// Run: node --test mcp/kf-marketing/server.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TOOLS,
  readConfig,
  buildHttpRequest,
  toToolResult,
  callTool,
  handleMessage,
} from "./server.mjs";

const CFG = { baseUrl: "https://kf.test", apiKey: "secret" };

function fakeFetch(status, body) {
  return async () => ({ status, text: async () => body });
}

test("only three read tools are registered; no write tool exists", () => {
  const names = TOOLS.map((t) => t.name).sort();
  assert.deepEqual(names, ["coach_report", "portfolio_summary", "resolve_coach"]);
  const all = JSON.stringify(TOOLS).toLowerCase();
  for (const verb of ["create", "update", "delete", "write", "move", "push"]) {
    assert.ok(!all.includes(`"${verb}`), `no ${verb} tool`);
  }
});

test("readConfig trims and strips trailing slashes", () => {
  const cfg = readConfig({
    KF_MARKETING_API_URL: " https://kf.test/ ",
    KF_MARKETING_API_KEY: " k ",
  });
  assert.equal(cfg.baseUrl, "https://kf.test");
  assert.equal(cfg.apiKey, "k");
});

test("portfolio_summary maps to the portfolio endpoint with window params", () => {
  const r = buildHttpRequest("portfolio_summary", { days: 60 }, CFG);
  assert.equal(r.method, "GET");
  assert.equal(r.url, "https://kf.test/api/marketing/portfolio?days=60");
  assert.equal(r.headers["X-API-Key"], "secret");
});

test("coach_report URL-encodes the coach ref", () => {
  const r = buildHttpRequest("coach_report", { coach_ref: "Mark Clevenger" }, CFG);
  assert.equal(
    r.url,
    "https://kf.test/api/marketing/coaches/Mark%20Clevenger/report"
  );
});

test("resolve_coach maps to the resolve endpoint", () => {
  const r = buildHttpRequest("resolve_coach", { query: "mark" }, CFG);
  assert.equal(r.url, "https://kf.test/api/marketing/coaches/resolve?query=mark");
});

test("missing config raises a clear, actionable error via callTool", async () => {
  const res = await callTool("portfolio_summary", {}, { baseUrl: "", apiKey: "" });
  assert.equal(res.isError, true);
  assert.match(res.content[0].text, /not configured/);
});

test("2xx returns the body as a normal tool result", async () => {
  const res = await callTool("portfolio_summary", {}, CFG, fakeFetch(200, '{"ok":1}'));
  assert.equal(res.isError, undefined);
  assert.equal(res.content[0].text, '{"ok":1}');
});

test("401/404/429/5xx are surfaced as explicit errors, not swallowed", async () => {
  for (const [status, needle] of [
    [401, /KF_MARKETING_API_KEY/],
    [404, /no such coach/],
    [429, /rate limited/],
    [500, /server error/],
  ]) {
    const res = await callTool(
      "coach_report",
      { coach_ref: "1" },
      CFG,
      fakeFetch(status, "boom")
    );
    assert.equal(res.isError, true, `status ${status} is an error`);
    assert.match(res.content[0].text, needle);
    assert.match(res.content[0].text, new RegExp(`HTTP ${status}`));
  }
});

test("300 ambiguous tells the caller to resolve_coach", () => {
  const res = toToolResult(300, '{"matches":[]}');
  assert.equal(res.isError, true);
  assert.match(res.content[0].text, /resolve_coach/);
});

test("network failure is reported, not swallowed", async () => {
  const boom = async () => {
    throw new Error("ECONNREFUSED");
  };
  const res = await callTool("portfolio_summary", {}, CFG, boom);
  assert.equal(res.isError, true);
  assert.match(res.content[0].text, /could not reach/);
});

test("initialize handshake echoes protocol + advertises tools capability", async () => {
  const resp = await handleMessage(
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } },
    CFG
  );
  assert.equal(resp.result.protocolVersion, "2025-06-18");
  assert.deepEqual(resp.result.capabilities, { tools: {} });
  assert.equal(resp.result.serverInfo.name, "kf-marketing");
});

test("tools/list returns the three read tools", async () => {
  const resp = await handleMessage({ jsonrpc: "2.0", id: 2, method: "tools/list" }, CFG);
  assert.equal(resp.result.tools.length, 3);
});

test("notifications (no id) get no response", async () => {
  const resp = await handleMessage(
    { jsonrpc: "2.0", method: "notifications/initialized" },
    CFG
  );
  assert.equal(resp, null);
});

test("unknown method returns JSON-RPC method-not-found", async () => {
  const resp = await handleMessage({ jsonrpc: "2.0", id: 3, method: "bogus" }, CFG);
  assert.equal(resp.error.code, -32601);
});

test("tools/call routes through to the endpoint", async () => {
  const resp = await handleMessage(
    {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "resolve_coach", arguments: { query: "mark" } },
    },
    CFG,
    fakeFetch(200, '{"match_count":1}')
  );
  assert.equal(resp.result.content[0].text, '{"match_count":1}');
});
