# Learnings — marketing-report quirks & framing

> **READ-ONLY SHIPPED SEED.** This file is the institutional baseline that
> travels with the plugin. The plugin install directory is replaced on every
> update, so **do not write here at runtime** — anything added is lost.
> Run-discovered learnings go in the operator-side file
> `kf-marketing-learnings.local.md` in the working directory the skill is
> invoked from (see `references/setup.md`). Read this seed *and* that file at
> the start of every session; append only to the operator-side file.

Keep entries short: the pattern, how to recognize it, what to do.

## Seeded at packaging time

- **"Outreach" ≠ messages sent.** v1 `outreach.opportunities_created` counts
  *opportunities created* in the window, not contacts reached or messages
  sent. Recognize: owner asks "how many people did she contact". Do: answer
  with new opportunities created and say raw contact/message volume isn't
  tracked here yet — never invent a contact number.

- **Movement is daily-sync best-effort.** GHL data syncs ~once/day, so a
  transition between syncs is attributed to when it was last observed.
  Recognize: owner expects real-time. Do: always pair movement with the
  freshness line; never imply minute-by-minute accuracy.

- **Freshness is never optional.** Every `freshness` block must reach the
  owner in plain words. `live` is always `false` in v1. Recognize: tempting to
  state a number bare. Do: append "based on data synced ~N hours ago".

- **A failed sync means a partial picture.** `freshness.last_sync_error` set →
  that coach's latest sync failed. Recognize: numbers look suspiciously low /
  flat. Do: say the picture may be incomplete because the last sync failed;
  treat it as a red attention signal — don't present partial data as full.

- **Fabricated emails exist in GHL data.** The prospecting pipeline synthesizes
  placeholder addresses like `firstname_lastname@noemail.com.invalid` when a
  contact has no email. Recognize: `.invalid` / `noemail` addresses in contact
  fields. Do: never present these as real, contactable addresses in a report.

- **Coach names collide.** Multiple coaches share first/last names. Recognize:
  `coach_report` returns HTTP 300, or `resolve_coach` returns `match_count > 1`.
  Do: ask the owner which one (show name + email) before reporting — never pick
  silently.

- **Enrolled vs anyone.** Portfolio = `marketing_active` coaches only; a
  by-name deep dive works for anyone. Recognize: owner asks "how's everyone"
  (portfolio, enrolled only) vs "how's <name>" (any coach). Do: don't widen the
  portfolio to non-enrolled coaches; don't refuse a named non-enrolled coach.

## Run-discovered learnings

Not added here (read-only — see banner). They go in the operator-side
`kf-marketing-learnings.local.md`, newest first, using:

```
### YYYY-MM-DD — short title
Pattern: ...
Recognize: ...
Do: ...
```

If a learning proves broadly true across operators, promote it into this seed
in the `kf-plugin` repo and cut a new plugin version.
