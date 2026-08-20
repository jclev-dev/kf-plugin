# Setup & Prerequisites

This skill orchestrates three external systems. If one is missing, stop and
tell the operator exactly what to connect — do not attempt a partial run.

## 1. Connectors that must be available in this Claude environment

- **Apify MCP connector** — used to scrape LinkedIn profiles (Stage 1) by
  calling the Actor directly. Confirm the tool for
  `dev_fusion/linkedin-profile-scraper` is available. Added once in the Claude
  app under **Settings → Connectors → Add custom connector**:

  - **Remote MCP server URL:**
    `https://mcp.apify.com/?tools=actors,docs,runs,storage,tasks,dev_fusion/Linkedin-Profile-Scraper`

  Auth is **OAuth on first connect** — there is no API token to paste and none
  belongs in any config. If it is missing, say:

  > "I can't scrape LinkedIn profiles — the Apify connector isn't added in this
  > Claude app. Add it under Settings → Connectors → Add custom connector with
  > the URL above, complete the Apify sign-in, then ask me again. There is no
  > other way to scrape; I won't guess."

  Then stop — **but only if the run's scope includes scraping.** A scope that
  skips scraping (e.g. "verify these emails and give me a CSV" over rows that
  are already `Scraped`) does not need Apify at all and must not be blocked by
  its absence.

- **n8n MCP server** — used to call the three tool workflows via
  `execute_workflow`. Confirm you can list/search workflows. If absent: the
  operator must add the Kingdom Factor n8n MCP connector in Claude Code settings.
- **Airtable access** — read/write to base `appB3GpIQaGaRVrsC` ("Kingdom
  Factor"). Confirm you can query the Prospects table. If absent: the operator
  must connect Airtable for that base.

## 2. The three n8n tool workflows (already created, must be ACTIVE + MCP-exposed)

| Tool | Workflow ID |
|---|---|
| KF Tool: Verify Email | `V0EoKHXbdmk7g6au` |
| KF Tool: GHL Push Contact | `otarDiS3anrAKzaC` |
| KF Tool: Instantly Add Lead | `BwbeD81BHGyz7fbh` |

> **Retired:** `KF Tool: Scrape LinkedIn` (`8lCOtgzuFSE5rSUE`) is deactivated
> and no longer used. Scraping calls Apify directly (§1). Do not activate,
> call, or reinstate it — Stage 1 has exactly one path on purpose.

These are built but ship **inactive**. Before first use the operator must, in
the n8n UI:

1. **Activate** each of the 3 workflows.
2. **Enable "Available in MCP"** on each (the existing pipeline workflows show
   this on; these need it toggled so this skill can call them).
3. **Attach the existing credentials** (the n8n API cannot set these
   programmatically — this is a one-time manual step, expected):
   - `KF Tool: Verify Email` → node **Reoon: Verify Email** → Reoon credential
     (`v4mnEAmfrzCkXYeC`).
   - `KF Tool: GHL Push Contact` → nodes **Get Location Token**, **Upsert
     Contact**, **Create Note** → GoHighLevel OAuth credential (`9gatP0eYzl6hugXl`).
   - `KF Tool: Instantly Add Lead` → node **Instantly** → confirm it bound to
     the intended Instantly credential (`Instantly: KF`); re-select if there are
     multiple.

If a tool call returns an auth error, an unattached credential is the most
likely cause — report it as a setup gap, do not retry blindly.

## 3. The 6 original pipeline workflows are untouched

The legacy chained workflows (`H8qd…`, `JAzS…`, `VVnh…`, `xBrZ…`, `iZgp…`,
`cudl…`) are intentionally left exactly as-is as a fallback. **Never call,
modify, or activate them from this skill.** This skill uses only the three
`KF Tool:` workflows above, plus the Apify Actor called directly (§1).

## 4. Distribution & install

This skill ships inside the **`kingdom-factor` Claude Code plugin** (the
`kf-plugin` private repo) and is the single source of truth. Operators install
the plugin per that repo's `README.md` — they do **not** hand-copy this
directory. It works on any machine that has the Apify MCP connector, the n8n MCP
connector, and Airtable access from section 1, with the n8n side set up per
sections 2–3.

## 5. Shared backend — IDs are intentionally global

Every install points at the **same shared KF n8n + Airtable**. The tool-workflow
IDs in `references/tools.md` and the Airtable base `appB3GpIQaGaRVrsC` are
therefore baked in **on purpose** and are correct for all operators — they are
not per-install configuration. If the backend is ever re-pointed to a different
n8n instance or Airtable base, those IDs (and this note) are where to change it.

Apify is the exception in one respect: scraping is billed to whichever Apify
account the operator's connector is signed in to, per profile. Nothing about
that is configured in this skill.

## 6. Where run-discovered learnings are written

The plugin install directory is a managed cache that is replaced on every plugin
update, so the shipped `learnings.md` is a **read-only seed** — never written to
at runtime. Run-discovered learnings persist in an operator-side file,
`kf-prospecting-learnings.local.md`, in the working directory the prospecting run
is invoked from. Read both the seed and that file at the start of every run;
append new learnings only to the operator-side file.

Once setup is confirmed, read `references/airtable-schema.md`.
