# Rendering — Plain-English First

The owner is not a marketer. Words carry the answer; a visual only ever
*supports* the words. Both per-coach and portfolio answers render **inline** in
the chat. There is no self-refreshing sidebar artifact in v1 — do not build
one.

## Answer shape (every time, in this order)

1. **One-sentence plain-English verdict.** "Sarah's marketing is steady but two
   deals have stalled." No numbers-first, no jargon.
2. **The few numbers that matter, in words.** Translate, don't dump: "5 new
   potential clients came in over the last 30 days, 1 closed, and 18 are still
   open." Explain any term inline the first time.
3. **The single highest-leverage next action**, grounded in this coach's
   actual data (use `attention.reasons` + the named `stalest` deals). One
   action, not a list. If nothing needs action, say so plainly.
4. **Freshness line.** "Based on pipeline data synced about 3 hours ago."
5. **Optional simple visual** — only if it makes the words easier to grasp.

Then invite the next question ("Want me to look at anyone else, or go deeper on
those stalled deals?").

## When to draw a visual

Draw one when a shape is easier to see than to read:
- portfolio → a small ranked bar of attention (red/amber/green) by coach;
- per-coach → a funnel bar (deals per stage) or a this-vs-last comparison.

Skip the visual for a simple factual follow-up ("how many did she win?") — just
answer in words.

## How to draw it

- **If a visualization MCP is available** (e.g. `mcp__visualize__show_widget`,
  or the environment's inline-widget tool — check with its `read_me` / list
  first), render a single, minimal inline widget: a labeled bar chart or a
  small table. Plain labels ("Days a deal has sat without moving"), no
  marketing vocabulary, no dashboards. One widget per answer, max.
- **If no visualization tool is available**, fall back to a compact Markdown
  table or a unicode bar (`█████░░░░░`) inline. Never let a missing widget tool
  block the answer — the words already carry it.

Keep every visual self-explanatory to someone who has never seen a CRM. If a
chart needs a marketing glossary to read, replace it with a sentence.

## Follow-ups

Stay in the same plain register. Reuse what you already pulled; re-call a tool
only for data the new question needs. Re-draw a visual only when the new
question changes the shape worth seeing — otherwise answer in words.
