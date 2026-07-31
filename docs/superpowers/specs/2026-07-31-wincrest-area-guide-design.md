# Lakewood Forest Area Guide — Design

Date: 2026-07-31
Status: Approved (design), pending implementation plan

## Purpose

A polished, shareable one-page web guide to the amenities around 12903 Wincrest Ct,
Cypress, TX 77429, aimed at a prospective tenant with children aged 3–10. The link
is sent directly to prospects; it is not marketing collateral for an agent and
carries no contact information.

The site answers one question: *what will my kids' life look like if we live here?*

## Scope

In scope:

- Amenities, parks, water features, indoor play, and weekend attractions, tiered by distance
- Cy-Fair ISD schools serving the address
- Everyday practicalities: grocery, pediatric care, library, commute times
- An interactive map anchored on the address
- Public hosting at `https://moelsaied88.github.io/wincrest-cypress`

Out of scope:

- The house itself — no photos, specs, rent, floor plan, or listing details.
  Prospects already have the MLS listing; this is the companion piece.
- Contact information, agent branding, or any call to action.
- A CMS, admin UI, or any runtime backend.

## Decisions Already Made

| Decision | Choice | Rationale |
| --- | --- | --- |
| Hosting | GitHub Pages, repo `moelsaied88/wincrest-cypress` | Free, permanent URL, publishable directly from the CLI |
| Repo | New public repo, separate from the HA dashboard repo | Unrelated content should not live in a HACS repo |
| Site scope | Amenities only | Prospect already has the listing |
| Radius | Three tiers: neighborhood → ~15 min → greater Houston | Tells a story outward from the front door |
| Image sourcing | Automatic, from official and public sources | User explicitly accepted the licensing risk |
| Visual direction | Editorial Warm | Serif headlines, cream/sage palette, large quiet photography |
| Content pacing | Hero + index per section | Stays polished at 25+ places without an endless scroll |
| Branding | Unbranded — no contact info | User will explain the link when sending it |
| Map anchor | Real address pinned | "Unbranded" meant no contact info, not no address |

## Content Architecture

One page, five acts plus two closing sections, with a slim sticky nav for jumping
between them. Every act opens with one hero place given full editorial treatment
(large photo, headline, short paragraph), followed by a compact illustrated index
of the rest — thumbnail, name, one-line description, distance.

### Act 1 — The neighborhood

Hero: **Lakewood Residents Club** (15006 Lakewood Forest Dr). 50m temperature-controlled
pool with diving board, a separate wading pool for small children, 4 lighted hard-surface
tennis courts, 2 pickleball courts, playground with climbing structure, sand volleyball,
summer swim team for children and teens. Backs onto Faulkey Gully with direct trail access.

**Required disclosure:** the club is a separate members-only organization, not an HOA
benefit. Living in Lakewood Forest does not grant access; residents join. This is stated
plainly in one line within the hero copy — approved by the user. Do not bury or omit it.

Index:

- Faulkey Gully hike & bike trail
- Lakewood Forest itself — 2,617 homes, mature oak canopy, large lots, low HOA fees
- Neighborhood ponds (the property backs onto one)
- Lakewood Forest Civic Association family events

### Act 2 — Ten minutes away

Hero: **Matzke Park** — 20 acres, Be An Angel inclusive playground, paved paths, sensory
elements, butterfly garden. In 77429.

Index: Telge Park, Kleb Woods Nature Preserve, Dennis Johnston Park, Grant Park,
Cy-Fair library branch (children's wing and story time).

### Act 3 — Water

Given its own act because Houston summers make it the deciding amenity.

Hero: **Zube Park** (17560 Roberts Rd, Hockley, ~8.5 mi) — free seasonal splash pad,
miniature railroad running select weekends, disc golf, 3-mile trail loop, 225 acres.

Index: Clark Henry Park (Jersey Village, ~9.6 mi), Bane Park (~12.5 mi),
Nottingham Park, May Valley Sprayground (The Woodlands, ~16.8 mi).

Splash pads are seasonal — each entry states its operating season.

### Act 4 — Rainy days and 100° days

Hero: **Fun N Play** (11712 Grant Rd Ste A, Cypress 77429) — padded indoor play for
infants through age 8, closest indoor option to the house.

Index: Play Street Museum Cypress (farm-themed, ages 1–8, reserved sessions),
Kidtastic Park (separate toddler and big-kid zones), Little Explorers Lab,
Romp n' Roll.

### Act 5 — Weekend adventures

Hero: **John Paul Landing Park** (24202 West Rd, Cypress 77433) — 876 acres,
176-acre lake, 7.8 miles of trail, environmental education center, non-motorized
boating, fishing.

Index: greater-Houston headliners appropriate to ages 3–10 — Children's Museum of
Houston, Houston Zoo, Space Center Houston, Kemah Boardwalk — each with an honest
drive time rather than an optimistic one.

### Closing section — Schools

Compact, not a full act. The feeder chain serving this address:

- Hamilton Elementary (12050 Old Kluge Rd) — TEA 2024–25 rating A, 93/100, five of
  six eligible distinction designations, K–5, ~990 students
- Hamilton Middle — TEA rating A, 91/100
- Cypress Creek High — TEA rating B, 84/100

The Lakewood Forest side of the Hamilton Middle zone routes to Cypress Creek High
rather than Cy-Fair High. Ratings are dated ("2024–25 TEA ratings") so they don't
silently go stale.

### Closing section — The practical stuff

Compact list, not photo-led: grocery, pediatric care, and commute times to downtown
Houston and the Energy Corridor. The library appears in Act 2 as a kid destination
and is not repeated here.

### Interactive map

Anchored on 12903 Wincrest Ct with every place above pinned and color-coded by act.

## Technical Design

### Stack

Static HTML, CSS, and vanilla JavaScript. No framework, no npm dependencies, no CI.

A zero-dependency Node script (`build.js`) renders `docs/index.html` from
`src/data/places.json` and HTML templates in `src/templates/`. GitHub Pages serves
the `/docs` folder from `main` directly.

**Why a build step rather than hand-written HTML:** each place appears in three
places — its section, its map pin, and the image credits list. Hand-maintaining that
triples the chance of a stale drive time or an orphaned pin. One JSON entry drives
all three.

**Why not Astro/11ty/Next:** a single page does not justify a dependency tree, a
lockfile, and a CI pipeline. The build script is expected to stay under 200 lines.

### Repository layout

```
wincrest-cypress/
  build.js                 # renders docs/ from src/
  scripts/
    fetch-images.js        # downloads source images into src/images/original/
    optimize-images.sh     # sips-based resize/compress to hero + thumb sizes
    verify.js              # checks images resolve and external links return 200
  src/
    data/places.json       # single source of truth
    templates/             # page shell, act, hero, index-item fragments
    styles/site.css
    scripts/map.js
    images/
  docs/                    # build output, served by GitHub Pages
    index.html
    assets/
  README.md
```

### Data model

Each place in `places.json`:

```json
{
  "id": "lakewood-residents-club",
  "name": "Lakewood Residents Club",
  "act": "neighborhood",
  "hero": true,
  "blurb": "One-line description for index entries.",
  "body": "Longer editorial paragraph, hero entries only.",
  "address": "15006 Lakewood Forest Dr, Houston, TX 77070",
  "coords": [30.0123, -95.6234],
  "distance": "0.9 mi · 3 min",
  "season": "Year-round",
  "cost": "Membership required",
  "url": "https://lakewoodrc.org/",
  "image": {
    "file": "lakewood-club.jpg",
    "alt": "Descriptive alt text.",
    "sourceUrl": "https://...",
    "credit": "Lakewood Residents Club"
  }
}
```

`act` is one of `neighborhood`, `nearby`, `water`, `indoor`, `weekend`, `schools`,
or `practical`. The last two render with the compact closing-section template
rather than the hero-plus-index template and are exempt from the hero rule.

`hero: true` marks the one place per act that gets the full spread. Exactly one
hero per act; the build fails loudly if an act has zero or more than one.

### Images

`fetch-images.js` downloads from the `sourceUrl` recorded in each entry, so the
image set is reproducible and every image has a traceable origin.
`optimize-images.sh` uses macOS `sips` to produce two sizes — a ~1600px hero and a
~400px thumbnail — keeping the toolchain dependency-free.

Every image carries alt text and explicit width/height attributes to prevent layout
shift, and loads lazily below the fold. A credits list in the footer names each
source. The user accepted the licensing risk; the credits list and source
attribution are the mitigation.

If a source image cannot be found for a place, that place still ships — the index
entry renders without a thumbnail rather than with a broken image or a stock
substitute that misrepresents the location.

### Map

Leaflet 1.9 with OpenStreetMap tiles, vendored into the repo rather than loaded
from a CDN. No API key, no billing account, and nothing third-party that can
rate-limit or expire a link already sent to a prospect. Pins are color-coded by act
and read from the same `places.json`. Rejected alternative: Google Maps embed,
which requires an API key and a billing account.

Drive times and distances are researched once at build time and stored in the JSON.
No live routing API.

### Responsive and accessible

Designed mobile-first at 390px, expanding to two-column editorial spreads at
desktop widths. A shared link is opened on a phone far more often than a laptop, so
the phone layout is the primary design target, not an afterthought.

Accessibility requirements: alt text on every image, semantic landmarks and heading
order, WCAG AA contrast against the cream palette, visible focus states, and
`prefers-reduced-motion` respected.

### Verification

There is no application logic to unit test, so verification is factual and visual:

1. `build.js` completes with no warnings, and fails loudly on malformed data or a
   miscounted hero.
2. `verify.js` confirms every referenced image file exists and every external link
   returns HTTP 200.
3. Every factual claim — rating, distance, season, address — traces to a source URL
   recorded in the JSON.
4. Lighthouse mobile run: performance, accessibility, and best-practices all ≥ 90.
5. Manual visual check at 390px, 768px, and 1440px.

### Deployment

Repo `moelsaied88/wincrest-cypress`, public. GitHub Pages source set to `main`
branch, `/docs` folder. Publishing is `git push`; no Action required.

Final URL: `https://moelsaied88.github.io/wincrest-cypress`

## Risks

- **Image licensing.** Photos are sourced automatically from official and public
  sources on a public URL. The user explicitly accepted this risk. Mitigation is
  source attribution plus a footer credits list, and preferring official venue and
  Harris County Precinct sources over aggregators.
- **Facts going stale.** School ratings, splash pad seasons, and admission prices
  change. Mitigation is dating every claim and recording its source URL so a refresh
  is mechanical.
- **The members-only club.** The strongest amenity is the one that costs extra. The
  disclosure is required, not optional, and is placed in the hero copy.
