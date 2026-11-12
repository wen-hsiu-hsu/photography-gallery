<template>
    <main>
        <UContainer>
            <HomeHeader class="snap-start" />
        </UContainer>
        <GlobeGallery />
        <!-- contact 與 footer 同一個 snap 區塊，對齊文件底（snap-end）：吸附點等於最大捲動值，不受網址列伸縮影響；lvh 與地球的 100vh 一致 -->
        <section class="snap-end min-h-lvh flex flex-col">
            <UContainer class="flex-1 flex w-full">
                <div id="contact" class="flex-1 flex items-center justify-center py-24">
                    <div class="flex flex-col md:flex-row justify-center text-center gap-8 max-w-[600px]">
                        <BaseScrollAnimate :configs="{ opacity: { from: 0, to: 1 }, filter: { from: 'blur(10px)', to: 'blur(0px)' } }">
                            <NuxtImg class="max-w-[250px]" src="/author.jpg" alt="" />
                        </BaseScrollAnimate>
                        <BaseScrollAnimate class="space-y-5" :configs="{ opacity: { from: 0, to: 1 }, filter: { from: 'blur(10px)', to: 'blur(0px)' } }">
                            <div class="text-left space-y-3">
                                <p class="text-[32px] font-bold">Hey!</p>
                                <p>I'm a Taiwan-based engineer who loves photography, usually out on weekends chasing sunrise in the mountains or candid moments on city streets.</p>
                                <p>I focus on landscapes and portraits, working with natural light to keep things honest and heartfelt. This site collects moments I’m proud to share</p>
                                <p>feel free to look around or say hi anytime.</p>
                            </div>
                            <div class="flex flex-col gap-3 items-start w-full">
                                <ULink class="flex items-center gap-1 underline" to="https://www.instagram.com/kevinshu">
                                    <span class="leading-none">Instagram</span>
                                    <UIcon name="mdi:arrow-top-right" />
                                </ULink>

                                <ULink class="flex items-center gap-1 underline" to="mailto:kevin.hsu.hws@gmail.com">
                                    <span class="leading-none">Email</span>
                                    <UIcon name="mdi:arrow-top-right" />
                                </ULink>
                            </div>
                        </BaseScrollAnimate>
                    </div>
                </div>
            </UContainer>
            <AppFooter />
        </section>
    </main>
</template>
