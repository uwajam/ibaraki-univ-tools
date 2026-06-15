import { jsonResponse } from "../../../packages/shared/src/http.js";
import { argsFromSearchParams, createRouter, methodNotAllowedResponse, readJsonBody, route } from "../../../packages/shared/src/router.js";
import { getPdfStats, searchDocuments } from "./repository.js";

export const pdfApiBasePath = "/api/pdf";

export const pdfToolDefinitions = [
  {
    name: "pdf.search_documents",
    description: "Search indexed public Ibaraki University academic PDF document chunks.",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string" },
        query: { type: "string" },
        queries: { type: "array", items: { type: "string" } },
        documentId: { type: "string" },
        academicYear: { type: "integer" },
        includeToc: { type: "boolean" },
        mode: { type: "string", enum: ["hybrid", "keyword"] },
        limit: { type: "integer", minimum: 1, maximum: 20 }
      }
    },
    call: (args) => ({ path: `${pdfApiBasePath}/search`, init: { method: "POST", body: JSON.stringify(args) } })
  }
];

export const pdfApiRoutes = [
  route("GET", `${pdfApiBasePath}/health`, async (_request, { env }) => {
    return jsonResponse({ ok: true, service: "iu-pdf-service", ...(await getPdfStats(env.DB)) });
  }),
  route("GET", `${pdfApiBasePath}/search`, async (request, { env }) => {
    const url = new URL(request.url);
    return jsonResponse(await searchDocuments(env.DB, argsFromSearchParams(url.searchParams, ["academicYear", "limit"])));
  }),
  route("POST", `${pdfApiBasePath}/search`, async (request, { env }) => {
    return jsonResponse(await searchDocuments(env.DB, await readJsonBody(request)));
  }),
  route(["PUT", "PATCH", "DELETE"], `${pdfApiBasePath}/search`, () => methodNotAllowedResponse("GET, POST, OPTIONS"))
];

const routePdfApiRequest = createRouter(pdfApiRoutes);

export async function handlePdfApiRequest(request, env) {
  return routePdfApiRequest(request, { env });
}
