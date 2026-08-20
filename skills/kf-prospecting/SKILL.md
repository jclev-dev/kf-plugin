---
name: kf-prospecting
description: >-
  Operator console for the Kingdom Factor prospect pipeline (the n8n workflow
  "Run prospect pipeline"). Use when someone asks what is stuck or why, how a
  run went, how many prospects are ready for review, wants a fixed row re-run,
  wants to start a run, or asks anything about prospects, coach lists, LinkedIn
  scraping, fit, drafts, or email verification. This skill explains and repairs
  single rows; the n8n workflow does the processing.
---

# Kingdom Factor prospecting — operator console

The pipeline runs in n8n as one execution per batch. Your job is the
**console**: read Airtable and the n8n run history, explain in plain English,
fix single rows, start re-runs. You never loop over prospects yourself — a
500-row loop in a chat seat is what this console replaced (ADR 0002).

Vocabulary lives in `CONTEXT.md` at the repo root: *Master run*, *Needs
Attention*, *Operator console*.

## Connectors

- **KF n8n MCP** (`kingdomfactor.app.n8n.cloud`) — run history, executions.
- **Airtable MCP** — base `appB3GpIQaGaRVrsC`, table `Prospects`.
- HTTP (curl) to the re-run webhook.

If one is missing, say which and stop. Apify is not needed here.

## Steps

1. **Identify the coach** (and campaign — there is one, `Christian Leader
   Article Interviews`). Every question is per coach.
2. **Answer from Airtable first.** Count `Prospects` by `Status` for that coach;
   list `Needs Attention` rows with `Attention Reason`. See
   `references/pipeline.md` for what each Status means and which stage sets it.
3. **When the question is "why", read the run.** `search_workflow_executions`
   on workflow `NOkpnPIxM3XG7ZXA`; open the failing execution with
   `includeData` and `nodeNames` for the node named in `references/pipeline.md`.
   Translate the error into the plain-language failure vocabulary there.
4. **Fix single rows when asked** — edit the row in Airtable (name, URL), tick
   `Re-run`, then start the re-run (step 5). Done when the row's `Re-run` box is
   ticked and the webhook returned "Re-run started".
5. **Start a re-run** when rows are ticked:
   `POST https://kingdomfactor.app.n8n.cloud/webhook/rerun-prospects` with JSON
   `{"coach":"<Full Name exactly as in Airtable>","campaign":"Christian Leader Article Interviews","report_email":"<operator email>"}`.
   One call processes every ticked row for that coach in one execution.
6. **Starting a fresh list** is the operator's job through the form
   `https://kingdomfactor.app.n8n.cloud/form/prospect-pipeline`; give them the
   link and the two CSV rules (a `LinkedIn URL` column; `Email` optional).
7. **Report** in plain English: counts, the rows needing a human and why, and the
   one next action. Operators are non-technical: name Airtable columns, never
   n8n nodes, unless asked.

## Rules

- Read fit / outreach criteria from Airtable (`Campaigns.ICP Criteria`,
  `Offers.Outreach System Prompt`) when explaining a judgment; the team tunes
  them there.
- Writes are limited to single-row repairs and the `Re-run` tick. Status is
  owned by the workflow; set it only when the operator explicitly asks you to
  override a row.
- Sending is human-gated: `Ready for Review` rows are sent by the operator via
  the Airtable `Queue` field (*Add to Instantly* / *CRM LI Connection*). You
  may explain that; you do not press it for them.
- Learnings: `learnings.md` here is a read-only shipped seed; write run-discovered
  quirks to `kf-prospecting-learnings.local.md` in the working directory.
