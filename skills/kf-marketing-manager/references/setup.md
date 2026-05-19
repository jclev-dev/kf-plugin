# Setup & Preflight

This skill reads through exactly one system: the **`kf-marketing` MCP
connector**, which forwards to the kingdom-factor app's read-only
`/api/marketing` endpoints. If it is missing or unconfigured, **stop and tell
the owner exactly what to fix — do not attempt a partial answer and never try
to reach GoHighLevel another way.**

## Preflight (do this before answering any question)

1. **Connector present?** Confirm the `kf-marketing` MCP tools are available
   (`portfolio_summary`, `coach_report`, `resolve_coach`). If they are not:

   > "I can't reach the Kingdom Factor marketing data — the `kf-marketing`
   > connector isn't available in this environment. It ships with the
   > `kingdom-factor` Claude Code plugin; install/enable that plugin, then ask
   > me again. I won't guess and I don't have any other way to read this data."

   Then stop.

2. **Connector configured?** The connector needs two environment variables
   (set per machine, never committed):
   - `KF_MARKETING_API_URL` — e.g. `https://kingdomfactor.us`
   - `KF_MARKETING_API_KEY` — the shared agency-level read key

   If a tool call returns a "not configured" error, surface it verbatim and
   stop:

   > "The `kf-marketing` connector is installed but not configured —
   > `KF_MARKETING_API_URL` and `KF_MARKETING_API_KEY` need to be set in this
   > environment. Once they are, ask me again."

3. **Auth/connectivity errors are setup gaps, not retry loops.** If a tool
   returns:
   - `HTTP 401` → the shared key is wrong/missing. Report it as a setup
     problem; do not retry.
   - `could not reach …` → the app/base URL is down or wrong. Say you cannot
     reach the data source right now and stop.
   - `HTTP 429` → rate limited; wait briefly and retry once, then report if it
     persists.
   - `HTTP 5xx` → kingdom-factor server error; report it, don't hammer.

## Why the boundary is hard

The owners cannot validate AI-driven CRM changes, so this capability is
read-only by design and deliberately has no GoHighLevel credentials of its
own. The connector is the *only* data path. "Falling back" to a direct GHL
call is not a degraded mode — it is forbidden and impossible here. Missing
connector = stop, don't improvise.

## Distribution

This skill ships inside the **`kingdom-factor` Claude Code plugin** (the
`kf-plugin` repo) and is the single source of truth. Operators install the
plugin per that repo's `README.md`; they do not hand-copy this directory. The
connector is bundled with the plugin (`.mcp.json` → `mcp/kf-marketing`); the
only per-machine step is setting the two environment variables above.
