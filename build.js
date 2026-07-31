#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'docs');
const ASSETS = path.join(OUT, 'assets');

/* Acts rendered with the hero-plus-index template. The two closing sections
   (schools, practical) use compact templates and are exempt from the hero rule. */
const PHOTO_ACTS = ['neighborhood', 'nearby', 'water', 'indoor', 'weekend'];

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const read = (p) => fs.readFileSync(p, 'utf8');

const tpl = (name) => read(path.join(SRC, 'templates', `${name}.html`));

/* Replaces {{key}} tokens. Keys ending in _RAW are inserted unescaped so
   templates can nest other rendered templates. */
function render(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (!(key in vars)) return '';
    return key.endsWith('_RAW') ? String(vars[key] ?? '') : esc(vars[key]);
  });
}

function fail(message) {
  console.error(`\n  build failed: ${message}\n`);
  process.exit(1);
}

function validate(data) {
  const seen = new Set();
  for (const p of data.places) {
    if (!p.id) fail(`a place in act "${p.act}" is missing an id`);
    if (seen.has(p.id)) fail(`duplicate place id "${p.id}"`);
    seen.add(p.id);
    if (!p.name) fail(`place "${p.id}" is missing a name`);
    if (!p.act) fail(`place "${p.id}" is missing an act`);
    if (!data.acts.some((a) => a.id === p.act)) fail(`place "${p.id}" has unknown act "${p.act}"`);
  }
  for (const actId of PHOTO_ACTS) {
    const heroes = data.places.filter((p) => p.act === actId && p.hero);
    if (heroes.length !== 1) {
      fail(`act "${actId}" has ${heroes.length} heroes, expected exactly 1`);
    }
  }
}

function distanceLabel(p) {
  const bits = [];
  if (typeof p.driveMinutes === 'number') {
    bits.push(p.driveMinutes < 1 ? 'On the street' : `${p.driveMinutes} min`);
  }
  if (typeof p.distanceMiles === 'number') bits.push(`${p.distanceMiles} mi`);
  return bits.join(' · ');
}

function metaLine(p) {
  return [p.cost, p.season, p.ageRange && `Ages ${p.ageRange}`].filter(Boolean).join(' · ');
}

function imageTag(p, variant, sizes) {
  if (!p.image || !p.image.file) return '';
  const base = p.image.file.replace(/\.[^.]+$/, '');
  const src = `assets/images/${base}-${variant}.jpg`;
  const dims = variant === 'hero' ? 'width="1600" height="1000"' : 'width="400" height="300"';
  return `<img src="${esc(src)}" alt="${esc(p.image.alt || p.name)}" ${dims} loading="lazy" decoding="async" sizes="${esc(sizes)}">`;
}

function buildHero(p, flip) {
  return render(tpl('hero'), {
    FLIP: flip ? ' hero--flip' : '',
    ID: p.id,
    NAME: p.name,
    BODY: p.body || p.blurb || '',
    DISTANCE: distanceLabel(p),
    META: metaLine(p),
    ADDRESS: p.address || '',
    URL: p.url || '',
    LINK_RAW: p.url
      ? `<a class="hero__link" href="${esc(p.url)}" target="_blank" rel="noopener">Visit site</a>`
      : '',
    IMAGE_RAW: imageTag(p, 'hero', '(min-width: 900px) 62vw, 100vw'),
    NOTE_RAW: p.note ? `<p class="hero__note">${esc(p.note)}</p>` : '',
  });
}

function buildIndexItem(p) {
  return render(tpl('index-item'), {
    NAME: p.name,
    BLURB: p.blurb || '',
    DISTANCE: distanceLabel(p),
    META: metaLine(p),
    THUMB_RAW: imageTag(p, 'thumb', '80px') || '<span class="item__thumb-empty" aria-hidden="true"></span>',
    LINK_OPEN_RAW: p.url ? `<a class="item__title-link" href="${esc(p.url)}" target="_blank" rel="noopener">` : '<span class="item__title-link">',
    LINK_CLOSE_RAW: p.url ? '</a>' : '</span>',
  });
}

function buildPhotoAct(act, places, flip) {
  const hero = places.find((p) => p.hero);
  const rest = places.filter((p) => !p.hero);
  return render(tpl('act'), {
    ID: act.id,
    LABEL: act.label,
    TITLE: act.title,
    INTRO: act.intro || '',
    HERO_RAW: buildHero(hero, flip),
    ITEMS_RAW: rest.map(buildIndexItem).join('\n'),
    COUNT: rest.length ? `${rest.length} more nearby` : '',
  });
}

function buildSchools(act, places) {
  const rows = places
    .map((p) =>
      render(tpl('school-item'), {
        NAME: p.name,
        RATING: p.rating || '',
        GRADES: p.grades || '',
        BLURB: p.blurb || '',
        DISTANCE: distanceLabel(p),
        LINK_OPEN_RAW: p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">` : '<span>',
        LINK_CLOSE_RAW: p.url ? '</a>' : '</span>',
      })
    )
    .join('\n');
  return render(tpl('section-compact'), {
    ID: act.id,
    LABEL: act.label,
    TITLE: act.title,
    INTRO: act.intro || '',
    ROWS_RAW: rows,
    FOOTNOTE: act.footnote || '',
  });
}

function buildPractical(act, places) {
  const rows = places
    .map((p) =>
      render(tpl('practical-item'), {
        NAME: p.name,
        BLURB: p.blurb || '',
        DISTANCE: distanceLabel(p),
        LINK_OPEN_RAW: p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">` : '<span>',
        LINK_CLOSE_RAW: p.url ? '</a>' : '</span>',
      })
    )
    .join('\n');
  return render(tpl('section-compact'), {
    ID: act.id,
    LABEL: act.label,
    TITLE: act.title,
    INTRO: act.intro || '',
    ROWS_RAW: rows,
    FOOTNOTE: act.footnote || '',
  });
}

function creditLine(label, image) {
  if (!image || !image.credit) return '';
  const credit = image.sourceUrl
    ? `<a href="${esc(image.sourceUrl)}" target="_blank" rel="noopener">${esc(image.credit)}</a>`
    : esc(image.credit);
  return `<li>${esc(label)} — ${credit}</li>`;
}

function buildCredits(data) {
  const items = [creditLine('Opening photograph', data.site.heroImage)]
    .concat(data.places.map((p) => creditLine(p.name, p.image)))
    .filter(Boolean);
  return items.length ? `<ul class="credits__list">${items.join('')}</ul>` : '';
}

function siteHeroImage(site) {
  if (!site.heroImage || !site.heroImage.file) return '';
  const base = site.heroImage.file.replace(/\.[^.]+$/, '');
  return `<img src="assets/images/${esc(base)}-hero.jpg" alt="${esc(site.heroImage.alt || '')}" width="1600" height="1000" fetchpriority="high" decoding="async">`;
}

function mapPayload(data) {
  return {
    home: data.site.home,
    acts: data.acts.filter((a) => PHOTO_ACTS.includes(a.id)).map((a) => ({ id: a.id, label: a.label, color: a.color })),
    places: data.places
      .filter((p) => Array.isArray(p.coords) && p.coords.length === 2 && PHOTO_ACTS.includes(p.act))
      .map((p) => ({
        name: p.name,
        act: p.act,
        coords: p.coords,
        blurb: p.blurb || '',
        distance: distanceLabel(p),
        url: p.url || '',
      })),
  };
}

/* Appends a content hash to stylesheet and script URLs. Without this a browser
   holding an old site.css will keep applying it after a deploy, which is both a
   real problem for anyone re-opening a link you already sent and a maddening
   one to debug locally. */
function fingerprintAssets(html) {
  return html.replace(/(assets\/[^"?]+\.(?:css|js))"/g, (match, rel) => {
    const file = path.join(OUT, rel);
    if (!fs.existsSync(file)) return match;

    let bytes = fs.readFileSync(file);
    /* site.css only @imports fonts.css, so a font change would not otherwise
       alter its hash. */
    if (rel.endsWith('styles/site.css')) {
      const fonts = path.join(OUT, 'assets', 'styles', 'fonts.css');
      if (fs.existsSync(fonts)) bytes = Buffer.concat([bytes, fs.readFileSync(fonts)]);
    }
    const hash = crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 8);
    return `${rel}?v=${hash}"`;
  });
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dest);
    else fs.copyFileSync(src, dest);
  }
}

function main() {
  const data = JSON.parse(read(path.join(SRC, 'data', 'places.json')));
  validate(data);

  const byAct = (id) => data.places.filter((p) => p.act === id);

  let photoActIndex = 0;
  const sections = data.acts
    .map((act) => {
      const places = byAct(act.id);
      if (!places.length) return '';
      if (act.id === 'schools') return buildSchools(act, places);
      if (act.id === 'practical') return buildPractical(act, places);
      return buildPhotoAct(act, places, photoActIndex++ % 2 === 1);
    })
    .filter(Boolean)
    .join('\n');

  const nav = data.acts
    .filter((a) => byAct(a.id).length)
    .map((a) => `<a href="#${esc(a.id)}">${esc(a.navLabel || a.label)}</a>`)
    .join('');

  const html = render(tpl('shell'), {
    TITLE: data.site.title,
    DESCRIPTION: data.site.description,
    HEADLINE: data.site.headline,
    STANDFIRST: data.site.standfirst,
    KICKER: data.site.kicker,
    NAV_RAW: nav,
    HERO_IMAGE_RAW: siteHeroImage(data.site),
    SECTIONS_RAW: sections,
    MAP_INTRO: data.site.mapIntro,
    ADDRESS: data.site.address,
    CREDITS_RAW: buildCredits(data),
    FOOTER_NOTE: data.site.footerNote,
    UPDATED: data.site.updated,
    MAPDATA_RAW: JSON.stringify(mapPayload(data)),
  });

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(ASSETS, { recursive: true });
  fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

  for (const dir of ['styles', 'scripts', 'vendor', 'fonts']) {
    const from = path.join(SRC, dir);
    if (fs.existsSync(from)) copyDir(from, path.join(ASSETS, dir));
  }

  /* Only the section heroes and the opening image use the large size, so
     copying the whole images directory would ship ~16 unused hero files. */
  const wanted = new Set([...html.matchAll(/assets\/(images\/[^"]+)/g)].map((m) => m[1]));
  const imagesFrom = path.join(SRC, 'images');
  if (fs.existsSync(imagesFrom)) {
    fs.mkdirSync(path.join(ASSETS, 'images'), { recursive: true });
    for (const rel of wanted) {
      const from = path.join(SRC, path.basename(path.dirname(rel)), path.basename(rel));
      if (fs.existsSync(from)) fs.copyFileSync(from, path.join(ASSETS, path.basename(path.dirname(rel)), path.basename(rel)));
      else console.warn(`  warning: ${rel} referenced but not built — run npm run images`);
    }
  }

  /* Written last: fingerprinting reads the copied files to hash them. */
  fs.writeFileSync(path.join(OUT, 'index.html'), fingerprintAssets(html));

  const withImages = data.places.filter((p) => p.image && p.image.file).length;
  console.log(`  built docs/index.html`);
  console.log(`  ${data.places.length} places across ${data.acts.length} sections, ${withImages} with photography`);
}

main();
