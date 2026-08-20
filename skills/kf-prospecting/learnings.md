# Learnings — accumulated data quirks & fixes

> **READ-ONLY SHIPPED SEED.** This file is the institutional baseline that
> travels with the plugin. The plugin install directory is replaced on every
> update, so **do not write here at runtime** — anything added would be lost.
> Run-discovered learnings go in the operator-side file
> `kf-prospecting-learnings.local.md` in the run's working directory (see
> SKILL.md "Rules"). Read this seed *and* that file at the start of
> every run; append only to the operator-side file.

This seed captures the patterns known at packaging time. Keep entries short: the
pattern, how to recognize it, what to do.

## Seed (known data quirks — useful when explaining a row to the operator)

- **LinkedIn URL forms** — CSVs carry vanity vs numeric slugs, locale
  subdomains (`uk.linkedin.com`), tracking params. The pipeline matches on the
  slug after `/in/`; a row at `LI Not Found` with a plausible URL usually means
  Apify could not resolve a variant — open the URL by hand.
- **Honorific in the first-name column** — Seamless exports put `Dr.` /
  `Pastor` in `First Name`. The clean step fixes this; a `Needs Attention`
  "Name/company unclear" means even the LinkedIn name was ambiguous.
- **Company size strings** drift (`2-10`, `10,001+ employees`); the pipeline
  buckets them. Blank `Company Size` means unparseable, not an error.
- **Reoon statuses** — `safe` → Safe, `catch_all` → Catch All (usable, lower
  confidence), `role_account`, `disposable`/`invalid`/`spamtrap`/`disabled` →
  not usable, `unknown` → Unknown (often credit exhausted when many at once).
- **Airtable `Email Status` enum drift** — old rows show `Valid` / `Accept
  All`; read them as Safe / Catch All.
- **Fabricated email** — legacy GHL pushes synthesised
  `first_last@noemail.com.invalid` when no real email existed. Never treat one
  as contactable.

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
