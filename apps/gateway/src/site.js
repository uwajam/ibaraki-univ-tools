export const SITE_HTML = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>茨城大学 シラバスMCP</title>
  <meta name="description" content="茨城大学のシラバスをAIツールやHTTP APIから検索できる非公式MCPサーバーです。">
<style>
    :root {
      color-scheme: light;
      --ink: #17201d;
      --muted: #66726c;
      --soft: #f5f7f3;
      --soft-2: #edf4ef;
      --panel: #ffffff;
      --line: #dbe3dc;
      --green: #17684d;
      --blue: #25577b;
      --rust: #9a4a31;
      --code: #101715;
      --code-text: #e5f5eb;
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      color: var(--ink);
      background: #fbfcfa;
      font-family: Inter, "Noto Sans JP", "Yu Gothic", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.72;
      text-rendering: optimizeLegibility;
    }
    a { color: inherit; }
    code { font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace; }
    .shell { width: min(1120px, calc(100% - 40px)); margin: 0 auto; }
    header {
      position: sticky;
      top: 0;
      z-index: 20;
      border-bottom: 1px solid rgba(23, 32, 29, .08);
      background: rgba(251, 252, 250, .9);
      backdrop-filter: blur(14px);
    }
    nav {
      min-height: 64px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      font-weight: 850;
      text-decoration: none;
      letter-spacing: 0;
      white-space: nowrap;
    }
    .mark {
      display: inline-grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: 7px;
      background: var(--green);
      color: #fff;
      font-size: 13px;
      font-weight: 900;
    }
    .links {
      display: flex;
      align-items: center;
      gap: 18px;
      color: var(--muted);
      font-size: 14px;
    }
    .links a { text-decoration: none; }
    .links a:hover { color: var(--ink); }
    .hero {
      padding: 76px 0 72px;
      background: linear-gradient(180deg, #fbfcfa 0%, #f3f7f3 100%);
    }
    .hero-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.08fr) minmax(360px, .92fr);
      gap: 48px;
      align-items: center;
    }
    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 18px;
      color: var(--green);
      font-size: 13px;
      font-weight: 850;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: var(--green);
    }
    h1 {
      margin: 0;
      max-width: 760px;
      font-size: 58px;
      line-height: 1.08;
      letter-spacing: 0;
      word-break: keep-all;
    }
    .lead {
      margin: 22px 0 0;
      max-width: 720px;
      color: var(--muted);
      font-size: 18px;
      line-height: 1.85;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 30px;
    }
    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 0 18px;
      border-radius: 8px;
      border: 1px solid var(--ink);
      background: var(--ink);
      color: #fff;
      text-decoration: none;
      font-weight: 800;
    }
    .button.secondary {
      border-color: var(--line);
      background: #fff;
      color: var(--ink);
    }
    .hero-facts {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin-top: 30px;
      max-width: 760px;
    }
    .fact {
      border: 1px solid var(--line);
      background: rgba(255,255,255,.74);
      border-radius: 8px;
      padding: 12px;
    }
    .fact b {
      display: block;
      font-size: 14px;
      line-height: 1.35;
    }
    .fact span {
      display: block;
      margin-top: 4px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
    }
    .hero-panel {
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 20px 48px rgba(23, 32, 29, .09);
    }
    .panel-top {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 16px;
      align-items: center;
      padding: 18px 20px;
      background: var(--soft);
      border-bottom: 1px solid var(--line);
    }
    .panel-title {
      display: block;
      font-weight: 850;
      line-height: 1.35;
    }
    .panel-meta {
      display: block;
      color: var(--muted);
      font-size: 13px;
      margin-top: 2px;
      overflow-wrap: anywhere;
    }
    .badge {
      border: 1px solid rgba(23, 104, 77, .28);
      background: #eef7f1;
      color: var(--green);
      border-radius: 999px;
      padding: 6px 10px;
      font-size: 12px;
      font-weight: 850;
      white-space: nowrap;
    }
    .panel-body {
      display: grid;
      gap: 0;
    }
    .tool-preview {
      display: grid;
      grid-template-columns: 190px minmax(0, 1fr);
      gap: 18px;
      padding: 18px 20px;
      border-top: 1px solid var(--line);
    }
    .tool-preview:first-child { border-top: 0; }
    .tool-key {
      color: var(--blue);
      font: 800 13px/1.45 "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      overflow-wrap: anywhere;
    }
    .tool-preview p {
      margin: 0;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.65;
    }
    section { padding: 76px 0; }
    section:nth-of-type(even) { background: #f7f9f6; }
    .section-head {
      max-width: 760px;
      margin-bottom: 30px;
    }
    h2 {
      margin: 0;
      font-size: 34px;
      line-height: 1.22;
      letter-spacing: 0;
    }
    .section-note {
      margin: 12px 0 0;
      max-width: 680px;
      color: var(--muted);
      font-size: 16px;
      line-height: 1.8;
      text-wrap: pretty;
    }
    .steps, .coverage-grid, .connect-steps, .faq-grid {
      display: grid;
      gap: 16px;
    }
    .steps, .connect-steps { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .coverage-grid, .faq-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .card, .coverage-card, .connect-step, .api-note, .example, .endpoint {
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 8px;
    }
    .card, .coverage-card, .connect-step, .api-note { padding: 22px; }
    .num, .connect-step strong {
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      margin-bottom: 14px;
      padding: 0 9px;
      border-radius: 999px;
      background: var(--soft-2);
      color: var(--green);
      font-size: 12px;
      font-weight: 850;
    }
    h3 {
      margin: 0 0 10px;
      font-size: 20px;
      line-height: 1.34;
      letter-spacing: 0;
    }
    .card p, .coverage-card p, .tool p, .connect-step p, .api-note p, .faq p {
      margin: 0;
      color: var(--muted);
    }
    .coverage-top {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: start;
      margin-bottom: 18px;
    }
    .coverage-count {
      color: var(--muted);
      font-size: 13px;
      white-space: nowrap;
      padding-top: 4px;
    }
    .year-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      min-height: 34px;
    }
    .year-chip, .params span {
      background: var(--soft);
      color: var(--muted);
      border-radius: 999px;
      padding: 5px 9px;
      font-size: 13px;
      font-weight: 750;
    }
    .year-chip.latest {
      background: var(--soft-2);
      color: var(--green);
    }
    .loading-note {
      color: var(--muted);
      font-size: 14px;
      margin: 0;
    }
    .tool {
      display: grid;
      grid-template-columns: 240px minmax(0, 1fr);
      gap: 30px;
      padding: 24px 0;
    }
    .tool + .tool { border-top: 1px solid var(--line); }
    .tool-name {
      color: var(--blue);
      font-weight: 850;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      overflow-wrap: anywhere;
    }
    .params {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 14px;
    }
    .api-note { margin-top: 24px; }
    .api-list {
      display: grid;
      gap: 8px;
      margin-top: 14px;
    }
    .api-list code {
      display: block;
      padding: 10px 12px;
      background: var(--soft);
      border-radius: 6px;
      color: var(--ink);
      overflow-wrap: anywhere;
    }
    .connect {
      display: grid;
      gap: 18px;
    }
    .endpoint {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 16px;
      align-items: center;
      padding: 18px 20px;
    }
    .endpoint-label {
      display: block;
      color: var(--muted);
      font-size: 13px;
      margin-bottom: 5px;
    }
    .endpoint code {
      display: block;
      color: var(--ink);
      font-size: 16px;
      overflow-wrap: anywhere;
    }
    .notice {
      border-left: 4px solid var(--rust);
      background: #fff8f4;
      padding: 16px 18px;
      color: #5f3428;
      border-radius: 8px;
      margin-top: 18px;
    }
    .console {
      border: 1px solid #ced7cf;
      background: var(--code);
      color: var(--code-text);
      border-radius: 8px;
      overflow: hidden;
    }
    .console-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-bottom: 1px solid rgba(229,245,235,.14);
      color: #a9c8b6;
      font-size: 13px;
    }
    pre {
      margin: 0;
      overflow-x: auto;
      padding: 18px;
      color: var(--code-text);
      background: var(--code);
      font: 13px/1.62 "SFMono-Regular", Consolas, "Liberation Mono", monospace;
    }
    .copy {
      min-width: 64px;
      height: 30px;
      border: 1px solid rgba(229,245,235,.28);
      background: rgba(255,255,255,.08);
      color: var(--code-text);
      font: 12px/1 "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      border-radius: 6px;
      cursor: pointer;
    }
    .copy.light {
      border-color: var(--line);
      background: var(--soft);
      color: var(--ink);
    }
    .copy:hover { background: rgba(255,255,255,.16); }
    .copy.light:hover { background: var(--soft-2); }
    .connect-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 18px;
    }
    .example { overflow: hidden; }
    .example-row {
      display: grid;
      grid-template-columns: 112px minmax(0, 1fr);
      gap: 18px;
      padding: 18px 20px;
    }
    .example-row + .example-row {
      border-top: 1px solid var(--line);
      background: #f7f9f7;
    }
    .example-label {
      color: var(--green);
      font-weight: 850;
      font-size: 13px;
    }
    .example p {
      margin: 0;
      color: var(--ink);
    }
    .example .muted {
      color: var(--muted);
      margin-top: 8px;
    }
    footer {
      padding: 32px 0 46px;
      color: var(--muted);
      font-size: 14px;
      background: #f4f6f3;
    }
    .footer-row {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      flex-wrap: wrap;
    }
    @media (max-width: 920px) {
      .hero-grid, .tool, .connect-grid { grid-template-columns: 1fr; }
      .steps, .coverage-grid, .connect-steps, .faq-grid { grid-template-columns: 1fr; }
      .endpoint { grid-template-columns: 1fr; }
      .hero { padding-top: 58px; }
      h1 { font-size: 44px; white-space: normal; }
      h2 { font-size: 30px; }
      .links { display: none; }
      .hero-facts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .panel-body { grid-template-columns: 1fr; }
      .tool-preview { grid-template-columns: 1fr; }
    }
    @media (max-width: 560px) {
      .shell { width: min(100% - 28px, 1120px); }
      h1 { font-size: 36px; }
      .lead { font-size: 16px; }
      .hero-facts { grid-template-columns: 1fr; }
      .panel-top, .example-row { grid-template-columns: 1fr; }
      .brand span:last-child { white-space: normal; line-height: 1.25; }
    }
  </style>
</head>
<body>
  <header>
    <nav class="shell">
      <a class="brand" href="/" aria-label="茨城大学 シラバスMCP"><span class="mark">IU</span><span>茨城大学 シラバスMCP</span></a>
      <div class="links">
        <a href="#usage">できること</a>
        <a href="#coverage">収録年度</a>
        <a href="#tools">ツールとAPI</a>
        <a href="#connect">接続方法</a>
        <a href="#examples">質問例</a>
        <a href="#faq">FAQ</a>
      </div>
    </nav>
  </header>

  <main>
    <section class="hero">
      <div class="shell hero-grid">
        <div class="hero-copy">
          <div class="eyebrow"><span class="dot"></span>非公式 / 公開情報のみ / 認証不要</div>
          <h1>茨城大学 シラバスMCP</h1>
          <p class="lead">茨城大学のシラバスをAIツールやHTTP APIから検索できます。授業候補の検索、時間割コードからの詳細取得、授業計画の確認に対応し、補助的に工学部履修案内PDFの本文検索も利用できます。</p>
          <div class="actions">
            <a class="button" href="#connect">MCPに接続する</a>
            <a class="button secondary" href="#tools">APIを見る</a>
          </div>
          <div class="hero-facts">
            <div class="fact"><b>認証不要</b><span>URLを登録するだけ</span></div>
            <div class="fact"><b>公開情報のみ</b><span>manaba等は対象外</span></div>
            <div class="fact"><b>公式URL付き</b><span>PDFはページ番号も返却</span></div>
            <div class="fact"><b>定期更新</b><span>差分を低頻度で収集</span></div>
          </div>
        </div>
        <aside class="hero-panel" aria-label="MCP endpoint and tools">
          <div class="panel-top">
            <div>
              <span class="panel-title">MCP Server URL</span>
              <span class="panel-meta">https://mcp.uwaja.net/iu</span>
            </div>
            <span class="badge">ready</span>
          </div>
          <div class="panel-body">
            <div class="tool-preview">
              <div class="tool-key">syllabus.search_courses</div>
              <p>授業名、教員名、科目番号、曜日時限、概要から候補を検索します。</p>
            </div>
            <div class="tool-preview">
              <div class="tool-key">syllabus.get_course</div>
              <p>courseId、時間割コード、公式URLからシラバス詳細を取得します。</p>
            </div>
            <div class="tool-preview">
              <div class="tool-key">pdf.search_documents</div>
              <p>PDF本文を検索し、本文抜粋、ページ番号、文書URLを返します。</p>
            </div>
          </div>
        </aside>
      </div>
    </section>

    <section id="usage">
      <div class="shell">
        <div class="section-head">
          <h2>できること</h2>
          <p class="section-note">AIに質問するだけで授業候補の探索、シラバス詳細の確認、履修要項PDFの該当箇所探しができます。</p>
        </div>
        <div class="steps">
          <article class="card"><div class="num">01</div><h3>自然文で探す</h3><p>「水曜2限の専門科目」「科目番号がT3から始まる授業」「CAP制について書かれた箇所」のように相談できます。</p></article>
          <article class="card"><div class="num">02</div><h3>公式情報へ戻れる</h3><p>検索結果には公式サービスのURLを付けます。PDF検索ではページ番号と本文チャンクも返します。</p></article>
          <article class="card"><div class="num">03</div><h3>公開情報だけ扱う</h3><p>個人の履修情報、manaba、メール、休講情報は扱いません。大学が公開しているページやPDFだけを対象にします。</p></article>
        </div>
      </div>
    </section>

    <section id="coverage">
      <div class="shell">
        <div class="section-head">
          <h2>収録年度</h2>
          <p class="section-note">現在検索できる年度です。AIに「2026年度に絞って」のように伝えると、その年度だけを対象にできます。</p>
        </div>
        <div class="coverage-grid">
          <article class="coverage-card">
            <div class="coverage-top">
              <div>
                <h3>シラバス</h3>
                <p class="loading-note">授業検索で利用できる年度</p>
              </div>
              <span class="coverage-count" id="syllabus-count">読み込み中</span>
            </div>
            <div class="year-list" id="syllabus-years"><span class="loading-note">年度を取得しています</span></div>
          </article>
          <article class="coverage-card">
            <div class="coverage-top">
              <div>
                <h3>PDF</h3>
                <p class="loading-note">履修要項PDF検索で利用できる年度</p>
              </div>
              <span class="coverage-count" id="pdf-count">読み込み中</span>
            </div>
            <div class="year-list" id="pdf-years"><span class="loading-note">年度を取得しています</span></div>
          </article>
        </div>
      </div>
    </section>

    <section id="tools">
      <div class="shell">
        <div class="section-head">
          <h2>ツールとHTTP API</h2>
          <p class="section-note">MCPツールとして呼び出せるほか、一部のシラバス機能はHTTP APIとしてJSONで取得できます。</p>
        </div>
        <div class="tool">
          <div class="tool-name">syllabus.search_courses</div>
          <div>
            <h3>授業候補を検索する</h3>
            <p>授業名、教員名、概要、科目番号、曜日、時限、学期、科目番号プレフィックスで候補を返します。</p>
            <div class="params"><span>query</span><span>academicYear</span><span>courseNumberPrefix</span><span>instructor</span><span>term</span><span>day</span><span>period</span><span>limit</span></div>
          </div>
        </div>
        <div class="tool">
          <div class="tool-name">syllabus.get_course</div>
          <div>
            <h3>シラバス詳細を取得する</h3>
            <p><code>courseId</code>、<code>syllabusId</code>、科目番号、時間割コード、公式URLから詳細を取得します。</p>
            <div class="params"><span>courseId</span><span>overview</span><span>sections</span><span>classScheduleDetails</span><span>officialUrl</span></div>
          </div>
        </div>
        <div class="tool">
          <div class="tool-name">pdf.search_documents</div>
          <div>
            <h3>PDF本文を検索する</h3>
            <p>履修要項などの公開PDFから、関連する本文チャンク、ページ番号、文書URLを返します。</p>
            <div class="params"><span>q</span><span>query</span><span>queries</span><span>academicYear</span><span>documentId</span><span>mode</span><span>includeToc</span><span>limit</span></div>
          </div>
        </div>
        <div class="api-note">
          <h3>HTTP APIとしても利用できます</h3>
          <p>MCPクライアントを使わず、保存済みのシラバスデータを直接JSONで取得できます。時間割コードから授業詳細を取得する場合は、年度を指定すると安定します。</p>
          <div class="api-list">
            <code>GET /univ/ibaraki/syllabus/timetable-codes/T3003?academicYear=2026</code>
            <code>GET /univ/ibaraki/syllabus/courses/T3003?academicYear=2026</code>
            <code>GET /univ/ibaraki/syllabus/search?q=情報&amp;academicYear=2026</code>
          </div>
        </div>
      </div>
    </section>

    <section id="connect">
      <div class="shell">
        <div class="section-head">
          <h2>接続方法</h2>
          <p class="section-note">CodexやClaude Codeに下のURLを登録すると、会話の中でシラバス検索とPDF検索を使えるようになります。認証やAPIキーは不要です。</p>
        </div>
        <div class="connect">
          <div class="connect-steps">
            <article class="connect-step"><strong>STEP 01</strong><h3>URLを確認する</h3><p>登録先は <code>/iu</code> で終わるURLです。この説明ページのURLではなく、下のMCP Server URLを使います。</p></article>
            <article class="connect-step"><strong>STEP 02</strong><h3>クライアントに追加する</h3><p>CodexまたはClaude Codeのどちらかのコマンドを実行します。普段使うプロジェクトにだけ登録できます。</p></article>
            <article class="connect-step"><strong>STEP 03</strong><h3>質問して使う</h3><p>「授業を探して」「履修要項PDFから該当箇所を探して」のように、そのまま日本語で依頼します。</p></article>
          </div>
          <div class="endpoint">
            <div>
              <span class="endpoint-label">MCP Server URL</span>
              <code id="copy-endpoint">https://mcp.uwaja.net/iu</code>
            </div>
            <button class="copy light" data-copy="endpoint">Copy</button>
          </div>
        </div>
        <p class="notice">このサービスは茨城大学公式ではありません。公開情報のみを扱い、履修判断や提出前の最終確認では必ず大学の公式情報を優先してください。</p>
      </div>
    </section>

    <section id="examples">
      <div class="shell">
        <div class="section-head">
          <h2>質問例</h2>
          <p class="section-note">登録後は、普段の会話の中で次のように頼めます。必要に応じてAIが検索機能を呼び出します。</p>
        </div>
        <div class="example-list">
          <article class="example">
            <div class="example-row">
              <div class="example-label">質問</div>
              <p>茨城大学で2026年度に開講される、情報系またはデータ分析に関係する授業を探して。授業名、担当教員、曜日時限、概要を比較できる形でまとめて。</p>
            </div>
            <div class="example-row">
              <div class="example-label">回答例</div>
              <div>
                <p>条件に近い授業候補を一覧化し、気になる科目はcourseIdから詳細を開いて、到達目標や成績評価まで確認します。</p>
                <p class="muted">授業検索には <code>syllabus.search_courses</code> と <code>syllabus.get_course</code> を使います。</p>
              </div>
            </div>
          </article>
          <article class="example">
            <div class="example-row">
              <div class="example-label">質問</div>
              <p>履修要項PDFから、卒業に必要な単位数とCAP制について書かれている箇所を探して。本文抜粋、ページ番号、文書URLも出して。</p>
            </div>
            <div class="example-row">
              <div class="example-label">回答例</div>
              <div>
                <p>関連するPDFチャンクを検索し、該当ページ、本文抜粋、文書URLを返します。</p>
                <p class="muted">PDF検索には <code>pdf.search_documents</code> を使います。</p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section id="faq">
      <div class="shell">
        <div class="section-head">
          <h2>FAQ</h2>
          <p class="section-note">大学公式のサービスではありません。履修登録や成績に関わる判断では、必ず大学の公式情報を確認してください。</p>
        </div>
        <div class="faq-grid">
          <article class="card faq"><h3>アカウントやAPIキーは必要ですか？</h3><p>不要です。MCP Server URLを登録すれば、そのまま接続できます。</p></article>
          <article class="card faq"><h3>大学サイトを毎回見に行きますか？</h3><p>いいえ。検索時は保存済みデータを読みます。大学サイトへの収集は、負荷をかけないよう低頻度で実行します。</p></article>
          <article class="card faq"><h3>PDFはどのように更新しますか？</h3><p>工学部履修案内ページを定期的に確認し、PDF本文のハッシュが変わったものだけ再取り込みします。</p></article>
          <article class="card faq"><h3>何年度に対応していますか？</h3><p>現在は主に2026年度データです。検索済みの年度は <code>academicYear</code> で指定できます。</p></article>
        </div>
      </div>
    </section>
  </main>

  <footer>
    <div class="shell footer-row">
      <span>茨城大学 シラバスMCP</span>
      <span>非公式・読み取り専用。最終確認は大学の公式情報で行ってください。</span>
    </div>
  </footer>
  <script>
    function renderYears(targetId, countId, years, countKey) {
      const target = document.getElementById(targetId);
      const count = document.getElementById(countId);
      if (!target || !count) return;
      if (!Array.isArray(years) || years.length === 0) {
        target.innerHTML = '<span class="loading-note">収録年度がありません</span>';
        count.textContent = '0件';
        return;
      }
      const latest = years[0]?.academicYear;
      target.innerHTML = years.map((year) => {
        const value = String(year.academicYear ?? '');
        const className = year.academicYear === latest ? 'year-chip latest' : 'year-chip';
        return '<span class="' + className + '">' + value + '</span>';
      }).join('');
      const total = years.reduce((sum, year) => sum + Number(year[countKey] ?? 0), 0);
      count.textContent = total.toLocaleString('ja-JP') + '件';
    }

    async function loadCoverage() {
      try {
        const [syllabus, pdf] = await Promise.all([
          fetch('/univ/ibaraki/syllabus/health').then((response) => response.json()),
          fetch('/univ/ibaraki/pdf/health').then((response) => response.json())
        ]);
        renderYears('syllabus-years', 'syllabus-count', syllabus.years, 'courseCount');
        renderYears('pdf-years', 'pdf-count', pdf.years, 'documentCount');
      } catch {
        const syllabusYears = document.getElementById('syllabus-years');
        const pdfYears = document.getElementById('pdf-years');
        if (syllabusYears) syllabusYears.innerHTML = '<span class="loading-note">年度を取得できませんでした</span>';
        if (pdfYears) pdfYears.innerHTML = '<span class="loading-note">年度を取得できませんでした</span>';
      }
    }

    loadCoverage();

    document.querySelectorAll("[data-copy]").forEach((button) => {
      button.addEventListener("click", async () => {
        const target = document.getElementById("copy-" + button.dataset.copy);
        if (!target) return;
        try {
          await navigator.clipboard.writeText(target.textContent.trim());
          const original = button.textContent;
          button.textContent = "Copied";
          setTimeout(() => { button.textContent = original; }, 1200);
        } catch {
          button.textContent = "Select";
        }
      });
    });
  </script>
</body>
</html>`;
