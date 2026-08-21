# Changelog

## 1.0.1 — 2026-08-21

- Fresh lists can be started by attaching the CSV to the chat (Claude creates
  the rows, dedupes by LinkedIn URL, starts the run). The form remains the
  default.

## 1.0.0 — 2026-08-21

The pipeline is live and sending. Breaking relative to 0.5.0 in how operators
work and in what the skills promise.

- **No human review gate.** Good Fits are sent automatically by the engine via
  `♻️ Record Reviewed` (Safe email → Instantly; otherwise GHL + LinkedIn).
  `Ready for Review` is transient.
- **Only an unclear first name** on a Good Fit parks a row. Last name and
  company are optional; trailing periods are stripped; Not a Fit is never
  flagged. A human `Fit Status = Good Fit` survives a re-run.
- **Web research** via Perplexity Sonar (OpenRouter) feeds the draft's opening
  hook. Clean + fit moved to Gemini 3.7 Flash; drafts stay on Claude Sonnet 4.6.
  Output parsers auto-fix malformed JSON.
- **Console workflow** `Re-run prospects (Claude console)` (`CIVKWwR8Jm5n5lxf`)
  is the only way a chat starts a run. `kf-prospecting` starts runs through it;
  no curl.
- **kf-n8n-ops rewritten** around Tier 1 (operator: restore, re-run, re-bind,
  add coach, diagnostics) vs Tier 2 (Jordan: prompts, models, wiring, send
  rules). Diagnostics: `Check OpenRouter key usage`, `Check Apify scraper
  status`.
- Report email and `Attention Reason` carry the provider's real error text;
  scraper outages park rows as re-runnable and are counted in the report.
- Retired and archived: `♻️ Prospect Fit`, `♻️ Outreach Generation`,
  `♻️ Web Research`, `♻️ Email Verification Reoon`, `LI Prospect Scraping`,
  `KF Tool: Scrape LinkedIn`. The Apify MCP connector is dropped from
  `.mcp.json`.
- Glossary: added Console workflow, Sent, Tier 1/2 change, Scraper outage,
  Research, Human override, ICP Criteria / Offer voice; removed n8n tool,
  Envelope, Verification Task, Scope.
