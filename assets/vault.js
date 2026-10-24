// Owner-only link vault. The published data/links.enc.json is AES-256-GCM
// ciphertext; entering the owner passphrase (once per device) decrypts it and
// reveals direct links to each app. Visitors without the passphrase see the
// site exactly as before — the URLs are not present in any readable form.
//
// What is remembered on an unlocked device is a NON-EXTRACTABLE CryptoKey in
// IndexedDB — never the passphrase. Script on the page can ask the browser to
// decrypt with it, but cannot read the key bytes out, and the passphrase is
// not stored anywhere. Re-encrypting the vault (new salt) invalidates every
// remembered key, so rotating the passphrase locks all devices.

(() => {
  const ENC_URL = "./data/links.enc.json";
  const LEGACY_LS_KEY = "portfolio.ownerPass"; // old builds stored the passphrase here
  const DB_NAME = "portfolio-vault";
  const STORE = "keys";
  const REC = "owner";
  let cachedLinks; // decrypted {id: [{label,url}]} for this page load

  const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const t = (k, fallback) => (window.I18N ? window.I18N.t(k) : fallback);

  // ── IndexedDB (tiny promise wrapper; every failure degrades to "not remembered")
  function idb(mode, fn) {
    return new Promise((resolve) => {
      let req;
      try { req = indexedDB.open(DB_NAME, 1); } catch { return resolve(null); }
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onerror = () => resolve(null);
      req.onsuccess = () => {
        try {
          const tx = req.result.transaction(STORE, mode);
          const r = fn(tx.objectStore(STORE));
          tx.oncomplete = () => resolve(r && "result" in r ? r.result : null);
          tx.onerror = () => resolve(null);
        } catch { resolve(null); }
      };
    });
  }
  const getRecord = () => idb("readonly", (s) => s.get(REC));
  const putRecord = (rec) => idb("readwrite", (s) => s.put(rec, REC));
  const deleteRecord = () => idb("readwrite", (s) => s.delete(REC));

  async function deriveKey(pass, enc) {
    const baseKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", hash: "SHA-256", salt: b64(enc.salt), iterations: enc.iter },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false, // non-extractable: usable for decrypt, never readable
      ["decrypt"]
    );
  }

  async function decryptWith(key, enc) {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(enc.iv) }, key, b64(enc.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  }

  async function fetchEnc() {
    const res = await fetch(ENC_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error(`vault HTTP ${res.status}`);
    return res.json();
  }

  async function remember(key, enc) {
    await putRecord({ key, salt: enc.salt, iter: enc.iter });
  }

  // One-time migration from builds that kept the passphrase in localStorage.
  async function migrateLegacy(enc) {
    let pass = null;
    try { pass = localStorage.getItem(LEGACY_LS_KEY); localStorage.removeItem(LEGACY_LS_KEY); } catch { /* blocked storage */ }
    if (!pass) return null;
    try {
      const key = await deriveKey(pass, enc);
      const links = await decryptWith(key, enc);
      await remember(key, enc);
      return links;
    } catch {
      return null;
    }
  }

  window.Vault = {
    // Returns decrypted links if this device is already unlocked, else null.
    async load() {
      if (cachedLinks) return cachedLinks;
      let enc;
      try { enc = await fetchEnc(); } catch { return null; }

      const rec = await getRecord();
      if (rec && rec.key && rec.salt === enc.salt && rec.iter === enc.iter) {
        try {
          cachedLinks = await decryptWith(rec.key, enc);
          return cachedLinks;
        } catch {
          await deleteRecord(); // stale key (vault re-encrypted) — forget it
        }
      } else if (rec) {
        await deleteRecord();
      }

      const migrated = await migrateLegacy(enc);
      if (migrated) cachedLinks = migrated;
      return cachedLinks || null;
    },

    // Prompts for the passphrase; on success remembers a non-extractable key.
    async unlock() {
      const pass = prompt(t("detail.passPrompt", "Owner passphrase"));
      if (!pass) return null;
      try {
        const enc = await fetchEnc();
        const key = await deriveKey(pass, enc);
        cachedLinks = await decryptWith(key, enc);
        await remember(key, enc);
        return cachedLinks;
      } catch {
        alert(t("detail.passWrong", "That passphrase didn't work."));
        return null;
      }
    },

    async lock() {
      cachedLinks = undefined;
      try { localStorage.removeItem(LEGACY_LS_KEY); } catch { /* blocked storage */ }
      await deleteRecord();
    },
  };
})();
