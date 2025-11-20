<template>
    <div :class="['fixed inset-x-0 bottom-0 pb-6 px-8 flex items-center justify-center md:justify-end', !!refContainer || 'opacity-0']" ref="container">
        <div class="rounded-full backdrop-blur bg-white/70 border border-gray-100 shadow-xl/10 py-1 px-4 flex items-center transition-all hover:scale-105">
            <div v-for="link in sites" :key="link.link" class="inline-block overflow-hidden" ref="siteLinks">
                <UButton size="lg" class="cursor-pointer text-highlighted gap-0" target="_blank" :to="link.link" variant="link" color="neutral">
                    <template v-if="link.label">
                        <span>{{ link.label }}</span>
                        <UIcon name="mdi:arrow-top-right" />
                    </template>

                    <UIcon :name="link.icon" v-if="link.icon" />
                </UButton>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { utils, createTimeline, easings, type Timeline, type Target } from "animejs";

const sites = [
    {
        label: "",
        icon: "simple-icons:instagram",
        link: "https://www.instagram.com/kevinshu/",
    },
    {
        label: "",
        icon: "simple-icons:github",
        link: "https://github.com/wen-hsiu-hsu",
    },
    {
        label: "Website",
        icon: "",
        link: "https://hsiu.soy",
    },
];

const refContainer = useTemplateRef("container");
const refSiteLinks = useTemplateRef("siteLinks");
const tl = shallowRef<Timeline | null>(null);

const { state: isPageAnimationLoaded } = useGlobalPageLoaded();

onMounted(async () => {
    await nextTick();
    if (!refSiteLinks.value || !refContainer.value) return;
    utils.$(refContainer.value).forEach($container => utils.set($container, { opacity: 0 }));
    utils.$(refSiteLinks.value).forEach($link => {
        $link.setAttribute("data-width", utils.get($link, "width"));
        utils.set($link, {
            width: 0,
            opacity: 0,
        });
    });
});

watchOnce(isPageAnimationLoaded, async () => {
    if (isPageAnimationLoaded.value && refContainer.value && refSiteLinks.value) {
        tl.value = createTimeline({
            delay: 1000,
        })
            .add(refContainer.value, {
                opacity: 1,
            })
            .add(refSiteLinks.value, {
                width: (target: Target) => {
                    return target.dataset.width;
                },
                duration: 1000,
                opacity: 1,
                ease: easings.spring({ bounce: 0.35 }),
            });
    }
});
</script>

