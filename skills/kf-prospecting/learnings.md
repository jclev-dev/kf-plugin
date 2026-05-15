# Learnings — accumulated data quirks & fixes

> **READ-ONLY SHIPPED SEED.** This file is the institutional baseline that
> travels with the plugin. The plugin install directory is replaced on every
> update, so **do not write here at runtime** — anything added would be lost.
> Run-discovered learnings go in the operator-side file
> `kf-prospecting-learnings.local.md` in the run's working directory (see
> `references/setup.md` §6). Read this seed *and* that file at the start of
> every run; append only to the operator-side file.

This seed captures the patterns known at packaging time. Keep entries short: the
pattern, how to recognize it, what to do.

## Seeded from the legacy n8n system (known brittle spots it had)

These are the exact places the old deterministic workflow broke. You handle them
with judgment now — but knowing the shapes speeds you up.

- **LinkedIn URL forms** — Apify may return a different URL form than the CSV
  supplied: vanity vs numeric IDs, locale subdomains (`de.linkedin.com`,
  `uk.linkedin.com`), `?miniProfileUrn=` / tracking params, trailing slashes,
  missing `https://`/`www.`. Match by the stable slug after `/in/`, lowercased,
  param-stripped — but verify by name/company, not slug alone.
- **Company size** — Apify returns inconsistent strings (`"2-10"`, `"10001-0"`,
  `"10,001+ employees"`, localized text). The old `mapCompanySize` returned
  `null` on anything unmapped. Instead: infer the right bucket from the numbers;
  only flag if truly unparseable.
- **Oversized profiles** — long `recommendations`/`experiences` arrays. The old
  `safeStringify` hard-capped at 90,000 chars and recursively halved arrays,
  silently dropping data. Summarize meaningfully instead; never chop
  mid-structure.
- **Reoon status drift** — the gate previously required the literal string
  `safe`. Real Reoon statuses include `safe`, `catch_all`, `disposable`,
  `invalid`, `role_account`, `spamtrap`, `unknown`. Map by meaning (see
  stages.md Stage 5), and watch for underscores vs spaces / title-casing.
- **Missing email + GHL** — GHL upsert fails without an `email`. The tool
  fabricates `firstname_lastname@noemail.com.invalid` and returns
  `email_fabricated:true`. That is expected and correct for GHL; just never let
  that address reach Instantly or be treated as real.
- **Airtable `Email Status` enum drift** — some older rows use `Valid`/`Accept
  All` where newer use `Safe`/`Catch All`. Treat semantically, write the newer
  option set.

## Run-discovered learnings

Run-discovered entries are **not** added here (this file is read-only — see the
banner above). They go in the operator-side file
`kf-prospecting-learnings.local.md` in the run's working directory, newest first,
using this template:

```
### YYYY-MM-DD — short title
Pattern: ...
Recognize: ...
Do: ...
```

If a learning proves broadly true across operators, promote it into this seed in
the `kf-plugin` repo and cut a new plugin version.
