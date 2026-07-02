import { emptyResponse, jsonResponse, rpcError, rpcResult } from "../../../packages/shared/src/http.js";
import { methodNotAllowedResponse } from "../../../packages/shared/src/router.js";
import { handlePdfApiRequest, pdfApiBasePath, pdfToolDefinitions } from "../../../services/pdf/src/index.js";
import { handleSyllabusApiRequest, syllabusApiBasePath, syllabusToolDefinitions } from "../../../services/syllabus/src/index.js";

const SERVER_INFO = {
  name: "iu-mcp-gateway",
  version: "0.2.0"
};

const SUPPORTED_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

const SERVICE_CLIENTS = {
  [`${syllabusApiBasePath}/`]: {
    baseUrlEnv: "SYLLABUS_API_BASE_URL",
    handler: handleSyllabusApiRequest,
    errorLabel: "syllabus api error"
  },
  [`${pdfApiBasePath}/`]: {
    baseUrlEnv: "PDF_API_BASE_URL",
    handler: handlePdfApiRequest,
    errorLabel: "pdf api error"
  }
};

const TOOL_DEFINITIONS = [...syllabusToolDefinitions, ...pdfToolDefinitions];
const TOOL_HANDLERS = new Map(TOOL_DEFINITIONS.map(({ call, ...tool }) => [tool.name, { tool, call }]));
const TOOLS = TOOL_DEFINITIONS.map(({ call: _call, ...tool }) => tool);

export async function handleMcpGatewayRequest(request, env) {
  if (request.method !== "POST") {
    return methodNotAllowedResponse("POST, OPTIONS");
  }

  let message;
  try {
    message = await request.json();
  } catch {
    return jsonResponse(rpcError(null, -32700, "Parse error"), 400);
  }

  const response = await handleMcpMessage(message, request, env);
  return response instanceof Response ? response : jsonResponse(response);
}

async function handleMcpMessage(message, request, env) {
  if (!message || typeof message !== "object") {
    return rpcError(null, -32600, "Invalid Request");
  }

  if (!("method" in message)) {
    return acceptedResponse();
  }

  const id = message.id ?? null;
  const method = message.method;
  const params = message.params ?? {};
  const isNotification = !("id" in message);

  if (method === "initialize") {
    const requestedVersion = params.protocolVersion;
    const protocolVersion = SUPPORTED_PROTOCOL_VERSIONS.includes(requestedVersion)
      ? requestedVersion
      : SUPPORTED_PROTOCOL_VERSIONS[0];
    return rpcResult(id, {
      protocolVersion,
      capabilities: { tools: { listChanged: false } },
      serverInfo: SERVER_INFO
    });
  }

  if (method === "notifications/initialized" || isNotification) {
    return acceptedResponse();
  }

  if (method === "tools/list") {
    return rpcResult(id, { tools: TOOLS });
  }

  if (method === "tools/call") {
    const result = await callTool(params.name, params.arguments ?? {}, request, env);
    if (result?.__rpcError) {
      return rpcError(id, -32602, result.message);
    }
    return rpcResult(id, {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
    });
  }

  return rpcError(id, -32601, `Unsupported method: ${method}`);
}

async function callTool(name, args, request, env) {
  const definition = TOOL_HANDLERS.get(name);
  if (!definition) return { __rpcError: true, message: `Unknown tool: ${name}` };

  const call = definition.call(args);
  if (call.error) return call;
  return callServiceApi(request, env, call.path, call.init ?? {});
}

async function callServiceApi(request, env, path, init = {}) {
  const service = findServiceClient(path);
  if (!service) return { error: `No service is registered for ${path}` };

  const baseUrl = env[service.baseUrlEnv];
  if (!baseUrl) {
    return callInternalApi(request, env, path, init, service.handler, service.errorLabel);
  }

  const url = new URL(baseUrl || request.url);
  url.pathname = path;
  url.search = "";

  const response = await fetch(url.toString(), buildApiRequestInit(init));
  const result = await response.json();
  return response.ok ? result : { error: result.error ?? service.errorLabel, status: response.status };
}

function findServiceClient(path) {
  return Object.entries(SERVICE_CLIENTS).find(([prefix]) => path.startsWith(prefix))?.[1];
}

async function callInternalApi(request, env, path, init, handler, errorLabel) {
  const url = new URL(request.url);
  url.pathname = path;
  url.search = "";

  const apiRequest = new Request(url.toString(), buildApiRequestInit(init));
  const response = await handler(apiRequest, env);
  const result = await response.json();
  return response.ok ? result : { error: result.error ?? errorLabel, status: response.status };
}

function buildApiRequestInit(init) {
  return {
    method: init.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {})
    },
    body: init.body
  };
}

function acceptedResponse() {
  return emptyResponse(202);
}
