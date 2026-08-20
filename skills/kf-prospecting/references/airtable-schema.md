# Airtable Schema — the source of truth

Base: **`appB3GpIQaGaRVrsC`** ("Kingdom Factor"). The n8n pipeline writes it;
the console reads it and repairs single rows.

## Tables

| Table | ID | Role |
|---|---|---|
| Prospects | `tblatRtY3PCNGYitJ` | The working table — one row per prospect |
| Campaigns | `tblciyIuFU5ysm2Xu` | Per-campaign config + the fit/research prompts |
| Offers | `tblj6HFpCiypNi3IG` | The outreach voice/rules prompt |
| Coaches | `tbllQP1eqA7VMGlUm` | Push targets (GHL location, Instantly campaign, identity) |

## The prompt-source fields — the team tunes judgment here

The pipeline's Claude nodes read these at run time; quote them when explaining
a fit or a draft.

| What you need | Read from | Used for |
|---|---|---|
| Fit rubric | Campaigns **`ICP Criteria`** | Deciding Good Fit / Not a Fit / Needs Review |
| Research guidance | Campaigns **`Research Prompt`** | What to dig up in web research |
| Research on/off | Campaigns **`Research Enabled`** (bool) | Gate: only research if true |
| Outreach voice/rules | Offers **`Outreach System Prompt`** | Drafting email/DM/connection copy |

The Campaign links to one or more Offers via Campaigns **`Offers`**. Resolve the
linked Offer record to get its `Outreach System Prompt`.

Coaches fields you need for the push stage: **`CRM ID`** (this is the
GoHighLevel locationId), **`Instantly Campaign ID`**, **`First Name`**,
**`Full Name`**, **`City`**, **`State`**.

## Status, Attention Reason, Re-run

`Status` is written by the pipeline; the full map is in `pipeline.md`. Two
columns added for the console (Aug 2026):

- **`Attention Reason`** (long text) — plain-English reason a row is at
  `Needs Attention`. Cleared at the start of a re-run.
- **`Re-run`** (checkbox) — tick after fixing a row; the re-run webhook picks up
  every ticked row for the coach, clears the tick, and resumes from the right
  stage (no re-scrape when profile data exists).

Other status fields the pipeline writes:

- **`Fit Status`**: `Good Fit` | `Not a Fit` | `Needs Review`
- **`Email Status`**: `Safe` | `Catch All` | `Disposable` | `Invalid` | `Unknown`
  (older rows may show `Valid`/`Accept All`)
- **`Research Confidence`**: `High` | `Medium` | `Low`
- **`Recommended Channel`**: `Email` | `LinkedIn`
- **`Instantly Status`**: `Not Sent` … `Active` … `Completed`

Field-by-stage detail: `pipeline.md`.
