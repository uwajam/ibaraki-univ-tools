export async function searchCourses(db, args) {
  const limit = clampInt(args.limit ?? args.pageSize, 1, 50, 20);
  const query = String(args.query ?? args.keyword ?? "").trim();
  const where = [];
  const values = [];

  if (args.academicYear) {
    where.push("academic_year = ?");
    values.push(Number(args.academicYear));
  }

  if (query) {
    const like = `%${escapeLike(query)}%`;
    where.push(`(
      title LIKE ? ESCAPE '\\' OR alternate_title LIKE ? ESCAPE '\\'
      OR course_number LIKE ? ESCAPE '\\' OR timetable_code LIKE ? ESCAPE '\\'
      OR instructors LIKE ? ESCAPE '\\' OR overview LIKE ? ESCAPE '\\'
    )`);
    values.push(like, like, like, like, like, like);
  }

  if (args.courseNumberPrefix) {
    const prefix = String(args.courseNumberPrefix).toUpperCase();
    if (!/^[A-Z0-9-]{1,16}$/.test(prefix)) return [];
    where.push("(course_number LIKE ? ESCAPE '\\' OR timetable_code LIKE ? ESCAPE '\\')");
    values.push(`${escapeLike(prefix)}%`, `${escapeLike(prefix)}%`);
  }

  if (args.instructor) {
    const like = `%${escapeLike(String(args.instructor))}%`;
    where.push("(instructors LIKE ? ESCAPE '\\' OR instructors_json LIKE ? ESCAPE '\\')");
    values.push(like, like);
  }

  if (args.term) {
    where.push("term LIKE ? ESCAPE '\\'");
    values.push(`%${escapeLike(String(args.term))}%`);
  }

  if (args.day) {
    const day = normalizeDay(args.day);
    where.push("(schedule LIKE ? ESCAPE '\\' OR schedule_days_json LIKE ? ESCAPE '\\')");
    values.push(`%${escapeLike(String(args.day))}%`, `%${escapeLike(day)}%`);
  }

  if (args.period) {
    const period = String(args.period);
    if (!/^[0-9]+$/.test(period)) return [];
    where.push("(schedule LIKE ? ESCAPE '\\' OR schedule_periods_json LIKE ? ESCAPE '\\')");
    values.push(`%${escapeLike(period)}%`, `%"${period}"%`);
  }

  let sql = "SELECT * FROM courses";
  if (where.length) sql += ` WHERE ${where.join(" AND ")}`;
  sql += " ORDER BY academic_year DESC, timetable_code ASC, title ASC LIMIT ?";
  values.push(limit);

  const result = await db.prepare(sql).bind(...values).all();
  return (result.results ?? []).map(rowToSearchJson);
}

export async function getSyllabusStats(db) {
  const result = await db.prepare(`
    SELECT academic_year, COUNT(*) AS course_count
    FROM courses
    GROUP BY academic_year
    ORDER BY academic_year DESC
  `).all();

  const years = (result.results ?? []).map((row) => ({
    academicYear: row.academic_year,
    courseCount: row.course_count
  }));

  return {
    years,
    latestAcademicYear: years[0]?.academicYear ?? null,
    courseCount: years.reduce((sum, year) => sum + Number(year.courseCount ?? 0), 0)
  };
}

export async function getCourse(db, courseId) {
  const key = String(courseId ?? "");
  if (!key) return { error: "courseId is required" };

  if (key.startsWith("http://") || key.startsWith("https://")) {
    const row = await db.prepare(
      "SELECT * FROM courses WHERE url = ? OR official_url = ? OR source_url = ? LIMIT 1"
    ).bind(key, key, key).first();
    return row ? rowToCourseJson(row) : { error: `Course '${key}' was not found` };
  }

  if (key.startsWith("ibaraki:")) {
    const row = await db.prepare("SELECT * FROM courses WHERE course_id = ? LIMIT 1").bind(key).first();
    return row ? rowToCourseJson(row) : { error: `Course '${key}' was not found` };
  }

  if (/^[0-9A-Z]+_[A-Z0-9-]+$/.test(key)) {
    const row = await db.prepare("SELECT * FROM courses WHERE syllabus_id = ? LIMIT 1").bind(key).first();
    return row ? rowToCourseJson(row) : { error: `Course '${key}' was not found` };
  }

  if (/^[A-Z0-9-]+$/.test(key)) {
    const row = await db.prepare(
      "SELECT * FROM courses WHERE course_number = ? OR timetable_code = ? LIMIT 1"
    ).bind(key, key).first();
    return row ? rowToCourseJson(row) : { error: `Course '${key}' was not found` };
  }

  return { error: "Unsupported courseId format" };
}

export async function getCourseByTimetableCode(db, timetableCode, academicYear) {
  const code = String(timetableCode ?? "").toUpperCase();
  if (!/^[A-Z0-9-]{1,32}$/.test(code)) {
    return { error: "Unsupported timetableCode format" };
  }

  const values = [code, code];
  let sql = "SELECT * FROM courses WHERE (timetable_code = ? OR course_number = ?)";
  if (academicYear) {
    sql += " AND academic_year = ?";
    values.push(Number(academicYear));
  }
  sql += " ORDER BY academic_year DESC, timetable_code ASC LIMIT 1";

  const row = await db.prepare(sql).bind(...values).first();
  return row ? rowToCourseJson(row) : { error: `Course '${code}' was not found` };
}

export async function getCourseByYearAndSyllabusId(db, academicYear, syllabusId) {
  const row = await db.prepare(
    "SELECT * FROM courses WHERE academic_year = ? AND syllabus_id = ? LIMIT 1"
  ).bind(academicYear, syllabusId).first();
  return row ? rowToCourseJson(row) : { error: "course not found" };
}

function rowToSearchJson(row) {
  return {
    courseId: row.course_id,
    source: row.source,
    academicYear: row.academic_year,
    courseNumber: row.course_number ?? row.timetable_code,
    timetableCode: row.timetable_code,
    syllabusId: row.syllabus_id,
    department: row.department,
    title: row.title,
    alternateTitle: row.alternate_title,
    credits: row.credits,
    yearLevel: row.year_level,
    targetYear: row.target_year,
    term: row.term,
    schedule: row.schedule,
    scheduleDays: loadJson(row.schedule_days_json, []),
    schedulePeriods: loadJson(row.schedule_periods_json, []),
    instructors: loadJson(row.instructors_json, []),
    overview: row.overview,
    officialUrl: row.official_url ?? row.url,
    sourceUrl: row.source_url
  };
}

function rowToCourseJson(row) {
  const sections = loadJson(row.sections_json, []);
  return {
    ...rowToSearchJson(row),
    remarks: row.remarks,
    detailLanguage: row.detail_language,
    detailFetchedAt: row.detail_fetched_at,
    classScheduleDetails: extractClassScheduleDetails(sections),
    sections,
    servedFrom: row.served_from ?? "d1"
  };
}

function extractClassScheduleDetails(sections) {
  if (!Array.isArray(sections)) return [];
  const section = sections.find((value) => value?.type === "classScheduleDetails");
  return Array.isArray(section?.rows) ? section.rows : [];
}

function loadJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, match => `\\${match}`);
}

function normalizeDay(day) {
  return {
    "月": "mon",
    "火": "tue",
    "水": "wed",
    "木": "thu",
    "金": "fri",
    "土": "sat",
    "日": "sun",
    mon: "mon",
    tue: "tue",
    wed: "wed",
    thu: "thu",
    fri: "fri",
    sat: "sat",
    sun: "sun"
  }[String(day).toLowerCase()] ?? String(day).toLowerCase();
}

function clampInt(value, minimum, maximum, fallback) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(minimum, Math.min(maximum, number));
}
