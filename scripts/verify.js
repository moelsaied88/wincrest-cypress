#!/usr/bin/env node
'use strict';

/* There is no application logic to unit test, so verification is factual:
   every referenced image must exist on disk and every outbound link must
   resolve. Run after a build. */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'docs');
const HTML = path.join(OUT, 'index.html');

/* No single user agent satisfies every host: Wikimedia 429s generic browser
   strings and wants a descriptive one, while several venue sites sit behind bot
   protection that 403s anything that is not a browser. Try both before calling
   a link broken. */
const AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'wincrest-cypress-site/1.0 (https://github.com/moelsaied88/wincrest-cypress; link check)',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function head(url, ua, redirects) {
  redirects = redirects || 0;
  return new Promise((resolve) => {
    if (redirects > 5) return resolve({ ok: false, status: 'redirect loop' });
    const lib = url.startsWith('http://') ? http : https;
    const req = lib.request(
      url,
      { method: 'GET', headers: { 'User-Agent': ua }, timeout: 15000 },
      (res) => {
        res.resume();
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const next = new URL(res.headers.location, url).toString();
          return resolve(head(next, ua, redirects + 1));
        }
        resolve({ ok: res.statusCode === 200, status: res.statusCode });
      }
    );
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, status: 'timeout' });
    });
    req.on('error', (e) => resolve({ ok: false, status: e.code || e.message }));
    req.end();
  });
}

async function main() {
  if (!fs.existsSync(HTML)) {
    console.error('\n  docs/index.html not found — run node build.js first\n');
    process.exit(1);
  }
  const html = fs.readFileSync(HTML, 'utf8');
  let problems = 0;

  console.log('\n  local assets');
  const localRefs = new Set();
  /* Strip the cache-busting ?v= suffix the build adds — the file on disk has no
     query string. */
  for (const m of html.matchAll(/(?:src|href)="(assets\/[^"]+?)(?:\?v=[0-9a-f]+)?"/g)) {
    localRefs.add(m[1]);
  }
  for (const ref of [...localRefs].sort()) {
    const exists = fs.existsSync(path.join(OUT, ref));
    if (!exists) {
      console.log(`    MISSING  ${ref}`);
      problems++;
    }
  }
  console.log(`    ${localRefs.size} referenced, ${problems} missing`);

  const cssPath = path.join(OUT, 'assets', 'styles', 'site.css');
  if (fs.existsSync(cssPath)) {
    const css = fs.readFileSync(cssPath, 'utf8');
    for (const m of css.matchAll(/url\("\.\.\/([^"]+)"\)/g)) {
      if (!fs.existsSync(path.join(OUT, 'assets', m[1]))) {
        console.log(`    MISSING  assets/${m[1]} (referenced from site.css)`);
        problems++;
      }
    }
  }

  console.log('\n  outbound links');
  const urls = [...new Set([...html.matchAll(/href="(https?:\/\/[^"]+)"/g)].map((m) => m[1]))];

  /* Checked serially with a pause: Wikimedia returns 429 to bursts, which would
     otherwise look like a page full of broken links. */
  const results = [];
  for (const url of urls) {
    let r;
    for (const ua of AGENTS) {
      r = await head(url, ua);
      if (r.ok) break;
      await sleep(1500);
    }
    results.push({ url, ...r });
    await sleep(300);
  }

  for (const r of results.sort((a, b) => a.url.localeCompare(b.url))) {
    if (!r.ok) {
      console.log(`    ${String(r.status).padEnd(8)} ${r.url}`);
      problems++;
    }
  }
  console.log(`    ${urls.length} checked, ${results.filter((r) => !r.ok).length} unreachable`);

  const sizeKb = Math.round(fs.statSync(HTML).size / 1024);
  const imgDir = path.join(OUT, 'assets', 'images');
  const imgKb = fs.existsSync(imgDir)
    ? Math.round(
        fs.readdirSync(imgDir).reduce((n, f) => n + fs.statSync(path.join(imgDir, f)).size, 0) / 1024
      )
    : 0;
  console.log(`\n  page ${sizeKb} KB · images ${imgKb} KB`);

  if (problems) {
    console.log(`\n  ${problems} problem(s) found\n`);
    process.exit(1);
  }
  console.log('\n  all checks passed\n');
}

main();
