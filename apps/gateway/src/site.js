export const SITE_HTML = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>茨城大学 学務情報MCPサーバ</title>
  <meta name="description" content="茨城大学のシラバスや履修要項PDFなど、公開されている学務情報を検索できる非公式ページです。">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;800;900&family=Shippori+Mincho:wght@700;800&display=swap" rel="stylesheet">
<style>
    :root {
      color-scheme: light;
      --ink: #111514;
      --subtle: #3f4c49;
      --muted: #6f7772;
      --line: #d8ddd7;
      --paper: #fbfaf2;
      --paper-2: #f1f2e8;
      --panel: #fffffb;
      --green: #006b4a;
      --blue: #1f4b72;
      --rust: #9b3f25;
      --code: #111716;
      --code-line: rgba(232, 246, 237, .13);
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      color: var(--ink);
      background: #fbfbf8;
      background-size: 76px 100%, auto;
      font-family: "Noto Sans JP", Inter, "Yu Gothic", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.72;
      text-rendering: optimizeLegibility;
    }
    a { color: inherit; }
    .shell { width: min(1160px, calc(100% - 40px)); margin: 0 auto; }
    header {
      position: sticky;
      top: 0;
      z-index: 10;
      background: rgba(251, 251, 248, .9);
      backdrop-filter: blur(10px);
    }
    nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 66px;
      gap: 24px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--green);
      font-family: "Shippori Mincho", "Yu Mincho", "Hiragino Mincho ProN", serif;
      font-size: 18px;
      font-style: italic;
      font-weight: 800;
      text-decoration: none;
      white-space: nowrap;
    }
    .mark {
      display: none;
    }
    .links {
      display: flex;
      align-items: center;
      gap: 20px;
      color: #4e5f59;
      font-size: 14px;
    }
    .links a { text-decoration: none; }
    .links a:hover { color: var(--ink); }
    .hero {
      position: relative;
      overflow: hidden;
      padding: 80px 0 68px;
      background:
        linear-gradient(90deg, rgba(22, 27, 25, .045) 1px, transparent 1px),
        linear-gradient(180deg, #fbfbf8 0%, #f8f6ef 100%);
      background-size: 72px 100%, auto;
    }
    .hero:before {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        linear-gradient(180deg, rgba(255,255,255,.55), transparent 38%),
        linear-gradient(90deg, transparent 0%, rgba(255,255,255,.48) 50%, transparent 100%);
    }
    .hero-grid {
      position: relative;
      display: grid;
      grid-template-columns: 1fr;
      gap: 42px;
      align-items: start;
    }
    .hero-copy {
      max-width: 1050px;
      padding: 8px 0 0;
    }
    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      color: var(--green);
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 0;
      font-style: italic;
      margin-bottom: 14px;
    }
    .rule {
      display: none;
    }
    h1 {
      margin: 0;
      max-width: none;
      font-size: 66px;
      line-height: 1.08;
      letter-spacing: 0;
      font-family: "Shippori Mincho", "Yu Mincho", "Hiragino Mincho ProN", serif;
      font-weight: 800;
      font-style: italic;
      word-break: keep-all;
      white-space: nowrap;
      font-feature-settings: "palt";
      text-shadow: 1px 1px 0 rgba(0, 107, 74, .16);
    }
    .lead {
      margin: 26px 0 0;
      max-width: 860px;
      color: var(--subtle);
      font-size: 18px;
      font-style: italic;
      line-height: 1.9;
      word-break: keep-all;
    }
    .lead span {
      text-decoration: underline;
      text-decoration-thickness: 1px;
      text-underline-offset: 4px;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 34px;
    }
    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 0 18px;
      background: var(--ink);
      color: #fff;
      text-decoration: none;
      font-weight: 800;
      border-radius: 3px;
    }
    .button.secondary {
      background: rgba(255,255,255,.56);
      color: var(--ink);
      border: 1px solid rgba(17, 21, 20, .22);
    }
    .button:hover { transform: translateY(-1px); }
    .status-row {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin-top: 30px;
      max-width: 880px;
    }
    .status {
      min-height: 70px;
      background: rgba(255, 255, 251, .56);
      padding-top: 12px;
      padding-left: 14px;
    }
    .status b {
      display: block;
      font-size: 15px;
      line-height: 1.35;
    }
    .status span {
      display: block;
      margin-top: 4px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
    }
    .hero-panel {
      background: rgba(255, 255, 255, .82);
      border-radius: 3px;
      box-shadow: 0 18px 42px rgba(38, 45, 39, .08);
      overflow: hidden;
      max-width: 1040px;
    }
    .panel-top {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 16px;
      align-items: center;
      padding: 18px 20px;
      background: rgba(239, 242, 229, .9);
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
    }
    .endpoint-badge {
      color: var(--green);
      background: #f5f7f2;
      border-radius: 3px;
      padding: 6px 10px;
      font-size: 12px;
      font-weight: 800;
      white-space: nowrap;
    }
    .panel-list {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .panel-row {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
      padding: 18px 20px;
    }
    .panel-key {
      color: var(--blue);
      font: 800 13px/1.45 "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      overflow-wrap: anywhere;
    }
    .panel-row p {
      margin: 0;
      color: var(--subtle);
      font-size: 14px;
      line-height: 1.65;
    }
    .console {
      border: 1px solid #ced7cf;
      background: var(--code);
      color: #dff3e6;
      border-radius: 8px;
      overflow: hidden;
    }
    .console-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-bottom: 1px solid var(--code-line);
      color: #a8c8b5;
      font-size: 13px;
    }
    .copy {
      min-width: 64px;
      height: 30px;
      border: 1px solid rgba(217,245,227,.28);
      background: rgba(255,255,255,.08);
      color: #d9f5e3;
      font: 12px/1 "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      border-radius: 6px;
      cursor: pointer;
    }
    .copy:hover { background: rgba(255,255,255,.16); }
    pre {
      margin: 0;
      overflow-x: auto;
      padding: 18px;
      color: #e6f7ea;
      background: var(--code);
      font: 13px/1.62 "SFMono-Regular", Consolas, "Liberation Mono", monospace;
    }
    code { font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace; }
    section { padding: 88px 0; }
    section:nth-of-type(even) {
      background: rgba(248, 249, 246, .76);
    }
    .section-head {
      max-width: 760px;
      margin-bottom: 44px;
    }
    h2 {
      margin: 0;
      font-size: 34px;
      line-height: 1.22;
      letter-spacing: 0;
      font-family: "Noto Sans JP", Inter, "Yu Gothic", system-ui, sans-serif;
      font-style: normal;
      font-weight: 900;
    }
    .section-note {
      margin: 14px 0 0;
      max-width: 680px;
      color: var(--muted);
      font-size: 16px;
      line-height: 1.8;
      word-break: normal;
      overflow-wrap: anywhere;
      text-wrap: pretty;
    }
    .steps, .usecases {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 18px;
    }
    .coverage-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 18px;
    }
    .coverage-card {
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 8px;
      padding: 26px;
    }
    .coverage-top {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: start;
      margin-bottom: 20px;
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
    .year-chip {
      background: #eef5f1;
      color: var(--ink);
      border-radius: 999px;
      padding: 6px 10px;
      font-size: 13px;
      font-weight: 800;
    }
    .year-chip.latest {
      background: #f0f6f1;
      color: var(--green);
    }
    .loading-note {
      color: var(--muted);
      font-size: 14px;
      margin: 0;
    }
    .item {
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 8px;
      padding: 24px;
    }
    .num {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 34px;
      height: 24px;
      margin-bottom: 16px;
      background: #eef5f1;
      color: var(--green);
      font-weight: 900;
      font-size: 12px;
      letter-spacing: .08em;
      border-radius: 999px;
    }
    h3 {
      margin: 0 0 10px;
      font-size: 20px;
      line-height: 1.32;
      letter-spacing: 0;
    }
    .item p, .tool p, .faq p {
      margin: 0;
      color: var(--muted);
    }
    .item h3 + p { margin-top: 10px; }
    .tool {
      padding: 28px 0;
      display: grid;
      grid-template-columns: 240px minmax(0, 1fr);
      gap: 30px;
    }
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
    .params span {
      background: #f3f6f3;
      color: var(--muted);
      padding: 5px 8px;
      border-radius: 999px;
      font-size: 13px;
    }
    .api-note {
      margin-top: 22px;
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 8px;
      padding: 18px 20px;
    }
    .api-note h3 {
      font-size: 18px;
      margin-bottom: 8px;
    }
    .api-note p {
      margin: 0;
      color: var(--muted);
    }
    .api-list {
      display: grid;
      gap: 8px;
      margin-top: 14px;
    }
    .api-list code {
      display: block;
      padding: 10px 12px;
      background: #f7f9f7;
      border-radius: 6px;
      color: var(--ink);
      overflow-wrap: anywhere;
    }
    .connect {
      display: grid;
      gap: 22px;
    }
    .connect-steps {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
    }
    .connect-step {
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 8px;
      padding: 20px;
    }
    .connect-step strong {
      display: block;
      color: var(--green);
      font-size: 13px;
      letter-spacing: .06em;
      margin-bottom: 8px;
    }
    .connect-step h3 {
      font-size: 18px;
      margin-bottom: 8px;
    }
    .connect-step p {
      margin: 0;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.65;
    }
    .connect-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 18px;
    }
    .notice {
      border-left: 4px solid var(--rust);
      background: #fff8f4;
      padding: 16px 18px;
      color: #5f3428;
      border-radius: 8px;
      margin-top: 18px;
    }
    .endpoint {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 16px;
      align-items: center;
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 8px;
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
    .copy.light {
      border-color: var(--line);
      background: #f3f6f3;
      color: var(--ink);
    }
    .copy.light:hover { background: #eef5f1; }
    .faq-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }
    .example-list {
      display: grid;
      gap: 18px;
    }
    .example {
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 8px;
      overflow: hidden;
    }
    .example-row {
      display: grid;
      grid-template-columns: 116px minmax(0, 1fr);
      gap: 18px;
      padding: 18px 20px;
    }
    .example-row + .example-row {
      background: #f7f9f7;
    }
    .example-label {
      color: var(--green);
      font-weight: 900;
      font-size: 13px;
      letter-spacing: .06em;
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
      padding: 34px 0 48px;
      color: var(--muted);
      font-size: 14px;
      background: #f6f6f0;
    }
    .footer-row {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      flex-wrap: wrap;
    }
    @media (max-width: 920px) {
      .hero-grid, .tool, .connect-grid, .connect-steps { grid-template-columns: 1fr; }
      .steps, .usecases, .coverage-grid, .faq-grid { grid-template-columns: 1fr; }
      .endpoint { grid-template-columns: 1fr; }
      .hero { padding-top: 58px; }
      h1 { font-size: 46px; white-space: normal; }
      h2 { font-size: 32px; }
      .links { display: none; }
      .status-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .panel-list { grid-template-columns: 1fr; }
      .panel-row {
        border-bottom: 0;
      }
    }
    @media (max-width: 560px) {
      .shell { width: min(100% - 28px, 1160px); }
      h1 { font-size: 36px; }
      .lead { font-size: 15px; }
      .status-row { grid-template-columns: 1fr; }
      .panel-top, .panel-row, .example-row { grid-template-columns: 1fr; }
      .brand span:last-child { white-space: normal; line-height: 1.25; }
    }
  </style>
</head>
<body>
  <header>
    <nav class="shell">
      <a class="brand" href="/" aria-label="茨城大学 学務情報MCPサーバ"><span class="mark">IU</span><span>茨城大学 学務情報MCPサーバ</span></a>
      <div class="links">
        <a href="#usage">できること</a>
        <a href="#coverage">収録年度</a>
        <a href="#tools">ツール</a>
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
          <div class="eyebrow"><span class="rule"></span>【非公式】 学務情報検索サービス</div>
          <h1>茨城大学 学務情報MCPサーバ</h1>
          <p class="lead"><span>CodexやClaude CodeなどのAIツールから、茨城大学のシラバスや履修要項PDFを探せるようにする非公式サービスです。</span><br><span>現在は授業検索と工学部履修案内PDFの本文検索に対応しています。</span></p>
          <div class="actions">
            <a class="button" href="#connect">接続方法を見る</a>
            <a class="button secondary" href="#tools">ツール仕様を見る</a>
          </div>
          <div class="status-row">
            <div class="status"><b>認証不要</b><span>URLを登録するだけで利用</span></div>
            <div class="status"><b>公開情報のみ</b><span>個人情報や学内ログインは不要</span></div>
            <div class="status"><b>公式URL付き</b><span>PDFはページ番号も表示</span></div>
            <div class="status"><b>定期更新</b><span>シラバスとPDFの変更を収集</span></div>
          </div>
        </div>
        <aside class="hero-panel" aria-label="available MCP tools">
          <div class="panel-top">
            <div>
              <span class="panel-title">AIツールに登録するURL</span>
              <span class="panel-meta">https://iu.mcp.uwaja.net/mcp</span>
            </div>
            <span class="endpoint-badge">利用可</span>
          </div>
          <div class="panel-list">
            <div class="panel-row">
              <div class="panel-key">syllabus.search_courses</div>
              <p>授業名、教員名、科目番号、曜日時限、概要からシラバス候補を検索します。</p>
            </div>
            <div class="panel-row">
              <div class="panel-key">syllabus.get_course</div>
              <p>courseIdや公式URLから、授業概要、到達目標、成績評価などの詳細を取得します。</p>
            </div>
            <div class="panel-row">
              <div class="panel-key">pdf.search_documents</div>
              <p>履修要項などのPDF本文を検索し、該当チャンク、ページ番号、文書URLを返します。</p>
            </div>
          </div>
        </aside>
      </div>
    </section>

    <section id="usage">
      <div class="shell">
        <div class="section-head">
          <h2>できること</h2>
          <p class="section-note">AIに質問するだけで、授業候補の探索、シラバス詳細の確認、履修要項PDFの該当箇所探しができるようになります。</p>
        </div>
        <div class="steps">
          <article class="item"><div class="num">01</div><h3>自然文で探す</h3><p>「水曜2限の専門科目」「科目番号がT3から始まる授業」「CAP制について書かれた箇所」のように相談できます。</p></article>
          <article class="item"><div class="num">02</div><h3>公式サービスへ戻れる</h3><p>検索結果には公式サービスのURLを付けます。PDF検索ではページ番号と本文チャンクも一緒に返します。</p></article>
          <article class="item"><div class="num">03</div><h3>公開情報だけ扱う</h3><p>個人の履修情報、manaba、メール、休講情報は扱いません。大学が公開しているページやPDFだけを検索対象にします。</p></article>
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
          <h2>公開ツール</h2>
          <p class="section-note">AIツールから呼び出せる機能の一覧です。授業を探す、授業の詳細を見る、PDF本文から該当箇所を探す、という用途に分かれています。</p>
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
            <div class="params"><span>courseId</span><span>overview</span><span>sections</span><span>officialUrl</span></div>
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
            <code>GET /api/syllabus/timetable-codes/T3003?academicYear=2026</code>
            <code>GET /api/syllabus/courses/T3003?academicYear=2026</code>
            <code>GET /api/syllabus/search?q=情報&amp;academicYear=2026</code>
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
            <article class="connect-step">
              <strong>STEP 01</strong>
              <h3>URLを確認する</h3>
              <p>登録先は <code>/mcp</code> で終わるURLです。この説明ページのURLではなく、下のMCP Server URLを使います。</p>
            </article>
            <article class="connect-step">
              <strong>STEP 02</strong>
              <h3>クライアントに追加する</h3>
              <p>CodexまたはClaude Codeのどちらかのコマンドを実行します。普段使うプロジェクトにだけ登録できます。</p>
            </article>
            <article class="connect-step">
              <strong>STEP 03</strong>
              <h3>質問して使う</h3>
              <p>「授業を探して」「履修要項PDFから該当箇所を探して」のように、そのまま日本語で依頼します。</p>
            </article>
          </div>
          <div class="endpoint">
            <div>
              <span class="endpoint-label">MCP Server URL</span>
              <code id="copy-endpoint">https://iu.mcp.uwaja.net/mcp</code>
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
          <article class="item faq">
            <h3>アカウントやAPIキーは必要ですか？</h3>
            <p>不要です。MCP Server URLを登録すれば、そのまま接続できます。</p>
          </article>
          <article class="item faq">
            <h3>大学サイトを毎回見に行きますか？</h3>
            <p>いいえ。検索時は保存済みデータを読みます。大学サイトへの収集は、負荷をかけないよう低頻度で実行します。</p>
          </article>
          <article class="item faq">
            <h3>PDFはどのように更新しますか？</h3>
            <p>工学部履修案内ページを定期的に確認し、PDF本文のハッシュが変わったものだけ再取り込みします。</p>
          </article>
          <article class="item faq">
            <h3>何年度に対応していますか？</h3>
            <p>現在は主に2026年度データです。検索済みの年度は <code>academicYear</code> で指定できます。</p>
          </article>
        </div>
      </div>
    </section>

  </main>

  <footer>
    <div class="shell footer-row">
      <span>茨城大学学務情報</span>
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
          fetch('/api/syllabus/health').then((response) => response.json()),
          fetch('/api/pdf/health').then((response) => response.json())
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
