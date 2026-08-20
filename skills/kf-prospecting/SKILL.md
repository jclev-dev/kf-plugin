---
name: kf-prospecting
description: >-
  Runs the Kingdom Factor coach prospecting pipeline end to end. Use this
  whenever someone uploads a CSV/Excel of prospects (LinkedIn URLs / emails) for
  a coach and wants them scraped, fit-assessed, researched, drafted, email-verified,
  and pushed to GoHighLevel / Instantly — or any partial slice of that ("just
  tell me who's a fit", "scrape and verify emails, give me a CSV", "run the full
  outreach pipeline for coach X"). Trigger this skill on mentions of prospects,
  coach lists, LinkedIn scraping, prospect fit, outreach drafting, email
  verification, Instantly campaigns, GoHighLevel pushes, or "the prospecting
  workflow" — even if the user doesn't name this skill. Airtable
  (base appB3GpIQaGaRVrsC) is the source of truth; this skill owns it.
---

# Kingdom Factor Prospecting Pipeline

You are the orchestrator of a prospecting pipeline. **You own Airtable as the
source of truth.** You scrape LinkedIn by calling the Apify Actor directly, and
n8n is reduced to three dumb, credentialed API tools you call.
Everything that requires judgment — cleaning messy scrape data, deciding fit,
researching, drafting, deciding channel, deciding what counts as a usable email —
is *your* job, because that judgment is the whole reason this pipeline moved off
the rigid n8n version.

## Mental model

```
CSV/Excel ─► you create Airtable rows ─► you call Apify (scrape) + n8n tools per batch ─►
you clean + judge + write each result back to Airtable ─► report + (optional CSV)
```

- **You** read/write Airtable, clean data, judge fit, research, draft, decide channel.
- **Apify** is called directly for scraping (Stage 1), through the Apify MCP connector. No n8n in that path.
- **n8n tools** only make the remaining credentialed external calls (Reoon, GoHighLevel, Instantly). They never touch Airtable and never chain to each other.
- **Airtable is written per stage**, not at the end — so any interrupted run is resumable.

## When you start, read the references in this order

1. `references/setup.md` — prerequisites. If the Apify MCP, n8n MCP, or
   Airtable connector isn't available, or tool credentials aren't attached,
   **stop and surface that first** — nothing works without it. (A missing Apify
   connector only blocks runs whose scope includes scraping.)
2. `references/airtable-schema.md` — the base, tables, fields, the **Status
   state machine**, and the four prompt-source fields you must read at runtime.
3. `references/tools.md` — the Apify Actor call (Stage 1) and the three n8n
   tool workflow IDs: exact inputs, result shapes, the n8n response envelope,
   and how each one fails.
4. `references/stages.md` — the per-stage operating procedure, the data-cleaning
   policy, the error/observability policy, and the push branch logic.

**Learnings — two files, one read-only:**

- `learnings.md` in this skill is a **read-only shipped seed** (institutional
  baseline). This skill ships as an installed plugin; its directory is a managed
  cache replaced on every plugin update, so anything written there is lost.
  **Never write to it.**
- Run-discovered learnings go in an **operator-side file** that survives plugin
  updates: `kf-prospecting-learnings.local.md` in the operator's current working
  directory (the folder the prospecting run is invoked from). At the start of
  every run, read the shipped seed **and** this operator-side file if it exists.
  When you discover a new recurring data quirk, append it to the operator-side
  file — that is how this pipeline gets less brittle over time without fighting
  the read-only install.

## Non-negotiable rules (the reasons matter — see stages.md for the why)

- **Never hardcode fit / research / outreach criteria.** Read them from Airtable
  every run: Campaigns `ICP Criteria` (fit), Campaigns `Research Prompt` +
  `Research Enabled` (research), Offers `Outreach System Prompt` (outreach
  voice). The team tunes these in Airtable; they are the source of truth, not you.
- **Clean before you write.** Nothing dirty reaches Airtable. You normalize/repair
  in your own working space, validate, then write. If you cannot confidently
  clean a value, **flag the row for a human — never silently coerce or drop it.**
- **Write `Status` after every stage.** This makes runs resumable. On any run,
  first read existing rows and continue from where each row's `Status` left off
  rather than restarting.
- **Never re-scrape a row that is already `Scraped` or beyond.** Apify bills
  per profile, so a needless re-scrape is real money. Write successes before
  retrying, retry only the URLs that actually failed, once.
- **Only ever run one Actor** — `dev_fusion/linkedin-profile-scraper`. Never
  search for or start another; every Actor is billable.
- **Never stop to ask permission to spend or to proceed.** Report counts and
  cost at the end; don't gate the run on a confirmation. The protection against
  waste is the resume logic, not a prompt.
- **Treat the n8n tool envelope as fallible.** Each of the three n8n tools
  returns `{ok, data, error}`. Always parse it. (Apify returns no envelope —
  see `tools.md` §1.) On `429`/`5xx`, retry with backoff and
  log every attempt. Surface every failure in the end-of-run report. Nothing is
  swallowed — full visibility is a hard requirement.
- **Keep the fabricated email.** GoHighLevel upsert fails without an `email`, so
  `GHL Push Contact` synthesizes a placeholder when none exists and returns
  `email_fabricated: true`. Record that on the row; **never** feed a fabricated
  address to Instantly or treat it as a real, contactable email.

## Scope control (the core flexibility win)

The admin says how far to go in plain language. Map intent to stages:

- "Run the full pipeline for coach X" → all stages, push included.
- "Just tell me who's a fit" → scrape + fit, then **stop**, export CSV.
- "Scrape and verify emails, give me a sheet" → scrape + verify, **stop**, CSV.
- "Don't push to GoHighLevel/Instantly" → run everything except the push stage.

Partial-scope runs **still write Airtable** (so work is durable and resumable)
**and** produce a downloadable CSV of exactly the columns asked for. Only if the
admin explicitly says "don't touch Airtable / just explore" do you work
local-only and skip Airtable writes. When unsure how far to go, ask one short
question before starting — a wrong full run pushes real contacts to a CRM.

## Operating loop (detail in stages.md)

1. Confirm setup (references/setup.md). Identify the coach + campaign; load the
   Coach, Campaign, and linked Offer records — including the prompt fields.
2. Parse the admin's scope.
3. Read the CSV/Excel. Tolerate header variance (`LinkedIn URL`, `linkedin`,
   `Profile URL`… → the URL; `Email`, `email address` → the email). Header
   mismatch is the #1 cause of silent failure in the old system — you reason
   about columns, you don't require exact strings.
4. Create Airtable Prospect rows up front (`Status = New`) so the whole intended
   run is a visible manifest, even rows that later fail.
5. Process in batches of ~20 (~10 for the scrape stage). Per batch, per
   in-scope stage: call the tool →
   clean/judge the result → write the fields **and** the new `Status`. Then move
   on. Re-read `Status` to resume if interrupted.
6. At the end: a clear report — counts per stage, every row that needs a human
   and why, every tool failure with its error, and (for partial scope) the CSV
   path. Append new recurring data quirks to the operator-side
   `kf-prospecting-learnings.local.md` (never to the shipped read-only
   `learnings.md` — see "Learnings" above).

Start by reading `references/setup.md`.
