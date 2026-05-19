# Report Definitions

Translate every number into plain English for a non-marketer. Definitions
below; phrasing guidance in `rendering.md`.

## The three report areas

### 1. Outreach volume — "new people brought in"

`outreach.opportunities_created` = how many opportunities (deals) were
**created** in the window. Plain English: *"how many new potential clients
entered the pipeline."*

- v1 measures **opportunities created**, not raw contacts. If the owner asks
  "how many people did she contact / reach out to", clarify that you can see
  *new opportunities created* and that raw contact/outreach-message counts
  aren't tracked here yet. Do not guess a contact number.

### 2. Pipeline movement — "what changed in this window"

From `movement`:
- `new` — deals created in the window (same as outreach). *"X new ones came in."*
- `moved_forward` — existing deals whose stage changed in the window. *"X moved
  forward a step."*
- `won` — deals marked won in the window. *"X closed/won."*
- `went_cold` — deals that dropped off or were marked lost/abandoned in the
  window. *"X went cold (stopped progressing)."*

Movement is best-effort: data is synced about once a day, so a change between
two syncs is attributed to when it was last seen. Always pair movement with the
freshness line; never imply minute-by-minute accuracy.

### 3. Pipeline health — "the state of the pipeline right now"

A snapshot (not windowed) from `health`:
- `active_opportunities` — open deals right now.
- `funnel` — count of deals sitting in each stage. Plain English: *"where deals
  are stacked up."*
- `oldest_days` / `avg_days` — how long the stalest deal / the average deal has
  sat without moving. "Time in stage" = *"days a deal has gone without moving
  to the next step."*
- `stalest` — the specific deals sitting longest; name them when they're the
  story (see `attention-heuristic.md`).

## Time windows

The owner says the window in plain language; you resolve it to dates and pass
`start_date`/`end_date` (or `days`):

| They say | You send |
|---|---|
| (nothing) | default — `days: 30`; **say "over the last 30 days"** |
| "this week" | start = Monday of this week → today |
| "last 7 days" | `days: 7` |
| "last month" / "in April" | that calendar month's start/end |
| "this quarter" / "last quarter" | that quarter's start/end |
| "this year" | Jan 1 → today |
| "compare her to last month/quarter" | call twice (this period vs that period) and contrast in words |

When you defaulted to 30 days because they didn't specify, **say so** ("Over
the last 30 days…"). Always echo the window you used.

## Freshness disclosure (required every answer)

Every response includes `freshness`. State it in plain words, e.g.:

> "This is based on pipeline data last synced about 3 hours ago."

- Use `stale_hours` for the human phrasing (round sensibly: "a few hours ago",
  "about a day ago"). The data is at most ~24h old (a daily sync).
- v1 has **no live figures** — `freshness.live` is always `false`. Never
  present any number as real-time.
- If `freshness.synced_at` is null (no synced data for that coach), say plainly
  there's no synced marketing data for them yet rather than showing zeros as if
  they were real activity.
- If `freshness.last_sync_error` is set, mention that the latest sync for that
  coach failed, so the picture may be incomplete — and treat it as an attention
  signal (`attention-heuristic.md`).
