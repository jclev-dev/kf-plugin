---
name: kf-n8n-ops
description: >-
  Keep the Kingdom Factor n8n prospect pipeline healthy: a run errored, rows
  are parked as Needs Attention with a scraper/AI/send error, a credential
  expired (Apify, Reoon, OpenRouter, Gmail, Airtable, Instantly, GHL), the
  workflow got unpublished, a coach must be added to the upload form, a bad
  change must be rolled back, or budget/usage on OpenRouter or Apify must be
  checked. Decides what the operator may fix alone (restore, re-run, re-bind,
  add a coach) and what goes to Jordan (prompts, models, wiring, send rules).
  Requires the KF n8n MCP. For "what is stuck and why" use kf-prospecting.
---

# KF n8n ops

Operators never open the n8n editor. You do, through the KF n8n MCP. Every
change you make is a named version that Jordan can read and undo in one click,
so the rule is not "do nothing" — it is **restore, don't redesign**.

## The one question before any n8n edit

> Is this about **one prospect**, or about **the workflow**?

- **One prospect** (a name, a URL, an email, one row that behaved oddly) → fix
  the **Airtable row** and tick `Re-run` (kf-prospecting step 4). Never touch
  n8n for a single person. Never put a person's name, URL, or email into a node.
- **The workflow** → use the tiers below. Everything in n8n is global: whatever
  you change runs for every coach and every future row.

## Tier 1 — the operator may do these alone

Restores and safe repairs. None of them changes what the pipeline decides or
writes; they put it back the way it was or let it try again.

| Task | How |
|---|---|
| Re-run parked rows (scraper outage, AI provider error, send failure) | Tick `Re-run` on the rows → `execute_workflow` on `CIVKWwR8Jm5n5lxf` (console). First check the cause is gone (diagnostics below) |
| Workflow got unpublished / form returns 404 | `publish_workflow` on `NOkpnPIxM3XG7ZXA` |
| Roll back a bad change | `get_workflow_history` → pick the last version whose description reads as known-good → `restore_workflow_version` → `publish_workflow` |
| A credential expired (Gmail most often) | Jordan re-authenticates it in the n8n UI; you re-bind with `setNodeCredential` if a node lost it. Credential IDs below |
| Add a coach to the upload form | `setNodeParameter` on `Prospect upload form`, path `/formFields/values/1/fieldOptions/values`; the option text must equal `Coaches.Full Name` in Airtable exactly. Publish after |
| Check OpenRouter budget ("Key limit exceeded") | `execute_workflow` `lbn1F0CN9z7KSCh9` (`Check OpenRouter key usage`) — reads usage vs monthly cap. Raising the cap is Jordan's (openrouter.ai → keys) |
| Check the LinkedIn scraper | `execute_workflow` `0SlubKoJ5fNFu3hf` (`Check Apify scraper status`) — last run status, its log, account usage. A log full of "Failed to enrich" in under a second = Apify-side outage; wait, then re-run |
| Raise a timeout or retry count on a node that timed out | `setNodeSettings` / `setNodeParameter` on that node only |
| Undo your own change that did not help | Roll back (above) |

Tier 1 still follows the procedure at the bottom (validate, verify, named
version, publish).

## Tier 2 — stop and hand to Jordan

Anything that changes **what the pipeline does** for every future row. Do the
diagnosis, write the proposed change in plain English, and give it to the
operator to send to Jordan. Do not apply it.

- Prompts or models: `Clean and assess fit`, `Draft outreach`, `Perplexity:
  research`, any `*model*` subnode, the output-parser schemas.
- Adding, removing, or rewiring nodes; changing batch sizes or loop logic;
  anything inside a Code node beyond restoring a previous version.
- Send rules: which rows go to Instantly vs LinkedIn, the Safe / Catch All
  rule, anything in `♻️ Record Reviewed`, Instantly campaign IDs, GHL fields.
- Archiving, unpublishing, or renaming workflows; the Airtable schema
  (fields, select options); the Airtable `Manual Queue` automation.
- A fix that only makes sense for one batch, one coach, or one campaign. If
  it would be wrong for the next upload, it does not belong in n8n.

The handoff message should name: the failing node, the error text, the rows
affected, and the one-line change you believe fixes it.

**Not n8n at all — the operator owns these in Airtable:** `Campaigns.ICP
Criteria` (who counts as a fit, including the LDS line), `Offers.Outreach
System Prompt` and `Subject Line` (email voice). Edit there; the next run
picks it up. Remind them it changes who gets contacted and how.

## The workflows that matter

| Workflow | ID | Role |
|---|---|---|
| Run prospect pipeline | `NOkpnPIxM3XG7ZXA` | **The engine.** Form upload or re-run webhook → Apify scrape (batches of 10) → Gemini clean + fit → Reoon verify → Perplexity research → Claude draft → `♻️ Record Reviewed` sends → report email. One execution per batch |
| Re-run prospects (Claude console) | `CIVKWwR8Jm5n5lxf` | The only way a chat session starts a re-run. Single webhook trigger that forwards to the engine. `execute_workflow` with `{type:"webhook", webhookData:{method:"POST", body:{coach, report_email}}}` |
| ♻️ Record Reviewed | `cudlW2E-ajmv446eFM-Hy` | Sends one drafted row: Safe email → Instantly; otherwise GHL contact + note for a LinkedIn connection. Called per row by the engine (sub-workflow runs do not count toward the n8n quota). **Tier 2** |
| Airtable Manual Queue | `vSI2AE6gFxxFhbl9wgID-` | Manual override behind the Airtable `Queue` field. Live: *Add to Instantly*, *CRM LI Connection*. Every other option only resets the field |
| Check OpenRouter key usage | `lbn1F0CN9z7KSCh9` | Diagnostic, read-only |
| Check Apify scraper status | `0SlubKoJ5fNFu3hf` | Diagnostic, read-only |
| ⚠️ Error Workflow | `OhoE8r8UPAccmokjSorGB` | Receives every failed execution |

Archived (do not revive, ADR 0001/0002): `LI Prospect Scraping`, `♻️ Prospect
Fit`, `♻️ Outreach Generation`, `♻️ Web Research`, `♻️ Email Verification
Reoon`, `KF Tool: Scrape LinkedIn`. The three remaining `KF Tool:*` webhooks
(Verify Email, GHL Push Contact, Instantly Add Lead) are not used by the
pipeline or the console; do not call them per row from a chat.

## Credentials the engine binds (n8n credential store only)

| Node(s) | Credential | Symptom when broken |
|---|---|---|
| All Airtable nodes | `Airtable: KF Access Token` `ZgE5guZzmTHq7jdG` | 401/403 on the first Airtable node |
| Apify: scrape batch | `Apify: KF Token` `QpZAvL0bT663AITz` (httpQueryAuth) | batches parked "Apify scrape call failed" |
| Reoon: verify email | `KF: Reoon` `v4mnEAmfrzCkXYeC` (httpQueryAuth) | `Email Status` Unknown for every Good Fit |
| Model (clean + fit), Fixer models | `OpenRouter: KF` `4j0MyAaOoAFtR1yt`, model `google/gemini-3.7-flash` | rows parked "AI clean/fit step failed: …" |
| Perplexity: research | same OpenRouter credential, model `perplexity/sonar` | `Research Confidence` Low everywhere; research text empty |
| Claude (draft) | same OpenRouter credential, model `anthropic/claude-sonnet-4.6` | rows parked "AI drafting step failed: …" |
| Email run report | `KF Admin Gmail` `8TYukFYou7dHRTdg` | no report email; run ends in error at the last node |

The report email and each row's `Attention Reason` now carry the provider's
own error text (for example `Key limit exceeded (monthly limit)`). Read it
before guessing. HTTP Request nodes are skipped by credential auto-assignment:
after any recreate, bind Apify, Reoon and Perplexity with `setNodeCredential`.

## Reading a failed run

1. `search_workflow_executions` on `NOkpnPIxM3XG7ZXA` (status `error`, or the
   latest run). The console workflow and `♻️ Record Reviewed` have their own
   executions; a send problem shows under `cudlW2E-ajmv446eFM-Hy`.
2. `get_workflow_execution` with `includeData: true` and `nodeNames` for the
   suspect node only — full executions are large. Use `truncateData`.
3. Translate the node into the operator vocabulary in
   `kf-prospecting/references/pipeline.md`.

## Procedure for every edit (Tier 1 included)

1. `get_workflow_details` first; confirm the node name and current value.
2. Make the smallest change. Use `setNodeParameter` / `setNodeSettings` /
   `setNodeCredential`, not a rebuild. Nodes inside a node group cannot be
   rewired without re-applying the groups (`setNodeGroups`); that is Tier 2.
3. Give the version a **name and description** that says what changed and
   why, with the execution ID that prompted it. Jordan reads these.
4. `get_workflow_details` again; check the `connections` object is unchanged.
5. `publish_workflow`. Then re-run the affected rows and read the report.
6. If it did not help, roll back — do not stack a second guess on top.

## Hard boundaries

- Never put a secret, a person's name, URL, or email into a workflow, a prompt,
  or this repo.
- Never re-enable an archived workflow as a fallback.
- Never loop over prospects from a chat or add per-row MCP tools back; the
  engine exists because that burned the n8n quota (ADR 0002).
- Never `execute_workflow` the engine `NOkpnPIxM3XG7ZXA` directly from a chat:
  it has two triggers and the MCP fires the upload form, not the re-run. Use
  the console workflow.
