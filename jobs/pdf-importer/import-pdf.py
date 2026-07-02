import argparse
import hashlib
import unicodedata
import json
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[2]
MIGRATION = ROOT / "migrations" / "0001_schema.sql"
DEFAULT_DB = ROOT / "work" / "iu_mcp.sqlite"
DEFAULT_PDF_DIR = ROOT / "work" / "pdf"

DEFAULT_DOCUMENT_ID = "ibaraki-eng-course-registration-2026"
DEFAULT_TITLE = "茨城大学工学部 履修要項 令和8年度入学者用（2026）"
DEFAULT_SOURCE_URL = "https://www.eng.ibaraki.ac.jp/common/education/class/2026-course-registration02.pdf"
DEFAULT_CATEGORY = "course-registration"
USER_AGENT = "Mozilla/5.0 (compatible; iu-mcp-pdf-importer/0.1; +https://mcp.uwaja.net/iu)"


def main():
    parser = argparse.ArgumentParser(description="Fetch a public academic PDF, extract text, and index chunks into SQLite.")
    parser.add_argument("--db", default=str(DEFAULT_DB))
    parser.add_argument("--source-url", default=DEFAULT_SOURCE_URL)
    parser.add_argument("--document-id", default=DEFAULT_DOCUMENT_ID)
    parser.add_argument("--title", default=DEFAULT_TITLE)
    parser.add_argument("--category", default=DEFAULT_CATEGORY)
    parser.add_argument("--academic-year", type=int, default=2026)
    parser.add_argument("--source-page-url", default="")
    parser.add_argument("--pdf-path", default="")
    parser.add_argument("--file-id", default="")
    parser.add_argument("--sha256", default="")
    parser.add_argument("--etag", default="")
    parser.add_argument("--last-modified", default="")
    parser.add_argument("--content-length", type=int, default=0)
    parser.add_argument("--pdf-dir", default=str(DEFAULT_PDF_DIR))
    parser.add_argument("--max-chars", type=int, default=1600)
    args = parser.parse_args()

    now = datetime.now(timezone.utc).isoformat()
    if args.pdf_path:
        pdf_path = Path(args.pdf_path)
        data = pdf_path.read_bytes()
    else:
        pdf_path, data, response_metadata = download_pdf(args.source_url, Path(args.pdf_dir), args.document_id)
        args.etag = args.etag or response_metadata["etag"]
        args.last_modified = args.last_modified or response_metadata["last_modified"]
        args.content_length = args.content_length or response_metadata["content_length"]
    content_sha256 = args.sha256 or sha256_hex(data)
    file_id = args.file_id or f"{args.document_id}:{content_sha256[:16]}"
    pages = extract_pages(pdf_path)
    chunks = chunk_pages(pages, args.max_chars)

    with sqlite3.connect(args.db) as conn:
        apply_schema(conn)
        replace_document(conn, args, file_id, content_sha256, len(pages), chunks, now)

    print(json.dumps({
        "ok": True,
        "fileId": file_id,
        "documentId": args.document_id,
        "title": args.title,
        "sourceUrl": args.source_url,
        "sourcePageUrl": args.source_page_url,
        "sha256": content_sha256,
        "pdfPath": str(pdf_path),
        "pages": len(pages),
        "chunks": len(chunks),
        "db": args.db
    }, ensure_ascii=False, indent=2))


def download_pdf(source_url, pdf_dir, document_id):
    pdf_dir.mkdir(parents=True, exist_ok=True)
    out_path = pdf_dir / f"{document_id}.pdf"
    request = Request(source_url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=60) as response:
        headers = response.headers
        content_type = headers.get("content-type", "")
        data = response.read()
    if not data.startswith(b"%PDF"):
        raise RuntimeError(f"Downloaded content is not a PDF: content-type={content_type}")
    out_path.write_bytes(data)
    return out_path, data, {
        "etag": headers.get("etag", ""),
        "last_modified": headers.get("last-modified", ""),
        "content_length": int(headers.get("content-length") or len(data)),
    }


def extract_pages(pdf_path):
    reader = PdfReader(str(pdf_path))
    pages = []
    for index, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        pages.append({"page": index, "text": clean_text(text)})
    return pages


def chunk_pages(pages, max_chars):
    chunks = []
    for page in pages:
        text = page["text"]
        if not text:
            continue
        heading = first_heading(text)
        for part in split_text(text, max_chars):
            chunks.append({
                "page": page["page"],
                "heading": heading,
                "text": part
            })
    return chunks


def split_text(text, max_chars):
    paragraphs = [p.strip() for p in re.split(r"\n{2,}", text) if p.strip()]
    if not paragraphs:
        return []

    chunks = []
    current = ""
    for paragraph in paragraphs:
        if len(paragraph) > max_chars:
            if current:
                chunks.append(current.strip())
                current = ""
            chunks.extend(split_long_text(paragraph, max_chars))
            continue
        candidate = f"{current}\n\n{paragraph}" if current else paragraph
        if len(candidate) > max_chars and current:
            chunks.append(current.strip())
            current = paragraph
        else:
            current = candidate
    if current:
        chunks.append(current.strip())
    return chunks


def split_long_text(text, max_chars):
    return [text[i:i + max_chars].strip() for i in range(0, len(text), max_chars) if text[i:i + max_chars].strip()]


def clean_text(text):
    text = text.replace("\x00", "")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n[ \t]+", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def first_heading(text):
    for line in text.splitlines():
        line = line.strip()
        if line:
            return line[:120]
    return ""


def normalize_text(text):
    normalized = unicodedata.normalize("NFKC", text).lower()
    collapsed = re.sub(r"\s+", " ", normalized).strip()
    compact = re.sub(r"\s+", "", normalized)
    return f"{collapsed} {compact}".strip()


def sha256_hex(data):
    return hashlib.sha256(data).hexdigest()


def apply_schema(conn):
    conn.executescript(MIGRATION.read_text(encoding="utf-8"))


def replace_document(conn, args, file_id, content_sha256, page_count, chunks, imported_at):
    old_documents = conn.execute(
        "SELECT document_id FROM pdf_documents WHERE source_url = ? OR document_id = ?",
        (args.source_url, args.document_id),
    ).fetchall()
    for row in old_documents:
        conn.execute("DELETE FROM pdf_chunks WHERE document_id = ?", (row[0],))
    conn.execute("DELETE FROM pdf_documents WHERE source_url = ? OR document_id = ?", (args.source_url, args.document_id))
    conn.execute("DELETE FROM pdf_chunks WHERE document_id = ?", (args.document_id,))
    conn.execute(
        """
        INSERT OR REPLACE INTO pdf_files (
          file_id, source_page_url, source_url, title, content_sha256, etag, last_modified,
          content_length, status, document_id, first_seen_at, last_seen_at, imported_at, missing_at
        ) VALUES (
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          'active',
          ?,
          COALESCE((SELECT first_seen_at FROM pdf_files WHERE file_id = ?), ?),
          ?,
          ?,
          NULL
        )
        """,
        (
            file_id,
            args.source_page_url or args.source_url,
            args.source_url,
            args.title,
            content_sha256,
            args.etag,
            args.last_modified,
            args.content_length,
            args.document_id,
            file_id,
            imported_at,
            imported_at,
            imported_at,
        ),
    )
    conn.execute(
        """
        INSERT INTO pdf_documents (
          document_id, title, source_url, academic_year, category, page_count, fetched_at, imported_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            args.document_id,
            args.title,
            args.source_url,
            args.academic_year,
            args.category,
            page_count,
            imported_at,
            imported_at,
        ),
    )
    for index, chunk in enumerate(chunks, start=1):
        chunk_id = f"{args.document_id}:p{chunk['page']}:c{index}"
        conn.execute(
            """
            INSERT INTO pdf_chunks (
              chunk_id, document_id, chunk_index, page_number, heading, text, text_normalized, imported_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                chunk_id,
                args.document_id,
                index,
                chunk["page"],
                chunk["heading"],
                chunk["text"],
                normalize_text(chunk["text"]),
                imported_at,
            ),
        )
    conn.commit()


if __name__ == "__main__":
    main()
