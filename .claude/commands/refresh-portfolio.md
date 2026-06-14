---
description: Re-discover dev projects and regenerate the portfolio's projects.json
---

You are refreshing the auto-populated portfolio in this directory. Work precisely and report a diff at the end.

## Steps

1. **Discover.** Run `node scripts/discover.mjs`. This rewrites `data/projects.raw.json` with the current structural data (GitHub repos + local `~/dev` projects, deduped, private repos excluded). If it errors (e.g. `gh` not authenticated), stop and report — do not continue with stale data.

2. **Read the three inputs:**
   - `data/projects.raw.json` — fresh structural data (no prose).
   - `data/overrides.json` — hand-curation, keyed by `id`. These values are authoritative.
   - `data/projects.json` — the existing published data, if present (its `description`/`benefit` are already-approved prose).

3. **Build the merged item list.** For each item in `projects.raw.json`, by `id`:
   - Start from the raw fields.
   - `description` / `benefit`:
     - If `overrides.json` defines them → use those.
     - Else if the existing `projects.json` already has them → keep them unchanged (do **not** rewrite approved prose).
     - Else (new or empty) → **write them yourself** from `readmeExcerpt`:
       - `description`: one factual sentence describing what it is.
       - `benefit`: one sentence — who it helps and how (the outcome).
       - Voice: understated, professional, agency-style (match the existing entries). No hype, no exclamation marks. British/AU spelling is fine. Summarise Japanese READMEs into clean English.
   - Apply any other `overrides.json` fields last (name, type, link, linkLabel, featured, hidden, order) — overrides always win.
   - Drop the `readmeExcerpt` and `topics` fields from the final object. Ensure each item has: `id, name, type, description, benefit, link, linkLabel, source, repo, private, tech, updatedAt, featured, hidden, order`.

4. **Sort** by `featured` (true first), then `order` (ascending), then `updatedAt` (newest first). Set `generatedAt` to today's date.

5. **Write** the result to `data/projects.json` (pretty-printed, 2-space indent).

6. **Report a diff:** list items added, items whose prose you newly generated (so the user can review), items hidden/renamed by overrides, and the final count. Flag any item whose source README was non-English or empty so the user reviews that copy.

## Notes
- Never include `private: true` items — `discover.mjs` already filters them, but double-check none slipped through.
- Local-only projects (`link: null`) are expected; render them link-less, never invent a URL or use a filesystem path.
- This command is idempotent: running it twice with no project changes should leave `projects.json` unchanged.
