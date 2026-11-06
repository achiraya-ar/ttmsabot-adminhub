<template>
  <div class="flex flex-col items-center justify-center px-5 py-14 text-center">
    <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-100 text-xl text-ink-400">
      <i :class="icon"></i>
    </div>
    <h3 class="text-base font-semibold text-ink-800">{{ title }}</h3>
    <p v-if="description" class="mt-1.5 max-w-sm text-sm leading-6 text-ink-500">
      {{ description }}
    </p>
    <div v-if="$slots.action" class="mt-5">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    icon?: string
    title: string
    description?: string
  }>(),
  {
    icon: 'fa-regular fa-folder-open',
    description: '',
  },
)
</script>
