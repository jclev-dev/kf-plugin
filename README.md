# kingdom-factor plugin (`kf-plugin`)

Private Claude Code plugin holding Kingdom Factor's internal skills. It is the
**single source of truth** for these skills — do not hand-copy them elsewhere.

## What's inside

| Skill | Purpose |
|---|---|
| `kf-prospecting` | The coach prospecting pipeline runbook: ingest a CSV/Excel of prospects, scrape LinkedIn, judge fit, research, draft outreach, verify email, push to GoHighLevel / Instantly — or any partial slice. Owns Airtable as the source of truth; calls the four `KF Tool:` n8n workflows. |
| `kf-n8n-ops` | Diagnose / validate / recreate the four `KF Tool:` n8n workflows when a tool fails or before first-run setup. |
| `kf-marketing-manager` | Plain-English coach marketing reports for non-marketer KF owners ("how's Mark doing", "how's everyone doing", "who's slipping"). **Read & advise only** — reads synced GoHighLevel data through the bundled read-only `kf-marketing` connector; never writes to GHL or the app. |

Everyone uses the **same shared KF n8n + Airtable**, so all backend IDs are
baked into the skills — there is **zero per-user configuration**. The only
per-machine requirements are the connectors below.

## Prerequisites (per machine)

1. **KF n8n MCP connector** — added in Claude Code so the skills can call
   `execute_workflow`. Confirm by listing/searching workflows.
   (`kf-prospecting`, `kf-n8n-ops`.)
2. **Airtable access** to base `appB3GpIQaGaRVrsC` ("Kingdom Factor").
   (`kf-prospecting`.)
3. **`kf-marketing` connector env** — for `kf-marketing-manager`. The connector
   itself is **bundled with this plugin** (`.mcp.json` → `mcp/kf-marketing`,
   zero npm deps, Node ≥ 18); you only set two environment variables so it can
   reach the kingdom-factor app:

   ```sh
   export KF_MARKETING_API_URL="https://kingdomfactor.us"
   export KF_MARKETING_API_KEY="<shared agency-level marketing read key>"
   ```

   `KF_MARKETING_API_KEY` is the value the kingdom-factor admin stores in Rails
   credentials under `api.marketing_key` (read-only, shared, no per-user
   OAuth). See `mcp/kf-marketing/README.md`.

If a required connector/var is missing the relevant skill will stop and say so
— that is expected.

## Install

### Option A — Private marketplace (operators with git access to this repo)

```
/plugin marketplace add https://github.com/jclev-dev/kf-plugin
/plugin install kingdom-factor@kf-plugin
```

Requires the machine's git to be able to read the private repo (SSH key or
`gh auth login`). Best for developers / anyone already set up with repo access.

### Option B — Local path (recommended for non-developer operators)

The developer clones this repo onto the operator's machine once, then:

```
/plugin marketplace add /absolute/path/to/kf-plugin
/plugin install kingdom-factor@kf-plugin
```

No git credentials needed on the operator's side. To update later, `git pull`
in that folder and re-run `/plugin install` (or the Claude Code update flow).

After installing, reload Claude Code and confirm `kf-prospecting`,
`kf-n8n-ops`, and `kf-marketing-manager` appear in the available skills, and
that the bundled `kf-marketing` MCP connector is listed (set its two env vars
per Prerequisites #3 before first use).

## One-time n8n setup (do this once, in the n8n UI)

The four `KF Tool:` workflows ship inactive and uncredentialed (the n8n API
cannot attach credentials). **Full, authoritative steps live in the skill** at
`skills/kf-prospecting/references/setup.md` (sections 2–3) — follow that, do not
rely on a summary. In short: activate the four workflows, enable "Available in
MCP" on each, and attach the existing Apify / Reoon / GoHighLevel / Instantly
credentials to the named nodes. The six original legacy workflows are the
preserved fallback and must never be touched.

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
├── .mcp.json                     # bundled kf-marketing connector wiring
├── mcp/kf-marketing/{server.mjs, server.test.mjs, README.md}
├── skills/
│   ├── kf-prospecting/{SKILL.md, references/*.md, learnings.md}
│   ├── kf-n8n-ops/SKILL.md
│   └── kf-marketing-manager/{SKILL.md, references/*.md, learnings.md}
├── README.md
└── .gitignore
```
