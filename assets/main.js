// Fetch the generated project data and render the Work list.
// Zero dependencies. The data is produced by scripts/discover.mjs + /refresh-portfolio.

const TYPE_LABEL = {
  app: "App",
  "html-page": "Web page",
  automation: "Automation",
  userscript: "Userscript",
  project: "Project",
};

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function renderItem(p) {
  const item = el("article", "work-item");

  const body = el("div", "body");
  const head = el("div", "work-head");
  head.appendChild(el("span", "work-name", p.name));
  head.appendChild(el("span", "tag", TYPE_LABEL[p.type] || p.type));
  if (!p.link) head.appendChild(el("span", "tag", "Local project"));
  body.appendChild(head);

  if (p.description) body.appendChild(el("p", "work-desc", p.description));
  if (p.benefit) body.appendChild(el("p", "work-benefit", p.benefit));

  if (Array.isArray(p.tech) && p.tech.length) {
    const tech = el("div", "work-tech");
    for (const t of p.tech) tech.appendChild(el("span", null, t));
    body.appendChild(tech);
  }
  item.appendChild(body);

  if (p.link) {
    const a = el("a", "work-link");
    a.href = p.link;
    a.target = "_blank";
    a.rel = "noopener";
    a.innerHTML = `${p.linkLabel || "Open"} <span class="arrow">↗</span>`;
    item.appendChild(a);
  } else {
    item.appendChild(el("span", "no-link", "Family / local build"));
  }
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
      list.appendChild(el("p", "loading", "No projects yet."));
      return;
    }
    for (const p of items) list.appendChild(renderItem(p));
    if (count) count.textContent = `${items.length} project${items.length === 1 ? "" : "s"}`;
  } catch (err) {
    list.innerHTML = "";
    list.appendChild(el("p", "error", `Could not load projects (${err.message}). Serve over http:// — run "python3 -m http.server" in this folder.`));
  }
}

// Nav border on scroll.
const nav = document.querySelector(".nav");
const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 8);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

load();
