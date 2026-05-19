# Connector Tool Surface

Three **read-only** tools. None of them write anything. All windows default
to the last 30 days when no window args are sent.

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

Deep dive for ONE coach (any coach, enrolled or not). Params: `coach_ref`
(**required** — account id, or a unique name/email fragment), plus the same
optional window args.

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

## Error envelope

A failed call comes back as an error result whose text starts with
`kf-marketing request failed: HTTP <status>` (or `could not reach …`):

| Status | Meaning | What you do |
|---|---|---|
| 300 | Name matched multiple coaches | Call `resolve_coach`, ask the owner which one |
| 401 | Wrong/missing shared key | Setup gap — see `setup.md`, stop |
| 404 | No such coach | Tell the owner you couldn't find that coach; offer `resolve_coach` |
| 429 | Rate limited | Wait, retry once, then report |
| 5xx / could not reach | App down | Say you can't reach the data source; stop |

Never swallow an error or fabricate numbers when one occurs.
