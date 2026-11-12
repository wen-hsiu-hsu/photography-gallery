<template>
    <header class="min-h-svh flex items-center relative">
        <!-- svh：手機網址列顯示時 100vh 的底部會被擋住；svh 不隨網址列伸縮，下面地球區塊的捲動位置不會位移 -->
        <div>
            <HeaderHeading class="uppercase text-[18vw] md:text-[9vw] xl:text-[130px] font-black leading-none" :duration="headingDuration">
                <span class="hidden md:inline">photography</span>
                <span class="inline md:hidden">photo<br />graphy</span>
            </HeaderHeading>
            <HeaderTextSlider :delay="headingDuration" />
        </div>
        <div class="absolute left-0 bottom-0 mb-32 md:mb-8 flex items-center justify-start">
            <p ref="description" :class="['text-[14px] sm:text-[16px] md:text-[20px] lg:text-[24px]', !!refDescription || 'opacity-0']">
                This site features work I'm proud to share. <br />
                I hope you enjoy it—feel free to <ULink class="underline" to="#contact">reach out</ULink> anytime!
            </p>
        </div>
    </header>
</template>

<script setup lang="ts">
import { createTimeline, type Timeline } from "animejs";

const { state: isPageAnimationLoaded } = useGlobalPageLoaded();
const headingDuration = ref(1000);

const refDescription = useTemplateRef("description");

const tl = shallowRef<Timeline | null>(null);

onMounted(async () => {
    await nextTick();
    if (refDescription.value) {
        tl.value = createTimeline({ delay: 2000 });

        tl.value
            .add(refDescription.value, {
                duration: 1000,
                opacity: {
                    from: 0,
                    to: 1,
                },
            })
            .reset();
    }
});

watch(isPageAnimationLoaded, async () => {
    await nextTick();
    if (isPageAnimationLoaded.value && tl.value) {
        tl.value.play();
    }
});
</script>

