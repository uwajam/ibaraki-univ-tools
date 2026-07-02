import { jsonResponse } from "../../../packages/shared/src/http.js";
import {
  argsFromSearchParams,
  createRouter,
  methodNotAllowedResponse,
  numberParam,
  readJsonBody,
  route
} from "../../../packages/shared/src/router.js";
import {
  getCourse,
  getCourseByTimetableCode,
  getCourseByYearAndSyllabusId,
  getSyllabusStats,
  searchCourses
} from "./repository.js";

export const syllabusApiBasePath = "/univ/ibaraki/syllabus";

export const syllabusToolDefinitions = [
  {
    name: "syllabus.search_courses",
    description: "Search cached Ibaraki University syllabus courses via the syllabus API.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        keyword: { type: "string" },
        academicYear: { type: "integer" },
        instructor: { type: "string" },
        term: { type: "string" },
        day: { type: "string" },
        period: { type: "string" },
        courseNumberPrefix: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 50 }
      }
    },
    call: (args) => ({ path: `${syllabusApiBasePath}/search`, init: { method: "POST", body: JSON.stringify(args) } })
  },
  {
    name: "syllabus.get_course",
    description: "Get a cached Ibaraki University syllabus course by courseId, syllabusId, course number, timetable code, or official URL.",
    inputSchema: {
      type: "object",
      properties: { courseId: { type: "string" } },
      required: ["courseId"]
    },
    call: (args) => {
      const courseId = String(args.courseId ?? "");
      if (!courseId) return { error: "courseId is required" };
      return { path: `${syllabusApiBasePath}/courses/${encodeURIComponent(courseId)}` };
    }
  }
];

export const syllabusApiRoutes = [
  route("GET", `${syllabusApiBasePath}/health`, async (_request, { env }) => {
    return jsonResponse({ ok: true, service: "iu-syllabus-service", ...(await getSyllabusStats(env.DB)) });
  }),
  route("GET", `${syllabusApiBasePath}/search`, async (request, { env }) => {
    const url = new URL(request.url);
    return jsonResponse(await searchCourses(env.DB, argsFromSearchParams(url.searchParams, ["academicYear", "limit"])));
  }),
  route("POST", `${syllabusApiBasePath}/search`, async (request, { env }) => {
    return jsonResponse(await searchCourses(env.DB, await readJsonBody(request)));
  }),
  route(["PUT", "PATCH", "DELETE"], `${syllabusApiBasePath}/search`, () => methodNotAllowedResponse("GET, POST, OPTIONS")),
  route("GET", `${syllabusApiBasePath}/timetable-codes/:timetableCode`, async (request, { env }, { params }) => {
    const url = new URL(request.url);
    const result = await getCourseByTimetableCode(env.DB, params.timetableCode, numberParam(url.searchParams.get("academicYear")));
    return jsonResponse(result, result.error ? 404 : 200);
  }),
  route("GET", `${syllabusApiBasePath}/courses/:key*`, async (request, { env }, { params }) => {
    const url = new URL(request.url);
    const key = params.key;
    const yearAndSyllabus = key.match(/^(20\d{2})\/([0-9A-Z]+_[A-Z0-9-]+)$/);
    const result = yearAndSyllabus
      ? await getCourseByYearAndSyllabusId(env.DB, Number(yearAndSyllabus[1]), yearAndSyllabus[2])
      : /^[A-Za-z0-9-]+$/.test(key) && url.searchParams.has("academicYear")
        ? await getCourseByTimetableCode(env.DB, key, numberParam(url.searchParams.get("academicYear")))
        : await getCourse(env.DB, key);
    return jsonResponse(result, result.error ? 404 : 200);
  })
];

const routeSyllabusApiRequest = createRouter(syllabusApiRoutes);

export async function handleSyllabusApiRequest(request, env) {
  return routeSyllabusApiRequest(request, { env });
}
