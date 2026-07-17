# Shuhei Uto — Portfolio

A zero-build portfolio that **auto-populates** from real dev work: public GitHub repos
(`shuheifuller`) + local projects under `~/dev`. Styled after [flexdigital.io](https://flexdigital.io)
— monochrome, generous whitespace, fixed nav, one vertical Work list.

**The apps are shared privately.** The portfolio does **not** link out to the apps or their
repos. Each Work row links to an on-site **detail page** (`project.html?id=<id>`) that explains
the project with an overview, highlights, and screenshots — but never exposes the app's URL.

> ⚠️ Removing links hides the apps from the portfolio, but any project still published on GitHub
> Pages or in a public repo remains reachable by direct URL. To truly restrict access, make those
> repos private (disables free Pages) or password-gate the live demos — that's a separate step.

## How it works

```
discover.mjs ──▶ projects.raw.json ──▶ /refresh-portfolio (Claude writes prose) ──▶ projects.json ──▶ index.html
                                          ▲
                                  overrides.json (your edits always win)
```

- **`scripts/discover.mjs`** — deterministic. Queries `gh`, scans `~/dev/{Personal,Family,Project,Work}`, classifies each project (`app` / `html-page` / `automation` / `userscript` / `project`), dedupes local↔GitHub by repo name, and **excludes private repos**. Writes `data/projects.raw.json`.
- **`/refresh-portfolio`** (Claude Code command) — runs discovery, then writes the one-sentence `description` + `benefit` for any *new* project, applies `overrides.json`, and writes `data/projects.json`. Already-approved prose is never rewritten.
- **`data/overrides.json`** — your curation layer, keyed by project `id`. Anything you set (name, type, link, `featured`, `hidden`, `order`, custom prose) wins and survives every refresh.
- **`index.html` + `assets/`** — static Work list that `fetch`es `data/projects.json`. No framework, no build.
- **`project.html` + `assets/detail.js`** — detail page rendered from the same JSON by `?id=`, with an image gallery.
- **`scripts/gen-placeholders.mjs`** — writes `assets/img/<id>/cover.svg` for any project missing a real screenshot (never overwrites one you've added).

## Owner-only links (the link vault)

Direct links to each app exist on the site but are **encrypted** — visitors can't see or
recover them; you unlock them once per device.

- `data/links.private.json` — the plaintext links (**gitignored**, never published).
- `scripts/lock-links.mjs` — encrypts it: `node scripts/lock-links.mjs "<passphrase>"`
  → writes `data/links.enc.json` (AES-256-GCM, safe to publish/commit).
- `assets/vault.js` — browser-side decrypt (PBKDF2 + WebCrypto).

**To unlock on one of your devices:** open any project detail page → click the small
**"owner unlock"** link under *Access* → enter the passphrase. The device stays unlocked
(localStorage) until you click **"lock this device"**. When unlocked, detail pages show
"Owner links" (open app / source) and the Work list gains small ↗ direct-open arrows.

**To change links or passphrase:** edit `data/links.private.json`, re-run
`node scripts/lock-links.mjs "<new-passphrase>"`, commit `data/links.enc.json`, push.

Honest scope: the encryption genuinely protects the URLs in the published site, but the
apps themselves live at guessable public URLs (`shuheifuller.github.io/<repo>/`) and the
repos are public — this hides the links, it does not authenticate the apps.

## Adding real screenshots

Each project's images live in `assets/img/<id>/`. To replace the generated placeholder:

1. Drop a real image in, e.g. `assets/img/block-survival/cover.svg` (or `.png`/`.jpg`).
2. For more than one image, add files and list them in that project's `detail.images` array in
   `data/projects.json` (or in `data/overrides.json`): `"images": [{"src": "./assets/img/block-survival/1.png", "caption": "Wave 5"}]`.
3. Commit and push.

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
- The black-cat feature image (`assets/img/black-cat.jpg`) is a free [Pexels](https://www.pexels.com/photo/black-cat-28119304/) photo (Pexels License — free for commercial use, no attribution required); the monochrome low-key look is applied in CSS. Swap the file to use your own cat's photo.
