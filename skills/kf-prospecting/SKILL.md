---
name: kf-prospecting
description: >-
  Operator console for the Kingdom Factor prospect pipeline (the n8n workflow
  "Run prospect pipeline"). Use when someone asks what is stuck or why, how a
  run went, how many prospects were sent, wants named people re-run or
  approved, wants a fresh list started, wants to change who counts as a fit or
  the email voice, or asks anything about prospects, coaches, LinkedIn
  scraping, fit, drafts, email verification, Instantly or GHL. This skill
  explains, repairs rows, and starts runs; the n8n workflow does the work.
---

# Kingdom Factor prospecting — operator console

The pipeline runs in n8n as one execution per batch and **sends automatically**:
a Good Fit with a Safe email goes to Instantly; any other Good Fit becomes a
GHL contact with a note for a LinkedIn connection. Nobody reviews drafts. Your
job is the **console**: read Airtable and the run history, explain in plain
English, fix single rows, start runs. You never loop over prospects yourself —
a 500-row loop in a chat seat is what this console replaced (ADR 0002).

Vocabulary lives in `CONTEXT.md` at the repo root: *Master run*, *Needs
Attention*, *Operator console*, *Console workflow*.

## Connectors

- **KF n8n MCP** (`kingdomfactor.app.n8n.cloud`) — run history, executions,
  starting runs.
- **Airtable MCP** — base `appB3GpIQaGaRVrsC`, table `Prospects`; also
  `Campaigns` (ICP Criteria) and `Offers` (email voice).

If one is missing, say which and stop. Nothing else is needed.

## Steps

1. **Identify the coach** (and campaign — there is one, `Christian Leader
   Article Interviews`). Every question and every run is per coach.
2. **Answer from Airtable first.** Count `Prospects` by `Status` for that coach;
   list `Needs Attention` rows with `Attention Reason`. `references/pipeline.md`
   says what each Status means and which stage sets it.
3. **When the question is "why", read the run.** `search_workflow_executions`
   on `NOkpnPIxM3XG7ZXA`; open the execution with `includeData` and
   `nodeNames` for the node named in `references/pipeline.md`. Translate the
   error into the plain-language vocabulary there. If the cause is in n8n
   itself (credential, outage, unpublished), switch to `kf-n8n-ops`.
4. **When the operator names people and says what to do** ("re-run Josh R and
   Mary Sallah for Matt", "Josh is actually a good fit, send him", "fix
   Brittney's first name to Britt and rerun"): find each row by name + coach
   (`First Name`, `Last Name`, `Coach`); show the matches if a name is
   ambiguous; apply the edit; tick `Re-run`; start the run (step 5). Edits you
   may make on request: `First Name`, `Last Name`, `LinkedIn URL`,
   `Fit Status` (a human `Good Fit` survives the re-run and is sent; a human
   `Not a Fit` stops the row), `Re-run`. Never set `Status` yourself.
5. **Start a run.** Confirm at least one row for that coach has `Re-run`
   ticked (the engine exits silently, with no report email, when none are).
   Then call the n8n MCP tool `execute_workflow` on **`CIVKWwR8Jm5n5lxf`**
   (`Re-run prospects (Claude console)`) with `executionMode: "production"`
   and
   `inputs: { type: "webhook", webhookData: { method: "POST", body: { coach: "<Full Name exactly as in Airtable>", report_email: "<operator email>" } } }`.
   Never call the engine `NOkpnPIxM3XG7ZXA` directly — it has two triggers and
   the MCP fires the upload form. One call processes every ticked row for that
   coach; rows with LinkedIn data skip the scrape. The report email arrives in
   1–40 minutes (about 6 minutes per 50 already-scraped rows).
   **Before firing a run of more than 25 rows, state the count and the rough
   cost** (about $0.02 per row all-in; Apify adds about $0.01 per row that
   still needs scraping) and that Good Fits will be sent for real.
6. **Starting a fresh list.** Two ways; both end in the same engine run and
   report email.
   - **Form (default, cheapest):** give them
     `https://kingdomfactor.app.n8n.cloud/form/prospect-pipeline`. CSV with a
     `LinkedIn URL` column (`Email` optional), pick the coach, type their
     email. Done.
   - **CSV attached to the chat:** read it; map columns loosely (`LinkedIn
     URL`/`LinkedIn`/`Profile URL`; `Email`/`Work Email`; `First Name`;
     `Last Name`; `Company`; `Title`). Drop rows with no LinkedIn URL and list
     them back. Look up the coach's record in `Coaches` by `Full Name` and the
     campaign in `Campaigns`. Query `Prospects` for existing rows with the same
     LinkedIn URL (normalise: lowercase, strip `https://`, `www.`, trailing
     slash, query string) and skip duplicates, saying how many. Create the rest
     with `create_records_for_table`, 50 per call, fields: `LinkedIn URL`,
     `Seamless Email`, `First Name`, `Last Name`, `Company`, `Job Title`,
     `Coach` (linked id), `Campaign` (linked id), `Status` = `New`,
     `Re-run` = true. Then step 5. State the row count and cost first (step 5
     rule). Names need not be clean; the engine fixes them.
7. **Changing who counts as a fit or how emails sound** is done in Airtable,
   not n8n: `Campaigns.ICP Criteria` (fit rules, including that LDS counts as
   Christian evidence) and `Offers.Outreach System Prompt` / `Subject Line`
   (voice). The operator owns these. Make the edit when asked, say that it
   applies to every future run and changes who gets contacted, and suggest a
   10-row re-run to check the effect before a big batch.
8. **Report** in plain English: counts, the rows needing a human and why, and
   the one next action. Operators are non-technical: name Airtable columns,
   never n8n nodes, unless asked.

## Rules

- Read fit and outreach criteria from Airtable when explaining a judgment;
  that text is the truth, not your opinion of who is a Christian leader.
- Writes are limited to the per-row edits in step 4 and the Airtable text in
  step 7. `Status` is owned by the workflow.
- A row at `Needs Attention` with a **scraper outage** or **AI provider**
  reason is not the operator's fault and needs no edit: check the cause is
  gone (kf-n8n-ops diagnostics), tick `Re-run`, start the run.
- A row at `LI Not Found` after a run where many rows failed at once is
  probably the same outage; offer to re-run those too.
- Sending is automatic and real. Do not promise a human review step that no
  longer exists.
- Learnings: `learnings.md` here is a read-only shipped seed; write
  run-discovered quirks to `kf-prospecting-learnings.local.md` in the working
  directory.
