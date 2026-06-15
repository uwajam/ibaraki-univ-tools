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
  const rawSections = loadJson(row.sections_json, []);
  const sections = normalizeSections(rawSections);
  return {
    ...rowToSearchJson(row),
    remarks: row.remarks,
    detailLanguage: row.detail_language,
    detailFetchedAt: row.detail_fetched_at,
    classScheduleDetails: extractClassScheduleDetails(rawSections),
    sectionMap: buildSectionMap(sections),
    sections,
    servedFrom: row.served_from ?? "d1"
  };
}

function extractClassScheduleDetails(sections) {
  if (!Array.isArray(sections)) return [];
  const section = sections.find((value) => value?.type === "classScheduleDetails");
  if (Array.isArray(section?.rows)) {
    return section.rows.map(normalizeClassScheduleDetail).filter(Boolean);
  }

  return sections.flatMap(parseLegacyClassScheduleSection).filter(Boolean);
}

function normalizeSections(sections) {
  if (!Array.isArray(sections)) return [];
  return sections
    .filter((section) => section && section.type !== "classScheduleDetails")
    .filter((section) => !isLegacyClassScheduleSection(section))
    .map((section) => ({
      heading: String(section.heading ?? "").trim(),
      content: String(section.content ?? "").trim()
    }))
    .filter((section) => section.heading && section.content);
}

function buildSectionMap(sections) {
  const result = {};
  for (const section of sections) {
    if (!result[section.heading]) result[section.heading] = section.content;
  }
  return result;
}

function normalizeClassScheduleDetail(row) {
  if (!row || typeof row !== "object") return null;
  const no = toNumberOrNull(row.no);
  const lessonNo = toNumberOrNull(row.lessonNo) ?? extractLessonNo(row.time ?? row.timeDateAndTime);
  return {
    no,
    lessonNo,
    time: cleanText(row.time ?? row.timeDateAndTime ?? ""),
    subject: cleanText(row.subject ?? splitScheduleSubject(row.subjectAndInstructorPosition ?? "").subject),
    instructors: Array.isArray(row.instructors) ? row.instructors.map(cleanText).filter(Boolean) : [],
    methodsAndContents: cleanText(row.methodsAndContents ?? ""),
    notes: cleanText(row.notes ?? ""),
    studyMinutes: {
      methods: Array.isArray(row.studyMinutes?.methods) ? row.studyMinutes.methods : parseStudyMinutes(row.methodsAndContents),
      notes: Array.isArray(row.studyMinutes?.notes) ? row.studyMinutes.notes : parseStudyMinutes(row.notes)
    },
    raw: row.raw ?? {
      no: row.no ?? "",
      time: row.time ?? row.timeDateAndTime ?? "",
      subject: row.subjectAndInstructorPosition ?? row.subject ?? "",
      methodsAndContents: row.methodsAndContents ?? "",
      notes: row.notes ?? ""
    }
  };
}

function parseLegacyClassScheduleSection(section) {
  if (!isLegacyClassScheduleSection(section)) return [];
  const heading = cleanText(section.heading);
  const content = cleanText(section.content);
  if (/^\d+$/.test(heading)) {
    const parsed = parseLegacyClassScheduleLine(`${heading} ${content}`);
    return parsed ? [parsed] : [];
  }

  return parseLegacyClassScheduleBlob(content);
}

function isLegacyClassScheduleSection(section) {
  const heading = cleanText(section?.heading);
  const content = normalizeDigits(section?.content);
  if (heading === "No." && /(?:Time|日時|Methods|学修方法|Notes|備考)/.test(content)) return true;
  return /^\d+$/.test(heading) && /^(?:第?\d+回|\d+\s+)/.test(content);
}

function parseLegacyClassScheduleBlob(content) {
  const text = normalizeDigits(cleanText(content)).replace(
    /^回（日?時?）.*?(?:備考|Notes)\s*/u,
    ""
  );
  const matches = [...text.matchAll(/(?:^|\s)(\d+)\s+((?:第?\d+回|\d+)\s+[\s\S]*?)(?=\s+\d+\s+(?:第?\d+回|\d+)\s+|$)/g)];
  return matches
    .map((match) => parseLegacyClassScheduleLine(`${match[1]} ${match[2]}`))
    .filter(Boolean);
}

function parseLegacyClassScheduleLine(line) {
  const normalized = normalizeDigits(cleanText(line));
  const match = normalized.match(/^(\d+)\s+(?:第?(\d+)回|(\d+))\s+([\s\S]+)$/);
  if (!match) return null;
  const lessonNo = match[2] ?? match[3];
  const subjectWithInstructor = extractLegacySubject(match[4]);
  const { subject, instructors } = splitScheduleSubject(subjectWithInstructor);
  return {
    no: Number(match[1]),
    lessonNo: Number(lessonNo),
    time: `第${lessonNo}回`,
    subject,
    instructors,
    methodsAndContents: "",
    notes: "",
    studyMinutes: {
      methods: parseStudyMinutes(match[4]),
      notes: []
    },
    raw: normalized
  };
}

function extractLegacySubject(value) {
  const text = cleanText(value);
  const [subject] = text.split(/(?=【|レポート|テキスト|全学教育機構|各班|課題|（約\d+時間）)/u);
  return cleanText(subject || text);
}

function splitScheduleSubject(value) {
  const text = cleanText(value);
  const match = text.match(/（担当[:：](.+?)）/u);
  if (!match) return { subject: text, instructors: [] };
  return {
    subject: cleanText(text.replace(match[0], "")),
    instructors: match[1].split(/[、,，]/u).map(cleanText).filter(Boolean)
  };
}

function extractLessonNo(value) {
  const match = cleanText(value).match(/第?(\d+)回/u);
  return match ? Number(match[1]) : null;
}

function parseStudyMinutes(value) {
  return [...cleanText(value).matchAll(/学修時間[:：]\s*(\d+)\s*分/gu)].map((match) => Number(match[1]));
}

function toNumberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeDigits(value) {
  return cleanText(value).replace(/[０-９]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0)
  );
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
