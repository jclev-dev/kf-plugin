---
name: kf-new-coach
description: >-
  Onboard one Kingdom Factor coach across the GoHighLevel CRM, the Kingdom
  Factor platform, and the Airtable Coaches index. Use when someone says they
  have a new coach to add, asks to create a sub-account or a coach login, asks
  why a coach is missing from the CRM or the platform, or wants an existing
  coach checked and linked up properly. This skill asks, explains, and
  confirms; two n8n workflows do the reading and the writing.
---

# Kingdom Factor — onboard a coach

One coach lives in three systems: the **CRM** (a GoHighLevel sub-account), the
**platform** (a Kingdom Factor login), and the **Airtable Coaches index**. They
drift. This skill brings them into agreement.

There is one job, an **Onboarding run**, and it has two halves:

1. **Audit** — read all three, report in plain English, write nothing.
2. **Apply** — write, and only after the operator has seen the audit and agreed.

Creating a coach is the case where the audit found nothing. Never treat
"create" and "repair" as two different jobs. The operator should not have to
know which one she is in.

Vocabulary is in `CONTEXT.md` at the repo root: *Coach*, *KF email*,
*Sub-account*, *Custom value*, *Coach index*, *Audit*, *Apply*, *Onboarding
run*. The reasoning is in `docs/adr/0003-coach-onboarding-is-an-audit-then-an-apply.md`.

## Connector

**KF n8n MCP** (`kingdomfactor.app.n8n.cloud`) only. If it is missing, say so
and stop. Do not call GoHighLevel, the Kingdom Factor API, or Airtable
yourself for this job, even though you may have those connectors: every
credential for this work lives in n8n, and a run has to leave an execution
record.

| Workflow | ID | What it does |
|---|---|---|
| `KF Coach: Audit` | `ll1R8FtysX9SU63C` | Reads three systems. Writes nothing. |
| `KF Coach: Apply` | `vAkrIdRhP0sajN72` | Writes. Refuses without `confirmed: true`. |

Call each with `execute_workflow`, `executionMode: "production"`, and
`inputs: { type: "webhook", webhookData: { method: "POST", body: { ... } } }`.

## Steps

### 1. Collect what the run needs

**Required:** first name, last name, KF email, phone, city, state, subdomain.
**Optional:** notification email, LinkedIn URL, about-me.

Ask for the required seven in one message, not seven messages. Say plainly
that the optional four can come later and will not hold the coach up.

Two rules you enforce before calling anything:

- **The KF email must end in `@kingdomfactor.us`.** A coach mailbox is created
  by hand in Google Workspace, and nothing here can create one. The operator
  giving you that address is the evidence it exists. If she gives a personal
  address, stop and ask for the Kingdom Factor one.
- **The subdomain is one value with three uses.** `sbral` becomes the CRM
  microsite (`sbral.kingdomfactor.us`), the platform `slug`, and the platform
  `highlevel_url`. Ask for it once, as "the short name for their site".

### 2. Run the Audit

Call `ll1R8FtysX9SU63C` with the collected fields. It returns `summary` (a
list of plain sentences), `blockers`, and the detail under `crm`, `platform`,
and `airtable`.

### 3. Read the audit back, in prose

Say what is there, what is missing, and what disagrees — **three or four
sentences**, in your own words, from `summary`. Do not paste the JSON. Do not
open with a table. Offer the per-field table only if she asks for the detail.

Then handle what the audit found:

- **`blockers` is not empty** → read them out and stop. Each one means a human
  has to decide something before a write is safe.
- **`crm.custom_values.conflicts` is not empty** → for each field, name the
  value that is in the CRM and the value she gave, and ask which is right.
  Never pick for her. Collect the `field_key` of every field where she chooses
  her new value; that list is `overwrite`.
- **`airtable.match_count` is more than one, or the match was on name only** →
  show her the candidates and ask which row is the coach, or whether to make a
  new one. Her answer becomes `airtable_record_id`.
- **The CRM found no user but Airtable has a `CRM ID`** → that sub-account
  exists and simply has no user attached. Pass that id as `location_id` so
  Apply attaches to it instead of creating a second sub-account.

### 4. Get a clear yes

Say what Apply will do, in one short list: create or keep the sub-account,
create or keep the CRM user, how many custom values it will fill, how many it
will leave alone, and that it will write the platform account and the Airtable
row. Then ask her to confirm.

**Do not call Apply without an explicit yes in this conversation.** Apply
refuses `confirmed: true` for a reason; do not send it on your own judgement.

### 5. Run Apply

Call `vAkrIdRhP0sajN72` with the same coach fields plus:

- `confirmed: true`
- `overwrite`: the field keys she ruled on (`[]` when there were none)
- `location_id`: only when step 3 found one the CRM lookup missed
- `airtable_record_id`: only when she picked a row

### 6. Report what happened, and what did not

Apply returns `written`, `not_written`, and `left_for_a_human`. Read both
lists out. **Never soften `not_written`.** There is no rollback across three
vendors, so a partial run is normal and the operator has to know exactly which
part is missing. The same summary is appended to the `Notes` field on the
Airtable Coaches row, so it survives this chat.

Two results that look like failures but are not:

- **"No custom values were read"** right after a sub-account was created: the
  CRM snapshot is still installing. Say so, wait a minute, and run Apply again.
  It is safe to repeat; Apply only fills blanks.
- **"Platform: not written"** with an error about the role: that email already
  belongs to a member or guest account on the platform. It is not a coach
  account, and nothing here will promote it. That is a job for a Kingdom
  Factor admin in the app.

### 7. Tell her what is still hers to do

Always end with the two manual steps, because the run cannot do them:

1. **Send the platform invite** from the Kingdom Factor admin screen when the
   coach is actually ready to start. The magic link lives **72 hours**, so
   sending it weeks early wastes it.
2. **Give the coach their CRM login**: their KF email, and the standing
   Kingdom Factor starting password.

## What this skill does not do

Say so plainly rather than improvising a workaround:

- It does not create the Google Workspace mailbox.
- It does not add the coach to Instantly. That belongs with their first
  prospecting campaign — see `kf-prospecting`.
- It does not turn on marketing reporting. A new coach is created with
  `marketing_active` off, on purpose, so an empty coach never appears in the
  portfolio report. Turning it on is a separate, deliberate act.
- It does not add fields to the Airtable Coaches table. That table is an
  index. A coach's phone, LinkedIn, about-me, and microsite live in the CRM,
  as custom values, and the CRM is where they are edited.

## When something is wrong with n8n itself

A credential that is not bound, a workflow that is not published, an execution
that failed inside n8n — that is `kf-n8n-ops`, not this skill. Hand over.
