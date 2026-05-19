# "Needs Attention" Heuristic

The connector already computes the ranking — **you do not invent your own**.
These thresholds intentionally mirror the kingdom-factor `app/admin/marketing`
page so the skill and that page never disagree.

## What the connector returns

Each coach carries an `attention` block:

```jsonc
{ "score": 3, "level": "red", "reasons": ["sync error: ...", "stalest deal 41 days in stage"] }
```

- `level`:
  - **red** — needs attention now (a stalest deal ≥ 30 days in stage, a failed
    sync, or score ≥ 3).
  - **amber** — worth a look (e.g. stalest deal ≥ 14 days, high average age, or
    no active opportunities).
  - **green** — healthy; nothing to flag.
- `score` — higher = more attention; `portfolio_summary` is already sorted
  most-attention-first.
- `reasons` — the specific, data-grounded causes. **Use these verbatim as the
  basis for your tip** — they are why the coach is flagged.

## The thresholds (for your explanation, not re-computation)

| Signal | amber | red |
|---|---|---|
| Stalest deal time-in-stage | ≥ 14 days | ≥ 30 days |
| Average time-in-stage | — | ≥ 30 days |
| Latest sync for the coach failed | — | always red |
| No active opportunities at all | amber | — |

"Time in stage" in plain English = *"days a deal has sat without moving to the
next step."*

## How to use it

- **Portfolio:** lead with the red coaches by name, then amber, then a one-line
  "the rest look healthy." Don't dump the whole list mechanically — surface who
  needs the owner and why, in their words.
- **Per-coach:** if `level` is red/amber, the highest-leverage next action is
  almost always tied to the top `reasons` entry (e.g. a stalled cohort →
  "follow up on the N deals that have sat over a month"). Name the specific
  stalled deals from `health.stalest` rather than only stating counts (this is
  what makes the tip grounded, not generic).
- A failed sync (`last_sync_error`) means the picture may be **incomplete** —
  say that explicitly; don't present partial data as the full story.
