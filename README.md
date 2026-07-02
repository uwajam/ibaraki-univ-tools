# iu-mcp

茨城大学の公開教務情報をMCP経由で利用するためのCloudflare Workersプロジェクトです。

リポジトリ名・Worker名・MCP登録名は `iu-mcp` に寄せています。

現在はシラバス検索・詳細取得と、公開PDFの全文検索に対応しています。今後、対象PDFの拡充と図書館キャッシュAPIを追加する予定です。

公開Workerは大学サイトへリアルタイム検索を行いません。シラバス検索はD1に投入済みの静的データだけを読みます。

MCP Gateway: `https://mcp.uwaja.net/iu`

## Architecture

外部から見ると1つのMCPサーバーですが、内部ではGateway層とservice API層を分けています。

```text
apps/gateway
  MCP JSON-RPC endpoint。tools/listとtools/callを扱い、DBやcrawlerには触らずservice APIをfetchする。

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
  Cloudflare Workerの薄いprefix router。公開ページは返さず、サービス追加時はservice側のroute/tool定義を増やして、ここではprefix委譲だけを追加する。
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
  - `/univ/ibaraki/syllabus/search`、`/univ/ibaraki/syllabus/courses/:id`、`/univ/ibaraki/syllabus/health` を提供します。
- MCP tools
  - `services/*/src/index.js` の `*ToolDefinitions` に各サービスがtool schemaとAPI呼び出し先を定義します。
  - `apps/gateway/src/index.js` は各サービスのtool定義を集約し、tool呼び出し時に登録済みservice APIへ委譲します。
- HTTP routing
  - `packages/shared/src/router.js` の `route()` / `createRouter()` でpath parameter付きルートを宣言します。
  - 各service APIは `*ApiRoutes` として公開し、Workerは `/univ/ibaraki/<service>...` prefixで委譲します。
  - `src/worker.js` は公開ページを返さず、大学APIとMCP Gatewayのprefixを各serviceへ渡すだけにします。

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

大学APIの公開入口は `https://api.uwaja.net/univ/ibaraki/*` です。この入口の内側で、現在は `/syllabus` をシラバスAPI、`/pdf` をPDF APIへ委譲します。

```text
GET  /univ/ibaraki/syllabus/health
GET  /univ/ibaraki/syllabus/search?academicYear=2026&query=入門&limit=20
POST /univ/ibaraki/syllabus/search
GET  /univ/ibaraki/syllabus/courses/:id
GET  /univ/ibaraki/pdf/health
GET  /univ/ibaraki/pdf/search?q=卒業要件&limit=10
POST /univ/ibaraki/pdf/search
```

`/univ/ibaraki/syllabus*` はシラバスAPI、`/univ/ibaraki/pdf*` はPDF APIです。将来 `library` などを増やす場合は、`/univ/ibaraki/library*` のように大学API配下へ追加します。

`/univ/ibaraki/syllabus/courses/:id` は `courseId`、`syllabusId`、科目番号、時間割コード、公式URLを受け付けます。URLを渡す場合はpath segmentとしてURL encodeしてください。

## MCP

MCP Gatewayの公開入口は `https://mcp.uwaja.net/iu` と `https://mcp.uwaja.net/iu/*` です。`POST /iu` は軽量なJSON-RPC endpointです。

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

- SQLはD1 prepared statementだけを使います。
- `courseId` 系入力はrepository側で想定形式に寄せています。
- raw HTMLはD1に入れず、APIレスポンスにも返しません。

## Contact

不具合報告は GitHub Issues をご利用ください。

## Public URL routing

| Public URL | Worker path prefix | Handler |
| --- | --- | --- |
| `https://api.uwaja.net/univ/ibaraki/syllabus*` | `/univ/ibaraki/syllabus` | `handleSyllabusApiRequest()` |
| `https://api.uwaja.net/univ/ibaraki/pdf*` | `/univ/ibaraki/pdf` | `handlePdfApiRequest()` |
| `https://mcp.uwaja.net/iu` | `/iu` | `handleMcpGatewayRequest()` |
| `https://mcp.uwaja.net/iu/*` | `/iu/*` | `handleMcpGatewayRequest()` |

`wrangler.toml` は `api.uwaja.net/univ/ibaraki/*`、`mcp.uwaja.net/iu`、`mcp.uwaja.net/iu/*` を登録します。Worker内では `src/worker.js` がprefixだけを見て、既存serviceのhandlerへ委譲します。将来 `library` を追加する場合は、`api.uwaja.net/univ/ibaraki/library*` のように大学API配下へ追加します。
