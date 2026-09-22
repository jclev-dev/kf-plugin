# kingdom-factor plugin (`kf-plugin`)

Private Claude Code plugin holding Kingdom Factor's internal skills. It is the
**single source of truth** for these skills — do not hand-copy them elsewhere.

## What's inside

| Skill | Purpose |
|---|---|
| `kf-prospecting` | **Operator console** for the prospect pipeline: what is stuck and why, how a run went, fix a row, approve a person, start a run, edit who counts as a fit. The pipeline itself runs in n8n as one execution per batch (workflow "Run prospect pipeline"): form upload → Apify scrape → Gemini clean + fit → Reoon verify → Perplexity research → Claude draft → **sent automatically** (Instantly, or GHL + LinkedIn) + email report. No human review gate. AI judgment runs inside n8n on the client's OpenRouter key, not in a chat seat (ADR 0002). |
| `kf-n8n-ops` | Keep the pipeline healthy. **Tier 1** (operator, alone): roll back, re-publish, re-bind a credential, add a coach, re-run after an outage, check OpenRouter/Apify usage. **Tier 2** (Jordan): prompts, models, wiring, send rules. The test: "is this about one person, or the workflow?" — one person is an Airtable edit, never n8n. |
| `kf-marketing-manager` | Plain-English coach marketing reports for KF owners and coaches ("how's Mark doing", "how's everyone doing", "who's slipping"). **Read & advise only** — reads synced GoHighLevel data through the kingdom-factor app's hosted, OAuth-protected remote MCP connector; access is scoped to the signed-in user's KF role (admin = full roster, coach = own marketing only); never writes to GHL or the app. |
| `kf-new-coach` | **Onboard one coach** across the GoHighLevel CRM, the Kingdom Factor platform and the Airtable Coaches index. One job in two halves: `KF Coach: Audit` reads all three and writes nothing; `KF Coach: Apply` writes, and only with `confirmed: true` after the operator has read the audit. Creating a coach is the case where the audit found nothing — there is no separate repair mode. Apply fills blank custom values, keeps values that agree, and overwrites a disagreeing value only when the operator names that field (ADR 0003). |

Everyone uses the **same shared KF n8n + Airtable**, so all backend IDs are
baked into the skills — there is **zero per-user configuration**. The only
per-machine requirements are the connectors below.

## Prerequisites (per machine)

Project-level MCP servers are declared in `.mcp.json` (OAuth, no keys to
paste): `kf-n8n` (`kingdomfactor.app.n8n.cloud`) and `kf-airtable`. Sign in to
each once. Scraping, research, verification and sending all happen inside n8n
with stored credentials; no other connector is needed. (Claude Cowork: install
the plugin and add the same two connectors.)

4. **kingdom-factor remote MCP connector** — for `kf-marketing-manager`. It is
   **not bundled**; it is the kingdom-factor app's hosted endpoint. Add it once
   per user in the Claude app under **Settings → Connectors → Add custom
   connector**:

   - **Remote MCP server URL:** `https://kingdomfactor.us/mcp`

After installing, reload Claude Code and confirm `kf-prospecting`,
`kf-n8n-ops`, `kf-marketing-manager`, and `kf-new-coach` appear in the
available skills. For
`kf-marketing-manager`, add the kingdom-factor remote connector and sign in
per Prerequisites #4 before first use.

## The pipeline (for operators)

Upload form: `https://kingdomfactor.app.n8n.cloud/form/prospect-pipeline`,
or attach the CSV to the Claude chat and say which coach it is for (Claude
creates the rows, skips duplicates, and starts the run). The CSV needs a
`LinkedIn URL` column; `Email` is optional; names need not be clean. One report email per run; Good Fits are sent automatically. Rows a
human must look at land at Airtable `Status = Needs Attention` with the reason
in `Attention Reason`. Everything after that is a conversation with Claude:
"re-run Josh R and Mary for Matt", "Josh is a good fit, send him", "what's
stuck for David Moody?" Claude edits the rows and starts the run; nobody opens
n8n. Full operator card: `docs/jen-one-pager.md` (internal).

## Recommended companion installs

Not bundled (to avoid drift / licensing); install separately where useful:

- **`anthropic-skills:xlsx`** — robust `.xlsx`/`.csv` handling for prospect
  uploads and the downloadable CSV deliverables.
- **`n8n-mcp-skills`** — expert n8n MCP guidance; needed for Tier 2 work on
  the pipeline workflow (Jordan).

## Updating / versioning

This repo is both the plugin and its own marketplace
(`.claude-plugin/marketplace.json`, `source: "./"`). To ship a change:

1. Edit the skill(s) here (this repo is canonical — the `kingdom-factor` app
   repo only holds a pointer).
2. Bump `version` in **both** `.claude-plugin/plugin.json` and
   `.claude-plugin/marketplace.json` (semver).
3. Commit and push. Operators update via the plugin-update flow in Claude
   Code / Cowork (or `git pull` + reinstall).

Changelog: `CHANGELOG.md`.

Run-discovered learnings are **not** stored in the plugin (its install dir is
replaced on update). They live operator-side in
`kf-prospecting-learnings.local.md` / `kf-marketing-learnings.local.md`;
promote broadly-true ones into the corresponding shipped
`skills/<skill>/learnings.md` here and cut a new version.

## Repo layout

```
kf-plugin/
├── .claude-plugin/{plugin.json, marketplace.json}
├── CONTEXT.md                     # shared vocabulary (glossary only)
├── skills/
│   ├── kf-prospecting/{SKILL.md, references/*.md, learnings.md}
│   ├── kf-n8n-ops/SKILL.md
│   └── kf-marketing-manager/{SKILL.md, references/*.md, learnings.md}
├── README.md
└── .gitignore
```
