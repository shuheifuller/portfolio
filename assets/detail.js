// Render a single project's detail page from data/projects.json, keyed by ?id=.
// No outbound links to the app itself — this page describes the project only.

const TYPE_LABEL = {
  app: "App",
  "html-page": "Web page",
  "ios-app": "iOS app",
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

function imagesFor(p) {
  // Use explicit detail.images if provided, else fall back to the generated cover.
  const imgs = (p.detail && Array.isArray(p.detail.images) && p.detail.images.length)
    ? p.detail.images
    : [{ src: `./assets/img/${p.id}/cover.svg`, caption: "" }];
  return imgs.map((i) => (typeof i === "string" ? { src: i, caption: "" } : i));
}

async function load() {
  const root = document.getElementById("detail");
  const id = new URLSearchParams(location.search).get("id");
  try {
    const res = await fetch("./data/projects.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const p = (data.items || []).find((x) => x.id === id);

    root.innerHTML = "";
    if (!p) {
      root.appendChild(el("p", "error", "Project not found."));
      root.appendChild(backLink());
      return;
    }
    document.title = `${p.name} — Shuhei Uto`;

    // Back link
    root.appendChild(backLink());

    // Header
    const head = el("header", "detail-head");
    const tags = el("div", "work-head");
    tags.appendChild(el("h1", "detail-title", p.name));
    tags.appendChild(el("span", "tag", TYPE_LABEL[p.type] || p.type));
    head.appendChild(tags);
    if (p.detail && p.detail.tagline) head.appendChild(el("p", "detail-tagline", p.detail.tagline));
    root.appendChild(head);

    // Cover / gallery
    const imgs = imagesFor(p);
    const gallery = el("div", imgs.length > 1 ? "gallery multi" : "gallery");
    for (const im of imgs) {
      const fig = el("figure", "shot");
      const img = el("img");
      img.src = im.src;
      img.alt = im.caption || `${p.name} preview`;
      img.loading = "lazy";
      fig.appendChild(img);
      if (im.caption) fig.appendChild(el("figcaption", null, im.caption));
      gallery.appendChild(fig);
    }
    root.appendChild(gallery);

    // Body grid: overview + meta
    const grid = el("div", "detail-grid");

    const overview = el("div", "detail-overview");
    const paras = (p.detail && p.detail.overview) || [p.description];
    for (const para of [].concat(paras)) overview.appendChild(el("p", null, para));
    if (p.benefit) {
      const b = el("p", "detail-benefit");
      b.appendChild(el("strong", null, "Why it's useful — "));
      b.appendChild(document.createTextNode(p.benefit));
      overview.appendChild(b);
    }
    if (p.detail && Array.isArray(p.detail.highlights) && p.detail.highlights.length) {
      overview.appendChild(el("h2", "detail-sub", "Highlights"));
      const ul = el("ul", "highlights");
      for (const h of p.detail.highlights) ul.appendChild(el("li", null, h));
      overview.appendChild(ul);
    }
    grid.appendChild(overview);

    const meta = el("aside", "detail-meta");
    if (Array.isArray(p.tech) && p.tech.length) {
      meta.appendChild(el("h3", null, "Built with"));
      const tl = el("div", "meta-tech");
      for (const t of p.tech) tl.appendChild(el("span", "chip", t));
      meta.appendChild(tl);
    }
    meta.appendChild(el("h3", null, "Access"));
    meta.appendChild(el("p", "meta-note", (data.access || "Shared privately with family and friends.") + " Reach out if you'd like a look."));
    const ownerArea = el("div", "owner-area");
    meta.appendChild(ownerArea);
    renderOwnerArea(ownerArea, p.id);
    grid.appendChild(meta);

    root.appendChild(grid);
    root.appendChild(backLink());
  } catch (err) {
    root.innerHTML = "";
    root.appendChild(el("p", "error", `Could not load project (${err.message}). Serve over http:// — run "python3 -m http.server" in this folder.`));
  }
}

function backLink() {
  const a = el("a", "back", "← All work");
  a.href = "./index.html#work";
  return a;
}

// Owner-only direct links, decrypted client-side (see assets/vault.js).
async function renderOwnerArea(area, id) {
  area.innerHTML = "";
  const links = await window.Vault.load();
  if (!links) {
    const u = el("a", "owner-unlock", "owner unlock");
    u.href = "#";
    u.addEventListener("click", async (e) => {
      e.preventDefault();
      if (await window.Vault.unlock()) renderOwnerArea(area, id);
    });
    area.appendChild(u);
    return;
  }
  const mine = links[id] || [];
  if (mine.length) {
    area.appendChild(el("h3", null, "Owner links"));
    const list = el("div", "owner-links");
    for (const l of mine) {
      if (l.url) {
        const a = el("a", "owner-link");
        a.href = l.url;
        a.target = "_blank";
        a.rel = "noopener";
        a.innerHTML = `${l.label} <span class="arrow">↗</span>`;
        list.appendChild(a);
      } else {
        list.appendChild(el("p", "meta-note", l.label));
      }
    }
    area.appendChild(list);
  }
  const lockBtn = el("a", "owner-unlock", "lock this device");
  lockBtn.href = "#";
  lockBtn.addEventListener("click", (e) => {
    e.preventDefault();
    window.Vault.lock();
    renderOwnerArea(area, id);
  });
  area.appendChild(lockBtn);
}

// Nav border on scroll.
const nav = document.querySelector(".nav");
const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 8);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

load();
