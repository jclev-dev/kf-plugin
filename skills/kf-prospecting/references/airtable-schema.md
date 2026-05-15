# Airtable Schema — the source of truth

Base: **`appB3GpIQaGaRVrsC`** ("Kingdom Factor"). You own this. Every interpretive
write goes through you, after cleaning.

## Tables

| Table | ID | Role |
|---|---|---|
| Prospects | `tblatRtY3PCNGYitJ` | The working table — one row per prospect |
| Campaigns | `tblciyIuFU5ysm2Xu` | Per-campaign config + the fit/research prompts |
| Offers | `tblj6HFpCiypNi3IG` | The outreach voice/rules prompt |
| Coaches | `tbllQP1eqA7VMGlUm` | Push targets (GHL location, Instantly campaign, identity) |

## The four prompt-source fields — READ THESE EVERY RUN, never hardcode

The team tunes the pipeline's judgment by editing these Airtable fields. If you
bake criteria into your own reasoning instead of reading them, the team loses
control and the pipeline silently drifts from what they intend.

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

## The Status state machine (Prospects `Status`)

This single field is what makes runs resumable. Always read it first and resume
each row from where it is — never blindly restart a row that's already advanced.

```
New ──scrape──► Scraped ──fit──► Fit Assessed ──research?──► Researched
                   │                                            │
                   └─(Apify miss)─► LI Not Found                 ▼
                                              ──outreach──► Ready for Review
                                                                 │
                                              ──verify+push──►  Approved        (Email path)
                                                              │
                                                              └► CRM LI Outreach (LinkedIn path)
```

Other status/stage fields you write:

- **`Fit Status`**: `Good Fit` | `Not a Fit` | `Needs Review`
- **`Email Status`**: `Safe` | `Catch All` | `Disposable` | `Invalid` | `Unknown`
  (older rows may show `Valid`/`Accept All`; treat semantically, see stages.md)
- **`Research Confidence`**: `High` | `Medium` | `Low`
- **`Recommended Channel`**: `Email` | `LinkedIn`
- **`Instantly Status`**: `Not Sent` … `Active` … `Completed`

## Prospects fields you write, by stage

- **Create (Status=New):** `LinkedIn URL`, `Seamless Email` (from CSV email
  column), `Coach` (link), `Campaign` (link), `Status="New"`.
- **After scrape (Status=Scraped | LI Not Found):** `First Name`, `Last Name`,
  `LI Scrape Email`, `Phone`, `Location`, `Headline`, `Job Title`, `Company`,
  `Company Industry`, `Company Size`, `Company Website`, `Time in Role`,
  `LinkedIn Signals` (JSON: connections, followers, isPremium, isVerified,
  openConnection, isJobSeeker, isCreator, isInfluencer, totalExperienceYears,
  firstRoleYear), `About`, `Career History`, `Skills`, `Education`,
  `Recommendations`, `Volunteer`, `Publications`.
- **After fit (Status=Fit Assessed):** `Fit Status`, `Fit Reasoning`.
- **After research (Status=Researched):** `Web Research`,
  `Web Research (Unverified)`, `Research Confidence`.
- **After outreach (Status=Ready for Review):** `Recommended Channel`,
  `Channel Reasoning`, `Personalization Hooks`, `LinkedIn Connection Message`,
  `Draft Email`, `Draft Direct Message`, and the linked `Offer`.
  - The legacy flow hardcoded `Offer = ["recgVGMZxVsYxjr5f"]`. Do **not** copy
    that blindly — set `Offer` to the Offer actually linked from the Campaign.
- **After verify:** `Email` (the chosen, usable address), `Email Status`.
- **After push (Email path, Status=Approved):** `Instantly Lead ID`,
  `Instantly Status="Active"`, `Instantly Last Event` (now), `CRM ID` (the GHL
  contact id returned).
- **After push (LinkedIn path, Status=CRM LI Outreach):** `CRM ID`.

Next: `references/tools.md`.
