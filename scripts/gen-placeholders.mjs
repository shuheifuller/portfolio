#!/usr/bin/env node
// Generate an on-brand placeholder cover image for every project that doesn't
// already have a real screenshot. Run after discovery/refresh:
//   node scripts/gen-placeholders.mjs
//
// It writes assets/img/<id>/cover.svg ONLY if that file is missing — so any
// real screenshot you drop in is never overwritten. To use real images,
// replace assets/img/<id>/cover.svg (or add more files and list them in the
// project's `detail.images` array in data/projects.json).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(__dirname);
const data = JSON.parse(readFileSync(join(ROOT, "data", "projects.json"), "utf8"));

const TYPE_LABEL = { app: "App", "html-page": "Web page", "ios-app": "iOS app", automation: "Automation", userscript: "Userscript", project: "Project" };

function hash(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }
function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

let wrote = 0;
for (const p of data.items) {
  const dir = join(ROOT, "assets", "img", p.id);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, "cover.svg");
  if (existsSync(file)) continue; // never clobber a real screenshot

  const h = hash(p.id);
  const a = 14 + (h % 8);        // dark charcoal stop
  const b = a + 14;              // lighter charcoal stop
  const ang = (h % 6) * 18;
  const name = esc(p.name);
  const type = (TYPE_LABEL[p.type] || p.type).toUpperCase();
  const nameSize = name.length > 16 ? 60 : name.length > 11 ? 76 : 92;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" role="img" aria-label="${name} cover">
  <defs>
    <linearGradient id="g" gradientTransform="rotate(${ang})">
      <stop offset="0" stop-color="hsl(0 0% ${a}%)"/>
      <stop offset="1" stop-color="hsl(0 0% ${b}%)"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="675" fill="url(#g)"/>
  <g font-family="Inter, -apple-system, 'Helvetica Neue', Arial, sans-serif">
    <text x="80" y="118" font-size="22" letter-spacing="5" fill="#9ca3af">${type}</text>
    <text x="76" y="370" font-size="${nameSize}" font-weight="600" letter-spacing="-2" fill="#f5f5f5">${name}</text>
    <text x="80" y="600" font-size="20" fill="#6b7280">Preview placeholder · drop a screenshot in assets/img/${p.id}/</text>
  </g>
</svg>
`;
  writeFileSync(file, svg);
  wrote++;
  console.log("wrote", file.replace(ROOT + "/", ""));
}
console.log(wrote ? `Generated ${wrote} placeholder cover(s).` : "All projects already have a cover image.");
