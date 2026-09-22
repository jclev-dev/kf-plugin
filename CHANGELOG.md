# Changelog

## 1.1.0 — 2026-09-22

- **New skill `kf-new-coach`.** Onboards one coach across the GoHighLevel CRM,
  the Kingdom Factor platform, and the Airtable Coaches index. It replaces the
  Bubble form that called the retired `KF: Create Subaccount V2`, which was not
  on the live n8n instance at all.
- **One job, two halves.** `KF Coach: Audit` (`ll1R8FtysX9SU63C`) reads all
  three systems and writes nothing. `KF Coach: Apply` (`vAkrIdRhP0sajN72`)
  writes, and refuses to run without `confirmed: true`. Creating a coach is the
  case where the audit found nothing; there is no separate "repair" mode.
- **Apply fills blanks and never overwrites silently.** A custom value that
  disagrees with what the operator gave is reported to her, and written only
  when she names that field. Custom values render on public funnel pages.
- **Three defects in V2 fixed:** the headshot custom value is no longer written
  with the coach's state abbreviation; the Coach User ID lands in its own custom
  value instead of whichever one came back first; the blind 60-second wait runs
  only when a sub-account was actually created.
- **Airtable `Coaches` gains no fields.** It is an index, not a store. A coach's
  phone, LinkedIn, about-me, and microsite live in the CRM as custom values, so
  an Airtable edit can never look like it propagated when it did not.
- A new coach is created with `marketing_active` off, so an empty coach never
  appears in the `kf-marketing-manager` portfolio report.
- Glossary gains *Coach*, *KF email*, *Sub-account*, *Custom value*, *Coach
  index*, *Audit*, *Apply*, *Onboarding run*. Reasoning in ADR 0003.
- **Depends on a kingdom-factor app change**: `POST /api/imports/coaches` must
  accept `ghl_location_id` and must stop blanking keys the payload omits.
  Until that ships, every run correctly reports the platform link as missing.

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
