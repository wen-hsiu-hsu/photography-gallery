<template>
    <ul class="columns-2 md:columns-3 lg:columns-4 gap-2 sm:gap-4 md:gap-6 lg:gap-8 space-y-2 sm:space-y-4 md:space-y-6 lg:space-y-8" ref="galleryContainer" id="image-gallery">
        <li v-for="item in formattedGallery" :key="item.image" class="hover:scale-105 transition-all break-inside-avoid">
            <BaseScrollAnimate :configs="{ y: { from: 300, to: 0 }, opacity: { from: 0, to: 1 }, filter: { from: 'blur(10px)', to: 'blur(0px)' } }">
                <a :href="item.image" noreferrer :data-pswp-width="item.PixelXDimension" :data-pswp-height="item.PixelYDimension" :id="`gallery-${item.fileId}`" class="block">
                    <NuxtImg :src="item.image" sizes="100vw sm:50vw md:33vw lg:25vw" placeholder :height="item.PixelYDimension" :width="item.PixelXDimension" loading="lazy" />
                </a>

                <ul v-if="item.customLocation || item.location" class="flex flex-wrap gap-2 text-[14px] text-neutral-500 mt-1">
                    <li v-if="item.customLocation || item.location" class="flex items-center gap-1">
                        <UIcon name="carbon:location" />
                        <span>{{ item.customLocation || item.location }}</span>
                    </li>
                    <!-- <li v-for="tag in item.tags" :key="tag">#{{ tag }}</li> -->
                </ul>
            </BaseScrollAnimate>

            <!-- INFO 這裡只是用來當作模板，子層會被拿去用 innerHTML 塞到 caption 區塊 （不要移除 hidden） -->
            <div ref="caption" :data-gallery-target="`gallery-${item.fileId}`" class="hidden">
                <div>
                    <div class="text-[14px] grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-4">
                        <div>
                            <p class="text-[12px] font-bold mb-4" v-if="item.description">{{ item.description }}</p>
                            <div class="flex items-center gap-4 justify-between w-full">
                                <div v-if="item.customLocation || item.location" class="flex items-center gap-1">
                                    <UIcon name="carbon:location" />
                                    <span>{{ item.customLocation || item.location }}</span>
                                </div>
                                <p>{{ dayjs(item.DateTimeOriginal).format("MMM. YYYY") }}</p>
                            </div>
                            <ul class="flex flex-wrap gap-2">
                                <li v-for="tag in item.tags" :key="tag">#{{ tag }}</li>
                            </ul>
                        </div>
                        <div class="space-y-2 text-stone-300">
                            <p v-if="item.LensSpecification">{{ item.LensSpecification }}</p>
                            <USeparator v-if="item.LensSpecification" />
                            <ul class="gap-2 grid grid-cols-1">
                                <li v-for="detail in item.details" :key="detail.label" class="flex gap-1 items-center">
                                    <UIcon :name="detail.icon" />
                                    <span class="leading-none">{{ detail.label }}</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </li>
    </ul>
</template>

<script setup lang="ts">
import type { Collections } from "@nuxt/content";
import PhotoSwipeLightbox from "photoswipe/lightbox";
import "photoswipe/style.css";
import PhotoSwipeDynamicCaption from "photoswipe-dynamic-caption-plugin";
import "photoswipe-dynamic-caption-plugin/photoswipe-dynamic-caption-plugin.css";

const props = defineProps<{
    gallery: Collections["gallery"][];
}>();

const formattedGallery = computed(() => {
    return props.gallery.map((item: Collections["gallery"]) => {
        const camera = `${item.Make} ${item.Model}`.trim();
        return {
            ...item,
            details: [
                {
                    icon: "carbon:camera",
                    label: camera,
                },
                {
                    icon: "carbon:timer",
                    label: item.ExposureTime,
                },
                {
                    icon: "carbon:aperture",
                    label: item.FNumber,
                },
                {
                    icon: "carbon:iso-outline",
                    label: item.ISOSpeedRatings,
                },
            ].filter(_item => _item.label),
        };
    });
});

const refGallery = useTemplateRef("galleryContainer");
const refCaption = useTemplateRef("caption");
const lightbox = shallowRef<null | PhotoSwipeLightbox>(null);
const captionPlugin = shallowRef<null | typeof PhotoSwipeDynamicCaption>(null);

onMounted(() => {
    if (!refGallery.value) return;
    lightbox.value = new PhotoSwipeLightbox({
        gallery: "#image-gallery a",
        pswpModule: () => import("photoswipe"),
        padding: { top: 20, bottom: 20, left: 0, right: 0 },
        zoom: false,
        allowPanToNext: false,
        wheelToZoom: false,
        maxZoomLevel: "fit",
        initialZoomLevel: "fit",
        secondaryZoomLevel: "fit",
    });
    lightbox.value.on("pointerMove", e => {
        // 阻止 pan
        e.preventDefault();
    });
    captionPlugin.value = new PhotoSwipeDynamicCaption(lightbox.value, {
        type: "below",
        captionContent: (slide: unknown) => {
            const textContent = refCaption.value?.find(el => {
                // @ts-expect-error 忽略，因為官方 typescript 沒有 export slide
                return el.dataset["galleryTarget"] === slide.data.element.id;
            });

            return textContent?.children?.[0]?.innerHTML;
        },
    });
    lightbox.value.init();
});

onUnmounted(() => {
    if (lightbox.value) {
        lightbox.value.destroy();
        lightbox.value = null;
    }
});
</script>

<style>
.pswp__dynamic-caption--aside {
    width: 100%;
    max-width: 400px;
}
</style>

