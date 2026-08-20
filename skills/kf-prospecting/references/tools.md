# The tools this pipeline calls

Two different surfaces, and they fail differently:

- **Stage 1 (scrape)** calls the **Apify Actor directly** through the Apify MCP
  connector. No n8n involved. See §1 below.
- **Stages 5–6 (verify, push)** call the **three n8n tool workflows** via the
  n8n MCP `execute_workflow` with a workflow ID and an input object. They are
  pure functions: input → external API call → structured result. They never
  touch Airtable and never call each other — sequencing is your job.

Do not expect the two surfaces to behave alike. The envelope below belongs to
the n8n tools only; Apify has never heard of it.

## The response envelope (the three n8n tools only)

Each n8n tool returns exactly this shape. **Always parse it. Never assume
success.** Apify returns nothing of the kind — §1 has its own failure section.

```json
{
  "ok": true,
  "data": <tool-specific payload, or null on failure>,
  "error": {
    "step": "<which internal step failed>",
    "http_status": <number or null>,
    "message": "<human-readable>",
    "body": <raw response body or null>
  }
}
```

`ok:false` with `http_status:429` or `5xx` → transient. Retry with exponential
backoff (e.g. 2s, 8s, 30s), max ~3 attempts, **logging every attempt**. A
non-transient failure (4xx other than 429, or `ok:false` with a clear message)
→ do not retry; record it on the row and in the run report. The whole reason
this envelope exists is so you always have full visibility — never swallow it.

## 1. Scrape LinkedIn — the Apify Actor, called directly

**There is no n8n scrape tool.** The former `KF Tool: Scrape LinkedIn` workflow
is retired and deactivated. Stage 1 has exactly one path: the Apify MCP
connector. If it is unavailable, scraping does not happen — never fall back to
n8n, and never look for another route.

### The tool

Call the tool the Apify MCP connector exposes for the Actor
**`dev_fusion/linkedin-profile-scraper`** (the Actor name is stable; the tool
name the server generates for it may vary, so identify it by Actor, not by a
hardcoded string). This is the same Actor the retired n8n workflow called, so
the result shape is unchanged.

Input:
```json
{ "profileUrls": ["https://www.linkedin.com/in/...", "..."] }
```

Send **batches of ~10 URLs**, smaller if profiles come back unusually large.
The Actor itself tolerates more, but the results now land in your context
instead of an n8n node, and a stalled Actor run should not put 20 prospects in
limbo. Airtable is written per batch, so smaller batches mean finer resume
granularity.

### Actor-only rule (this one costs money to break)

The connector also exposes `actors`, `docs`, `runs`, `storage`, and `tasks`.

- The **only** Actor you may ever run is `dev_fusion/linkedin-profile-scraper`.
- `runs` and `storage` are **read-only recovery** — use them to retrieve the
  results of a run *you started* if a response comes back truncated. That is
  their entire purpose here.
- Never search for another Actor, never start another Actor, never create a
  task, however helpful it seems. Every Actor is billable and inventing spend
  is not your call.

### The results

You get back the **raw** dataset items, one per submitted URL, untransformed —
exactly as before. A successful item has `linkedinUrl`, `linkedinPublicUrl`,
`firstName`, `lastName`, `fullName`, `headline`, `email`, `mobileNumber`,
`jobTitle`, `companyName`, `companyIndustry`, `companySize`, `companyWebsite`,
`currentJobDuration`, `about`, `connections`, `followers`, `isPremium`,
`isVerified`, `openConnection`, `isJobSeeker`, `isCreator`, `isInfluencer`,
`totalExperienceYears`, `firstRoleYear`, `publicIdentifier`, `urn`, and the
arrays `experiences`, `educations`, `skills`, `languages`, `certifications`,
`recommendations`, `recommendationsReceived`, `volunteerAndAwards`,
`publications`. **You** clean and shape all of it — the Actor deliberately does
no normalization (see stages.md → data-cleaning).

A failed item looks different, and this is the trap:

```json
{ "inputUrl": "https://www.linkedin.com/in/invalid-profile",
  "succeeded": false,
  "error": "Profile enrichment API responded with success=false." }
```

The URL is under **`inputUrl`**, not `linkedinUrl`, and the profile fields are
absent entirely. So:

- Match each returned item to a Prospect row on `linkedinUrl` **or**
  `inputUrl`, reasoning about URL equivalence (vanity vs numeric, locale
  subdomains, tracking params, trailing slashes — see learnings.md). Never
  match positionally: the Actor works concurrently and skips invalid URLs, so
  index alignment is not guaranteed.
- Any URL you submitted that appears under **neither** key is a miss →
  `Status="LI Not Found"`. Every submitted URL must end the batch as exactly one
  of `Scraped`, `LI Not Found`, or still-`New`-and-reported. Nothing may
  silently vanish.

### When it fails — two kinds, handled differently

**Row failure** — one profile didn't resolve (`succeeded:false`, or missing from
the results). Write `Status="LI Not Found"` with the reason and **keep going**.
This is normal; it is not an incident.

**Platform failure** — the Actor run itself fails, the connector errors, auth is
rejected, or the account is out of credit. This is not a per-row problem and
retrying it harder will not fix it. **Tell the operator plainly what is wrong**
("Apify is refusing runs — the account is out of credit", "the Apify connector
isn't authorised"), stop attempting scrapes, and follow the mid-run rule in
stages.md: carry rows already at `Scraped` through the remaining in-scope
stages, leave the rest at `New`, and report. Knowing *why* it broke, and saying
so, is the whole reason this stage moved off n8n — the operator should never be
left re-running a scrape to see if it works this time.

### Retrying costs real money

This Actor is **pay-per-result** ($10 / 1,000 profiles). Re-running a batch of
10 in which 8 succeeded bills you for those 8 again. Therefore:

- **Write the successes to Airtable at `Scraped` first**, then retry.
- Retry **only** the URLs that failed or went missing, as a fresh, smaller call.
- **One retry.** Then mark whatever still failed and move on.
- **Never re-scrape a row already at `Scraped` or beyond.** The resume logic in
  stages.md is not just a convenience now; it is the spend control.

## 2. KF Tool: Verify Email — `V0EoKHXbdmk7g6au`

Input (ordered candidates — usually `[Seamless Email, LI Scrape Email]`):
```json
{ "emails": ["a@co.com", "b@co.com"] }
```
`data` = `[{ "email": "...", "status": "<Reoon status verbatim>", "raw": {...} }]`
The tool does **not** decide safe/unsafe — Reoon's raw status comes back as-is.
You apply judgment (see stages.md → email policy) about what's usable.

## 3. KF Tool: GHL Push Contact — `otarDiS3anrAKzaC`

Input:
```json
{
  "coach_crm_id": "<Coaches.CRM ID>",
  "contact": {
    "firstName": "...", "lastName": "...",
    "email": "<real email, or omit/empty>",
    "companyName": "...", "linkedin_profile": "https://...",
    "source_channel": "Automated Article Outreach" | "Future Connections"
  },
  "note": "<the composed CRM note>"
}
```
Does: GHL locationToken (agency `aDajZEFaBBFBml5rV6ZR`, locationId =
`coach_crm_id`) → contacts/upsert → contacts/{id}/notes.
`data` = `{ "contact_id": "...", "email_fabricated": true|false }`.
**`email_fabricated:true`** means no real email existed and a
`firstname_lastname@noemail.com.invalid` placeholder was synthesized so the GHL
upsert wouldn't fail (GHL requires an email). Record this on the row; never
treat that address as contactable and never send it to Instantly.
`error.step` ∈ `token` | `upsert` | `note`.

## 4. KF Tool: Instantly Add Lead — `BwbeD81BHGyz7fbh`

Input:
```json
{
  "campaign_id": "<Coaches.Instantly Campaign ID>",
  "email": "<verified, real, usable email>",
  "firstName": "...", "lastName": "...",
  "personalization": "<the Draft Email>",
  "coachFirst": "...", "coachFull": "...", "coachCity": "...", "coachState": "..."
}
```
`data` = `{ "lead_id": "..." }`. Only ever call this with a real, verified
email — never a fabricated one.

Next: `references/stages.md`.
