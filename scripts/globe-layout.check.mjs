// node --experimental-strip-types scripts/globe-layout.check.mjs
// golden：原型 index.html (v7, size l / cut 40) 在三種視窗下 layout() 寫出的 CSS 變數、globe 位置與 offset（2026-11-12 於 chrome-devtools 擷取）。
import assert from "node:assert/strict";
import { cssVars, globeLayout, parsePoint, zoomAt } from "../app/utils/globe.ts";

const golden = {
    "1440x900": {
        mode: "desk",
        css: { "--step": "450px", "--th": "60px", "--main-l": "346px", "--main-w": "539px", "--main-t": "108px", "--main-h": "684px", "--strip-x": "1060px", "--strip-y": "450px", "--info-l": "1196px", "--info-t": "450px", "--info-w": "220px" },
        globe: { left: -419.6, top: -74, size: 1048 },
        R: 522, offset: [68.4, 0],
    },
    "1024x768": {
        mode: "tab",
        css: { "--step": "384px", "--th": "60px", "--main-l": "266px", "--main-w": "463px", "--main-t": "61px", "--main-h": "492px", "--strip-x": "904px", "--strip-y": "307px", "--info-l": "266px", "--info-t": "571px", "--info-w": "463px" },
        globe: { left: -358.412, top: -63.5, size: 895 },
        R: 445.44, offset: [44.032, 0],
    },
    "390x844": {
        mode: "phone",
        css: { "--step": "422px", "--th": "44px", "--main-l": "16px", "--main-w": "358px", "--main-t": "186px", "--main-h": "426px", "--strip-x": "195px", "--strip-y": "798px", "--info-l": "16px", "--info-t": "624px", "--info-w": "358px" },
        globe: { left: 38.5, top: -79.28, size: 313 },
        R: 154.44, offset: [0, 15.62],
    },
};
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 0.01, `${msg}: ${a} vs ${b}`);

for (const [k, want] of Object.entries(golden)) {
    const [w, h] = k.split("x").map(Number);
    const g = globeLayout(w, h);
    assert.equal(g.mode, want.mode, k);
    assert.deepEqual(cssVars(g), want.css, k);
    near(g.globe.cx - g.globe.size / 2, want.globe.left, `${k} left`);
    near(g.globe.cy - g.globe.size / 2, want.globe.top, `${k} top`);
    assert.equal(g.globe.size, want.globe.size, k);
    near(g.globe.R, want.R, `${k} R`);
    near(g.globe.offset[0], want.offset[0], `${k} offset x`);
    near(g.globe.offset[1], want.offset[1], `${k} offset y`);
    console.log("ok", k, g.mode);
}

// zoomAt：赤道上 R=522 → log2(2π·522/512)+0.47；緯度越高 zoom 越小
const z0 = zoomAt(0, { R: 522, offset: [0, 0] });
near(z0, Math.log2((2 * Math.PI * 522) / 512) + 0.47, "zoomAt(0)");
assert.ok(zoomAt(35, { R: 522, offset: [0, 0] }) < z0);
console.log("ok zoomAt");

// parsePoint：CMS 存 [lng, lat]，回傳 [lat, lng]；空值略過，壞格式 throw
assert.deepEqual(parsePoint('{"type":"Point","coordinates":[121.607,25.055]}', "x"), [25.055, 121.607]);
assert.equal(parsePoint("", "x"), null);
assert.equal(parsePoint(undefined, "x"), null);
assert.throws(() => parsePoint("25.0, 121.6", "x"));
assert.throws(() => parsePoint('{"type":"Point","coordinates":[25.055,121.607]}', "x")); // 經緯度對調時緯度超過 90
console.log("ok parsePoint");
