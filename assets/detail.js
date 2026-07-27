// Render a single project's detail page from data/projects.json, keyed by ?id=.
// No outbound links to the app itself — this page describes the project only.

const typeLabel = (t) => window.I18N.t("type." + t);

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
    const raw = (data.items || []).find((x) => x.id === id);
    const p = raw ? window.I18N.loc(raw) : null;

    root.innerHTML = "";
    if (!p) {
      root.appendChild(el("p", "error", window.I18N.t("detail.notFound")));
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
    tags.appendChild(el("span", "tag", typeLabel(p.type)));
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
      b.appendChild(el("strong", null, window.I18N.t("detail.why")));
      b.appendChild(document.createTextNode(p.benefit));
      overview.appendChild(b);
    }
    if (p.detail && Array.isArray(p.detail.highlights) && p.detail.highlights.length) {
      overview.appendChild(el("h2", "detail-sub", window.I18N.t("detail.highlights")));
      const ul = el("ul", "highlights");
      for (const h of p.detail.highlights) ul.appendChild(el("li", null, h));
      overview.appendChild(ul);
    }
    grid.appendChild(overview);

    const meta = el("aside", "detail-meta");
    if (Array.isArray(p.tech) && p.tech.length) {
      meta.appendChild(el("h3", null, window.I18N.t("detail.builtWith")));
      const tl = el("div", "meta-tech");
      for (const t of p.tech) tl.appendChild(el("span", "chip", t));
      meta.appendChild(tl);
    }
    meta.appendChild(el("h3", null, window.I18N.t("detail.access")));
    meta.appendChild(el("p", "meta-note", window.I18N.t("detail.accessNote")));
    const ownerArea = el("div", "owner-area");
    meta.appendChild(ownerArea);
    renderOwnerArea(ownerArea, raw.id);
    grid.appendChild(meta);

    root.appendChild(grid);
    if (p.detail && p.detail.architecture) root.appendChild(renderArchitecture(p.detail.architecture));
    root.appendChild(backLink());
  } catch (err) {
    root.innerHTML = "";
    root.appendChild(el("p", "error", `Could not load project (${err.message}). Serve over http:// — run "python3 -m http.server" in this folder.`));
  }
}

function backLink() {
  const a = el("a", "back", window.I18N.t("detail.back"));
  a.href = "./index.html#work";
  return a;
}

// Architecture diagram: a vertical flow of stages, each either one box or a
// row of parallel boxes, with optionally-labelled connectors between them.
// Pure DOM + CSS so it stays monochrome, themeable and readable on mobile.
function archBox(node) {
  const box = el("div", "arch-box");
  box.appendChild(el("span", "arch-box-title", node.title));
  if (node.note) box.appendChild(el("span", "arch-box-note", node.note));
  if (node.tech) box.appendChild(el("span", "arch-box-tech", node.tech));
  return box;
}

function renderArchitecture(arch) {
  const sec = el("section", "detail-arch");
  sec.appendChild(el("h2", "detail-sub", window.I18N.t("detail.architecture")));
  if (arch.summary) {
    for (const para of [].concat(arch.summary)) sec.appendChild(el("p", "arch-summary", para));
  }

  const flow = el("div", "arch-flow");
  (arch.flow || []).forEach((step, i) => {
    if (i > 0) {
      const link = el("div", "arch-link");
      link.appendChild(el("span", "arch-arrow", "↓"));
      if (step.via) link.appendChild(el("span", "arch-via", step.via));
      flow.appendChild(link);
    }
    const stage = el("div", "arch-stage");
    if (Array.isArray(step.parallel)) {
      stage.classList.add("parallel");
      for (const n of step.parallel) stage.appendChild(archBox(n));
    } else {
      stage.appendChild(archBox(step));
    }
    flow.appendChild(stage);
  });
  sec.appendChild(flow);

  if (Array.isArray(arch.notes) && arch.notes.length) {
    const ul = el("ul", "arch-notes");
    for (const n of arch.notes) ul.appendChild(el("li", null, n));
    sec.appendChild(ul);
  }
  return sec;
}

// Owner-only direct links, decrypted client-side (see assets/vault.js).
async function renderOwnerArea(area, id) {
  area.innerHTML = "";
  const links = await window.Vault.load();
  if (!links) {
    const u = el("a", "owner-unlock", window.I18N.t("detail.unlock"));
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
    area.appendChild(el("h3", null, window.I18N.t("detail.ownerLinks")));
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
  const lockBtn = el("a", "owner-unlock", window.I18N.t("detail.lock"));
  lockBtn.href = "#";
  lockBtn.addEventListener("click", (e) => {
    e.preventDefault();
    window.Vault.lock();
    renderOwnerArea(area, id);
  });
  area.appendChild(lockBtn);
}

// Re-render when the language changes.
window.I18N.onChange(() => load());
document.getElementById("lang-toggle")?.addEventListener("click", () => window.I18N.toggle());
window.I18N.applyStatic();

// Nav border on scroll.
const nav = document.querySelector(".nav");
const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 8);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

load();
