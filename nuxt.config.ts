// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    compatibilityDate: "2025-07-15",
    devtools: { enabled: true },
    app: {
        head: {
            meta: [
                {
                    name: "google-site-verification",
                    content: "2ZRxTX7x_ZhaBhPq3H4vU4IBPyl4x_zCxEUbb93zl-w",
                },
            ],
            link: [
                { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
                { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
                { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
                { rel: "manifest", href: "/site.webmanifest" },
            ],
        },
    },

    site: {
        url: "https://photography.hsiu.soy",
        name: "許文修 Hsu Wen Hsiu",
        description: "Landscape and portrait photography from Taiwan and beyond—natural light, candid moments, and stories told in frames。",
        defaultLocale: "zh-Hant",
    },
    ogImage: {
        fonts: ["Noto+Serif+TC:400", "Noto+Serif+TC:700", "Work+Serif+TC:ital:400"],
    },

    modules: ["@nuxt/content", "@nuxt/eslint", "@nuxt/image", "@nuxt/scripts", "@nuxt/ui", "@vueuse/nuxt", "@nuxt/fonts", "@nuxtjs/seo"],

    css: ["~/assets/css/index.css"],

    runtimeConfig: {
        public: {
            // 嵌入的地球地圖；本機驗證用 NUXT_PUBLIC_GLOBE_MAP_URL=http://localhost:3940/
            globeMapUrl: "https://map.hsiu.soy/",
        },
    },

    colorMode: {
        preference: "light",
    },
});

