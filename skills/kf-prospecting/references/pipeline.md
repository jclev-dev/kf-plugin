# The pipeline — what runs, what each Status means, how it fails

Workflow: **Run prospect pipeline** — n8n id `NOkpnPIxM3XG7ZXA`,
`https://kingdomfactor.app.n8n.cloud/workflow/NOkpnPIxM3XG7ZXA`.
One execution per batch. Two entry points:

| Entry | How | Who |
|---|---|---|
| Form `…/form/prospect-pipeline` | CSV upload + Coach dropdown + report email | Operator |
| Webhook `POST …/webhook/rerun-prospects` | `{coach, campaign, report_email}`; processes every row with `Re-run` ticked for that coach | Console, via `Re-run prospects (Claude console)` `CIVKWwR8Jm5n5lxf` (`execute_workflow`, webhook input). A single-trigger forwarder: the MCP cannot pick the second trigger on the master |

## Stages and the Status they write

```
CSV row ─► New ──Apify──► Scraped ──Gemini clean+fit──► Fit Assessed ──(Good Fit)──► Reoon verify ──Perplexity research──Claude draft──► sent (Approved / CRM LI Outreach)
             │              │                              │                                                         │
             │              └─ no profile ─► LI Not Found   └─ Good Fit + first name unclear ─► Needs Attention   (♻️ Record Reviewed: Safe email → Instantly,
             └─ no LinkedIn URL ─► Needs Attention                                                             otherwise GHL contact + LinkedIn connection)
```

| Status | Set by node | Meaning for the operator |
|---|---|---|
| `New` | Create prospect rows / Stage re-run rows | Queued for scraping |
| `Scraped` | Write scrape to Airtable | LinkedIn data is in; waiting for clean + fit |
| `LI Not Found` | Map profiles to rows | Apify answered for the batch but not for this URL — private, deleted, or wrong URL. Fix URL, tick Re-run. If many rows got this in one run, it was a scraper outage: just re-run them |
| `Fit Assessed` | Write clean + fit | Fit decided (`Fit Status`: Good Fit / Not a Fit / Needs Review). Only Good Fits continue |
| `Ready for Review` | Write drafts | Transient: drafts written, about to be sent. If a row rests here, the `Send outreach` node is disabled or errored |
| `Needs Attention` | several | Pipeline stopped for this row; `Attention Reason` says why. Only a *first name unclear* reason needs an edit; outage and provider reasons just need a re-run once the cause is gone |
| `Reanalyzing` | legacy only | Stuck by the retired Queue path (Aug 2026). Treat as `Scraped`: tick `Re-run` |
| `Approved`, `CRM LI Outreach`, `Sent Email`, `Responded` | ♻️ Record Reviewed (called by `Send outreach`) | Sent automatically. No human review gate (Jordan, 2026-08-21) |

Other columns the pipeline writes: `Fit Status`, `Fit Reasoning`, `Company
Size` (bucketed), cleaned `First Name` / `Last Name` / `Company`, `Email`,
`Email Status` (Safe / Catch All / Role Account / Disposable / Invalid /
Unknown), `Recommended Channel`, `Channel Reasoning`, `Draft Email`,
`Draft Direct Message`, `LinkedIn Connection Message`, `Personalization Hooks`,
`Offer`, `Attention Reason`, `Re-run` (cleared at start of a re-run).

## Failure vocabulary — node → what to tell the operator

| Where it failed | Plain-English cause | Fix |
|---|---|---|
| `Prepare prospect rows` throws "Coach … not found" | Coach dropdown name does not match `Coaches.Full Name` | Add the coach to Airtable or fix the name in the form (kf-n8n-ops) |
| `Prepare prospect rows` throws "No row … had a LinkedIn URL" | CSV header is not `LinkedIn URL` | Rename the column, upload again |
| `Needs Attention` "LinkedIn scraper (Apify) returned no data for any of the N profiles in this batch" | Apify-side outage: the actor accepted the URLs and failed them all in under a second. Nothing wrong with the rows | Run `Check Apify scraper status` (kf-n8n-ops); when its log shows real profiles again, tick `Re-run` |
| `Apify: scrape batch` error branch → whole batch `Needs Attention` "Apify scrape call failed (…)" | Apify HTTP error: token invalid, out of credit, or down | Check apify.com account; tick `Re-run` on those rows |
| Many `LI Not Found` in one run | Usually the same outage as above (Apify returned a few profiles and failed the rest); rarely vanity/locale URL variants | Re-run them with the outage rows; spot-check 3 URLs only if they fail twice |
| `Needs Attention` "First name unclear: …" | Claude could not decide the greeting first name (only raised for Good Fits; last name and company are optional, trailing periods are stripped) | Fix `First Name`, tick `Re-run` |
| `Needs Attention` "Sending failed: …" | ♻️ Record Reviewed errored (Instantly / GHL / Supabase) | Jordan checks the send sub-execution; tick `Re-run` |
| `Research Confidence` = Low for most Good Fits | Perplexity found nothing public (normal for small-business owners) or OpenRouter credit exhausted | Spot-check one by hand; if many in a row, check openrouter.ai credit |
| `Needs Attention` "The AI clean/fit step failed: …" or "drafting step failed: …" | The text after the colon is the provider's own error. `Key limit exceeded (monthly limit)` = the OpenRouter key's monthly cap, not credits (Jordan raises it). `Model output doesn't fit required format` = one-off bad answer (auto-fix now retries it) | Run `Check OpenRouter key usage` (kf-n8n-ops); tick `Re-run` once the cause is gone |
| `Email Status` = Unknown for many Good Fits | Reoon credit exhausted or API down | Check emailverifier.reoon.com balance; tick `Re-run` |
| No report email arrived | Run died before `Build run report` (see execution), or Gmail credential expired | Open the execution; re-auth `KF Admin Gmail` in n8n if the Gmail node errored |
| Workflow not triggering from the form | Workflow unpublished | kf-n8n-ops: publish `NOkpnPIxM3XG7ZXA` |

Reading an execution: `get_workflow_execution` with `includeData: true` and
`nodeNames` limited to the node you suspect — full executions are large.

## Spend per 500-prospect run (say it before firing a big run)

Measured 2026-08-21: about **$0.02 per row all-in** on OpenRouter (Gemini 3.7
Flash for clean+fit, Perplexity Sonar for research, Claude Sonnet 4.6 for
drafts), plus Apify ≈ $0.01 per row that still needs scraping (pay-per-profile,
batches of 10, never re-scraped when data exists). Reoon ≈ 1 credit per
Good-Fit candidate email. n8n = 1 execution per run (sub-workflow sends do not
count toward the quota). A 500-row fresh list ≈ $15; a 50-row re-run of
already-scraped rows ≈ $1 and about 6 minutes.

## The send rule (today)

`♻️ Record Reviewed` emails through Instantly only when `Recommended Channel`
= Email **and** `Email Status` = Safe. Catch All and everything else becomes a
GHL contact with a note for a LinkedIn connection (`CRM LI Outreach`). Roughly
a quarter of Good Fits take the LinkedIn route. Changing this is Jordan's call
(kf-n8n-ops Tier 2).

## Retired paths — do not revive

- `KF Tool: Verify Email` / `GHL Push Contact` / `Instantly Add Lead` called
  one-by-one from a chat session (≈1,500 executions per run). Nothing in the
  pipeline or the console uses them.
- `KF Tool: Scrape LinkedIn` and the Apify MCP connector path.
- `♻️ Web Research` (Gemini + Google Search), `♻️ Prospect Fit`, `♻️ Outreach
  Generation`, `♻️ Email Verification Reoon`, `LI Prospect Scraping` — all
  archived 2026-08-21. Research is the `Perplexity: research` node in the
  master workflow (model `perplexity/sonar`, OpenRouter credential).
- Airtable `Queue` = *Scrape LinkedIn* / *Assess Fit* / *Generate Outreach* —
  these now only clear the Queue field (their targets are deactivated).
- Legacy form `…/form/contacts-upload` (workflow `H8qdEFvCWM7GC0VBgs35Y`).
