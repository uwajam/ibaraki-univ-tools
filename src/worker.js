import { handleMcpGatewayRequest } from "../apps/gateway/src/index.js";
import { handlePdfApiRequest } from "../services/pdf/src/index.js";
import { handleSyllabusApiRequest } from "../services/syllabus/src/index.js";
import { createRouter, route } from "../packages/shared/src/router.js";
import { emptyResponse, jsonResponse, notFoundResponse } from "../packages/shared/src/http.js";

const appRoutes = [
  route(["GET", "POST", "PUT", "PATCH", "DELETE"], "/iu", (request, { env }) => handleMcpGatewayRequest(request, env)),
  route(["GET", "POST", "PUT", "PATCH", "DELETE"], "/iu/:path*", (request, { env }) => handleMcpGatewayRequest(request, env)),
  route("GET", "/health", () => jsonResponse({ ok: true, service: "iu-mcp-gateway" })),
  route(["GET", "POST", "PUT", "PATCH", "DELETE"], "/univ/ibaraki/syllabus", (request, { env }) => handleSyllabusApiRequest(request, env)),
  route(["GET", "POST", "PUT", "PATCH", "DELETE"], "/univ/ibaraki/syllabus/:path*", (request, { env }) => handleSyllabusApiRequest(request, env)),
  route(["GET", "POST", "PUT", "PATCH", "DELETE"], "/univ/ibaraki/pdf", (request, { env }) => handlePdfApiRequest(request, env)),
  route(["GET", "POST", "PUT", "PATCH", "DELETE"], "/univ/ibaraki/pdf/:path*", (request, { env }) => handlePdfApiRequest(request, env))
];

const routeWorkerRequest = createRouter(appRoutes, { notFound: notFoundResponse });

export default {
  async fetch(request, env) {
    try {
      if (request.method === "OPTIONS") {
        return emptyResponse(204);
      }
      return routeWorkerRequest(request, { env });
    } catch (error) {
      return jsonResponse({ error: "internal error", message: error.message }, 500);
    }
  }
};
