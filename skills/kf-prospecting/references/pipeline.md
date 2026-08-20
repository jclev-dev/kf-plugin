# The pipeline — what runs, what each Status means, how it fails

Workflow: **Run prospect pipeline** — n8n id `NOkpnPIxM3XG7ZXA`,
`https://kingdomfactor.app.n8n.cloud/workflow/NOkpnPIxM3XG7ZXA`.
One execution per batch. Two entry points:

| Entry | How | Who |
|---|---|---|
| Form `…/form/prospect-pipeline` | CSV upload + Coach dropdown + report email | Operator |
| Webhook `POST …/webhook/rerun-prospects` | `{coach, campaign, report_email}`; processes every row with `Re-run` ticked for that coach | Console (you) |

## Stages and the Status they write

```
CSV row ─► New ──Apify──► Scraped ──Claude clean+fit──► Fit Assessed ──(Good Fit)──► Reoon verify ──Claude draft──► Ready for Review
             │              │                              │                                                         │
             │              └─ no profile ─► LI Not Found   └─ name/company unclear ─► Needs Attention        operator sends via Queue
             └─ no LinkedIn URL ─► Needs Attention                                                            ─► Approved / CRM LI Outreach
```

| Status | Set by node | Meaning for the operator |
|---|---|---|
| `New` | Create prospect rows / Stage re-run rows | Queued for scraping |
| `Scraped` | Write scrape to Airtable | LinkedIn data is in; waiting for clean + fit |
| `LI Not Found` | Map profiles to rows | Apify returned nothing for that URL — private, deleted, or wrong URL. Fix URL, tick Re-run |
| `Fit Assessed` | Write clean + fit | Fit decided (`Fit Status`: Good Fit / Not a Fit / Needs Review). Only Good Fits continue |
| `Ready for Review` | Write drafts | Drafts written; operator reads and sends via `Queue` |
| `Needs Attention` | several | Pipeline stopped for this row; `Attention Reason` says why; fix, tick `Re-run` |
| `Reanalyzing` | legacy only | Stuck by the retired Queue path (Aug 2026). Treat as `Scraped`: tick `Re-run` |
| `Approved`, `CRM LI Outreach`, `Sent Email`, `Responded` | Record Reviewed (legacy, still live) | Sent; downstream of this pipeline |

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
| `Apify: scrape batch` error branch → whole batch `Needs Attention` "Apify scrape call failed" | Apify down, out of credit, or token invalid | Check apify.com account; tick `Re-run` on those rows |
| Many `LI Not Found` in one run | URLs are vanity/locale variants Apify cannot resolve, or profiles private | Spot-check 3 URLs by hand |
| `Needs Attention` "Name/company unclear: …" | Claude could not decide the greeting name confidently | Fix `First Name` / `Last Name`, tick `Re-run` |
| `Needs Attention` "The AI clean/fit step failed" or "drafting step failed" | OpenRouter error or unparseable answer | Tick `Re-run`; if repeated, check the OpenRouter: KF credit at openrouter.ai |
| `Email Status` = Unknown for many Good Fits | Reoon credit exhausted or API down | Check emailverifier.reoon.com balance; tick `Re-run` |
| No report email arrived | Run died before `Build run report` (see execution), or Gmail credential expired | Open the execution; re-auth `KF Admin Gmail` in n8n if the Gmail node errored |
| Workflow not triggering from the form | Workflow unpublished | kf-n8n-ops: publish `NOkpnPIxM3XG7ZXA` |

Reading an execution: `get_workflow_execution` with `includeData: true` and
`nodeNames` limited to the node you suspect — full executions are large.

## Spend per 500-prospect run (for the report, not for gating)

Apify ≈ $5 (pay-per-profile, batches of 10, never re-scraped when data
exists). Claude via OpenRouter ≈ $2–5. Reoon ≈ 1 credit per Good-Fit candidate
email. n8n ≈ 1–2 executions.

## Retired paths — do not revive

- `KF Tool: Verify Email` / `GHL Push Contact` / `Instantly Add Lead` called
  one-by-one from a chat session (≈1,500 executions per run). Push tools are
  still used by the legacy `Record Reviewed` workflow behind the `Queue` field.
- `KF Tool: Scrape LinkedIn` and the Apify MCP connector path.
- Airtable `Queue` = *Scrape LinkedIn* / *Assess Fit* / *Generate Outreach* —
  these now only clear the Queue field (their targets are deactivated).
- Legacy form `…/form/contacts-upload` (workflow `H8qdEFvCWM7GC0VBgs35Y`).
