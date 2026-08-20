---
name: kf-n8n-ops
description: >-
  Maintain the Kingdom Factor n8n pipeline workflow "Run prospect pipeline"
  (NOkpnPIxM3XG7ZXA) and the push tools behind the Airtable Queue. Use when the
  form does not trigger, a run errors, a credential expires (Apify, Reoon,
  OpenRouter, Gmail, Airtable), a coach must be added to the upload form, the
  Claude model or prompts in the pipeline need changing, or the workflow must be
  published / rolled back. Requires the KF n8n MCP. For "what is stuck and
  why" questions use kf-prospecting instead.
---

# KF n8n ops

Keeps the pipeline workflow healthy. Operators never open n8n; you do.

## The workflows that matter

| Workflow | ID | Role |
|---|---|---|
| Run prospect pipeline | `NOkpnPIxM3XG7ZXA` | **The engine.** Form + re-run webhook → scrape → Claude clean/fit → Reoon → Claude draft → report. One execution per batch |
| Airtable Manual Queue | `vSI2AE6gFxxFhbl9wgID-` | Behind the Airtable `Queue` field. Live actions: *Research Prospect*, *Add to Instantly*, *CRM LI Connection*. *Scrape / Assess Fit / Generate Outreach* are neutered (they only clear the Queue) |
| ♻️ Record Reviewed | `cudlW2E-ajmv446eFM-Hy` | Sends approved rows (Instantly / GHL). Called by Manual Queue |
| KF Tool: GHL Push Contact / Instantly Add Lead | `otarDiS3anrAKzaC` / `BwbeD81BHGyz7fbh` | Push tools, still valid, called by humans-approved paths only |
| ⚠️ Error Workflow | `OhoE8r8UPAccmokjSorGB` | Receives every failed execution of the pipeline |

Retired, keep unpublished: `KF Tool: Verify Email` (`V0EoKHXbdmk7g6au`),
`KF Tool: Scrape LinkedIn` (`8lCOtgzuFSE5rSUE`), legacy `LI Prospect
Scraping` (`H8qdEFvCWM7GC0VBgs35Y`, the old `contacts-upload` form),
`♻️ Prospect Fit`, `♻️ Outreach Generation`.

## Credentials the pipeline binds (n8n credential store only)

| Node | Credential | Symptom when broken |
|---|---|---|
| Airtable nodes (9) | `Airtable: KF Access Token` `ZgE5guZzmTHq7jdG` | 401/403 on the first Airtable node |
| Apify: scrape batch | `Apify: KF Token` `QpZAvL0bT663AITz` (httpQueryAuth) | whole batches `Needs Attention` "Apify scrape call failed" |
| Reoon: verify email | `KF: Reoon` `v4mnEAmfrzCkXYeC` (httpQueryAuth) | `Email Status` Unknown for every Good Fit |
| Claude (clean + fit), Claude (draft) | `OpenRouter: KF` `4j0MyAaOoAFtR1yt`, model `anthropic/claude-sonnet-4.6` | rows `Needs Attention` "AI … step failed" |
| Email run report | `KF Admin Gmail` `8TYukFYou7dHRTdg` | no report email; execution ends in error at the last node |

HTTP Request nodes are skipped by credential auto-assignment: after any
recreate, bind Apify and Reoon with `setNodeCredential`.

## Routine tasks

- **Diagnose a failed run.** `search_workflow_executions` (workflowId above,
  status error) → `get_workflow_execution` with `includeData` and `nodeNames`
  for the suspect node only. Map the node to the operator-facing cause in
  `kf-prospecting/references/pipeline.md`.
- **Add a coach to the form.** `setNodeParameter` on `Prospect upload form`,
  path `/formFields/values/1/fieldOptions/values` — the option text must equal
  `Coaches.Full Name` exactly (the lookup is `{Full Name} = '<option>'`).
  Publish after.
- **Change a prompt or model.** Prompts are the `text` and `messages` params of
  `Clean and assess fit` / `Draft outreach`; the model is the `model` param of
  the two OpenRouter subnodes. To move to a direct Anthropic key: add an
  Anthropic credential in n8n, replace each OpenRouter subnode with
  `@n8n/n8n-nodes-langchain.lmChatAnthropic`, reconnect `ai_languageModel`.
- **Publish / roll back.** `publish_workflow`; versions carry names and
  descriptions — `get_workflow_history` → `restore_workflow_version`.
- **Every edit:** `validate_workflow` → `get_workflow_details` (check
  `connections`) → `test_workflow` with pinned data for external nodes →
  publish. Node groups must be cleared (`setNodeGroups: []`) before rewiring
  nodes that belong to a group, then re-applied.

## Hard boundaries

- Never put a secret in a workflow, prompt, or this repo.
- Never re-enable the retired workflows as a "fallback" (ADR 0001, ADR 0002).
- Per-prospect tool calls from a chat session are the anti-pattern this
  workflow replaced; do not add MCP-callable per-row tools back.
