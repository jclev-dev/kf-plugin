# kf-marketing connector

Thin, **read-only** stdio MCP server that the `kf-marketing-manager` skill
uses to read coach marketing reports from the kingdom-factor app. It only
forwards three read tools to `/api/marketing/*` — it never writes to the app
or to GoHighLevel.

## Tools

| Tool | Endpoint | Purpose |
|---|---|---|
| `portfolio_summary` | `GET /api/marketing/portfolio` | Enrolled-roster overview, ranked by attention need |
| `coach_report` | `GET /api/marketing/coaches/:ref/report` | Deep dive for any one coach |
| `resolve_coach` | `GET /api/marketing/coaches/resolve` | Disambiguate a coach by name/email |

## Configuration (per machine, never committed)

The plugin's `.mcp.json` wires this server up automatically; you only set two
environment variables in your shell / Claude Code environment:

```sh
export KF_MARKETING_API_URL="https://kingdomfactor.us"
export KF_MARKETING_API_KEY="<shared agency-level marketing read key>"
```

The key is the value the kingdom-factor admin places in Rails credentials
under `api.marketing_key` (see that repo's setup notes). It is read-only and
shared (no per-user OAuth).

If either variable is missing the server starts but every tool call returns a
clear "not configured" error, and the skill's preflight stops with that
message rather than guessing.

## Runtime

- Node >= 18, **zero npm dependencies** (Node built-ins only).
- Transport: newline-delimited JSON-RPC 2.0 over stdio.

## Tests

```sh
node --test mcp/kf-marketing/server.test.mjs
```
