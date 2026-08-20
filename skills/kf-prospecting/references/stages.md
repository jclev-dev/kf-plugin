# Stage-by-stage operating procedure

Process in **batches of ~20** (**~10** for the scrape stage — see Stage 1). For
each batch, run only the in-scope stages, in order. After each stage, write the fields **and** the new `Status` before moving
on — that is what makes an interrupted run resumable.

## Resume logic (run this first, every time)

Before processing, query existing Prospect rows for this coach+campaign. Group
by `Status`. A row at `Researched` doesn't need scrape/fit/research again —
continue it from outreach. Only create new rows for CSV entries not already
present. Re-running a partially-done run should be cheap and not re-spend Apify
credits or re-push contacts.

Since the scrape stage now bills Apify directly per profile, this is **spend
control, not just convenience**: a row at `Scraped` or beyond is never scraped
again, under any circumstances.

## Stage 0 — Intake

1. Load Coach, Campaign, and the Campaign's linked Offer. Capture the four
   prompt fields (airtable-schema.md). If `ICP Criteria` or
   `Outreach System Prompt` is empty, stop and ask — you cannot judge without them.
2. Read the CSV/Excel. **Reason about columns**, don't require exact headers:
   anything like `LinkedIn URL`/`linkedin`/`Profile`/`LI` → the profile URL;
   `Email`/`email address`/`work email` → the seamless email. Header-string
   mismatch was the single biggest silent failure in the legacy system; you fix
   it by understanding intent.
3. Create Prospect rows (`Status=New`, `LinkedIn URL`, `Seamless Email`, linked
   `Coach`, linked `Campaign`) so the full intended run is a visible manifest.

## Stage 1 — Scrape (`New → Scraped` / `LI Not Found`)

Called **directly against the Apify Actor** through the Apify MCP connector —
there is no n8n scrape tool any more. Read `references/tools.md` §1 for the
tool, the Actor-only rule, the result shape, and the retry rules; the short
version:

- Send ~10 URLs per Actor run. Only ever run
  `dev_fusion/linkedin-profile-scraper`.
- Match results back to rows on `linkedinUrl` **or** `inputUrl` (failures use
  `inputUrl`). Any URL you sent that comes back under neither is a miss.
- For each miss, or any item with `succeeded:false` / missing core identity →
  `Status="LI Not Found"` with the reason, and continue. Don't abort the batch.
- Otherwise **clean before writing** (see Data-cleaning policy below) and write
  the profile fields + `Status="Scraped"`.
- Write successes **before** any retry, then retry **only** the failed URLs,
  **once**.

### If Apify itself is down or refusing (platform failure)

Do not grind. Say plainly what is wrong and stop scraping. Then:

1. **Carry on with what you have.** Rows already at `Scraped` continue through
   every remaining in-scope stage — fit, research, outreach, verify, push. Those
   stages use entirely different systems and are unaffected. Sixty finished
   prospects beats zero.
2. **Leave the rest at `New`.** That is precisely the resume list for when
   Apify recovers; no separate tracking is needed.
3. **Say so in the report**: how many were scraped, how many are waiting at
   `New`, and what the actual Apify problem was.

The operator should never be left guessing whether to try again. You know why
it failed — tell them.

## Stage 2 — Fit (`Scraped → Fit Assessed`)

- Evaluate each prospect against the Campaign **`ICP Criteria`** text — that is
  the rubric, verbatim, not your own notion of a good prospect. Decide
  `Fit Status` = `Good Fit` / `Not a Fit` / `Needs Review` and write a 1–2
  sentence `Fit Reasoning`. Be decisive; reserve `Needs Review` for genuinely
  ambiguous signals. Write `Status="Fit Assessed"`.

## Stage 3 — Research (`Fit Assessed → Researched`) — conditional

- Only if scope includes research AND Campaign `Research Enabled` is true AND
  `Fit Status == "Good Fit"`. Otherwise skip (the row stays at `Fit Assessed`;
  that's a valid terminal state for non-fits).
- Use your own web search/fetch, guided by the Campaign **`Research Prompt`**.
  Look for what that prompt asks for (typically: podcasts, articles, published
  writing, public Christian-in-business signals). Separate **verified** findings
  (you have a source URL) from **unverified**. Write `Web Research`,
  `Web Research (Unverified)`, `Research Confidence`, `Status="Researched"`.

## Stage 4 — Outreach (`Researched/Fit Assessed → Ready for Review`)

- Using the Offer **`Outreach System Prompt`** as the voice/rules, decide
  `Recommended Channel` (`Email` vs `LinkedIn`) with a short `Channel Reasoning`,
  and draft: `Draft Email`, `Draft Direct Message`, `LinkedIn Connection
  Message` (<200 chars), and `Personalization Hooks`. Set the linked `Offer`
  (the Campaign's Offer — not a hardcoded id). Write `Status="Ready for Review"`.

## Stage 5 — Verify email

- Call `Verify Email` with `[Seamless Email, LI Scrape Email]` (skip blanks).
- Apply judgment, don't string-match: Reoon `safe` → clearly usable. `catch_all`
  / `accept_all` → usable-with-lower-confidence (record as `Catch All`).
  `disposable`/`invalid`/`spamtrap`/`role_account` → not usable (`Invalid`).
  Nothing returned / both blank → `Unknown`. Pick the best usable address, write
  `Email` + `Email Status`. See learnings.md for status-string drift.

## Stage 6 — Push (in scope only)

Branch exactly:

- **Email path** — `Recommended Channel == "Email"` AND a real (not fabricated)
  usable `Email` exists AND `Email Status` is usable (`Safe`/`Catch All`):
  1. `Instantly Add Lead` (campaign = Coach `Instantly Campaign ID`,
     personalization = `Draft Email`, coach fields from Coach record).
  2. `GHL Push Contact` (source_channel `"Automated Article Outreach"`, note =
     composed email-style note).
  3. Write `Instantly Lead ID`, `Instantly Status="Active"`,
     `Instantly Last Event`, `CRM ID`, `Status="Approved"`.
- **LinkedIn path** — everything else (channel LinkedIn, OR no usable real
  email): `GHL Push Contact` only (source_channel `"Future Connections"`, note =
  LinkedIn-style note incl. `Draft Direct Message`). Write `CRM ID`,
  `Status="CRM LI Outreach"`. **Never** send a fabricated email to Instantly.

Compose the GHL note from: coach identity (`Full Name`, `City`, `State` →
"Kingdom Factor Coach <Full Name> — <City>, <State>"), the fit reasoning, the
web research, and the relevant draft. Keep it human-readable.

## Data-cleaning policy (the core value of this rewrite)

The legacy system did rigid transforms that broke on messy data. You replace
them with judgment:

- **LinkedIn URL ↔ row matching**: reason about equivalence (vanity vs numeric,
  locale subdomains like `de.linkedin.com`, tracking params, trailing slashes).
  Record new forms you encounter in learnings.md.
- **Company size**: map sensibly to the bucket options; don't null-out an
  unrecognized string — infer the bucket or flag it.
- **Large/odd profiles**: keep the data. Do not blind-truncate. If a field is
  genuinely too large, summarize meaningfully rather than chopping mid-structure.
- **HTML entities / encoding junk**: clean it.
- **Golden rule**: if you cannot confidently clean a value, **flag the row as
  needs-human with the specific reason** — never silently coerce or drop. Silent
  coercion is exactly the failure mode this rewrite exists to kill.

## Error & observability policy (hard requirement)

- Treat every n8n tool envelope as fallible. Retry `429`/`5xx` with backoff
  (~2s/8s/30s, max 3), logging **every attempt**. **Apify (Stage 1) is not an
  n8n tool and returns no envelope** — its failure handling is in Stage 1 and
  `tools.md` §1: one retry, failed URLs only, and platform failures are
  reported, not retried.
- On final failure: write a short failure note on the row, set its `Status`
  unchanged (so resume retries it), and add it to the run report. Never advance
  a row's `Status` past a stage that didn't actually succeed.
- Keep a running log for the run. The end-of-run report must include: counts per
  `Status`, every needs-human row + reason, every tool failure + its
  `error` (including 429s), any fabricated-email rows, and — for scraping — how
  many profiles were scraped and the approximate Apify cost ($10 / 1,000, so
  142 profiles ≈ $1.42).

- **Never stop to ask permission to spend.** The cost line above is
  information for the report, not a gate. Do not ask the operator to confirm a
  scrape, a batch, or a run size. Runs are meant to run; the protection against
  waste is the resume logic (never re-scraping a done row), not a prompt.

## Scope → stages

| Admin intent | Stages run |
|---|---|
| Full pipeline | 0–6 |
| "Who's a fit?" | 0,1,2 → CSV |
| "Fit + verified email" | 0,1,2,5 → CSV |
| "Everything but don't push" | 0–5 |
| "Just explore, don't touch Airtable" | local-only, no Airtable writes, CSV |

Partial-scope (except explicit explore) still writes Airtable AND produces a
downloadable CSV of the requested columns. When the intent is ambiguous about
how far to go, ask one short question first — a wrong full run pushes real
people into a CRM and an email campaign.
