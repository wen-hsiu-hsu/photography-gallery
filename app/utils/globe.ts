// 地球首頁所有「不是 DOM」的東西：資料轉換、各模式幾何、zoom 校正、滾筒、地圖訊息型別。
// 純函式，沒有 runtime import（scripts/globe-layout.check.mjs 直接用 node 載入）。唯一使用者：GlobeGallery.vue。
import type { Collections } from "@nuxt/content";

// ---------- 資料 ----------

export const EXIF_LABELS = ["相機", "鏡頭", "焦距", "光圈", "快門", "ISO"] as const;

export interface Place {
    id: string; // 地點字串，同時是顯示名稱
    lat: number;
    lng: number;
    coord: string; // "25.055°N 121.607°E"
}

export interface GlobePhoto {
    id: string;
    place: string;
    date: string; // "2025.07.22"
    w: number;
    h: number;
    main: string;
    thumb: string;
    ratio: string; // 縮圖角落的最近常見比例
    exif: string[]; // 與 EXIF_LABELS 對齊，缺值為 "—"
}

const RATIOS: [number, number][] = [[1, 1], [4, 3], [3, 2], [16, 9], [3, 4], [2, 3], [9, 16]];
const ratioLabel = (w: number, h: number) => {
    const r = w / h;
    const [a, b] = RATIOS.reduce((best, c) => (Math.abs(c[0] / c[1] - r) < Math.abs(best[0] / best[1] - r) ? c : best));
    return `${a}:${b}`;
};
const fmtCoord = (lat: number, lng: number) => `${Math.abs(lat).toFixed(3)}°${lat >= 0 ? "N" : "S"} ${Math.abs(lng).toFixed(3)}°${lng >= 0 ? "E" : "W"}`;

/**
 * content rows → 地球需要的資料。地點取 `customLocation || location`，精確比對 table。
 * - 兩欄都空：略過並 console.warn（剛同步進來、還沒放上地圖的照片不該讓部署壞掉）。
 * - 非空但不在 table：throw，nuxt generate 失敗。
 */
export function toGlobeData(
    rows: Collections["gallery"][],
    url: (path: string, kind: "main" | "thumb") => string,
    table: Record<string, [number, number]>,
): { photos: GlobePhoto[]; places: Place[] } {
    const photos: GlobePhoto[] = [];
    const places = new Map<string, Place>();
    for (const row of rows) {
        const name = row.customLocation || row.location;
        if (!name) {
            console.warn(`[globe] ${row.name}: 沒有地點，不放上首頁`);
            continue;
        }
        const ll = table[name];
        if (!ll) throw new Error(`[globe] ${row.name}.json: "${name}" 不在 app/utils/places.ts`);
        const [lat, lng] = ll;
        if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) throw new Error(`[globe] "${name}" 座標不合法`);
        if (!places.has(name)) places.set(name, { id: name, lat, lng, coord: fmtCoord(lat, lng) });
        const w = Number(row.PixelXDimension), h = Number(row.PixelYDimension);
        const v = (x: unknown, suffix = "") => (x === undefined || x === null || x === "" ? "—" : `${x}${suffix}`);
        photos.push({
            id: row.fileId,
            place: name,
            date: (row.DateTimeOriginal || "").slice(0, 10).replaceAll("-", "."),
            w,
            h,
            main: url(row.image, "main"),
            thumb: url(row.image, "thumb"),
            ratio: ratioLabel(w, h),
            exif: [v(row.Model), v(row.LensSpecification), v(row.FocalLength), v(row.FNumber), v(row.ExposureTime, "s"), v(row.ISOSpeedRatings)],
        });
    }
    return { photos, places: [...places.values()] };
}

// ---------- 幾何 ----------

export type Mode = "desk" | "tab" | "phone";

export interface Geometry {
    vw: number;
    vh: number;
    mode: Mode;
    step: number; // 每張照片的捲動距離
    th: number; // 縮圖邊長
    pitch: number;
    L: { mainL: number; mainR: number; mainT: number; mainH: number; stripX: number; stripY: number; infoL: number; infoT: number; infoW: number };
    globe: { R: number; cx: number; cy: number; size: number; offset: [number, number] };
}

const SIZE_L = 0.58; // 桌機/平板：大
const SIZE_S = 0.36; // 手機：小
const CUT = 0.4; // 桌機/平板切 2/5
const PHONE_CUT = 0.25;

/** 與原型 layout()/layoutGlobe() 逐行相同；size l、cut 40 固定。 */
export function globeLayout(vw: number, vh: number): Geometry {
    const mode: Mode = vw < 768 || vw < vh * 0.9 ? "phone" : vw < 1280 ? "tab" : "desk";
    const phone = mode === "phone";
    const step = Math.round(vh * 0.5);
    const th = phone ? 44 : 60;
    const pitch = phone ? 76 : th + 26;
    let L: Geometry["L"];
    if (mode === "desk") {
        const infoW = 220, infoL = vw - 24 - infoW, stripX = infoL - 136;
        L = { mainL: 0.24 * vw, mainR: stripX - 175, mainT: 0.12 * vh, mainH: 0.76 * vh, stripX, stripY: vh / 2, infoL, infoT: vh / 2, infoW };
    } else if (mode === "tab") {
        const stripX = vw - 24 - 96, mainL = 0.26 * vw, mainR = stripX - 175, mainT = 0.08 * vh, mainH = 0.64 * vh;
        L = { mainL, mainR, mainT, mainH, stripX, stripY: mainT + mainH / 2, infoL: mainL, infoT: mainT + mainH + 18, infoW: mainR - mainL };
    } else {
        const R = SIZE_S * Math.min(1.1 * vw, 0.52 * vh), globeBottom = R - PHONE_CUT * 2 * R + R;
        const mainT = Math.max(globeBottom - 0.06 * vh, 0.22 * vh), stripY = vh - 46, mainH = stripY - 22 - 20 - 132 - 12 - mainT;
        L = { mainL: 16, mainR: vw - 16, mainT, mainH, stripX: vw / 2, stripY, infoL: 16, infoT: mainT + mainH + 12, infoW: vw - 32 };
    }
    // 地球：桌機/平板被左緣切、手機被上緣切
    const R = phone ? SIZE_S * Math.min(1.1 * vw, 0.52 * vh) : SIZE_L * Math.min(vh, 0.8 * vw);
    const cut = phone ? PHONE_CUT : CUT;
    const cx = phone ? vw / 2 : R - cut * 2 * R, cy = phone ? R - cut * 2 * R : vh / 2, size = Math.ceil(2 * R + 4);
    // 亮點放在「圓盤露出畫面、又不在主圖底下」那一段的中間
    const clamp = (v: number) => Math.max(-0.45 * R, Math.min(v, 0.45 * R));
    const offset: [number, number] = phone
        ? [0, clamp((Math.max(0, cy - R) + Math.min(cy + R, L.mainT)) / 2 - cy)]
        : [clamp((Math.max(0, cx - R) + Math.min(cx + R, L.mainL)) / 2 - cx), 0];
    return { vw, vh, mode, step, th, pitch, L, globe: { R, cx, cy, size, offset } };
}

/** 寫在元件根節點上的 CSS 變數（px，四捨五入，和原型一致）。 */
export function cssVars(g: Geometry): Record<string, string> {
    const { L } = g;
    const css = { "--step": g.step, "--th": g.th, "--main-l": L.mainL, "--main-w": L.mainR - L.mainL, "--main-t": L.mainT, "--main-h": L.mainH, "--strip-x": L.stripX, "--strip-y": L.stripY, "--info-l": L.infoL, "--info-t": L.infoT, "--info-w": L.infoW };
    return Object.fromEntries(Object.entries(css).map(([k, v]) => [k, `${Math.round(v)}px`]));
}

// MapLibre 5 的地球半徑 = worldSize / 2π / cos(視圖中心緯度)，所以 zoom 必須跟著緯度，否則轉動時地球會脹縮。
// PERSPECTIVE：可見邊緣約為該半徑的 0.72（iframe = 地球 + 4px），2026-11-12 量得；log2(1/0.72) ≈ 0.47。
export const PERSPECTIVE = 0.47;
export function zoomAt(lat: number, globe: Pick<Geometry["globe"], "R" | "offset">): number {
    // 垂直 offset（手機）讓視圖中心落在目標南北側
    const centreLat = lat + (Math.asin(Math.max(-1, Math.min(1, globe.offset[1] / globe.R))) * 180) / Math.PI;
    return Math.log2((2 * Math.PI * globe.R * Math.cos((centreLat * Math.PI) / 180)) / 512) + PERSPECTIVE;
}

/** 第 i 張縮圖在滾筒上的位置；超出可視範圍回傳 null（呼叫端隱藏）。 */
export function drum(i: number, pos: number, g: Geometry): { transform: string; opacity: string } | null {
    const phone = g.mode === "phone", half = (phone ? g.vw : g.vh) / 2;
    const Rc = phone ? g.vw * 1.1 : g.vh * 0.95; // 縮圖滾動的虛擬滾筒半徑
    const d = (i - pos) * g.pitch;
    if (Math.abs(d) > half * 1.24) return null;
    const t = Math.min(1, Math.abs(d) / half);
    const bend = Rc - Math.sqrt(Rc * Rc - Math.min(d * d, Rc * Rc)); // 中央最靠近照片，兩端向外彎
    const s = (1 - 0.14 * t).toFixed(3);
    return {
        transform: phone
            ? `translate(${(d - g.th / 2).toFixed(1)}px, ${(bend - g.th / 2).toFixed(1)}px) scale(${s})`
            : `translate(${bend.toFixed(1)}px, ${(d - g.th / 2).toFixed(1)}px) scale(${s})`,
        opacity: (1 - 0.7 * t * t).toFixed(3),
    };
}

/** 主圖在 #main 方塊內的 contain 位置：桌機置中，平板/手機貼底（坐在 info 上）。 */
export function fitMain(box: { w: number; h: number }, photo: { w: number; h: number }, mode: Mode): Record<"width" | "height" | "left" | "top", string> {
    const s = Math.min(box.w / photo.w, box.h / photo.h), w = photo.w * s, h = photo.h * s;
    return { width: `${w}px`, height: `${h}px`, left: `${(box.w - w) / 2}px`, top: `${mode === "desk" ? (box.h - h) / 2 : box.h - h}px` };
}

/** 桌機：從 active 刻度連到 info 的強調線。tick 結束於縮圖槽左側 6px。 */
export function linkStyle(g: Geometry): { marginLeft: string; width: string } {
    const tickEnd = -6, span = g.L.infoL - g.L.stripX;
    return { marginLeft: `${tickEnd}px`, width: `${span - 12 - tickEnd}px` };
}

// ---------- 地圖訊息協定 ----------
// 與 map repo 的 lib/postMessageTypes.ts 對應的子集；兩邊一起改。

export type ToMap =
    | { type: "SET_MARKERS"; markers: { id: string; lat: number; lng: number; color: string }[] }
    | { type: "SET_OPTIONS"; interactive: false; onMarkerClick: "event-only" }
    | { type: "HIGHLIGHT"; id: string }
    | { type: "EASE_TO"; lat: number; lng: number; zoom: number; offset: [number, number]; duration: number };

export type FromMap = { type: "READY" } | { type: "GLOBE_POSITION"; x: number; y: number; r: number };

const finite = (...n: unknown[]) => n.every(x => typeof x === "number" && Number.isFinite(x));

/** 入站訊息的信任邊界：來源 window、origin、形狀都要對。 */
export function parseFromMap(e: { source: unknown; origin: string; data: any }, frame: unknown, origin: string): FromMap | null {
    if (!frame || e.source !== frame || e.origin !== origin) return null;
    const d = e.data;
    if (d?.type === "READY") return { type: "READY" };
    if (d?.type === "GLOBE_POSITION" && finite(d.x, d.y, d.r)) return { type: "GLOBE_POSITION", x: d.x, y: d.y, r: d.r };
    return null;
}

/** iframe src。zoom 是佔位：地球在 READY 前透明，READY 後會跳到真正的視角。 */
export function mapSrc(base: string): string {
    return `${base}?attribution=off&labels=off&bg=f4f4f2&center=121,26&zoom=2`;
}
