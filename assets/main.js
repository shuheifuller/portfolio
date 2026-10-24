// Fetch the generated project data and render the Work list.
// Zero dependencies. The data is produced by scripts/discover.mjs + /refresh-portfolio.

const typeLabel = (t) => window.I18N.t("type." + t);

// The Work list groups by category (game, automation, learning tool, …), not a
// flat list. `category` is an explicit curation field (see data/overrides.json);
// if a project doesn't set one, it falls back from its `type`.
const CATEGORY_ORDER = ["app", "ios-app", "game", "learning", "automation", "utility"];
const CATEGORY_FALLBACK = {
  app: "app", "ios-app": "ios-app", "html-page": "game",
  automation: "automation", userscript: "utility", project: "utility",
};
const categoryOf = (p) => p.category || CATEGORY_FALLBACK[p.type] || "utility";
const categoryLabel = (c) => window.I18N.t("category." + c);

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function renderItem(raw) {
  const p = window.I18N.loc(raw);
  const item = el("article", "work-item");

  const body = el("div", "body");
  const head = el("div", "work-head");
  head.appendChild(el("span", "work-name", p.name));
  head.appendChild(el("span", "tag", typeLabel(p.type)));
  body.appendChild(head);

  if (p.description) body.appendChild(el("p", "work-desc", p.description));
  if (p.benefit) body.appendChild(el("p", "work-benefit", p.benefit));

  if (Array.isArray(p.tech) && p.tech.length) {
    const tech = el("div", "work-tech");
    for (const t of p.tech) tech.appendChild(el("span", null, t));
    body.appendChild(tech);
  }
  item.appendChild(body);

  // Every row links to its own detail page on this site — no outbound app links.
  const actions = el("div", "work-actions");
  const a = el("a", "work-link", window.I18N.t("work.viewDetails") + " ");
  const detailHref = `./project.html?id=${encodeURIComponent(p.id)}`;
  a.href = window.Safe.safeInternalHref(p.link, detailHref);
  a.appendChild(el("span", "arrow", "→"));
  actions.appendChild(a);
  item.dataset.id = raw.id;
  item.appendChild(actions);
  return item;
}

async function load() {
  const list = document.getElementById("work-list");
  const count = document.getElementById("work-count");
  try {
    const res = await fetch("./data/projects.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const items = (data.items || [])
      .filter((p) => !p.hidden)
      .sort((a, b) => {
        if (!!b.featured !== !!a.featured) return b.featured ? 1 : -1;
        const ao = a.order ?? 999, bo = b.order ?? 999;
        if (ao !== bo) return ao - bo;
        return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
      });

    list.innerHTML = "";
    if (!items.length) {
      list.appendChild(el("p", "loading", window.I18N.t("work.empty")));
      return;
    }

    // Group into category buckets, preserving the sort order within each.
    const groups = new Map();
    for (const p of items) {
      const c = categoryOf(p);
      if (!groups.has(c)) groups.set(c, []);
      groups.get(c).push(p);
    }
    const orderedCats = [...CATEGORY_ORDER.filter((c) => groups.has(c)), ...[...groups.keys()].filter((c) => !CATEGORY_ORDER.includes(c))];

    for (const cat of orderedCats) {
      const group = el("div", "work-group");
      const head = el("div", "work-group-head");
      head.appendChild(el("h3", "work-group-title", categoryLabel(cat)));
      head.appendChild(el("span", "work-group-count", String(groups.get(cat).length)));
      group.appendChild(head);
      for (const p of groups.get(cat)) group.appendChild(renderItem(p));
      list.appendChild(group);
    }

    if (count) count.textContent = window.I18N.t(items.length === 1 ? "work.count_one" : "work.count", { n: items.length });
    decorateOwnerLinks(list);
  } catch (err) {
    list.innerHTML = "";
    list.appendChild(el("p", "error", `Could not load projects (${err.message}). Serve over http:// — run "python3 -m http.server" in this folder.`));
  }
}

// If this device is owner-unlocked (assets/vault.js), add a direct-open arrow
// next to each row's "View details" button. Visitors see nothing extra.
async function decorateOwnerLinks(list) {
  const links = await window.Vault.load();
  if (!links) return;
  for (const item of list.querySelectorAll(".work-item")) {
    const first = (links[item.dataset.id] || []).find((l) => window.Safe.safeExternalHref(l.url));
    if (!first) continue;
    const a = el("a", "owner-ext");
    a.href = window.Safe.safeExternalHref(first.url);
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.title = first.label;
    a.textContent = "↗";
    item.querySelector(".work-actions").appendChild(a);
  }
}

// Re-render the list when the language changes.
window.I18N.onChange(() => load());
document.getElementById("lang-toggle")?.addEventListener("click", () => window.I18N.toggle());
window.I18N.applyStatic();

// Nav border on scroll.
const nav = document.querySelector(".nav");
const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 8);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

load();
