import argparse
import json
import re
import sqlite3
import time
from datetime import datetime, timezone
from html.parser import HTMLParser
from http.cookiejar import CookieJar
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlencode, urljoin, urlparse
from urllib.request import HTTPCookieProcessor, HTTPRedirectHandler, Request, build_opener


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB = ROOT / "work" / "ibaraki_syllabus.sqlite"
MIGRATION = ROOT / "migrations" / "0001_schema.sql"
BASE_URL = "https://syllabus.ibaraki.ac.jp"
ENTRY_URL = f"{BASE_URL}/syllabus_ref/"
SEARCH_ACTION = f"{BASE_URL}/syllabus_ref/campussquare.do"
USER_AGENT = "Mozilla/5.0 (compatible; iu-mcp-syllabus-crawler/0.1; +https://syllabus.iu.mcp.uwaja.net)"


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class KeywordFormParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_form = False
        self.action = ""
        self.fields = {}
        self.select_name = None
        self.select_seen_option = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        tag = tag.lower()
        if tag == "form" and attrs.get("name") == "KeywordForm":
            self.in_form = True
            self.action = attrs.get("action", "")
            return
        if not self.in_form:
            return
        if tag == "input" and "name" in attrs:
            self.fields[attrs["name"]] = attrs.get("value", "")
        elif tag == "select" and "name" in attrs:
            self.select_name = attrs["name"]
            self.select_seen_option = False
            self.fields.setdefault(self.select_name, "")
        elif tag == "option" and self.select_name:
            if "selected" in attrs or not self.select_seen_option:
                self.fields[self.select_name] = attrs.get("value", "")
            self.select_seen_option = True

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag == "select":
            self.select_name = None
        elif tag == "form" and self.in_form:
            self.in_form = False


class DetailTableParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows = []
        self.current_row = None
        self.current_cell = None
        self.current_tag = None
        self.skip_depth = 0

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag in ("script", "style"):
            self.skip_depth += 1
            return
        if tag == "tr":
            self.current_row = []
        elif tag in ("th", "td") and self.current_row is not None:
            self.current_cell = []
            self.current_tag = tag
        elif tag == "br" and self.current_cell is not None:
            self.current_cell.append("\n")

    def handle_data(self, data):
        if self.skip_depth == 0 and self.current_cell is not None:
            self.current_cell.append(data)

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in ("script", "style") and self.skip_depth:
            self.skip_depth -= 1
            return
        if tag in ("th", "td") and self.current_cell is not None:
            text = normalize_text("".join(self.current_cell))
            self.current_row.append((self.current_tag, text))
            self.current_cell = None
            self.current_tag = None
        elif tag == "tr" and self.current_row is not None:
            if self.current_row:
                self.rows.append(self.current_row)
            self.current_row = None


class Crawler:
    def __init__(self, delay, page_delay):
        self.cookie_jar = CookieJar()
        self.opener = build_opener(HTTPCookieProcessor(self.cookie_jar), NoRedirect())
        self.delay = delay
        self.page_delay = page_delay

    def request(self, url, data=None, referer=None):
        headers = {
            "User-Agent": USER_AGENT,
            "Accept-Language": "ja,en;q=0.8",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }
        body = None
        if data is not None:
            body = urlencode(data).encode("utf-8")
            headers["Content-Type"] = "application/x-www-form-urlencoded"
        if referer:
            headers["Referer"] = referer
        request = Request(url, data=body, headers=headers)
        try:
            response = self.opener.open(request, timeout=45)
            html = response.read().decode("utf-8", "replace")
            return response.status, response.geturl(), dict(response.headers), html
        except HTTPError as error:
            html = error.read().decode("utf-8", "replace") if hasattr(error, "read") else ""
            return error.code, error.geturl(), dict(error.headers), html

    def follow_get(self, url, referer=None):
        for _ in range(10):
            status, current_url, headers, html = self.request(url, referer=referer)
            if status in (301, 302, 303, 307, 308) and headers.get("Location"):
                referer = current_url
                url = urljoin(current_url, headers["Location"])
                continue
            return status, current_url, html
        raise RuntimeError("Too many redirects while opening syllabus search")

    def open_search_form(self):
        status, url, html = self.follow_get(ENTRY_URL)
        if status != 200 or "_flowExecutionKey" not in html:
            raise RuntimeError(f"Could not open search form: status={status} url={url}")
        parser = KeywordFormParser()
        parser.feed(html)
        if not parser.fields.get("_flowExecutionKey"):
            raise RuntimeError("Search form did not include _flowExecutionKey")
        return url, parser.action or "/syllabus_ref/campussquare.do", parser.fields

    def search(self, year, display_count, filters):
        form_url, action, fields = self.open_search_form()
        fields.update(
            {
                "_eventId": "search",
                "nendo": str(year),
                "_displayCount": str(display_count),
                "kaikoKbnCd": "",
                "jikanwariShozokuCd": "",
                "gakunen": "",
                "yobi": "",
                "jigen": "",
                "jikanwariCd": "",
                "numberingCd": "",
                "kaikoKeitaiCd": "",
                "kaikoKamokuNm": "",
                "kyokanNm": "",
                "freeWord": "",
            }
        )
        fields.update({key: value for key, value in filters.items() if value is not None})
        target = urljoin(form_url, action)
        status, post_url, headers, html = self.request(target, fields, referer=form_url)
        if status in (301, 302, 303, 307, 308) and headers.get("Location"):
            status, result_url, html = self.follow_get(urljoin(post_url, headers["Location"]), referer=post_url)
        else:
            result_url = post_url
        if status != 200 or "SYSTEM ERROR" in html:
            raise RuntimeError(f"Search failed: status={status} url={result_url}")
        return result_url, html

    def fetch_detail(self, url, retries=3, retry_delay=5.0):
        last_error = None
        for attempt in range(retries + 1):
            status, final_url, html = self.follow_get(url)
            if status == 200 and "SYSTEM ERROR" not in html:
                return final_url, html
            last_error = f"Detail fetch failed: status={status} url={final_url}"
            if attempt < retries and retry_delay > 0:
                time.sleep(retry_delay * (attempt + 1))
        raise RuntimeError(last_error)


def main():
    parser = argparse.ArgumentParser(description="Crawl Ibaraki University static syllabus pages into SQLite.")
    parser.add_argument("--year", type=int, default=datetime.now().year)
    parser.add_argument("--db", default=str(DEFAULT_DB))
    parser.add_argument("--display-count", type=int, default=100)
    parser.add_argument("--start-page", type=int, default=1)
    parser.add_argument("--end-page", type=int, default=0)
    parser.add_argument("--max-pages", type=int, default=0)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--delay", type=float, default=1.5)
    parser.add_argument("--page-delay", type=float, default=2.0)
    parser.add_argument("--detail-retries", type=int, default=3)
    parser.add_argument("--retry-delay", type=float, default=5.0)
    parser.add_argument("--max-detail-errors", type=int, default=50)
    parser.add_argument("--fail-on-detail-error", action="store_true")
    parser.add_argument("--refresh", action="store_true")
    parser.add_argument("--free-word", default="")
    parser.add_argument("--course-name", default="")
    parser.add_argument("--instructor", default="")
    args = parser.parse_args()

    db_path = Path(args.db)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        ensure_schema(conn)
        crawler = Crawler(delay=args.delay, page_delay=args.page_delay)
        filters = {
            "freeWord": args.free_word,
            "kaikoKamokuNm": args.course_name,
            "kyokanNm": args.instructor,
        }
        result_url, html = crawler.search(args.year, args.display_count, filters)
        total_discovered = 0
        fetched = 0
        skipped = 0
        detail_errors = 0
        page = 1
        current_url = result_url

        while True:
            if page >= args.start_page:
                urls = extract_static_urls(html)
                total_discovered += len(urls)
                print(json.dumps({"page": page, "urls": len(urls), "url": current_url}, ensure_ascii=False))
                for url in urls:
                    if args.limit and fetched >= args.limit:
                        break
                    if not args.refresh and course_exists(conn, url):
                        skipped += 1
                        continue
                    try:
                        final_url, detail_html = crawler.fetch_detail(
                            url,
                            retries=args.detail_retries,
                            retry_delay=args.retry_delay
                        )
                    except RuntimeError as error:
                        detail_errors += 1
                        print(json.dumps({
                            "level": "warning",
                            "event": "detail_fetch_failed",
                            "page": page,
                            "url": url,
                            "error": str(error)
                        }, ensure_ascii=False))
                        if args.fail_on_detail_error:
                            raise
                        if args.max_detail_errors and detail_errors > args.max_detail_errors:
                            raise RuntimeError(f"Too many detail fetch errors: {detail_errors}") from error
                        continue
                    row = parse_course(final_url, args.year, detail_html)
                    upsert_course(conn, row)
                    fetched += 1
                    if args.delay > 0:
                        time.sleep(args.delay)
                conn.commit()
            if args.limit and fetched >= args.limit:
                break
            if args.end_page and page >= args.end_page:
                break
            if args.max_pages and page >= args.max_pages:
                break
            next_url = extract_next_page_url(html)
            if not next_url:
                break
            page += 1
            current_url = next_url
            if args.page_delay > 0:
                time.sleep(args.page_delay)
            status, current_url, html = crawler.follow_get(next_url)
            if status != 200 or "SYSTEM ERROR" in html:
                raise RuntimeError(f"Paging failed: status={status} url={current_url}")

    print(json.dumps({
        "ok": True,
        "db": str(db_path),
        "discovered": total_discovered,
        "fetched": fetched,
        "skipped": skipped,
        "detailErrors": detail_errors
    }, ensure_ascii=False, indent=2))


def ensure_schema(conn):
    conn.executescript(MIGRATION.read_text(encoding="utf-8"))


def extract_static_urls(html):
    urls = []
    seen = set()
    pattern = r"(?:https://syllabus\.ibaraki\.ac\.jp)?/syllabus/20\d{2}/[^\"'<> \t\r\n]+_ja_JP\.html"
    for match in re.findall(pattern, html):
        url = urljoin(BASE_URL, match)
        if url not in seen:
            seen.add(url)
            urls.append(url)
    return urls


def extract_next_page_url(html):
    match = re.search(r'<a\s+href="([^"]+)">\s*次へ(?:&nbsp;|\s)*&gt;&gt;\s*</a>', html)
    if not match:
        return None
    return urljoin(BASE_URL, match.group(1).replace("&amp;", "&"))


def course_exists(conn, url):
    return conn.execute("SELECT 1 FROM courses WHERE url = ? LIMIT 1", (url,)).fetchone() is not None


def parse_course(url, fallback_year, html):
    parser = DetailTableParser()
    parser.feed(html)
    fields = {}
    sections = []
    class_schedule_details = extract_class_schedule_details(parser.rows)
    for row in parser.rows:
        header = next((text for tag, text in row if tag == "th"), "")
        value = "\n".join(text for tag, text in row if tag == "td").strip()
        if not header or not value:
            continue
        key = normalize_heading(header)
        fields[key] = value
        sections.append({"heading": key, "content": value})
    if class_schedule_details:
        sections.append({
            "heading": "授業計画詳細情報",
            "type": "classScheduleDetails",
            "rows": class_schedule_details,
        })

    parsed = urlparse(url)
    parts = parsed.path.split("/")
    year = int(parts[2]) if len(parts) > 3 and parts[2].isdigit() else fallback_year
    syllabus_id = Path(parsed.path).name.replace("_ja_JP.html", "")

    title, alternate_title = split_bilingual(fields.get("開講科目名", ""))
    timetable_code = fields.get("時間割コード") or infer_course_number(syllabus_id)
    instructors = split_people(fields.get("担当教員（ローマ字表記）", "") or fields.get("担当教員", ""))
    schedule = normalize_schedule(fields.get("開講曜日・時限", ""))
    days, periods = parse_schedule(schedule)
    fetched_at = datetime.now(timezone.utc).isoformat()

    return {
        "url": url,
        "course_id": f"ibaraki:{year}:{syllabus_id}",
        "source": "ibaraki",
        "academic_year": year,
        "course_number": timetable_code,
        "syllabus_id": syllabus_id,
        "department": split_bilingual(fields.get("開講所属", ""))[0],
        "timetable_code": timetable_code,
        "numbering": fields.get("ナンバリング"),
        "title": title,
        "alternate_title": alternate_title,
        "instructors": ", ".join(instructors),
        "instructors_json": json.dumps(instructors, ensure_ascii=False),
        "credits": parse_float(fields.get("単位数")),
        "year_level": normalize_year_level(fields.get("対象学年", "")),
        "term": split_bilingual(fields.get("開講区分", ""))[0],
        "schedule": schedule,
        "schedule_days_json": json.dumps(days, ensure_ascii=False),
        "schedule_periods_json": json.dumps(periods, ensure_ascii=False),
        "target_year": fields.get("対象学生所属") or fields.get("対象学年"),
        "overview": fields.get("授業の概要"),
        "remarks": fields.get("備考") or fields.get("その他") or fields.get("履修上の注意"),
        "official_url": url,
        "source_url": SEARCH_ACTION,
        "detail_language": "ja_JP",
        "detail_fields_json": json.dumps(fields, ensure_ascii=False),
        "sections_json": json.dumps(sections, ensure_ascii=False),
        "html_r2_key": None,
        "served_from": "github-actions/static",
        "detail_fetched_at": fetched_at,
        "fetched_at": fetched_at,
    }


def upsert_course(conn, row):
    columns = list(row.keys())
    placeholders = ", ".join("?" for _ in columns)
    updates = ", ".join(f"{column}=excluded.{column}" for column in columns if column != "url")
    conn.execute(
        f"INSERT INTO courses ({', '.join(columns)}) VALUES ({placeholders}) "
        f"ON CONFLICT(url) DO UPDATE SET {updates}",
        [row[column] for column in columns],
    )


def extract_class_schedule_details(rows):
    details = []
    in_schedule_table = False
    for row in rows:
        cells = [text for _tag, text in row]
        if not cells:
            continue
        header_text = " ".join(cells)
        if any(tag == "th" for tag, _text in row):
            in_schedule_table = (
                "No." in header_text
                and ("Time" in header_text or "日時" in header_text)
                and ("Methods" in header_text or "学修方法" in header_text)
            )
            continue
        if not in_schedule_table:
            continue
        td_values = [text for tag, text in row if tag == "td"]
        if len(td_values) < 5:
            continue
        details.append({
            "no": td_values[0],
            "timeDateAndTime": td_values[1],
            "subjectAndInstructorPosition": td_values[2],
            "methodsAndContents": td_values[3],
            "notes": td_values[4],
        })
    return details


def normalize_text(value):
    value = re.sub(r"[ \t\r\f\v]+", " ", value)
    value = re.sub(r" *\n *", "\n", value)
    value = re.sub(r"\n{2,}", "\n", value)
    return value.strip()


def normalize_heading(value):
    value = normalize_text(value).replace("\n", " ")
    value = re.split(r"\s*／\s*", value, maxsplit=1)[0]
    return value.strip()


def split_bilingual(value):
    value = normalize_text(value).replace("\n", " ")
    if "／" in value:
        left, right = value.split("／", 1)
        return left.strip(), right.strip()
    return value.strip(), None


def split_people(value):
    raw = normalize_text(value)
    people = []
    for part in re.split(r"[\n,，]+", raw):
        name, _latin = split_bilingual(part)
        name = re.sub(r"\s+", " ", name).strip()
        if name:
            people.append(name)
    return people


def infer_course_number(syllabus_id):
    return syllabus_id.split("_", 1)[1] if "_" in syllabus_id else syllabus_id


def parse_float(value):
    if not value:
        return None
    match = re.search(r"\d+(?:\.\d+)?", value)
    return float(match.group(0)) if match else None


def normalize_year_level(value):
    if not value:
        return None
    years = re.findall(r"\d+", value)
    return ",".join(years) if years else normalize_text(value)


def normalize_schedule(value):
    value = normalize_text(value)
    if not value:
        return None
    value = re.sub(r"／[A-Za-z.]+", "", value)
    value = value.replace("　", " ")
    value = re.sub(r"\s+", "", value)
    return value or None


def parse_schedule(schedule):
    if not schedule:
        return [], []
    day_map = {"月": "mon", "火": "tue", "水": "wed", "木": "thu", "金": "fri", "土": "sat", "日": "sun"}
    days = []
    periods = []
    for char in schedule:
        if char in day_map and day_map[char] not in days:
            days.append(day_map[char])
    for period in re.findall(r"\d+", schedule):
        if period not in periods:
            periods.append(period)
    return days, periods


if __name__ == "__main__":
    main()
