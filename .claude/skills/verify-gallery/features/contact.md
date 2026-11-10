# Contact and links

At the bottom of `/`, the `#contact` section shows the author photo, a "Hey!" bio, and Instagram and Email links. A floating pill bar at the bottom of the viewport (centered on mobile, right-aligned from `md`) holds Instagram, GitHub and Website links that open in a new tab.

## Sub-features

- `contact-about` shows the author photo and bio text.
- `contact-links` holds the Instagram (`instagram.com/kevinshu`) and Email (`mailto:`) links.
- `link-bubble` holds the Instagram, GitHub (`github.com/wen-hsiu-hsu`) and Website (`hsiu.soy`) links, with `target="_blank"`, and expands in after the intro.

## How to get to it (user POV)

- Scroll to the bottom, or click "reach out" in the header.
- The link bubble shows on every scroll position once the intro ends.

## Driving it with chrome-devtools

Preconditions:

- `verify.sh doctor` prints `OK`, and the overlay is hidden.

- **About.** Scroll `#contact` into view and wait 1.5 s. Its `innerText` contains `Hey!`, and its `img` has `naturalWidth` > 0.
- **Contact links.** Collect the `href` values of the `a` elements inside `#contact`. They include `https://www.instagram.com/kevinshu` and a `mailto:` link.
- **Bubble.** Wait 3 s after the overlay hides. The anchors with `href*="github.com/wen-hsiu-hsu"`, `instagram.com/kevinshu/` and `hsiu.soy` each have `target="_blank"`, and their wrapper's computed `opacity` is `1`.
- **Proof.** Run `take_screenshot` on `.verify/evidence/contact/contact.png` with `#contact` in view.

## Gotchas

- Never click the external links during verification: they open real third-party sites in new tabs. Assert `href` and `target` instead.
- The link bubble starts at `width:0; opacity:0` per link and springs open about 1 s after the overlay ends. Asserting earlier fails.
