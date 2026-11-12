# Globe photo section

Below the header, a full-viewport section shows one photo at a time next to a rolling thumbnail strip, an info block (number, place, date, coordinates, EXIF) and a globe cut by the screen edge with the photo's place lit. Scrolling switches photos; clicking a thumbnail glides to it. Photos come from published `content/gallery/*.json` (newest first), placed by `customLocation || location` via `app/utils/places.ts`.

## Sub-features

- `globe-scroll` switches the photo, info text and active thumbnail as the page scrolls through the section (one step = half a viewport height).
- `globe-click` scrolls to a thumbnail's photo when it is clicked.
- `globe-info` swaps each info value in place (old value leaves, new one enters).
- `globe-map` shows the embedded map, lights the place and turns to it.
- `globe-layout` changes arrangement by viewport: desk (>=1280 wide), tab (768-1279), phone (<768 or portrait).
- `globe-snap` snaps scrolling to header start, each photo, and contact start.

## How to get to it (user POV)

- Scroll past the full-screen header on `/`.
- Click a thumbnail in the strip.

## Driving it with chrome-devtools

Preconditions:

- `verify.sh doctor` prints `OK` with `globe_thumbs` > 0, and the loading overlay is hidden (see SKILL.md).
- A map is reachable at `NUXT_PUBLIC_GLOBE_MAP_URL` (local: map-proto on `:3940`).
- `resize_page` cannot go below 500 wide; use `emulate { viewport: "390x844x2,mobile,touch" }` for phone.

- **Count.** `document.querySelectorAll('.th').length` equals the number of published files that have a `customLocation` or `location`; `curl -s localhost:3939/ | grep -c 'class="th"'` matches.
- **Scroll.** `const top = document.querySelector('#section').getBoundingClientRect().top + scrollY; scrollTo({top: top + 10 * step, behavior: 'instant'})` with `step = Math.round(innerHeight / 2)`. After 1 s `.th.on` has `data-i="10"` and `.slot[data-f="count"]` reads `11 / N`.
- **Click.** `document.querySelector('.th[data-i="20"]').click()`, wait 2.5 s. `scrollY === top + 20 * step` and `.th.on` is index 20.
- **Info swap.** Right after a scroll switch, within 300 ms `.slot[data-f="place"] > span` has 2 elements; after 700 ms it has 1.
- **Map.** Scroll the section into view, wait up to 6 s. `#globe.className === 'on'` and `#globe.style.clipPath` starts with `circle(`; the screenshot shows a full disc, not a polygon.
- **Link bubble.** In the section the pill (`.rounded-full.backdrop-blur`) computed `opacity` is `0` and `pointer-events` `none`; on the header and on `#contact` it is `1`.
- **Snap.** After `scrollTo(300)` `scrollY` ends at `0`; `scrollTo(top - 100)` ends at `top`; a position midway between the last photo and `#contact` ends at the nearer of the two.
- **Proof.** `take_screenshot` at photo 5 (`scrollTo(top + 4 * step)`), wait 5 s, at 1440x900, 1024x768 and 390x844. `take_screenshot { filePath }` only accepts paths inside the repo roots, so write to `.verify/evidence/globe/`.

## Gotchas

- The map iframe is throttled while off screen: it only answers READY once the section is on screen. A page loaded at the top shows no globe until you scroll in; that is expected.
- Before JS runs the stage is hidden (`visibility: hidden`) on purpose; a blank section in a no-JS screenshot is not a bug.
- In dev, the Nuxt DevTools button overlaps the bottom of the viewport.
- Photo order inside one day follows `DateTimeOriginal`, so it can differ from the prototype's filename order.
- A photo with neither `customLocation` nor `location` is left off (build warns); an unknown place name fails `pnpm generate` and breaks the dev SSR page.
- `scrollTo` with `behavior: 'instant'` still re-snaps under mandatory snapping; probe with positions near a snap point.
- Map iframe is cross-origin: assert on `#globe` attributes, not its contents.
