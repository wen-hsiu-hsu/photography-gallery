---
name: verify-gallery
description: Drive the photography-gallery Nuxt site (single-page web UI at /) in a real browser to prove a change works — loading overlay, header, globe photo section (scroll-driven thumbnails, EXIF, embedded map), contact section, floating link bubble. Use after any change to app/, content/gallery/, public/img/ or nuxt.config.ts, or when asked to verify, screenshot or check the site.
---

# Verify photography-gallery

The product is one statically generated page (`app/pages/index.vue`). Users scroll it; the globe section turns scroll into photo switching, and thumbnails can be clicked. There is no auth, no backend writes, and no persistent data dir. Gallery data comes from `content/gallery/*.json` (only `published: true`), images from `public/img/`, locations from `app/utils/places.ts`. The globe is an iframe of the map app: set `NUXT_PUBLIC_GLOBE_MAP_URL` (default `https://map.hsiu.soy/`; local map-proto: `http://localhost:3940/`).

Harness: `.claude/skills/verify-gallery/verify.sh` (launch/doctor/stop) + the `chrome-devtools` MCP tools (`new_page`, `evaluate_script`, `press_key`, `take_screenshot`, `take_snapshot`). Load them with one ToolSearch `select:` call.

## Launch

```bash
.claude/skills/verify-gallery/verify.sh launch     # nuxt dev on :3939 (VERIFY_PORT to override); prefix NUXT_PUBLIC_GLOBE_MAP_URL=http://localhost:3940/ for a local map
```

Ready = it prints `OK: http://localhost:3939 pid=… globe_thumbs=N rev=…`. That line comes from doctor, which needs the SSR HTML to contain globe thumbnails (`class="th"`), so "ready" means content was queried, not just that the port answers. First start takes ~20–60 s (Nuxt Content builds its sqlite index in `.data/`). Log: `.verify/dev.log`. If the log shows `EMFILE: too many open files, watch` and the server answers 503, relaunch with `CHOKIDAR_USEPOLLING=1` in front.

Launch refuses if the port is already taken — it never drives someone else's dev server (e.g. the user's own `pnpm dev` on :3000). Pick another `VERIFY_PORT` rather than killing theirs.

For changes to SSG output, SEO/og-image, or `nuxt.config.ts` build behavior, also run `pnpm generate` and inspect `.output/public/index.html`; dev mode does not prove the static build.

## Doctor

```bash
.claude/skills/verify-gallery/verify.sh doctor
```

Read-only. Checks: the pid we started is alive, the listening port belongs to that pid's process tree, `GET /` succeeds, the HTML contains `class="th"` globe thumbnails, and prints the git rev (`+dirty` when there are uncommitted changes). Run it first whenever anything looks off.

## Drive

Open the page in an isolated context so cookies/storage never mix with the user's browser:

`new_page { url: "http://localhost:3939/", isolatedContext: "verify-gallery" }`

Always wait for the loading overlay first — it covers the page with `z-99` for ~1–2 s and sets `style.display = "none"` on `.loading-bg` when done:

```js
async () => {
  const o = document.querySelector('.loading-bg');
  for (let i = 0; i < 50 && o && o.style.display !== 'none'; i++) await new Promise(r => setTimeout(r, 200));
  return o?.style.display === 'none';
}
```

Stable handles (from the source, not guesses):

| Thing | Handle |
| --- | --- |
| Loading overlay | `.loading-bg` |
| Globe section | `#section` (root, `data-mode` = desk/tab/phone) |
| Thumbnails | `.th[data-i]`, active one has `.on` |
| Main photo / info / map | `#main img`, `#info .slot`, `#globe` (iframe, gets `.on` after the map says READY) |
| Contact section | `#contact` (header "reach out" link targets it) |
| Link bubble | fixed bottom bar; links to `instagram.com/kevinshu/`, `github.com/wen-hsiu-hsu`, `hsiu.soy` |

Per-feature journeys live in [features/README.md](features/README.md). A proof that drives one entry point is incomplete when the map lists others.

## Evidence

Write to `.verify/evidence/<feature>/` (gitignored, survives `stop`). Capture:

- the action and the resulting state: an `evaluate_script` return value (JSON) plus `take_screenshot { filePath: ".../<step>.png" }` of the state after the action;
- `take_snapshot { filePath }` when accessibility/text matters;
- for data changes (new/edited `content/gallery/*.json`), also prove the SSR HTML: `curl -s localhost:3939/ | grep -c 'class="th"'` and grep for the new `fileId`.
- the map iframe only runs while it is on screen (off-screen cross-origin iframes are throttled), so scroll the globe section into view before waiting for `#globe.on`.

Proof standards: drive the real user path (scroll, click a thumbnail), not by calling Vue internals. Do not mock content. Check what the user sees *and* the underlying state (count slot, info text, `.th.on`, `scrollY`).

## Cleanup

```bash
.claude/skills/verify-gallery/verify.sh stop
```

Stops only the pid tree `launch` recorded in `.verify/dev.pid` (never by process name). Also `close_page` the tab you opened. Evidence in `.verify/evidence/` is kept; delete it only when the user asks.

## Helpers

- `verify.sh launch|doctor|stop` — shown above; executable; env `VERIFY_PORT`.
