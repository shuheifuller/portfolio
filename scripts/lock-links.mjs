#!/usr/bin/env node
// Encrypt data/links.private.json → data/links.enc.json (safe to publish).
//
//   node scripts/lock-links.mjs          # prompts for the passphrase (hidden)
//   PORTFOLIO_PASS=... node scripts/lock-links.mjs   # non-interactive
//
// The passphrase is never accepted as a command-line argument: argv is visible
// to every process on the machine and lands in shell history.
//
// The ciphertext is PUBLIC, so it can be attacked offline at GPU speed with no
// rate limit. The only defence is passphrase entropy plus a slow KDF — hence
// the strength floor below. Use 5+ random words (e.g. a diceware / password
// manager "passphrase" generator), not a word plus a few digits.
//
// Browser side (assets/vault.js) reads `iter` and `salt` from the output, so
// changing ITER here needs no change there. Re-running this rotates the salt,
// which also locks every device that had the old vault unlocked.

import { readFileSync, writeFileSync } from "node:fs";
import { pbkdf2Sync, randomBytes, createCipheriv } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";

const ITER = 600000; // PBKDF2-HMAC-SHA256 — OWASP Password Storage Cheat Sheet recommendation

function promptHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.includes(question)) rl.output.write(s); }; // echo the label, not the keystrokes
    rl.question(question, (answer) => { rl.close(); process.stdout.write("\n"); resolve(answer); });
  });
}

function strongEnough(p) {
  const words = p.trim().split(/[\s\-_.]+/).filter((w) => w.length >= 3);
  return p.length >= 24 || (words.length >= 5 && p.length >= 20);
}

if (process.argv[2]) {
  console.error("Refusing a passphrase on the command line (visible in `ps` and shell history).");
  console.error("Run without arguments to be prompted, or set PORTFOLIO_PASS.");
  process.exit(1);
}

let pass = process.env.PORTFOLIO_PASS;
if (!pass) {
  pass = await promptHidden("Owner passphrase (hidden): ");
  const again = await promptHidden("Repeat passphrase: ");
  if (pass !== again) { console.error("Passphrases did not match."); process.exit(1); }
}
if (!pass || !strongEnough(pass)) {
  console.error("Passphrase too weak for a public ciphertext. Use 5+ random words or 24+ characters.");
  process.exit(1);
}

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const plaintext = readFileSync(join(root, "data", "links.private.json"));

const salt = randomBytes(16);
const iv = randomBytes(12);
const key = pbkdf2Sync(pass, salt, ITER, 32, "sha256");
const cipher = createCipheriv("aes-256-gcm", key, iv);
// WebCrypto's AES-GCM expects ciphertext||authTag, so append the tag.
const ct = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);

const out = {
  v: 1,
  kdf: "PBKDF2-SHA256",
  iter: ITER,
  salt: salt.toString("base64"),
  iv: iv.toString("base64"),
  ct: ct.toString("base64"),
};
writeFileSync(join(root, "data", "links.enc.json"), JSON.stringify(out, null, 2) + "\n");
console.log("Wrote data/links.enc.json (encrypted, publishable). Every previously unlocked device is now locked.");
