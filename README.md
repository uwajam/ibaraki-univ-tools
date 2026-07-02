# iu-mcp

茨城大学の公開学務情報をMCP経由で利用するためのCloudflare Workersプロジェクトです。

表示名は「茨城大学学務情報MCP」です。リポジトリ名・Worker名・MCP登録名は `iu-mcp` に寄せています。

現在はシラバス検索・詳細取得と、公開PDFの全文検索に対応しています。今後、対象PDFの拡充と図書館キャッシュAPIを追加する予定です。

公開Workerは大学サイトへリアルタイム検索を行いません。シラバス検索はD1に投入済みの静的データだけを読みます。

説明サイト: `https://iu.mcp.uwaja.net/`

## Disclaimer

このプロジェクトは茨城大学公式ではありません。扱うのは公開情報のみです。個人の履修情報、manaba、メール、休講情報、成績、学生アカウントに紐づく情報は含めません。

## Architecture

外部から見ると1つのMCPサーバーですが、内部ではGateway層とservice API層を分けています。

```text
apps/gateway
  MCP endpointと説明サイト。DBやcrawlerには触らず、service APIをfetchする。

services/syllabus
  シラバス検索・詳細取得API。D1 schemaに沿って検索する。

services/pdf
  履修案内PDF・学務文書PDFの検索API。現在は全文検索の最小実装。

services/library
  将来の図書館API用の境界。現時点では未実装。

packages/shared
  共通レスポンス、JSON-RPC helper、宣言的HTTP routerなど。

jobs/syllabus-crawler
  大学サイトからシラバスをページ単位で収集し、SQLite/D1 seedを生成する。

jobs/pdf-importer
  PDF取得・テキスト抽出・チャンク化・インデックス作成。

migrations
  D1 schema。

src/worker.js
  Cloudflare Workerの薄いHTTPルーター。サービス追加時はservice側のroute/tool定義を増やし、ここではprefix委譲だけを追加する。
```

## Responsibility

- crawler
  - `jobs/syllabus-crawler/crawl-syllabus.py`
  - 大学サイトのセッションを確立し、検索結果ページをページ単位で辿り、詳細ページをSQLiteへ保存します。
- DB schema / migration
  - `migrations/0001_schema.sql`
  - D1の `courses` tableとindexを定義します。
- search / detail取得ロジック
  - `services/syllabus/src/repository.js`
  - D1 prepared statementだけを使って検索・詳細取得を行います。
- HTTP syllabus API
  - `services/syllabus/src/index.js`
  - `/api/syllabus/search`、`/api/syllabus/courses/:id`、`/api/syllabus/health` を提供します。
- MCP tools
  - `services/*/src/index.js` の `*ToolDefinitions` に各サービスがtool schemaとAPI呼び出し先を定義します。
  - `apps/gateway/src/index.js` は各サービスのtool定義を集約し、tool呼び出し時に登録済みservice APIへ委譲します。
- HTTP routing
  - `packages/shared/src/router.js` の `route()` / `createRouter()` でpath parameter付きルートを宣言します。
  - 各service APIは `*ApiRoutes` として公開し、Workerは `/api/<service>/...` prefixで委譲します。

## Setup

```sh
npm install
npm run cf:login
npm run d1:create
```

作成された `database_id` を `wrangler.toml` に設定してから、schemaを適用します。

```sh
npm run d1:migrate
```

既存のSQLiteスナップショットをD1へ投入する場合:

```sh
python jobs/syllabus-crawler/export-d1-seed.py --db path/to/ibaraki_syllabus.sqlite --out work/d1_seed.sql
npx wrangler d1 execute ibaraki_syllabus --remote --file work/d1_seed.sql
```

件数が多い場合は分割して投入します。

```sh
python jobs/syllabus-crawler/export-d1-seed.py --db work/ibaraki_syllabus.sqlite --chunk-size 500
npx wrangler d1 execute ibaraki_syllabus --remote --file work/d1_seed/0001.sql
npx wrangler d1 execute ibaraki_syllabus --remote --file work/d1_seed/0002.sql
```

deploy:

```sh
npm run deploy
```

## Update Data

GitHub Actionsでシラバスをページ単位でクロールし、SQLiteからD1 seedを作ってremote D1へ投入します。

定期実行は毎週日曜 22:00 UTC、つまり日本時間では毎週月曜 07:00です。相手サイトへの負荷と長時間セッションを避けるため、定期実行は8ページずつ処理します。全72ページを9週間で一周します。

必要なRepository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

手動実行:

```text
Actions -> Update syllabus D1 -> Run workflow
```

例:

```text
start_page = 1, end_page = 8
start_page = 9, end_page = 16
start_page = 17, end_page = 24
```

一気に全ページを指定せず、8ページ前後ずつに分けるのがおすすめです。

検索結果に載っていても一時的に取得できない詳細ページがあるため、個別シラバス取得の失敗は警告として記録し、一定数までは処理を続行します。

ローカルで小さく試す場合:

```sh
python jobs/syllabus-crawler/crawl-syllabus.py --year 2026 --start-page 1 --end-page 1 --limit 10 --db work/ibaraki_syllabus.sqlite
python jobs/syllabus-crawler/export-d1-seed.py --db work/ibaraki_syllabus.sqlite --chunk-size 500
```

公開Workerはクロールを行わず、D1だけを読みます。

## Import PDF Data

工学部履修案内ページをPDF一覧ページとして扱い、毎日クロールしてPDF差分を検知します。

```text
source page: https://www.eng.ibaraki.ac.jp/education/class/
```

source crawlerは `.pdf` リンクを抽出し、相対URLを絶対URLへ正規化し、PDF本体のSHA-256 hashを計算します。同じURLでもhashが変わった場合は新しい版として扱い、新規または変更されたPDFだけをimporterに渡します。削除されたPDFリンクはすぐ消さず、`pdf_files.status = 'missing'` にします。

ローカルで試す場合:

```sh
python jobs/pdf-source-crawler/crawl-pdf-source.py --db work/iu_mcp.sqlite --limit 3
python jobs/pdf-importer/export-d1-seed.py --db work/iu_mcp.sqlite --chunk-size 500 --mode upsert
```

単体PDFを直接取り込むこともできます。

```sh
python jobs/pdf-importer/import-pdf.py --db work/iu_mcp.sqlite
python jobs/pdf-importer/export-d1-seed.py --db work/iu_mcp.sqlite --chunk-size 500
npx wrangler d1 execute ibaraki_syllabus --remote --file work/pdf_d1_seed/0001.sql
```

既定の取り込み対象:

```text
title: 茨城大学工学部 履修要項 令和8年度入学者用（2026）
source_url: https://www.eng.ibaraki.ac.jp/common/education/class/2026-course-registration02.pdf
```

PDF全体をLLMへ渡さず、job側でページ単位のテキスト抽出、チャンク化、SQLite/D1投入用seed生成を行います。

GitHub Actionsの `Update PDF sources D1` は毎日 19:35 UTC、日本時間では毎日 04:35 に実行します。Actions cacheで前回のSQLite状態を復元し、hashが同じPDFは再importしません。

## HTTP API

```text
GET  /api/syllabus/health
GET  /api/syllabus/search?academicYear=2026&query=入門&limit=20
POST /api/syllabus/search
GET  /api/syllabus/courses/:id
GET  /api/pdf/health
GET  /api/pdf/search?q=卒業要件&limit=10
POST /api/pdf/search
POST /mcp
```

`/api/syllabus/courses/:id` は `courseId`、`syllabusId`、科目番号、時間割コード、公式URLを受け付けます。URLを渡す場合はpath segmentとしてURL encodeしてください。

## MCP

`POST /mcp` は軽量なJSON-RPC endpointです。

対応メソッド:

- `initialize`
- `tools/list`
- `tools/call`

公開ツール:

- `syllabus.search_courses`
- `syllabus.get_course`
- `pdf.search_documents`

MCP GatewayはD1を直接参照しません。tool呼び出しは内部HTTP APIへ変換されます。

## Security

- リアルタイム検索は公開APIに入れていません。
- SQLはD1 prepared statementだけを使います。
- `courseId` 系入力はrepository側で想定形式に寄せています。
- raw HTMLはD1に入れず、APIレスポンスにも返しません。

## Contact

不具合報告は GitHub Issues をご利用ください。
その他のお問い合わせは contact@uwaja.net までお願いいたします。

## URL migration plan

シラバスJSON APIとMCP入口を段階的に分離するため、新旧URLを並行稼働します。まずWorker内の共通ハンドラへ委譲し、D1/KV/環境変数やレスポンス形式は維持します。

| 旧URL | 新URL | 用途 | 移行中の扱い |
| --- | --- | --- | --- |
| `https://iu.mcp.uwaja.net/api/syllabus/timetable-codes/` | `https://api.uwaja.net/univ/ibaraki/syllabus/timetable-codes/` | 時間割コードからシラバスを取得 | 旧URLも同じハンドラで処理し、`Deprecation: true` を返します。 |
| `https://iu.mcp.uwaja.net/api/syllabus/...` | `https://api.uwaja.net/univ/ibaraki/syllabus/...` | シラバスJSON API全般 | 旧URLも同じハンドラで処理し、`Deprecation: true` を返します。 |
| `https://iu.mcp.uwaja.net/mcp` | `https://mcp.uwaja.net/iu` | MCP JSON-RPC入口 | 新旧URLとも同じMCP Gatewayハンドラで処理します。 |
| `https://iu.mcp.uwaja.net/` | `https://mcp.uwaja.net/iu` | MCPクライアント向け入口の案内 | 説明サイトは旧ホストで維持し、MCPクライアントは新URLへ移行します。 |

### Recommended migration workflow

1. 現在の構成確認
   - `src/worker.js` でWorker入口のprefix委譲を確認します。
   - `services/syllabus/src/index.js` でシラバスAPIのroute定義と公開されているエンドポイントを確認します。
   - `apps/gateway/src/index.js` でMCP toolがどのservice API pathを呼ぶか確認します。
   - `wrangler.toml` でWorkerに紐づくroutes、D1 binding、環境変数を確認します。
2. 共通ハンドラの切り出し
   - シラバスAPIの実処理は `services/syllabus/src/index.js` に集約し、ホスト名には依存させません。
   - 新base pathは `/univ/ibaraki/syllabus`、旧base pathは `/api/syllabus` として、同じroute配列を生成します。
3. ルーティング分岐の追加
   - `src/worker.js` では `api.uwaja.net/univ/ibaraki/syllabus/*` 相当のpathを `handleSyllabusApiRequest()` へ委譲します。
   - 旧 `iu.mcp.uwaja.net/api/syllabus/*` 相当のpathも同じハンドラへ委譲し、レスポンスヘッダーに `Deprecation: true` を付けます。
   - `mcp.uwaja.net/iu` と `mcp.uwaja.net/iu/*` は `handleMcpGatewayRequest()` へ委譲します。
4. MCP tool呼び出し先の切り替え
   - `services/syllabus/src/index.js` のtool定義は新API path `/univ/ibaraki/syllabus/*` を返すようにします。
   - `apps/gateway/src/index.js` のservice clientは新旧シラバスAPI prefixを受けられるようにし、外部API base URLを設定していない場合はWorker内ハンドラを直接呼びます。
5. wrangler routesの更新タイミング
   - コードが新旧pathの両方を処理できる状態になってから `wrangler.toml` のroutesへ `api.uwaja.net/univ/ibaraki/syllabus*`、`mcp.uwaja.net/iu*`、`iu.mcp.uwaja.net/*` を追加します。
   - DNS/Cloudflare側のroute反映前にデプロイしても旧URLは維持されるため、破壊的変更を避けられます。
6. ローカル確認
   - 構文確認: `npm run check`
   - Worker起動: `npm run dev`
   - 別端末から例として `curl http://localhost:8787/univ/ibaraki/syllabus/health`、`curl -i http://localhost:8787/api/syllabus/health`、MCP initializeのPOSTを確認します。
7. 本番反映
   - 先にD1 bindingと既存secrets/envが変わっていないことを確認します。
   - `npm run deploy` でWorkerをデプロイします。
   - 新API、新MCP、旧APIの順に疎通確認します。
   - 旧APIレスポンスに `Deprecation: true` が付くことを確認します。
   - クライアントやドキュメントを新URLへ移行し、アクセスログを見ながら旧URLの終了時期を別途決めます。
