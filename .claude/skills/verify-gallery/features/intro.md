# Intro: loading overlay and header

On load, a black full-screen `LOADING` overlay with a glowing border runs for about 1 s and fades out. A full-height header then animates in the huge `PHOTOGRAPHY` heading (`PHOTO / GRAPHY` on two lines under `md`), a rotating text slider and a description line with a "reach out" link.

## Sub-features

- `intro-loading` shows the overlay, then hides it and flips the global "page loaded" state.
- `intro-heading` animates the heading in.
- `intro-description` fades the description in about 2 s after the overlay ends.
- `intro-reach-out` scrolls the "reach out" link to `#contact`.

## How to get to it (user POV)

- Open `/`.

## Driving it with chrome-devtools

Preconditions:

- `verify.sh doctor` prints `OK`.

- **Overlay.** Open a fresh page and read `.loading-bg` straight away. The text `Loading` is visible. Then poll until `style.display === "none"`, which happens within 10 s.
- **Heading.** Read `document.querySelector('header').innerText`. It contains `photography` in any case.
- **Reach out.** Click the `reach out` link (`take_snapshot`, then `click` its uid). `location.hash` is `#contact`, and `#contact` sits inside the viewport (`getBoundingClientRect().top` < `innerHeight`).
- **Proof.** Run `take_screenshot` on `.verify/evidence/intro/header.png` 3 s after the overlay hides.

## Gotchas

- The description and link bubble stay at opacity 0 until the overlay finishes. Before that, missing elements are not a bug.
- The animations use real timers. Wait on the conditions above, not fixed sleeps, except for the 3 s screenshot wait.
