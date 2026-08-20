---
name: kf-n8n-ops
description: >-
  Diagnose, repair, validate, or recreate the three Kingdom Factor n8n tool
  workflows that the kf-prospecting pipeline depends on (Verify Email, GHL Push
  Contact, Instantly Add Lead). Use this whenever a KF tool call fails or
  misbehaves — "GHL push is erroring", "verify email returns nothing", "the
  prospecting run can't reach the n8n tools", "recreate the KF n8n tools", "a
  tool isn't showing up in MCP", or any auth/credential/availability problem
  with the KF tool workflows. Also use before first-run setup to confirm the
  three workflows are activated, MCP-exposed, and credentialed. Requires the KF
  n8n MCP connector. Does **not** cover LinkedIn scraping — that no longer runs
  through n8n; it calls the Apify Actor directly (see kf-prospecting).
---

# KF n8n Tool Ops

Operational skill for keeping the three `KF Tool:` n8n workflows healthy. These
are the only n8n workflows `kf-prospecting` calls. This skill does **not** run
the prospecting pipeline — it keeps its tools working.

**Scraping is out of scope.** `KF Tool: Scrape LinkedIn` (`8lCOtgzuFSE5rSUE`)
is retired and deactivated; `kf-prospecting` now calls the Apify Actor
`dev_fusion/linkedin-profile-scraper` directly through the Apify MCP connector.
A scrape problem is an Apify or connector problem, never an n8n one — do not
diagnose, repair, or reactivate that workflow.

## The three tool workflows

| Tool | Workflow ID | Calls |
|---|---|---|
| KF Tool: Verify Email | `V0EoKHXbdmk7g6au` | Reoon `emailverifier.reoon.com` |
| KF Tool: GHL Push Contact | `otarDiS3anrAKzaC` | GHL locationToken → contacts/upsert → notes |
| KF Tool: Instantly Add Lead | `BwbeD81BHGyz7fbh` | Instantly `lead/addToCampaign` |

Every tool returns one envelope — always parse it, never assume success:

```json
{ "ok": <bool>, "data": <payload|null>,
  "error": { "step": "<string>", "http_status": <number|null>,
             "message": "<string>", "body": <raw|null> } }
```

`ok:false` with `http_status` 429 or 5xx → transient (retry/backoff is the
caller's job). 4xx (esp. 401/403) → almost always an unattached or wrong
credential, not a code bug. A null `http_status` with a clear message → inspect
`error.step` to localize (for GHL: `token` | `upsert` | `note`).

## First triage — before touching the workflow

1. **Is the workflow active and MCP-exposed?** Via the n8n MCP, confirm the
   workflow exists, is active, and is "Available in MCP". A tool that "isn't
   showing up" is usually inactive or not MCP-exposed, not broken.
2. **Auth error (401/403, or `error.step: token` for GHL)?** A credential is
   unattached or wrong. The n8n API cannot set credentials — they are attached
   manually in the n8n UI. Required attachments:
   - Verify Email → **Reoon** httpQueryAuth (`v4mnEAmfrzCkXYeC`)
   - GHL Push Contact (Get Location Token / Upsert Contact / Create Note) →
     **GoHighLevel** OAuth (`9gatP0eYzl6hugXl`)
   - Instantly Add Lead → **Instantly** (`Instantly: KF`)
   Report the specific node + credential as a setup gap; do not retry blindly.
3. **Transient (429/5xx)?** Not a workflow defect. Confirm by re-running once;
   advise the caller's backoff rather than editing the workflow.
4. **Bad/empty `data` but `ok:true`?** The upstream API shape may have drifted
   (e.g. Apify field renamed, Reoon status string changed). Inspect `error`/raw
   and the upstream node’s response; record the drift in the kf-prospecting
   operator-side learnings so the pipeline’s cleaning logic adapts. (Apify field
   drift is no longer an n8n concern — it surfaces directly in kf-prospecting.)

## Inspecting / validating a workflow

Use the n8n MCP read + validate tools (get workflow details, validate workflow).
**Consult the `n8n-mcp-skills` plugin first** (`n8n-mcp-tools-expert`,
`n8n-validation-expert`, `n8n-node-configuration`, `n8n-expression-syntax`) — it
documents correct nodeType formats, parameter structures, and validation flow
and prevents the common mistakes. If that plugin is not installed, recommend
installing it before deep node-level work.

## Recreating a tool workflow

If a tool is damaged beyond a quick fix, rebuild it as a **new** workflow — do
not repair in place under time pressure and do not touch the originals.

- Each tool is a pure function: an `executeWorkflowTrigger` ("When Executed by
  Another Workflow") with declared inputs → the external call(s) → a final Code
  node that emits the `{ok,data,error}` envelope. Every external node sets
  `onError: continueRegularOutput` so the workflow never hard-fails.
- The exact per-tool input schema, endpoints, headers, and body shapes live in
  the `kf-prospecting` skill's `references/tools.md` — treat that as the
  contract; anything you rebuild must match it so the pipeline keeps working.
- Mirror an existing healthy `KF Tool:` workflow's trigger/credential/node
  shapes. Build with the `n8n-mcp-skills` guidance, `validate_workflow` until
  clean, leave it inactive, then have the operator activate + attach credentials
  + enable "Available in MCP", and update the ID in `references/tools.md` (cut a
  new plugin version).

## Hard boundaries

- **Never modify, activate, or call the 6 original legacy workflows**
  (`H8qd…`, `JAzS…`, `VVnh…`, `xBrZ…`, `iZgp…`, `cudl…`). They are the
  preserved fallback.
- **Never embed credentials** in a workflow, prompt, or file — they live only in
  n8n's credential store, attached via the UI.
- Changes to a tool's input/output contract must be reflected in
  `kf-prospecting/references/tools.md` and shipped as a new plugin version, or
  the pipeline and the tool will silently disagree.
