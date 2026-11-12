// 地球上每個地點的座標，唯一來源。key 與 content/gallery 的 customLocation（空則 location）完全一致。
// 新地點沒加進來時，toGlobeData 會 throw，nuxt generate 失敗。
export const PLACES: Record<string, [lat: number, lng: number]> = {
    "Daqiu Island, Matsu": [26.317, 119.997],
    "Enoshima, Japan": [35.3, 139.48],
    "Gushan, Taiwan": [22.627, 120.267],
    "Hakone, Japan": [35.233, 139.107],
    "Jhuci, Taiwan": [23.523, 120.54],
    "Liuqiu, Taiwan": [22.34, 120.37],
    "Meishan, Taiwan": [23.585, 120.553],
    "Mitaka, Japan": [35.683, 139.56],
    "Muzha, Taiwan": [24.989, 121.573],
    "Nangang, Taiwan": [25.055, 121.607],
    "Shilin, Taiwan": [25.093, 121.526],
    "Shinjuku, Japan": [35.694, 139.703],
    "Songshan, Taiwan": [25.05, 121.578],
    "Sumida, Japan": [35.711, 139.801],
    "Tainan, Taiwan": [22.999, 120.227],
    "Taipei, Taiwan": [25.033, 121.565],
    "Taitung, Taiwan": [22.756, 121.144],
    "Tokyo, Japan": [35.681, 139.767],
    "Yingge, Taiwan": [24.955, 121.355],
};
