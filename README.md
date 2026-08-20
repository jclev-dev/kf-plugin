# kingdom-factor plugin (`kf-plugin`)

Private Claude Code plugin holding Kingdom Factor's internal skills. It is the
**single source of truth** for these skills — do not hand-copy them elsewhere.

## What's inside

| Skill | Purpose |
|---|---|
| `kf-prospecting` | **Operator console** for the prospect pipeline: what is stuck and why, how a run went, fix a row, start a re-run. The pipeline itself runs in n8n as one execution per batch (workflow "Run prospect pipeline"): form upload → Apify scrape → Claude clean + fit → Reoon verify → Claude draft → Airtable `Ready for Review` + email report. Claude's judgment runs inside n8n on the client's API key, not in a chat seat (ADR 0002). |
| `kf-n8n-ops` | Maintain the pipeline workflow and the push tools behind the Airtable `Queue`: failed runs, expired credentials, add a coach to the form, change prompts/model, publish / roll back. |
| `kf-marketing-manager` | Plain-English coach marketing reports for KF owners and coaches ("how's Mark doing", "how's everyone doing", "who's slipping"). **Read & advise only** — reads synced GoHighLevel data through the kingdom-factor app's hosted, OAuth-protected remote MCP connector; access is scoped to the signed-in user's KF role (admin = full roster, coach = own marketing only); never writes to GHL or the app. |

Everyone uses the **same shared KF n8n + Airtable**, so all backend IDs are
baked into the skills — there is **zero per-user configuration**. The only
per-machine requirements are the connectors below.

## Prerequisites (per machine)

Project-level MCP servers are declared in `.mcp.json` (OAuth, no keys to
paste): `kf-n8n` (`kingdomfactor.app.n8n.cloud`), `kf-airtable`, `kf-apify`.
Run `/mcp` once and sign in to each. `kf-apify` is optional for the console —
scraping happens inside n8n with the `Apify: KF Token` credential.

4. **kingdom-factor remote MCP connector** — for `kf-marketing-manager`. It is
   **not bundled**; it is the kingdom-factor app's hosted endpoint. Add it once
   per user in the Claude app under **Settings → Connectors → Add custom
   connector**:

   - **Remote MCP server URL:** `https://kingdomfactor.us/mcp`

After installing, reload Claude Code and confirm `kf-prospecting`,
`kf-n8n-ops`, and `kf-marketing-manager` appear in the available skills. For
`kf-marketing-manager`, add the kingdom-factor remote connector and sign in
per Prerequisites #4 before first use.

## The pipeline (for operators)

Upload form: `https://kingdomfactor.app.n8n.cloud/form/prospect-pipeline`.
The CSV needs a `LinkedIn URL` column; `Email` is optional; names need not be
clean. One report email per run. Rows a human must fix land at Airtable
`Status = Needs Attention` with the reason in `Attention Reason`; fix, tick
`Re-run`, and ask Claude to start the re-run. Full operator card:
`docs/jen-one-pager.md` (internal). Everything else is in the two skills.

## Recommended companion installs

Not bundled (to avoid drift / licensing); install separately where useful:

- **`anthropic-skills:xlsx`** — robust `.xlsx`/`.csv` handling for prospect
  uploads and the downloadable CSV deliverables.
- **`n8n-mcp-skills`** — expert n8n MCP guidance; needed for deep node-level
  rebuilds of the tool workflows (see `kf-n8n-ops`).

## Updating / versioning

This repo is both the plugin and its own marketplace
(`.claude-plugin/marketplace.json`, `source: "./"`). To ship a change:

1. Edit the skill(s) here (this repo is canonical — the `kingdom-factor` app
   repo only holds a pointer).
2. Bump `version` in **both** `.claude-plugin/plugin.json` and
   `.claude-plugin/marketplace.json` (semver).
3. Commit and push. Operators update via `git pull` + reinstall (Option B) or
   the Claude Code plugin-update flow (Option A).

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
