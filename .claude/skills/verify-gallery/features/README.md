# photography-gallery feature map

The site is a single page at `/`. Each file below covers one user-visible feature.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior, then exactly four H2 sections in this order:

1. `Sub-features`: short IDs, one line each.
2. `How to get to it (user POV)`: every user entry point.
3. `Driving it with chrome-devtools`: starts with `Preconditions:`, then labeled bullets pairing a user action with the exact tool call and the observable result.
4. `Gotchas`: traps that waste or invalidate a run.

Keep implementation details out. Name user paths, stable handles, required state, commands and observable proof. If seed content lacks a precondition, the journey fails and the reason goes in `Gotchas`; never weaken the journey.

## Features

- [Intro: loading overlay and header](./intro.md): loading animation, `PHOTOGRAPHY` heading, text slider, "reach out" link.
- [Gallery grid](./gallery.md): masonry list of published photos with location labels.
- [Lightbox](./lightbox.md): click a photo to open it full-size with a caption and EXIF details; close it. **Verified end to end 2026-11-10.**
- [Contact and links](./contact.md): about section, Instagram/Email links, floating link bubble.
