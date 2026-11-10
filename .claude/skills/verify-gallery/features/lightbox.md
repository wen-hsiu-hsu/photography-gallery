# Lightbox

Clicking a photo opens it in a PhotoSwipe lightbox, fit to the screen, with a caption below: description, location, month and year, tags, lens, camera, shutter speed, aperture and ISO. Escape, the × button or a background click closes it.

## Sub-features

- `lightbox-open` opens the clicked photo in the lightbox.
- `lightbox-caption` shows the matching caption for that photo.
- `lightbox-close` closes with Escape or the × button, and the page stays at `/`.

## How to get to it (user POV)

- Click any photo in the gallery.
- Keyboard: Tab to a photo link, then press Enter.

## Driving it with chrome-devtools

Preconditions:

- `verify.sh doctor` prints `OK` with `gallery_items` > 0.
- The page is open in the `verify-gallery` isolated context and the loading overlay is hidden (see SKILL.md).

- **Open.** Click the first photo. Run `evaluate_script` with `const a = document.querySelector('#image-gallery a[id^="gallery-"]'); a.scrollIntoView(); a.click();`, then poll for `.pswp--open`. `.pswp--open` exists, and the active slide's `img` `src` contains the same `img/<name>` as the anchor's `href`.
- **Caption.** Read `.pswp__dynamic-caption` `innerText`. It contains that photo's `description` and location from `content/gallery/<file>.json` and a date like `Jul. 2025`.
- **Proof.** Run `take_screenshot { filePath: ".verify/evidence/lightbox/open.png" }`. The photo and caption are visible over the dimmed gallery.
- **Close.** Run `press_key { key: "Escape" }` and wait about 600 ms. `.pswp--open` is gone and `location.href` is still `http://localhost:3939/`.

## Gotchas

- Click before the loading overlay is hidden and the click lands on the overlay. Wait for `.loading-bg` to get `display:none`.
- Each photo opens as its own one-photo gallery by design: the counter reads `1 / 1`, ArrowRight does nothing, and PhotoSwipe hides the arrows (`.pswp--one-slide`). Do not report it as a bug.
- Caption details: the timer icon (`carbon:timer`) labels the shutter speed (e.g. `1/400`) and the aperture icon (`carbon:aperture`) labels the f-number (e.g. `f/5.6`).
- In dev mode the slide `src` is an `_ipx/...` resized URL. In the generated build it is a static path. Match on the `img/<name>` part.
- Pan and zoom are disabled on purpose (`zoom: false`, and pointerMove calls preventDefault).
