#!/usr/bin/env node
// Thin, read-only stdio MCP connector for the kf-marketing-manager skill.
//
// It forwards three READ tools to the kingdom-factor app's
// /api/marketing/* endpoints, holding the shared X-API-Key. It NEVER
// exposes a write/mutating tool — read & advise only, by design. All
// HTTP errors (401/404/300/429/5xx) are surfaced as explicit tool
// errors; nothing is swallowed.
//
// Transport: newline-delimited JSON-RPC 2.0 over stdio (MCP stdio
// transport). Zero npm dependencies — Node >= 18 built-ins only.
//
// Config (environment, never committed):
//   KF_MARKETING_API_URL  e.g. https://kingdomfactor.us
//   KF_MARKETING_API_KEY  the shared agency-level read key

const PROTOCOL_VERSION = "2025-06-18";
const SERVER_INFO = { name: "kf-marketing", version: "0.1.0" };

// ---- Tool surface (READ ONLY) ------------------------------------------

export const TOOLS = [
  {
    name: "portfolio_summary",
    description:
      "Marketing overview for the enrolled coach roster (marketing-program coaches only), ranked by who needs attention. Use for 'how's everyone doing', 'which coaches are slipping'. Read-only.",
    inputSchema: {
      type: "object",
      properties: {
        days: { type: "number", description: "Window length in days (default 30)." },
        start_date: { type: "string", description: "ISO date (optional, overrides days)." },
        end_date: { type: "string", description: "ISO date (optional)." },
      },
    },
  },
  {
    name: "coach_report",
    description:
      "Deep-dive marketing report for ONE coach (any coach, enrolled or not): outreach, pipeline movement, pipeline health, attention. Use for 'how's <coach> doing'. Read-only.",
    inputSchema: {
      type: "object",
      properties: {
        coach_ref: {
          type: "string",
          description: "Account id or a unique name/email fragment for the coach.",
        },
        days: { type: "number", description: "Window length in days (default 30)." },
        start_date: { type: "string", description: "ISO date (optional, overrides days)." },
        end_date: { type: "string", description: "ISO date (optional)." },
      },
      required: ["coach_ref"],
    },
  },
  {
    name: "resolve_coach",
    description:
      "Disambiguate a coach by name/email fragment — returns matching coaches so you can ask which one. Read-only.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Name or email fragment to search." },
      },
      required: ["query"],
    },
  },
];

// ---- Pure helpers (unit-tested) ----------------------------------------

export function readConfig(env = process.env) {
  const baseUrl = (env.KF_MARKETING_API_URL || "").trim().replace(/\/+$/, "");
  const apiKey = (env.KF_MARKETING_API_KEY || "").trim();
  return { baseUrl, apiKey };
}

export class ConfigError extends Error {}

function requireConfig(cfg) {
  if (!cfg.baseUrl || !cfg.apiKey) {
    throw new ConfigError(
      "kf-marketing connector is not configured. Set KF_MARKETING_API_URL and " +
        "KF_MARKETING_API_KEY in the environment before using this skill."
    );
  }
}

function withWindow(params, args) {
  if (args.days != null) params.set("days", String(args.days));
  if (args.start_date) params.set("start_date", String(args.start_date));
  if (args.end_date) params.set("end_date", String(args.end_date));
}

// Maps a tool call to a concrete HTTP request against the app endpoints.
export function buildHttpRequest(toolName, args = {}, cfg) {
  requireConfig(cfg);
  const headers = { "X-API-Key": cfg.apiKey, Accept: "application/json" };

  switch (toolName) {
    case "portfolio_summary": {
      const params = new URLSearchParams();
      withWindow(params, args);
      const qs = params.toString();
      return {
        method: "GET",
        url: `${cfg.baseUrl}/api/marketing/portfolio${qs ? `?${qs}` : ""}`,
        headers,
      };
    }
    case "coach_report": {
      if (!args.coach_ref) throw new Error("coach_ref is required");
      const params = new URLSearchParams();
      withWindow(params, args);
      const qs = params.toString();
      const ref = encodeURIComponent(String(args.coach_ref));
      return {
        method: "GET",
        url: `${cfg.baseUrl}/api/marketing/coaches/${ref}/report${qs ? `?${qs}` : ""}`,
        headers,
      };
    }
    case "resolve_coach": {
      if (!args.query) throw new Error("query is required");
      const params = new URLSearchParams({ query: String(args.query) });
      return {
        method: "GET",
        url: `${cfg.baseUrl}/api/marketing/coaches/resolve?${params.toString()}`,
        headers,
      };
    }
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// Turns an HTTP response into an MCP tool result. Non-2xx is surfaced as an
// explicit error result (isError) with the status — never swallowed.
export function toToolResult(status, bodyText) {
  if (status >= 200 && status < 300) {
    return { content: [{ type: "text", text: bodyText }] };
  }

  const hint =
    status === 401
      ? " (check KF_MARKETING_API_KEY)"
      : status === 404
        ? " (no such coach)"
        : status === 300
          ? " (ambiguous coach — call resolve_coach and ask which one)"
          : status === 429
            ? " (rate limited — wait and retry)"
            : status >= 500
              ? " (kingdom-factor server error)"
              : "";

  return {
    isError: true,
    content: [
      {
        type: "text",
        text: `kf-marketing request failed: HTTP ${status}${hint}\n${bodyText}`,
      },
    ],
  };
}

// Executes a tool call end-to-end. `fetchImpl` is injectable for tests.
export async function callTool(toolName, args, cfg, fetchImpl = fetch) {
  let req;
  try {
    req = buildHttpRequest(toolName, args, cfg);
  } catch (e) {
    return {
      isError: true,
      content: [{ type: "text", text: e.message }],
    };
  }

  let res;
  try {
    res = await fetchImpl(req.url, { method: req.method, headers: req.headers });
  } catch (e) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `kf-marketing could not reach ${req.url}: ${e.message}`,
        },
      ],
    };
  }

  const text = await res.text();
  return toToolResult(res.status, text);
}

// ---- JSON-RPC dispatch -------------------------------------------------

export async function handleMessage(msg, cfg, fetchImpl = fetch) {
  const { id, method, params } = msg;

  // Notifications (no id) get no response.
  if (id === undefined || id === null) return null;

  try {
    switch (method) {
      case "initialize":
        return {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: params?.protocolVersion || PROTOCOL_VERSION,
            capabilities: { tools: {} },
            serverInfo: SERVER_INFO,
          },
        };
      case "ping":
        return { jsonrpc: "2.0", id, result: {} };
      case "tools/list":
        return { jsonrpc: "2.0", id, result: { tools: TOOLS } };
      case "tools/call": {
        const result = await callTool(
          params?.name,
          params?.arguments || {},
          cfg,
          fetchImpl
        );
        return { jsonrpc: "2.0", id, result };
      }
      default:
        return {
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Method not found: ${method}` },
        };
    }
  } catch (e) {
    return {
      jsonrpc: "2.0",
      id,
      error: { code: -32603, message: `Internal error: ${e.message}` },
    };
  }
}

// ---- stdio main --------------------------------------------------------

function main() {
  const cfg = readConfig();
  if (!cfg.baseUrl || !cfg.apiKey) {
    process.stderr.write(
      "[kf-marketing] WARNING: KF_MARKETING_API_URL / KF_MARKETING_API_KEY " +
        "not set — tool calls will return a configuration error until they are.\n"
    );
  }

  let buffer = "";
  process.stdin.setEncoding("utf8");

  process.stdin.on("data", async (chunk) => {
    buffer += chunk;
    let nl;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;

      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        continue; // ignore unparseable lines
      }

      const response = await handleMessage(msg, readConfig(), fetch);
      if (response) process.stdout.write(JSON.stringify(response) + "\n");
    }
  });

  process.stdin.on("end", () => process.exit(0));
}

// Run only when executed directly (not when imported by tests).
if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("server.mjs")
) {
  main();
}
