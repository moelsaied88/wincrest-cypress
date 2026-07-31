# Lakewood Forest Area Guide

A one-page guide to the family amenities around Lakewood Forest in Cypress, Texas,
written for a prospective tenant with children aged 3–10.

**Live at https://moelsaied88.github.io/wincrest-cypress**

The page covers what a family would actually do here, tiered outward from the front
door: the neighborhood itself, everything inside a fifteen-minute drive, the splash
pads that make a Houston summer survivable, indoor options for when it is 100°, and
weekend destinations further afield. It closes with the Cy-Fair ISD feeder chain,
everyday logistics, and a map of all of it.

## How it works

Everything on the page comes from one file: `src/data/places.json`. A place's
section entry, its map pin, and its photo credit are all generated from the same
record, so a drive time can never be right in one spot and stale in another.

`build.js` renders `docs/index.html` from that data plus the templates in
`src/templates/`. There are no dependencies, no lockfile, and no CI — GitHub Pages
serves the `docs/` folder from `main` directly.

## Commands

```bash
npm run build     # render docs/ from src/
npm run verify    # confirm every image exists and every outbound link resolves
npm run serve     # preview at http://localhost:4173
npm run images    # re-download and re-optimize source photography
npm run fonts     # re-download the self-hosted webfonts
```

Publishing is `git push`. Pages picks it up within a minute or so.

## Layout

```
build.js                 renders docs/ from src/
scripts/
  fetch-fonts.js         downloads the latin subset of Fraunces and Inter
  fetch-images.js        downloads source photography into src/originals/
  optimize-images.sh     sips-based resize into hero and thumbnail sizes
  verify.js              checks images resolve and links return 200
src/
  data/places.json       single source of truth
  templates/             page shell and section fragments
  styles/                site.css, plus generated fonts.css
  scripts/map.js         Leaflet setup
  vendor/leaflet/        vendored so the page has no third-party runtime deps
  images/                optimized derivatives
  originals/             downloaded sources (gitignored)
docs/                    build output, served by GitHub Pages
spec/                    design document
```

## Editing content

Add or change a place in `src/data/places.json`, then `npm run build`.

Each of the five photo sections must have exactly one entry with `"hero": true` —
the build fails loudly otherwise, which is deliberate. The `schools` and
`practical` sections use a compact template and are exempt.

If you add a place with a new photo, put its direct image URL in
`image.sourceUrl`, then run `npm run images` before building.

## A note on the photography

Photographs are sourced from official venue and Harris County Precinct pages. Each
one records its origin in `places.json` and is credited in the page footer. If a
source cannot be found for a place, that place ships without a thumbnail rather
than with a stock photo that misrepresents it.

## Accuracy

Facts on the page — school ratings, splash pad seasons, admission prices, drive
times — carry a date and a source URL in `places.json`. They will drift. School
ratings are labelled with the year they apply to so they do not silently go stale.
