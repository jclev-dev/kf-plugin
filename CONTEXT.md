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

**Run** *(pipeline sense)* — one invocation of the prospecting skill over a list
of Prospects. Distinct from an **Actor run** (below). When both senses are in
play, say "pipeline run" and "Actor run".

**Scope** — how far through the Stages the operator wants this pipeline run to
go. Scope is the operator's instruction; Status is the Prospect's reality.

## Data sources

**Actor** — an Apify web-data automation, called directly through the Apify MCP
connector. Kingdom Factor uses one: the LinkedIn profile scraper.

**Actor run** — one execution of an Actor over a batch of profile URLs. Billed
per result, so an Actor run is a thing with a price, not a free retry.

**Dataset item** — one object an Actor run returns, one per submitted URL. A
dataset item is **raw**: the skill cleans it, the Actor never does. An item is
either an enriched profile or a failure stub; both are dataset items.

**n8n tool** — a single-purpose n8n workflow that makes one credentialed
external call and returns a fixed envelope. n8n tools are pure functions: they
never touch Airtable and never call each other.

**Envelope** — the `{ok, data, error}` shape that **n8n tools** return. It is a
property of the n8n tools alone. Apify does not return an envelope, so the
scrape Stage has its own failure vocabulary.

## Judgement

**Clean** — to repair and normalise a raw value into something safe to write to
Airtable. Cleaning is the skill's judgement, and it either succeeds or the row
is flagged for a human. Silently coercing or dropping a value is not cleaning.

**Flag for a human** — to record on the row that a value could not be cleaned
confidently, with the specific reason. The opposite of a silent default.

**Fabricated email** — a placeholder address synthesised only so a CRM upsert
can succeed. A fabricated email is never contactable and never real.

**Learning** — a recurring data quirk discovered during a pipeline run, written
down so the next run is less brittle. A **seed** learning ships with the plugin
and is read-only; a **run-discovered** learning is operator-side and survives
plugin updates.
