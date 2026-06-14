#!/usr/bin/env node
// Deterministic discovery for the auto-populating portfolio.
//
// Scans GitHub (via `gh`) + the local ~/dev tree, classifies each project,
// dedupes local<->GitHub by repo name, drops private repos, and writes
// data/projects.raw.json. This file contains every structural field EXCEPT
// the prose (`description` / `benefit`) — those are written by Claude in the
// /refresh-portfolio step. A `readmeExcerpt` is included to feed that step.
//
// No npm dependencies. Run from anywhere: `node scripts/discover.mjs`.

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const GH_OWNER = "shuheifuller";                 // GitHub username (NOT the macOS user `shuheiuto`)
const INCLUDE_PRIVATE = false;                   // never leak private repos onto a public page
const DEV_ROOT = join(homedir(), "dev");
const SCAN_DIRS = ["Personal", "Family", "Project", "Work"];
const SKIP_NAMES = new Set([
  "Shuhei's Portfolio",   // this project
  "cc-knowledge",         // knowledge base, not a deliverable
  "untitled folder",
  ".DS_Store",
]);

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORTFOLIO_DIR = dirname(__dirname);
const DATA_DIR = join(PORTFOLIO_DIR, "data");
const OUT_FILE = join(DATA_DIR, "projects.raw.json");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function sh(cmd, args, opts = {}) {
  try {
    return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], ...opts }).trim();
  } catch {
    return null;
  }
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Turn "matefc-mock-app" / "wealth-dashboard" / "Anzac of Zombies" into a clean display name.
function displayName(raw) {
  return raw
    .replace(/[-_]+/g, " ")
    .replace(/\.git$/, "")
    .split(" ")
    .filter(Boolean)
    .map((w) => (w.length <= 3 && w === w.toUpperCase() ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ")
    .trim();
}

function readIfExists(p) {
  return existsSync(p) ? readFileSync(p, "utf8") : null;
}

// Find the best prose source file inside a project folder.
function findProse(dir) {
  const candidates = ["README.md", "Readme.md", "readme.md", "_Overview.md", "OVERVIEW.md"];
  for (const c of candidates) {
    const p = join(dir, c);
    if (existsSync(p)) return readFileSync(p, "utf8");
  }
  // package.json description as a last resort
  const pkg = readPkg(dir);
  if (pkg?.description) return pkg.description;
  return null;
}

function readPkg(dir) {
  const raw = readIfExists(join(dir, "package.json"));
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function listShallow(dir) {
  try { return readdirSync(dir); } catch { return []; }
}

// Classify a local folder into a portfolio `type`.
function classifyLocal(dir) {
  const entries = listShallow(dir);
  const has = (f) => entries.includes(f);
  const pkg = readPkg(dir);
  const deps = pkg ? { ...pkg.dependencies, ...pkg.devDependencies } : {};

  // Tampermonkey / Greasemonkey userscript (future-proofing)
  for (const f of entries) {
    if (f.endsWith(".user.js")) {
      const content = readIfExists(join(dir, f)) || "";
      if (content.includes("==UserScript==")) return "userscript";
    }
  }
  if (deps.next || deps.react || deps.vite || deps.vue || deps.svelte) return "app";
  if (has("requirements.txt") || has("pyproject.toml") || entries.some((f) => f.endsWith(".py"))) return "automation";
  if (has("index.html")) return "html-page";
  if (pkg) return "app";
  return "project";
}

// Collect a short tech list from package.json + a primary language.
function techFromLocal(dir, primaryLanguage) {
  const pkg = readPkg(dir);
  const tech = new Set();
  if (primaryLanguage) tech.add(primaryLanguage);
  if (pkg) {
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const known = {
      next: "Next.js", react: "React", vite: "Vite", vue: "Vue", svelte: "Svelte",
      three: "Three.js", "@anthropic-ai/sdk": "Claude API", "@supabase/supabase-js": "Supabase",
      tailwindcss: "Tailwind", express: "Express", ws: "WebSocket", typescript: "TypeScript",
    };
    for (const [dep, label] of Object.entries(known)) if (deps[dep]) tech.add(label);
  }
  return [...tech].slice(0, 4);
}

// Parse the GitHub repo name out of an origin remote URL.
function repoNameFromRemote(url) {
  if (!url) return null;
  const m = url.match(/[/:]([^/]+)\/([^/]+?)(?:\.git)?$/);
  return m ? m[2] : null;
}

// ---------------------------------------------------------------------------
// 1. GitHub
// ---------------------------------------------------------------------------
function ghAuthOk() {
  try {
    execFileSync("gh", ["auth", "status"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function fetchRepos() {
  if (!ghAuthOk()) {
    console.error("ERROR: `gh` is not authenticated. Run `gh auth login` and retry.");
    process.exit(1);
  }
  const out = sh("gh", [
    "repo", "list", GH_OWNER, "--limit", "100",
    "--json", "name,description,url,homepageUrl,primaryLanguage,updatedAt,isPrivate,repositoryTopics",
  ]);
  if (out == null) {
    console.error("ERROR: `gh repo list` failed.");
    process.exit(1);
  }
  let repos;
  try { repos = JSON.parse(out); } catch { console.error("ERROR: could not parse gh output."); process.exit(1); }
  const map = new Map();
  for (const r of repos) map.set(r.name, r);
  return map;
}

// ---------------------------------------------------------------------------
// 2. Local scan
// ---------------------------------------------------------------------------
function scanLocal() {
  const found = []; // { folder, dir, repoName|null }
  for (const group of SCAN_DIRS) {
    const groupDir = join(DEV_ROOT, group);
    for (const name of listShallow(groupDir)) {
      if (SKIP_NAMES.has(name) || name.startsWith(".")) continue;
      const dir = join(groupDir, name);
      let st;
      try { st = statSync(dir); } catch { continue; }
      if (!st.isDirectory()) continue;
      const remote = sh("git", ["-C", dir, "remote", "get-url", "origin"]);
      found.push({ folder: name, dir, group, repoName: repoNameFromRemote(remote) });
    }
  }
  return found;
}

// ---------------------------------------------------------------------------
// 3. Merge + classify + link policy
// ---------------------------------------------------------------------------
function linkFor(type, homepageUrl, repoUrl) {
  if (homepageUrl) {
    const label = type === "app" || type === "html-page" ? "Live demo" : type === "userscript" ? "Install" : "Open";
    return { link: homepageUrl, linkLabel: label };
  }
  if (repoUrl) return { link: repoUrl, linkLabel: "View on GitHub" };
  return { link: null, linkLabel: null };
}

function build() {
  const repos = fetchRepos();
  const locals = scanLocal();
  const localByRepo = new Map();
  for (const l of locals) if (l.repoName) localByRepo.set(l.repoName, l);

  const items = [];
  const usedRepos = new Set();

  // 3a. Local folders (merged with GitHub when a remote matches)
  for (const l of locals) {
    const gh = l.repoName ? repos.get(l.repoName) : null;
    if (gh && gh.isPrivate && !INCLUDE_PRIVATE) { usedRepos.add(l.repoName); continue; }
    if (gh) usedRepos.add(l.repoName);

    const primaryLanguage = gh?.primaryLanguage?.name || null;
    const type = classifyLocal(l.dir);
    const repoUrl = gh?.url || null;
    const { link, linkLabel } = linkFor(type, gh?.homepageUrl, repoUrl);
    const id = l.repoName ? l.repoName : slugify(l.folder);

    items.push({
      id,
      name: displayName(l.folder),
      type,
      link, linkLabel,
      source: gh ? "github+local" : "local",
      repo: repoUrl,
      private: false,
      tech: techFromLocal(l.dir, primaryLanguage),
      updatedAt: gh?.updatedAt || null,
      topics: gh?.repositoryTopics?.map((t) => t.name) || [],
      readmeExcerpt: (findProse(l.dir) || "").slice(0, 1500),
    });
  }

  // 3b. GitHub-only repos (no local folder)
  for (const [name, r] of repos) {
    if (usedRepos.has(name)) continue;
    if (r.isPrivate && !INCLUDE_PRIVATE) continue;
    const type = r.primaryLanguage?.name === "HTML" ? "html-page" : "project";
    const { link, linkLabel } = linkFor(type, r.homepageUrl, r.url);
    items.push({
      id: name,
      name: displayName(name),
      type,
      link, linkLabel,
      source: "github",
      repo: r.url,
      private: false,
      tech: r.primaryLanguage?.name ? [r.primaryLanguage.name] : [],
      updatedAt: r.updatedAt || null,
      topics: r.repositoryTopics?.map((t) => t.name) || [],
      readmeExcerpt: (r.description || "").slice(0, 1500),
    });
  }

  // Sort newest-first by default; the refresh step re-applies featured/order from overrides.
  items.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  return items;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const items = build();
mkdirSync(DATA_DIR, { recursive: true });
writeFileSync(OUT_FILE, JSON.stringify({ generatedAt: null, owner: GH_OWNER, items }, null, 2) + "\n");
console.log(`Wrote ${items.length} items to ${OUT_FILE}`);
for (const it of items) {
  console.log(`  - ${it.name} [${it.type}] ${it.source} ${it.link ? "→ " + it.linkLabel : "(no link)"}`);
}
