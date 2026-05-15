# The four n8n tool workflows

Call these via the n8n MCP `execute_workflow` with the workflow ID and an input
object. They are pure functions: input → external API call → structured result.
They never touch Airtable and never call each other — sequencing is your job.

## The response envelope (every tool)

Every tool returns exactly this shape. **Always parse it. Never assume success.**

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

## 1. KF Tool: Scrape LinkedIn — `8lCOtgzuFSE5rSUE`

Input:
```json
{ "profile_urls": ["https://www.linkedin.com/in/...", "..."] }
```
`data` = the **raw** Apify dataset items array, untransformed. Each item has
`linkedinUrl`, `error` (set when a profile wasn't found), `firstName`,
`lastName`, `email`, `mobileNumber`, `headline`, `jobTitle`, `companyName`,
`companyIndustry`, `companySize`, `companyWebsite`, `currentJobDuration`,
`about`, `connections`, `followers`, `isPremium`, `isVerified`,
`openConnection`, `isJobSeeker`, `isCreator`, `isInfluencer`,
`totalExperienceYears`, `firstRoleYear`, and the arrays `experiences`,
`educations`, `skills`, `recommendations`, `recommendationsReceived`,
`volunteerAndAwards`, `publications`. **You** clean/shape this — the tool
deliberately does no normalization (see stages.md → data-cleaning).

Send batches of ~20 URLs. Match results back to your Prospect rows by reasoning
about the LinkedIn URL (see learnings.md for known URL-form quirks) — not by a
brittle exact-string slug.

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
