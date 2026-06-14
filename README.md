# Shuhei Uto — Portfolio

A single-page, zero-build portfolio that **auto-populates** from real dev work:
public GitHub repos (`shuheifuller`) + local projects under `~/dev`. Each entry shows a
short description, a benefit, and a link. Styled after [flexdigital.io](https://flexdigital.io)
— monochrome, generous whitespace, fixed nav, one vertical Work list.

## How it works

```
discover.mjs ──▶ projects.raw.json ──▶ /refresh-portfolio (Claude writes prose) ──▶ projects.json ──▶ index.html
                                          ▲
                                  overrides.json (your edits always win)
```

- **`scripts/discover.mjs`** — deterministic. Queries `gh`, scans `~/dev/{Personal,Family,Project,Work}`, classifies each project (`app` / `html-page` / `automation` / `userscript` / `project`), dedupes local↔GitHub by repo name, and **excludes private repos**. Writes `data/projects.raw.json`.
- **`/refresh-portfolio`** (Claude Code command) — runs discovery, then writes the one-sentence `description` + `benefit` for any *new* project, applies `overrides.json`, and writes `data/projects.json`. Already-approved prose is never rewritten.
- **`data/overrides.json`** — your curation layer, keyed by project `id`. Anything you set (name, type, link, `featured`, `hidden`, `order`, custom prose) wins and survives every refresh.
- **`index.html` + `assets/`** — static page that `fetch`es `data/projects.json`. No framework, no build.

## Update the portfolio

1. Ship a project (push a new GitHub repo, or add a folder under `~/dev`).
2. In Claude Code, from this directory, run **`/refresh-portfolio`**.
3. Review the printed diff. To rename / hide / feature / reorder / rewrite anything, edit `data/overrides.json` and re-run.
4. Commit `index.html`, `assets/`, `data/*.json` and push.

Adding a project is essentially zero-effort: the discovery step finds it, Claude writes the first draft of its copy, and you tweak via overrides only if you want to.

## Preview locally

```bash
cd "Shuhei's Portfolio"
python3 -m http.server 8000
# open http://localhost:8000
```

(Must be served over `http://` — `main.js` `fetch`es the JSON, which file:// blocks.)

## Scheduled auto-refresh (optional)

`automation/refresh.sh` runs discovery + a headless `claude -p` prose pass, then commits & pushes **only if `projects.json` changed** (Pages redeploys on push). To run it daily at 09:00:

```bash
cp automation/com.shuhei.portfolio.refresh.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.shuhei.portfolio.refresh.plist
# dry-run once before trusting the schedule:
bash automation/refresh.sh   # check automation/refresh.log
```

To stop it: `launchctl unload ~/Library/LaunchAgents/com.shuhei.portfolio.refresh.plist`.

## Deploy (GitHub Pages)

1. Create a public repo, e.g. `shuheifuller/portfolio`.
2. Push these files to it.
3. Repo **Settings → Pages → Deploy from branch → `main` / root**.
4. Live at `https://shuheifuller.github.io/portfolio/`.

## Notes

- GitHub owner is `shuheifuller` (set once at the top of `discover.mjs`); the local macOS user is `shuheiuto` — don't confuse them in URLs.
- Tampermonkey/Greasemonkey `*.user.js` files are auto-detected as `userscript` once they exist under `~/dev`.
- Private repos (e.g. `family-wealth-dashboard`) are excluded in the script, so their data never reaches the published JSON.
