# Setup & Preflight

This skill reads through exactly one system: the **`kingdom-factor` remote
MCP connector** — a hosted endpoint the kingdom-factor app serves at
`https://kingdomfactor.us/mcp`, OAuth-protected by the user's own Kingdom
Factor login. If the connector is missing or the user isn't authenticated,
**stop and tell them exactly what to fix — never attempt a partial answer and
never try to reach GoHighLevel another way.**

## What this connector is (and is not)

- It is a **remote MCP server** added once in the Claude app via
  **Settings → Connectors → Add custom connector**:
  - **Remote MCP server URL:** `https://kingdomfactor.us/mcp`
  - **Advanced settings → OAuth Client ID / Client Secret:** the values a
    Kingdom Factor admin generated with
    `bin/rails oauth:register_claude_client` (one shared confidential client;
    the *user* still logs in individually).
- Authentication is **per-user OAuth against the user's Kingdom Factor
  account** (not a shared API key, not env vars, not a bundled stdio server).
  There is nothing to configure per machine beyond adding the connector and
  completing the KF login.
- Access is **role-scoped server-side**:
  - **KF admins** → the enrolled-roster portfolio **and** any coach deep-dive.
  - **Non-admin coaches** → only their **own** report (the connector ignores
    requests for other coaches by design — that is correct, not a bug).
  - Anyone else → no access.

## Preflight (before answering any question)

1. **Connector present?** Confirm the MCP tools `portfolio_summary`,
   `coach_report`, `resolve_coach` are available. If not:

   > "I can't reach the Kingdom Factor marketing data — the kingdom-factor
   > connector isn't added in this Claude app. Add it under Settings →
   > Connectors → Add custom connector with the URL
   > `https://kingdomfactor.us/mcp` (your KF admin has the OAuth Client
   > ID/Secret), then sign in with your Kingdom Factor account and ask me
   > again. I won't guess and I have no other way to read this data."

   Then stop.

2. **Authenticated?** If a tool call returns an authorization error
   (`invalid_token` / `insufficient_scope` / "Not authorized"):

   - `invalid_token` / not signed in → tell the user to (re-)connect the
     connector and complete the Kingdom Factor login, then retry.
   - `insufficient_scope` → the OAuth client is missing the `marketing.read`
     scope; a KF admin must re-register it
     (`bin/rails oauth:register_claude_client`).
   - "Not authorized: …admins (full roster) and coaches (their own
     marketing only)" → this is **expected role scoping**, not an error to
     work around. If a non-admin coach asked about *another* coach or the
     whole roster, explain plainly that they can only see their own
     marketing here, and offer their own report instead.

3. **Connectivity errors** (cannot reach the data source / 5xx) → say you
   can't reach Kingdom Factor right now and stop. Never fall back to calling
   GoHighLevel directly — there is no such path and it is forbidden.

## Why the boundary is hard

The owners cannot validate AI-driven CRM changes, so this capability is
read-only by design and the connector exposes only the three read tools
above. The connector is the *only* data path. "Falling back" to a direct GHL
call is not a degraded mode — it is impossible and forbidden here. Missing or
unauthenticated connector = stop, don't improvise.

## Distribution

This skill ships inside the **`kingdom-factor` Claude Code plugin** (the
`kf-plugin` repo) and is the single source of truth. The connector itself is
**not bundled** — it is the kingdom-factor app's hosted endpoint. The only
per-user step is adding the custom connector in the Claude app and signing in
with a Kingdom Factor account. Server, OAuth, and all GHL credentials live in
the app; nothing sensitive is configured on the user's side.
