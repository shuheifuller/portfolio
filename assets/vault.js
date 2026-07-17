// Owner-only link vault. The published data/links.enc.json is AES-256-GCM
// ciphertext; entering the owner passphrase (once per device) decrypts it and
// reveals direct links to each app. Visitors without the passphrase see the
// site exactly as before — the URLs are not present in any readable form.

(() => {
  const ENC_URL = "./data/links.enc.json";
  const LS_KEY = "portfolio.ownerPass";
  let cachedLinks; // decrypted {id: [{label,url}]} for this page load

  const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

  async function decrypt(pass, enc) {
    const baseKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", hash: "SHA-256", salt: b64(enc.salt), iterations: enc.iter },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(enc.iv) }, key, b64(enc.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  }

  async function fetchEnc() {
    const res = await fetch(ENC_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error(`vault HTTP ${res.status}`);
    return res.json();
  }

  window.Vault = {
    // Returns decrypted links if this device is already unlocked, else null.
    async load() {
      if (cachedLinks) return cachedLinks;
      const pass = localStorage.getItem(LS_KEY);
      if (!pass) return null;
      try {
        cachedLinks = await decrypt(pass, await fetchEnc());
        return cachedLinks;
      } catch {
        localStorage.removeItem(LS_KEY); // stale/wrong passphrase
        return null;
      }
    },
    // Prompts for the passphrase; on success remembers it on this device.
    async unlock() {
      const pass = prompt("Owner passphrase");
      if (!pass) return null;
      try {
        cachedLinks = await decrypt(pass, await fetchEnc());
        localStorage.setItem(LS_KEY, pass);
        return cachedLinks;
      } catch {
        alert("That passphrase didn't work.");
        return null;
      }
    },
    lock() {
      cachedLinks = undefined;
      localStorage.removeItem(LS_KEY);
    },
  };
})();
