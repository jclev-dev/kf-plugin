# Context — Kingdom Factor plugin

The shared language of this repo. Glossary only: no procedures, no IDs, no
implementation decisions. Those live in the skills and in `docs/adr/`.

## Pipeline

**Prospect** — one person being evaluated for outreach, and one row in Airtable.
A Prospect exists from the moment the CSV is read, before anything is known
about them.

**Stage** — one step of the prospecting pipeline (scrape, fit, research,
outreach, verify, push). Every Stage ends by writing Airtable, which is what
makes a run resumable.

**Status** — where a single Prospect currently sits in the pipeline. It belongs
to the Prospect, not to the run: two Prospects in the same run are routinely at
different Statuses.

**Master run** — one execution of the n8n pipeline over one batch of
Prospects, started from one trigger. A Master run owns every Stage for its
batch; nothing outside it advances a Prospect's Status.

**Needs Attention** — the Status of a Prospect that a Master run could not
carry forward, together with the plain-English reason. It is the only way a
Prospect leaves the pipeline without finishing. A Prospect never disappears
silently.

**Operator console** — the Claude conversation an operator uses to ask what
happened, why a Prospect is stuck, to fix rows, and to start runs. The console
explains, repairs, and starts; it does not process batches.

**Console workflow** — the single-trigger n8n workflow the console calls to
start a Master run. It exists only because the engine has two triggers and a
chat session can reach just the first one.

**Sent** — the end state of a Good Fit. The pipeline sends without a human
review step: a Safe email goes to Instantly; anything else becomes a CRM
contact with a note for a LinkedIn connection.

**Tier 1 change** — an n8n edit that restores or retries without changing what
the pipeline decides or writes: roll back, re-publish, re-bind a credential,
add a coach, re-run, raise a timeout. An operator may make it alone.

**Tier 2 change** — an n8n edit that changes what the pipeline does for every
future row: prompts, models, wiring, send rules, schema. Goes to Jordan. The
test is "is this about one person, or about the workflow?" — one person is
never an n8n change.

**Scraper outage** — a Master run in which the LinkedIn scraper accepted valid
URLs and returned nothing, or almost nothing, in seconds. Rows are parked as
Needs Attention with that reason; they need a re-run, not an edit.

## Data sources

**Actor** — an Apify web-data automation. Kingdom Factor uses one, the
LinkedIn profile scraper, called only from inside the engine with the n8n
credential. Nothing calls it from a chat.

**Actor run** — one execution of an Actor over a batch of profile URLs. Billed
per result, so an Actor run is a thing with a price, not a free retry.

**Dataset item** — one object an Actor run returns, one per submitted URL. A
dataset item is **raw**: the skill cleans it, the Actor never does. An item is
either an enriched profile or a failure stub; both are dataset items.

**Research** — the public footprint of a Prospect (podcasts, articles, talks,
books, press) found by a web-search model inside the engine, stored as readable
text with sources, and used as the opening hook of the draft. Research is
nice-to-have: when it finds nothing the row still proceeds.

**Candidate email** — an address a Prospect *might* be reachable at, before
verification has an opinion. A Prospect can have several; at most one becomes
the Prospect's email.

## Judgement

**Clean** — to repair and normalise a raw value into something safe to write to
Airtable. Cleaning is the engine's judgement. Only an unclear **first name** on
a Good Fit flags the row for a human; a missing last name or company is fine.

**Flag for a human** — to record on the row that something could not be
resolved confidently, with the specific reason. The opposite of a silent
default. Rows that are Not a Fit are never flagged; nobody contacts them.

**Human override** — a `Fit Status` set by an operator before a re-run. A human
Good Fit survives the re-run and is sent; a human Not a Fit stops the row.

**ICP Criteria / Offer voice** — the Airtable text that defines who counts as a
fit and how outreach sounds. Operators own and edit it; the engine reads it on
every run. It is business copy, not configuration.

**Fabricated email** — a placeholder address synthesised only so a CRM upsert
can succeed. A fabricated email is never contactable and never real.

**Learning** — a recurring data quirk discovered during a pipeline run, written
down so the next run is less brittle. A **seed** learning ships with the plugin
and is read-only; a **run-discovered** learning is operator-side and survives
plugin updates.

## Coaches

**Coach** — one Kingdom Factor coach. A Coach is never a Prospect: a Prospect
is someone a Coach is reaching out to. One Coach lives in three systems at
once — the CRM, the platform, and Airtable — and is the same person in all
three.

**KF email** — the coach's `@kingdomfactor.us` address. It is the identity of
a Coach everywhere: the CRM login, the platform login, and the key every
system is matched on. A human creates it in Google Workspace before onboarding
starts; nothing in Kingdom Factor can create it.

**Sub-account** — the CRM location that belongs to one Coach. It holds that
coach's contacts, funnels, and calendars. Airtable calls its id `CRM ID`; the
platform calls it `ghl_location_id`. One Coach has exactly one Sub-account.

**Custom value** — a named variable inside one Sub-account. The snapshot's
funnels and emails read it, so a blank or wrong Custom value shows up as a
blank or wrong word on a page the coach's audience sees.

**Onboarding run** — one pass over one Coach that brings the CRM, the platform,
and Airtable into agreement. A run that finds nothing creates the Coach; a run
that finds a Coach already there fills what is missing. Creating is the empty
case of the same job, not a different job.

**Coach index** — the Airtable `Coaches` table, seen correctly: a list that
says which Coaches exist and what their `CRM ID` is. It is not where a Coach's
details live. A field is added to it only when a human editing that field
would change something real; otherwise the field would invite an edit that
goes nowhere.

**Audit** — the read-only half of an Onboarding run. It reads all three
systems and reports what is there, what is missing, and what disagrees. An
Audit writes nothing, so it is always safe to run.

**Apply** — the writing half of an Onboarding run. It runs only after a human
sees the Audit and agrees to it. Apply fills what is blank; it never
overwrites a filled value that a human has not ruled on.
