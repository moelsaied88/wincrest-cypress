#!/usr/bin/env node
'use strict';

/* Downloads each place's source photograph into src/originals/. Sources are
   recorded in places.json so the image set is reproducible and every photo has
   a traceable origin for the credits list. */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'src', 'data', 'places.json');
const OUT = path.join(ROOT, 'src', 'originals');

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function get(url, redirects) {
  redirects = redirects || 0;
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('too many redirects'));
    const lib = url.startsWith('http://') ? http : https;
    lib
      .get(url, { headers: { 'User-Agent': UA, Accept: 'image/*,*/*' }, timeout: 20000 }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const next = new URL(res.headers.location, url).toString();
          res.resume();
          return resolve(get(next, redirects + 1));
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ body: Buffer.concat(chunks), type: res.headers['content-type'] || '' }));
      })
      .on('timeout', function () {
        this.destroy(new Error('timed out'));
      })
      .on('error', reject);
  });
}

function targets(data) {
  const list = [];
  if (data.site.heroImage && data.site.heroImage.sourceUrl) {
    list.push({ label: 'opening photograph', image: data.site.heroImage });
  }
  for (const p of data.places) {
    if (p.image && p.image.sourceUrl) list.push({ label: p.name, image: p.image });
  }
  return list;
}

async function main() {
  const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  fs.mkdirSync(OUT, { recursive: true });

  const force = process.argv.includes('--force');
  let ok = 0;
  const failed = [];

  for (const { label, image } of targets(data)) {
    const dest = path.join(OUT, image.file);
    if (fs.existsSync(dest) && !force) {
      ok++;
      continue;
    }
    try {
      const { body, type } = await get(image.sourceUrl);
      if (!/^image\//.test(type)) throw new Error(`not an image (${type || 'no content-type'})`);
      if (body.length < 5000) throw new Error(`suspiciously small (${body.length} bytes)`);
      fs.writeFileSync(dest, body);
      console.log(`  ok    ${image.file}  ${Math.round(body.length / 1024)} KB  — ${label}`);
      ok++;
    } catch (err) {
      console.log(`  FAIL  ${image.file}  — ${label}: ${err.message}`);
      failed.push({ label, url: image.sourceUrl, reason: err.message });
    }
  }

  console.log(`\n  ${ok} downloaded, ${failed.length} failed`);
  if (failed.length) {
    console.log('  Places without a photo will render without a thumbnail rather than');
    console.log('  with a stock substitute that misrepresents the location.\n');
  }
}

main().catch((err) => {
  console.error(`\n  image fetch failed: ${err.message}\n`);
  process.exit(1);
});
