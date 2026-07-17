#!/usr/bin/env node
// Encrypt data/links.private.json → data/links.enc.json (safe to publish).
//
//   node scripts/lock-links.mjs "<passphrase>"
//
// The published file is AES-256-GCM ciphertext; without the passphrase the
// owner-only links cannot be recovered from the public site or repo.
// Browser side (assets/vault.js) uses the same KDF parameters to decrypt.

import { readFileSync, writeFileSync } from "node:fs";
import { pbkdf2Sync, randomBytes, createCipheriv } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ITER = 310000; // PBKDF2-SHA256 iterations — must match assets/vault.js

const pass = process.argv[2] || process.env.PORTFOLIO_PASS;
if (!pass) {
  console.error('Usage: node scripts/lock-links.mjs "<passphrase>"');
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
console.log("Wrote data/links.enc.json (encrypted, publishable).");
