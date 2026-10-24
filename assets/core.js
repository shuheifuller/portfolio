// Shared, security-relevant helpers. Loaded first on every page.
//
// The page data (data/projects.json) is produced partly by an AI-assisted
// refresh that reads project READMEs. README text is untrusted input, so a
// prompt-injected README could try to smuggle a `javascript:` link or a
// third-party tracking image into the data. Everything the renderers turn
// into an href or img src goes through these allowlists first.

(() => {
  // Refuse to render inside a frame. GitHub Pages can't send
  // `X-Frame-Options` / CSP `frame-ancestors`, and those can't be set from a
  // <meta> tag, so this is the clickjacking defence available to a static site.
  if (window.top !== window.self) {
    document.documentElement.style.display = "none";
    try { window.top.location = window.self.location.href; } catch { /* cross-origin parent */ }
  }

  // Same-site links only: ./project.html?id=… and ./index.html#…
  function safeInternalHref(href, fallback) {
    if (typeof href === "string" && /^\.\/(?:project\.html\?id=[\w.-]+|index\.html(?:#[\w-]*)?)$/.test(href)) {
      return href;
    }
    return fallback;
  }

  // External links (owner vault only): plain https, nothing else.
  function safeExternalHref(href) {
    try {
      const u = new URL(href);
      return u.protocol === "https:" ? u.href : null;
    } catch {
      return null;
    }
  }

  // Images: only files shipped with this site.
  function safeAssetSrc(src) {
    return typeof src === "string" && /^\.\/assets\/img\/[\w.-]+\/[\w.-]+\.(?:png|jpe?g|svg|webp)$/.test(src) ? src : null;
  }

  window.Safe = { safeInternalHref, safeExternalHref, safeAssetSrc };

  document.addEventListener("DOMContentLoaded", () => {
    const year = document.getElementById("year");
    if (year) year.textContent = String(new Date().getFullYear());
  });
})();
