# Gallery grid

Published photos (`published: true` in `content/gallery/*.json`) appear newest first by `DateTimeOriginal`, in a masonry grid: 2 columns on mobile, 3 at `md`, 4 at `lg`. A location label sits under each photo. Photos fade and slide in as they scroll into view.

## Sub-features

- `gallery-list` renders one item per published JSON file, in date order.
- `gallery-location` shows `customLocation`, falling back to `location`, under each photo.
- `gallery-responsive` changes the column count with the viewport.
- `gallery-reveal` animates items in on scroll.

## How to get to it (user POV)

- Scroll past the full-screen header on `/`.

## Driving it with chrome-devtools

Preconditions:

- `verify.sh doctor` prints `OK`, and the overlay is hidden.

- **Count.** Count published files and rendered items. Run `grep -l '"published": true' content/gallery/*.json | wc -l` in Bash, and `document.querySelectorAll('#image-gallery a[id^="gallery-"]').length` in `evaluate_script`. The two numbers match.
- **Order.** Read the first three anchor ids. Their `fileId`s belong to the three newest `DateTimeOriginal` values among published files.
- **SSR.** Run `curl -s localhost:3939/ | grep -c 'id="gallery-'`. It matches the count above, so the content is in the server HTML, not only rendered on the client.
- **Columns.** Use `resize_page` at 390, 800 and 1280 wide, then read `getComputedStyle(document.querySelector('#image-gallery')).columnCount`. The values are `2`, `3` and `4`.
- **Proof.** Scroll `#image-gallery` into view, wait 1.5 s for the reveal, then `take_screenshot` to `.verify/evidence/gallery/grid.png`.

## Gotchas

- Items start at opacity 0 with blur until scrolled into view. A screenshot taken before scrolling shows blank tiles, which is not a bug.
- Images use `loading="lazy"`, so off-screen tiles have no pixels yet.
- After editing a JSON file, Nuxt Content re-indexes in dev and HMR usually picks the change up. If it doesn't, `stop` then `launch`.
- `pnpm update:gallery` rewrites `content/gallery/*.json` from the EXIF in `public/img/`. Never run it during verification unless the change is to that script.
