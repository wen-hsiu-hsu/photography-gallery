<!-- 地球相簿：滿版 sticky 舞台 + 一張照片一個捲動 step 的 #track。
     Vue 只負責首幀（SSR + hydration）；mount 之後由下面 onMounted 裡的引擎接手舞台 DOM（spring、滾筒、swapMain/swapText、postMessage）。
     根節點 v-once：這份模板沒有任何響應式內容，Vue 不會 patch 被引擎搬動、播放中的節點。
     id/class 沿用原型（.verify/evidence/globe-proto/src/v8.html），CSS 逐行移植。 -->
<template>
    <section ref="root" id="section" class="globe" v-once>
        <div id="stage">
            <div id="globeWrap"><iframe ref="globe" id="globe" title="Photo locations globe" tabindex="-1" /></div>
            <div ref="main" id="main" aria-live="polite">
                <!-- 與 HTML 一起下載（LCP）；mount 時移除，由引擎播入場動畫（同一個已快取的 URL） -->
                <img :src="first.main" :alt="first.place" fetchpriority="high" />
            </div>
            <div ref="link" id="link" />
            <div ref="strip" id="strip" role="list" aria-label="照片">
                <button v-for="(p, i) in photos" :key="p.id" class="th" role="listitem" :data-i="i" :aria-label="`${pad(i)} ${p.place} ${p.date}`">
                    <span class="meta"
                        ><b>{{ pad(i) }}</b
                        >{{ p.date }}<br />{{ p.place }}</span
                    >
                    <span class="tick" /><span v-if="i < photos.length - 1" class="minor" />
                    <span class="frame" :style="{ '--r': (p.w / p.h).toFixed(4) }">
                        <img :src="p.thumb" alt="" loading="lazy" decoding="async" /><i class="ratio" :data-r="p.ratio" />
                    </span>
                </button>
            </div>
            <aside ref="info" id="info" aria-label="照片資訊">
                <div class="rule" />
                <div class="count">
                    <span>No.</span><span class="slot" data-f="count" style="width: 60px; text-align: right"><span>{{ pad(0) }} / {{ photos.length }}</span></span>
                </div>
                <div class="place"><span class="slot" data-f="place"><span>{{ first.place }}</span></span></div>
                <div class="grid">
                    <div class="row"><span>Date</span><span class="slot" data-f="date"><span>{{ first.date }}</span></span></div>
                    <div class="row"><span>Coord</span><span class="slot" data-f="coord"><span>{{ placeOf[first.place]!.coord }}</span></span></div>
                    <div class="gap" />
                    <div v-for="(k, n) in EXIF_LABELS" :key="k" :class="['row', { wide: k === '相機' }]">
                        <span>{{ k }}</span><span class="slot" :data-f="`x${n}`"><span>{{ first.exif[n] }}</span></span>
                    </div>
                </div>
                <div class="foot rule" />
            </aside>
            <small id="credit"
                ><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a> ·
                <a href="https://carto.com/attributions" target="_blank" rel="noopener">© CARTO</a></small
            >
            <!-- 地球被舞台底緣切成直線；往 contact 捲時淡到白色（停在最後一張時不顯示） -->
            <div ref="fade" class="fade" aria-hidden="true" />
            <nav ref="jump" class="jump" aria-label="區塊導覽">
                <button type="button" data-to="prev">↑ Top</button>
                <button type="button" data-to="next">↓ Contact</button>
            </nav>
        </div>
        <div id="track"><div v-for="p in photos" :key="p.id" class="snap" /></div>
    </section>
</template>

<script setup lang="ts">
const img = useImage();
// URL 在 useAsyncData 裡（prerender 階段）算出來，@nuxt/image 才會把 _ipx 圖片一起輸出；JS 之後才載入的主圖也算在內
const { data } = await useAsyncData("globe-gallery", async () => {
    const rows = await queryCollection("gallery").where("published", "=", true).order("DateTimeOriginal", "DESC").all();
    return toGlobeData(
        rows,
        (path, kind) => (kind === "main" ? img(path, { width: 1800, height: 1800, fit: "inside", format: "webp" }) : img(path, { width: 120, height: 120, fit: "cover", format: "webp" })),
    );
});
// toGlobeData 遇到壞資料會 throw，所以這裡沒有值代表 build 失敗，不是執行期狀態
const { photos, places } = data.value!;
const first = photos[0]!;
const placeOf = Object.fromEntries(places.map(p => [p.id, p]));
const pad = (i: number) => String(i + 1).padStart(2, "0");

const mapUrl = useRuntimeConfig().public.globeMapUrl;
const mapOrigin = new URL(mapUrl).origin;
const fillsViewport = useState("globeFillsViewport", () => false); // LinkBubble 讀這個：地球佔滿視窗時淡出

const root = useTemplateRef<HTMLElement>("root");
const globe = useTemplateRef<HTMLIFrameElement>("globe");
const main = useTemplateRef<HTMLElement>("main");
const link = useTemplateRef<HTMLElement>("link");
const strip = useTemplateRef<HTMLElement>("strip");
const info = useTemplateRef<HTMLElement>("info");
const fade = useTemplateRef<HTMLElement>("fade");
const jump = useTemplateRef<HTMLElement>("jump");

useHead({ htmlAttrs: { class: "globe-snap" } }); // 只有首頁：html scroll-snap-type y mandatory

onMounted(() => {
    // 引擎狀態：全是普通變數，只有這個閉包擁有，不是響應式
    const rootEl = root.value!, globeEl = globe.value!, mainEl = main.value!, linkEl = link.value!, stripEl = strip.value!, infoEl = info.value!, fadeEl = fade.value!, jumpEl = jump.value!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const N = photos.length;
    const ths = [...stripEl.children] as HTMLElement[];
    const clamp = (v: number) => Math.max(0, Math.min(N - 1, v));
    const top = () => rootEl.getBoundingClientRect().top + scrollY; // 區塊的文件座標
    let g = globeLayout(innerWidth, innerHeight);
    let active = -1, pos = 0, vel = 0, last = performance.now(), raf = 0, ready = false;
    let easeTimer: ReturnType<typeof setTimeout> | undefined;

    mainEl.replaceChildren(); // 拿掉 SSR 的那張主圖，見模板註解

    const send = (m: ToMap) => {
        if (ready) globeEl.contentWindow?.postMessage(m, mapOrigin);
    };
    const easeGlobe = (pl: Place, duration: number) => send({ type: "EASE_TO", lat: pl.lat, lng: pl.lng, zoom: zoomAt(pl.lat, g.globe), offset: g.globe.offset, duration });

    function setLink() {
        Object.assign(linkEl.style, linkStyle(g));
    }

    // 目前主圖依新版面重排（不播動畫）
    function refitMain() {
        const cur = mainEl.lastElementChild as HTMLElement | null;
        if (cur && active >= 0) Object.assign(cur.style, fitMain({ w: mainEl.clientWidth, h: mainEl.clientHeight }, photos[active]!, g.mode));
    }

    function layout() {
        g = globeLayout(innerWidth, innerHeight);
        rootEl.dataset.mode = g.mode;
        for (const [k, v] of Object.entries(cssVars(g))) rootEl.style.setProperty(k, v);
        stripEl.style.setProperty("--pitch", String(g.pitch));
        const { R, cx, cy, size } = g.globe;
        Object.assign(globeEl.style, { left: `${cx - size / 2}px`, top: `${cy - size / 2}px`, width: `${size}px`, height: `${size}px`, clipPath: `circle(${R + 1}px at 50% 50%)` });
        refitMain();
        if (active >= 0) {
            setLink();
            easeGlobe(placeOf[photos[active]!.place]!, 800);
        }
    }

    // ---------- 縮圖跟著捲動，經過輕微欠阻尼的 spring ----------
    const K = 170, C = 18; // ζ ≈ 0.69：停下時有幾乎看不出的 overshoot
    function frame(now: number) {
        const dt = Math.min(0.032, (now - last) / 1000);
        last = now;
        const target = clamp((scrollY - top()) / g.step);
        if (reduced) {
            pos = target;
            vel = 0;
        } else {
            vel += (K * (target - pos) - C * vel) * dt;
            pos += vel * dt;
        }
        for (let i = 0; i < N; i++) {
            const s = drum(i, pos, g), el = ths[i]!;
            if (!s) {
                el.style.visibility = "hidden";
                continue;
            }
            el.style.visibility = "";
            el.style.transform = s.transform;
            el.style.opacity = s.opacity;
        }
        const i = clamp(Math.round(target));
        if (i !== active) setActive(i);
        const r = rootEl.getBoundingClientRect();
        const fills = r.top < innerHeight / 2 && r.bottom > innerHeight / 2;
        if (fills !== fillsViewport.value) fillsViewport.value = fills;
        fadeEl.style.opacity = String(Math.max(0, Math.min(1, (innerHeight - r.bottom) / (0.25 * innerHeight))));
        raf = requestAnimationFrame(frame);
    }

    // ---------- 主圖與 info：離場 / 入場 ----------
    function setMain(i: number, dir: number) {
        const p = photos[i]!;
        const im = new Image();
        im.src = p.main;
        im.alt = p.place;
        Object.assign(im.style, fitMain({ w: mainEl.clientWidth, h: mainEl.clientHeight }, p, g.mode));
        // 先離開主執行緒解碼：沒解碼的照片在轉場中會卡 60-140ms
        im.decode().catch(() => {}).then(() => {
            if (active === i) swapMain(im, dir);
        });
    }
    function swapMain(im: HTMLImageElement, dir: number) {
        for (const old of [...mainEl.children] as HTMLElement[]) {
            old.getAnimations().forEach(a => a.commitStyles?.());
            old.animate([{}, { opacity: 0, transform: `translateY(${-dir * 2.5}%)` }], { duration: 650, easing: "cubic-bezier(.65,0,.35,1)", fill: "forwards" }).finished.then(() => old.remove(), () => {});
        }
        mainEl.appendChild(im);
        if (reduced) return;
        // 從照片來的那一側揭開，帶一點 settle
        const from = dir >= 0 ? "inset(100% 0 0 0)" : "inset(0 0 100% 0)";
        im.animate([{ clipPath: from, transform: `translateY(${dir * 3}%) scale(1.03)`, opacity: 0.4 }, { clipPath: "inset(0 0 0 0)", transform: "none", opacity: 1 }], { duration: 950, easing: "cubic-bezier(.65,0,.35,1)" });
    }
    function swapText(slot: Element, text: string, dir: number, delay: number) {
        const old = slot.querySelector("span:last-child") as HTMLElement | null;
        if (old?.textContent === text) return;
        const s = document.createElement("span");
        s.textContent = text;
        slot.appendChild(s);
        if (reduced || !old) {
            old?.remove();
            return;
        }
        const o = { duration: 520, delay, easing: "cubic-bezier(.65,0,.35,1)", fill: "both" as const };
        old.animate([{ transform: "none", opacity: 1 }, { transform: `translateY(${-dir * 100}%)`, opacity: 0 }], o).finished.then(() => old.remove(), () => {});
        s.animate([{ transform: `translateY(${dir * 100}%)`, opacity: 0 }, { transform: "none", opacity: 1 }], { ...o, delay: delay + 90 });
    }

    function setActive(i: number) {
        const dir = active < 0 ? 1 : Math.sign(i - active);
        ths[active]?.classList.remove("on");
        active = i;
        const p = photos[i]!, pl = placeOf[p.place]!;
        ths[i]!.classList.add("on");
        setMain(i, dir);
        const vals: Record<string, string> = { count: `${pad(i)} / ${N}`, place: pl.id, date: p.date, coord: pl.coord };
        p.exif.forEach((v, n) => (vals[`x${n}`] = v));
        [...infoEl.querySelectorAll<HTMLElement>(".slot")].forEach((slot, n) => swapText(slot, vals[slot.dataset.f!]!, dir, n * 28));
        setLink();
        // 預載相鄰兩張，揭開時不會看到半解碼的圖
        for (const j of [i - 1, i + 1]) if (photos[j]) new Image().src = photos[j]!.main;
        send({ type: "HIGHLIGHT", id: pl.id });
        clearTimeout(easeTimer);
        easeTimer = setTimeout(() => easeGlobe(pl, 1600), 220);
    }

    // 點縮圖滑過去（spring 在平滑捲動上再加一層）
    const onStripClick = (e: Event) => {
        const b = (e.target as Element).closest<HTMLElement>(".th");
        if (b) scrollTo({ top: top() + Number(b.dataset.i) * g.step, behavior: reduced ? "auto" : "smooth" });
    };
    stripEl.addEventListener("click", onStripClick);

    // 跳到上一個 / 下一個區塊（header、contact）
    const onJump = (e: Event) => {
        const to = (e.target as Element).closest<HTMLElement>("button")?.dataset.to;
        const el = to === "prev" ? rootEl.previousElementSibling : to === "next" ? rootEl.nextElementSibling : null;
        el?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    };
    jumpEl.addEventListener("click", onJump);

    // 入站訊息：source + origin 都驗；READY 冪等（重送完整狀態），所以地圖重載後再來一次也只是重新同步
    const onMessage = (e: MessageEvent) => {
        const msg = parseFromMap(e, globeEl.contentWindow, mapOrigin);
        if (msg?.type === "READY") {
            ready = true;
            send({ type: "SET_MARKERS", markers: places.map(p => ({ id: p.id, lat: p.lat, lng: p.lng, color: "#e8590c" })) });
            send({ type: "SET_OPTIONS", interactive: false, onMarkerClick: "event-only" });
            const pl = placeOf[photos[Math.max(0, active)]!.place]!;
            send({ type: "HIGHLIGHT", id: pl.id });
            easeGlobe(pl, 0);
            globeEl.classList.add("on");
        }
        // 地圖不再回報半徑來調 zoom（會在 ease 途中失控）：zoomAt() 自己算；這裡只拿來裁圓
        if (msg?.type === "GLOBE_POSITION") globeEl.style.clipPath = `circle(${msg.r + 0.5}px at ${msg.x}px ${msg.y}px)`;
    };
    addEventListener("message", onMessage);

    // 版面改變（含手機網址列伸縮）會改 step，active 會跳號；人在區塊內時重新對齊到 active
    const onResize = () => {
        const r = rootEl.getBoundingClientRect();
        const inside = r.top < innerHeight && r.bottom > 0;
        layout();
        if (inside && active >= 0) scrollTo({ top: top() + active * g.step, behavior: "instant" });
    };
    addEventListener("resize", onResize);

    layout(); // 設 data-mode，舞台由 CSS 顯示；與第一幀同一個 task，不會畫出「縮圖疊在原點」
    globeEl.src = mapSrc(mapUrl); // listener 已存在，READY 不會漏
    frame(performance.now()); // 放好縮圖並 setActive，趕在第一次 paint 前
    requestAnimationFrame(() => infoEl.classList.add("drawn"));

    onBeforeUnmount(() => {
        cancelAnimationFrame(raf);
        clearTimeout(easeTimer);
        removeEventListener("message", onMessage);
        removeEventListener("resize", onResize);
        stripEl.removeEventListener("click", onStripClick);
        jumpEl.removeEventListener("click", onJump);
        fillsViewport.value = false;
    });
});
</script>

<style>
/* 原型 v8 的 CSS 逐行移植：選擇器加 .globe 前綴，:root token 改掛 .globe，#switcher 刪除。 */
html.globe-snap { scroll-snap-type: y mandatory; }
.globe {
    --bg: #fff; --fg: #1d1d1f; --muted: #8d8d90; --faint: #b9b9bb; --line: rgba(29,29,31,.16); --accent: #e8590c;
    --mono: ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace;
    --ease: cubic-bezier(.65,0,.35,1); --ease-out: cubic-bezier(.2,.7,.2,1);
    --th: 60px; /* 幾何（--main-*、--strip-*、--info-*）由 globeLayout 逐模式寫成 px */
    position: relative; background: var(--bg); color: var(--fg); font: 12px/1.5 -apple-system, "Helvetica Neue", sans-serif;
}
.globe, .globe * { box-sizing: border-box; }
/* JS 執行前版面未知，舞台先藏起來 */
.globe:not([data-mode]) #stage { visibility: hidden; }
.globe #track { padding-bottom: calc(100vh - var(--step)); margin-top: -100vh; }
.globe .snap { height: var(--step); scroll-snap-align: start; }

.globe #stage { position: sticky; top: 0; height: 100vh; overflow: hidden; }
.globe #globeWrap { position: absolute; inset: 0; pointer-events: none; }
.globe #globe { position: absolute; border: 0; pointer-events: none; opacity: 0; transition: opacity 1.2s var(--ease-out); }
.globe #globe.on { opacity: 1; }

/* main image */
.globe #main { position: absolute; left: var(--main-l); width: var(--main-w); top: var(--main-t); height: var(--main-h); }
.globe #main img { position: absolute; display: block; max-width: none; will-change: transform, opacity, clip-path; }

/* thumbnail strip: items are placed per frame by JS along an arc */
.globe #strip { position: absolute; left: var(--strip-x); top: var(--strip-y); width: 0; height: 0; }
.globe .th { position: absolute; left: 0; top: 0; padding: 0; border: 0; background: none; cursor: pointer; transform-origin: 0 50%; will-change: transform, opacity; }
.globe .th .frame { position: relative; display: block; width: var(--th); height: var(--th); overflow: hidden; background: #e6e6e3; transition: opacity .5s var(--ease), transform .5s var(--ease); }
.globe .th .frame img { display: block; width: 100%; height: 100%; max-width: none; object-fit: cover; }
.globe .th.on .frame { opacity: 0; transform: scale(.9); }
.globe .th .ratio { position: absolute; inset: 0; margin: auto; transform: scale(.84);
    width: calc(min(1, var(--r)) * 100%); height: calc(min(1, 1 / var(--r)) * 100%);
    --m: rgba(255,255,255,.9);
    background: linear-gradient(var(--m), var(--m)) 0 0 / 6px 1px, linear-gradient(var(--m), var(--m)) 0 0 / 1px 6px,
        linear-gradient(var(--m), var(--m)) 100% 0 / 6px 1px, linear-gradient(var(--m), var(--m)) 100% 0 / 1px 6px,
        linear-gradient(var(--m), var(--m)) 0 100% / 6px 1px, linear-gradient(var(--m), var(--m)) 0 100% / 1px 6px,
        linear-gradient(var(--m), var(--m)) 100% 100% / 6px 1px, linear-gradient(var(--m), var(--m)) 100% 100% / 1px 6px;
    background-repeat: no-repeat; }
.globe .th .ratio::after { content: attr(data-r); position: absolute; right: 2px; bottom: 2px; font: 7px/1 var(--mono); color: #fff; text-shadow: 0 0 2px rgba(0,0,0,.6); }
.globe .th:focus-visible { outline: 1px solid var(--accent); outline-offset: 3px; }
.globe .th .meta { position: absolute; right: calc(100% + 22px); top: 50%; transform: translateY(-50%); text-align: right; white-space: nowrap;
    font: 8.5px/1.45 var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--muted); transition: color .5s, opacity .5s; opacity: .55; }
.globe .th .meta b { font-weight: 400; color: var(--faint); margin-right: 6px; }
.globe .th.on .meta { opacity: 1; color: var(--fg); }
.globe .th.on .meta b { color: var(--accent); }
/* ruler: a major tick at each photo, three minor ticks down to the next */
.globe .th .tick { position: absolute; right: calc(100% + 6px); top: 50%; width: 10px; height: 1px; background: var(--faint); transition: width .5s var(--ease-out), background .5s; }
.globe .th.on .tick { width: 14px; background: var(--accent); }
.globe .th .minor { position: absolute; right: calc(100% + 6px); top: 50%; width: 4px; height: calc(var(--pitch) * 1px);
    background: linear-gradient(var(--line), var(--line)) 0 25% / 4px 1px no-repeat, linear-gradient(var(--line), var(--line)) 0 50% / 4px 1px no-repeat, linear-gradient(var(--line), var(--line)) 0 75% / 4px 1px no-repeat; }

/* fixed info block beside the active thumbnail */
.globe #info { position: absolute; left: var(--info-l); top: var(--info-t); width: var(--info-w); transform: translateY(-50%); font: 9px/1.6 var(--mono); letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
.globe #info .rule { height: 1px; background: var(--line); transform-origin: 0 50%; transform: scaleX(0); transition: transform 1.4s var(--ease); }
.globe #info.drawn .rule { transform: scaleX(1); }
.globe #info .count { display: flex; justify-content: space-between; margin: 6px 0 14px; }
.globe #info .row { display: grid; grid-template-columns: 52px 1fr; }
.globe #info .row > span:first-child { color: var(--faint); }
.globe #info .place .slot { font: 500 13px/1.3 -apple-system, "Helvetica Neue", sans-serif; letter-spacing: .01em; text-transform: none; color: var(--fg); }
.globe #info .place { margin-bottom: 2px; }
.globe #info .gap { height: 12px; }
.globe #info .foot { margin-top: 14px; }
/* every value sits in a mask so it can leave and enter in place */
.globe .slot { position: relative; display: block; overflow: hidden; height: 1.6em; }
.globe .slot > span { position: absolute; left: 0; top: 0; white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
.globe #link { position: absolute; left: var(--strip-x); top: var(--strip-y); height: 1px; background: var(--accent); opacity: .7; }

/* tablet + phone: info sits under the main photo as a compact grid */
.globe[data-mode="tab"] #info, .globe[data-mode="phone"] #info { transform: none; }
.globe[data-mode="tab"] #info .grid, .globe[data-mode="phone"] #info .grid { display: grid; grid-template-columns: repeat(2, 1fr); column-gap: 16px; }
.globe[data-mode="tab"] #info .row, .globe[data-mode="phone"] #info .row { grid-template-columns: 40px 1fr; }
.globe[data-mode="tab"] #info .gap, .globe[data-mode="phone"] #info .gap, .globe[data-mode="tab"] #link, .globe[data-mode="phone"] #link { display: none; }
.globe[data-mode="tab"] #info .count, .globe[data-mode="phone"] #info .count { margin: 4px 0 6px; }
/* tab: the globe runs behind the info block, so lift the text off it with a page-colour halo and one step darker ink */
.globe[data-mode="tab"] #info { color: #6f6f73; text-shadow: 0 0 2px var(--bg), 0 0 2px var(--bg), 0 0 5px var(--bg); }
.globe[data-mode="tab"] #info .row > span:first-child { color: #8d8d90; }
/* camera names ("iPhone SE (2nd generation)") need the full width */
.globe[data-mode="tab"] #info .row.wide, .globe[data-mode="phone"] #info .row.wide { grid-column: 1 / -1; }
.globe[data-mode="tab"] #info .foot, .globe[data-mode="phone"] #info .foot { margin-top: 8px; }

/* phone: the strip runs sideways along the bottom, ruler underneath, no per-thumb text */
.globe[data-mode="phone"] .th { transform-origin: 50% 50%; }
.globe[data-mode="phone"] .th .meta { display: none; }
.globe[data-mode="phone"] .th .tick { right: auto; left: 50%; top: calc(100% + 6px); width: 1px; height: 6px; transition: height .5s var(--ease-out), background .5s; }
.globe[data-mode="phone"] .th.on .tick { width: 1px; height: 10px; }
.globe[data-mode="phone"] .th .minor { right: auto; left: 50%; top: calc(100% + 6px); height: 4px; width: calc(var(--pitch) * 1px);
    background: linear-gradient(var(--line), var(--line)) 25% 0 / 1px 4px no-repeat, linear-gradient(var(--line), var(--line)) 50% 0 / 1px 4px no-repeat, linear-gradient(var(--line), var(--line)) 75% 0 / 1px 4px no-repeat; }

/* map data credit, shown by the page because the map's own (i) button is hidden */
.globe #credit { position: absolute; right: 14px; bottom: 10px; font: 8px/1 var(--mono); letter-spacing: .06em; text-transform: uppercase; color: var(--faint); }
.globe[data-mode="phone"] #credit { bottom: auto; top: 10px; right: 12px; }
.globe #credit a { color: inherit; text-decoration: none; }
.globe .fade { position: absolute; left: 0; right: 0; bottom: 0; height: 25vh; background: linear-gradient(rgba(255, 255, 255, 0), var(--bg)); opacity: 0; pointer-events: none; }
/* 縮圖在右側時（桌機、平板）放在畫面正上、正下；手機縮圖在底部，改疊在左上 */
.globe .jump button { position: absolute; left: 50%; transform: translateX(-50%); min-height: 32px; padding: 0 8px; border: 0; background: none; cursor: pointer; white-space: nowrap;
    font: 11px/1.6 var(--mono); letter-spacing: .08em; text-transform: uppercase; color: #6f6f73; text-shadow: 0 0 2px var(--bg), 0 0 2px var(--bg), 0 0 5px var(--bg); transition: color .3s; }
.globe .jump [data-to="prev"] { top: 12px; }
.globe .jump [data-to="next"] { bottom: 12px; }
.globe .jump button:hover { color: var(--fg); }
.globe .jump button:focus-visible { color: var(--fg); outline: 1px solid var(--accent); outline-offset: 3px; }
.globe[data-mode="phone"] .jump button { left: 4px; transform: none; }
.globe[data-mode="phone"] .jump [data-to="prev"] { top: 2px; }
.globe[data-mode="phone"] .jump [data-to="next"] { top: 34px; bottom: auto; }

@media (prefers-reduced-motion: reduce) { .globe, .globe * { transition: none !important; } }
</style>
