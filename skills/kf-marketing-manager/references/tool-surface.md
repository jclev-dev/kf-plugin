# Connector Tool Surface

Three **read-only** tools, served by the kingdom-factor app's remote MCP
endpoint (`https://kingdomfactor.us/mcp`). None of them write anything. All
windows default to the last 30 days when no window args are sent.

**Role scoping is enforced server-side** (the connector authenticates the
*user* via their Kingdom Factor OAuth login):

- **KF admin** → `portfolio_summary` (full roster), `coach_report` for any
  coach, `resolve_coach` across all coaches.
- **Non-admin coach** → `coach_report` returns only **their own** report (any
  `coach_ref` they pass is ignored by design); `resolve_coach` returns only
  themselves; `portfolio_summary` is denied. This is correct behavior — when
  a coach asks about someone else, explain they can only see their own
  marketing here and offer their own report.
- Anyone else → all tools denied.

## `portfolio_summary`

Enrolled-roster overview, ranked most-attention-first. Params (all optional):
`days` (number), `start_date`, `end_date` (ISO dates; override `days`).

Response:

```jsonc
{
  "scope": "marketing_active",
  "window":  { "start": "...", "end": "...", "days": 30, "label": "YYYY-MM-DD to YYYY-MM-DD" },
  "freshness": { "synced_at": "ISO|null", "stale_hours": 3.2, "source": "synced_db", "live": false },
  "coach_count": 12,
  "coaches": [
    {
      "coach":     { "id": 4, "name": "...", "email": "...", "marketing_active": true, "ghl_location_id": "..." },
      "window":    { ... },
      "freshness": { ..., "last_sync_error": null, "last_sync_error_at": null },
      "outreach":  { "opportunities_created": 5, "basis": "opportunities_created" },
      "health":    { "active_opportunities": 18, "oldest_days": 41, "avg_days": 12 },
      "attention": { "score": 3, "level": "red", "reasons": ["stalest deal 41 days in stage"] }
    }
    // ... sorted: highest attention score first
  ]
}
```

## `coach_report`

Deep dive for ONE coach. Params: `coach_ref` (account id or unique
name/email fragment — **admins only**; ignored for a non-admin coach, who
always gets their own report), plus the same optional window args.

Response adds `movement` and a fuller `health`:

```jsonc
{
  "coach":     { "id": 4, "name": "...", "marketing_active": false, ... },
  "window":    { ... },
  "freshness": { "synced_at": "...", "stale_hours": 3.2, "live": false,
                 "last_sync_error": null, "last_sync_error_at": null },
  "outreach":  { "opportunities_created": 5, "basis": "opportunities_created" },
  "movement":  { "new": 5, "moved_forward": 3, "won": 1, "went_cold": 2 },
  "health": {
    "active_opportunities": 18,
    "oldest_days": 41,
    "avg_days": 12,
    "funnel":  [ { "pipeline_name": "...", "stage_name": "...", "count": 7 } ],
    "stalest": [ { "contact_name": "...", "contact_company": "...",
                   "status": "open", "time_in_stage_days": 41,
                   "ghl_last_stage_change_at": "ISO|null" } ]
  },
  "attention": { "score": 3, "level": "red", "reasons": [ ... ] }
}
```

## `resolve_coach`

Disambiguation. Param: `query` (**required**, name/email fragment).

```jsonc
{ "query": "mark", "match_count": 2,
  "matches": [ { "id": 4, "name": "...", "email": "...",
                 "marketing_active": true, "ghl_location_id": "..." } ] }
```

## Errors

Failures come back as MCP **error tool responses** (an `isError` result whose
text carries the message) or, for transport/auth, an HTTP/JSON-RPC error:

| Signal | Meaning | What you do |
|---|---|---|
| `Not authorized: …admins (full roster) and coaches (their own marketing only)` | Role scoping — expected, not a bug | Explain the user can only see what their role allows; offer their own report if they're a coach |
| `No coach found for that reference.` | `coach_report` ref didn't match (admin) | Tell the owner; offer `resolve_coach` |
| `{ "error": "ambiguous", "matches": [...] }` (admin only) | Name matched multiple coaches | Show the matches, ask which one, retry with the id |
| `invalid_token` / 401 + `WWW-Authenticate` | Not signed in / token expired | Tell the user to (re-)connect the connector and complete the KF login (`setup.md`), then retry |
| `insufficient_scope` | OAuth client missing `marketing.read` | Setup gap — a KF admin re-registers the client (`setup.md`); stop |
| cannot reach / 5xx | App down | Say you can't reach the data source; stop |

Never swallow an error or fabricate numbers when one occurs. Never attempt to
reach GoHighLevel directly on any failure.
