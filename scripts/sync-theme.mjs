#!/usr/bin/env node
/**
 * Vendor the canonical Tools Suite theme into this repo.
 *
 *   npm run theme                    fetch the canonical file, verify it against
 *                                    the pin, and write theme/theme.css
 *   npm run theme -- --check         verify the committed copy matches the pin
 *                                    (no network; CI drift gate, exit 1 on drift)
 *   npm run theme:pin                maintainer: re-pin + vendor the current
 *                                    canonical file
 *
 * The canonical file is tools-suite/shared/theme.css, published at
 * https://qqshi13.github.io/tools-suite/shared/theme.css. The sha256 in
 * theme/theme.sha256 is what makes the vendored copy tamper-evident: a fetch
 * that does not hash to the pin is rejected instead of written.
 *
 * No dependencies — Node 18+ (global fetch). Set THEME_URL to point at a mirror
 * or a local server when testing.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CANONICAL_URL =
  process.env.THEME_URL || 'https://qqshi13.github.io/tools-suite/shared/theme.css';
const THEME_FILE = join(ROOT, 'theme', 'theme.css');
const PIN_FILE = join(ROOT, 'theme', 'theme.sha256');

function fail(message) {
  console.error(`sync-theme: ${message}`);
  process.exit(1);
}

const options = new Set(process.argv.slice(2));
const unknown = [...options].filter((a) => a !== '--check' && a !== '--update-pin');
if (unknown.length) fail(`unknown option: ${unknown.join(' ')} (supported: --check, --update-pin)`);
if (options.has('--check') && options.has('--update-pin')) {
  fail('--check and --update-pin cannot be combined');
}

const show = (path) => relative(ROOT, path);
const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

async function readPin() {
  let raw = null;
  try {
    raw = await readFile(PIN_FILE, 'utf8');
  } catch {
    raw = null;
  }
  if (raw === null) {
    fail(
      `no pin found at ${show(PIN_FILE)}.\n` +
        `        The vendored theme must be pinned by sha256. A maintainer creates the\n` +
        `        pin with \`npm run theme:pin\`, which vendors ${CANONICAL_URL}.`
    );
  }
  const match = raw.match(/[0-9a-f]{64}/i);
  if (!match) fail(`${show(PIN_FILE)} does not contain a sha256 hash`);
  return match[0].toLowerCase();
}

async function fetchCanonical() {
  let response;
  try {
    response = await fetch(CANONICAL_URL, { redirect: 'follow' });
  } catch (error) {
    fail(`could not fetch ${CANONICAL_URL} — ${error.message}`);
  }
  if (!response.ok) fail(`GET ${CANONICAL_URL} failed: ${response.status} ${response.statusText}`);
  return Buffer.from(await response.arrayBuffer());
}

const pin = await readPin();

if (options.has('--check')) {
  let committed = null;
  try {
    committed = await readFile(THEME_FILE);
  } catch {
    committed = null;
  }
  if (committed === null) {
    fail(`${show(THEME_FILE)} is missing — run \`npm run theme\` and commit the result`);
  }
  const actual = sha256(committed);
  if (actual !== pin) {
    fail(
      `drift detected: ${show(THEME_FILE)} hashes to ${actual}\n` +
        `        but ${show(PIN_FILE)} pins ${pin}\n` +
        `        run \`npm run theme\` and commit the result`
    );
  }
  console.log(`theme: ${show(THEME_FILE)} matches the pin (${pin})`);
  process.exit(0);
}

const canonical = await fetchCanonical();
const canonicalHash = sha256(canonical);

if (canonicalHash !== pin && !options.has('--update-pin')) {
  fail(
    `the canonical file does not match the pin — refusing to vendor it\n` +
      `        source   ${CANONICAL_URL}\n` +
      `        fetched  ${canonicalHash}\n` +
      `        pinned   ${pin}\n` +
      `        If the canonical theme changed on purpose, re-pin with \`npm run theme:pin\`.`
  );
}

if (options.has('--update-pin')) {
  await mkdir(dirname(PIN_FILE), { recursive: true });
  await writeFile(PIN_FILE, `${canonicalHash}  theme.css\n`);
  console.log(`theme: pinned ${show(PIN_FILE)} -> ${canonicalHash}`);
}

await mkdir(dirname(THEME_FILE), { recursive: true });
await writeFile(THEME_FILE, canonical);
console.log(`theme: wrote ${show(THEME_FILE)} (${canonicalHash})`);
