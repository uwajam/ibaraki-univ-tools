export function createRouter(routes = [], { notFound = () => jsonNotFound() } = {}) {
  return async function routeRequest(request, context = {}) {
    const url = new URL(request.url);
    for (const route of routes) {
      const match = matchRoute(route, url.pathname, request.method);
      if (!match) continue;
      return route.handler(request, context, match);
    }
    return notFound(request, context);
  };
}

export function route(methods, pattern, handler) {
  return {
    methods: normalizeMethods(methods),
    pattern: compilePattern(pattern),
    handler
  };
}

export function methodNotAllowedResponse(allow = "GET, POST, OPTIONS") {
  return new Response(null, {
    status: 405,
    headers: {
      allow,
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "accept, content-type, mcp-protocol-version, mcp-session-id"
    }
  });
}

export async function readJsonBody(request) {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}

export function argsFromSearchParams(params, numberKeys = []) {
  const numeric = new Set(numberKeys);
  const args = {};
  for (const [key, value] of params.entries()) {
    args[key] = numeric.has(key) ? Number(value) : value;
  }
  return args;
}

export function numberParam(value) {
  if (!value) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function matchRoute(route, pathname, method) {
  if (!route.methods.includes(method)) return null;
  const match = pathname.match(route.pattern.regex);
  if (!match) return null;
  const params = {};
  route.pattern.names.forEach((name, index) => {
    params[name] = decodeURIComponent(match[index + 1]);
  });
  return { params };
}

function normalizeMethods(methods) {
  return Array.isArray(methods) ? methods : [methods];
}

function compilePattern(pattern) {
  if (pattern instanceof RegExp) return { regex: pattern, names: [] };
  const names = [];
  const parts = String(pattern).split("/").map((part) => {
    if (!part.startsWith(":")) return escapeRegex(part);
    const rawName = part.slice(1);
    const catchAll = rawName.endsWith("*");
    const name = catchAll ? rawName.slice(0, -1) : rawName;
    names.push(name);
    return catchAll ? "(.+)" : "([^/]+)";
  });
  return { regex: new RegExp(`^${parts.join("/")}$`), names };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function jsonNotFound() {
  return new Response(JSON.stringify({ error: "not found" }, null, 2), {
    status: 404,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}
