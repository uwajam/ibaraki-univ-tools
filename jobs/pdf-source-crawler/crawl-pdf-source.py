import argparse
import hashlib
import json
import re
import sqlite3
import subprocess
import sys
import time
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[2]
MIGRATION = ROOT / "migrations" / "0001_schema.sql"
IMPORTER = ROOT / "jobs" / "pdf-importer" / "import-pdf.py"
DEFAULT_DB = ROOT / "work" / "iu_mcp.sqlite"
DEFAULT_PDF_DIR = ROOT / "work" / "pdf-source"
DEFAULT_SOURCE_PAGE_URL = "https://www.eng.ibaraki.ac.jp/education/class/"
DEFAULT_CATEGORY = "engineering-course-registration"
USER_AGENT = "Mozilla/5.0 (compatible; iu-mcp-pdf-source-crawler/0.1; +https://mcp.uwaja.net/iu)"


class PdfLinkParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.current_href = ""
        self.current_text = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() != "a":
            return
        attrs = dict(attrs)
        href = attrs.get("href", "")
        if ".pdf" not in href.lower():
            return
        self.current_href = href
        self.current_text = []

    def handle_data(self, data):
        if self.current_href:
            self.current_text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() != "a" or not self.current_href:
            return
        text = normalize_space("".join(self.current_text))
        self.links.append({"href": self.current_href, "title": text})
        self.current_href = ""
        self.current_text = []


def main():
    parser = argparse.ArgumentParser(description="Crawl a public PDF listing page and import changed PDFs.")
    parser.add_argument("--db", default=str(DEFAULT_DB))
    parser.add_argument("--source-page-url", default=DEFAULT_SOURCE_PAGE_URL)
    parser.add_argument("--pdf-dir", default=str(DEFAULT_PDF_DIR))
    parser.add_argument("--category", default=DEFAULT_CATEGORY)
    parser.add_argument("--academic-year", type=int, default=0)
    parser.add_argument("--delay", type=float, default=1.0)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    now = datetime.now(timezone.utc).isoformat()
    html = fetch_text(args.source_page_url)
    links = extract_pdf_links(html, args.source_page_url)
    if args.limit > 0:
        links = links[:args.limit]

    summary = {
        "ok": True,
        "sourcePageUrl": args.source_page_url,
        "found": len(links),
        "imported": 0,
        "skipped": 0,
        "missing": 0,
        "items": [],
    }

    Path(args.db).parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(args.db) as conn:
        conn.row_factory = sqlite3.Row
        apply_schema(conn)
        seen_urls = set()
        for index, link in enumerate(links):
            if index > 0 and args.delay > 0:
                time.sleep(args.delay)
            pdf = fetch_pdf(link["url"], Path(args.pdf_dir))
            seen_urls.add(link["url"])
            existing = find_file_by_url_and_hash(conn, link["url"], pdf["sha256"])
            if existing:
                mark_seen(conn, existing["file_id"], now)
                summary["skipped"] += 1
                summary["items"].append(item_summary(link, pdf, "skipped", existing["document_id"]))
                continue

            document_id = build_document_id(link["url"], pdf["sha256"])
            file_id = f"{document_id}:{pdf['sha256'][:16]}"
            title = link["title"] or title_from_url(link["url"])
            academic_year = args.academic_year or infer_year(title, link["url"])
            if not args.dry_run:
                mark_superseded_versions(conn, link["url"], now)
                conn.commit()
                run_importer(args, link, pdf, file_id, document_id, title, academic_year)
            summary["imported"] += 1
            summary["items"].append(item_summary(link, pdf, "imported", document_id))

        if not args.dry_run and args.limit <= 0:
            summary["missing"] = mark_missing(conn, args.source_page_url, seen_urls, now)
            conn.commit()

    print(json.dumps(summary, ensure_ascii=False, indent=2))


def fetch_text(url):
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=60) as response:
        data = response.read()
        charset = response.headers.get_content_charset() or "utf-8"
    return data.decode(charset, errors="replace")


def extract_pdf_links(html, base_url):
    parser = PdfLinkParser()
    parser.feed(html)
    seen = set()
    links = []
    for link in parser.links:
        url = normalize_pdf_url(urljoin(base_url, link["href"]))
        if url in seen:
            continue
        seen.add(url)
        links.append({"url": url, "title": link["title"]})
    return links


def normalize_pdf_url(url):
    parsed = urlparse(url)
    return parsed._replace(fragment="").geturl()


def fetch_pdf(url, pdf_dir):
    pdf_dir.mkdir(parents=True, exist_ok=True)
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=90) as response:
        headers = response.headers
        data = response.read()
    if not data.startswith(b"%PDF"):
        raise RuntimeError(f"Downloaded content is not a PDF: {url}")
    digest = hashlib.sha256(data).hexdigest()
    path = pdf_dir / f"{slug_from_url(url)}-{digest[:16]}.pdf"
    path.write_bytes(data)
    return {
        "path": path,
        "sha256": digest,
        "etag": headers.get("etag", ""),
        "last_modified": headers.get("last-modified", ""),
        "content_length": int(headers.get("content-length") or len(data)),
    }


def run_importer(args, link, pdf, file_id, document_id, title, academic_year):
    command = [
        sys.executable,
        str(IMPORTER),
        "--db",
        args.db,
        "--source-url",
        link["url"],
        "--source-page-url",
        args.source_page_url,
        "--pdf-path",
        str(pdf["path"]),
        "--file-id",
        file_id,
        "--document-id",
        document_id,
        "--title",
        title,
        "--category",
        args.category,
        "--academic-year",
        str(academic_year),
        "--sha256",
        pdf["sha256"],
        "--etag",
        pdf["etag"],
        "--last-modified",
        pdf["last_modified"],
        "--content-length",
        str(pdf["content_length"]),
    ]
    subprocess.run(command, check=True)


def apply_schema(conn):
    conn.executescript(MIGRATION.read_text(encoding="utf-8"))


def find_file_by_url_and_hash(conn, source_url, content_sha256):
    return conn.execute(
        "SELECT * FROM pdf_files WHERE source_url = ? AND content_sha256 = ? LIMIT 1",
        (source_url, content_sha256),
    ).fetchone()


def mark_seen(conn, file_id, seen_at):
    conn.execute(
        """
        UPDATE pdf_files
        SET status = 'active', last_seen_at = ?, missing_at = NULL
        WHERE file_id = ?
        """,
        (seen_at, file_id),
    )


def mark_superseded_versions(conn, source_url, seen_at):
    conn.execute(
        """
        UPDATE pdf_files
        SET status = 'superseded', last_seen_at = ?
        WHERE source_url = ? AND status = 'active'
        """,
        (seen_at, source_url),
    )


def mark_missing(conn, source_page_url, seen_urls, missing_at):
    rows = conn.execute(
        "SELECT file_id, source_url FROM pdf_files WHERE source_page_url = ? AND status = 'active'",
        (source_page_url,),
    ).fetchall()
    missing_ids = [row["file_id"] for row in rows if row["source_url"] not in seen_urls]
    for file_id in missing_ids:
        conn.execute(
            "UPDATE pdf_files SET status = 'missing', missing_at = ?, last_seen_at = ? WHERE file_id = ?",
            (missing_at, missing_at, file_id),
        )
    return len(missing_ids)


def item_summary(link, pdf, status, document_id):
    return {
        "status": status,
        "title": link["title"] or title_from_url(link["url"]),
        "sourceUrl": link["url"],
        "documentId": document_id,
        "sha256": pdf["sha256"],
        "etag": pdf["etag"],
        "lastModified": pdf["last_modified"],
        "contentLength": pdf["content_length"],
    }


def build_document_id(source_url, content_sha256):
    return f"{slug_from_url(source_url)}-{content_sha256[:12]}"


def slug_from_url(url):
    path = unquote(urlparse(url).path)
    name = Path(path).stem or "document"
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", name).strip("-").lower()
    return slug or "document"


def title_from_url(url):
    path = unquote(urlparse(url).path)
    return Path(path).name or url


def infer_year(title, url):
    match = re.search(r"(20\d{2})", f"{title} {url}")
    return int(match.group(1)) if match else 0


def normalize_space(value):
    return re.sub(r"\s+", " ", value).strip()


if __name__ == "__main__":
    main()
