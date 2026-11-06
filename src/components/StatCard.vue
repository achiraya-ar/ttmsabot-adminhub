<template>
  <div class="app-card p-5">
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="text-xs font-medium uppercase tracking-wider text-ink-500">{{ label }}</p>
        <p class="mt-2 text-3xl font-semibold tracking-tight text-ink-900">{{ value }}</p>
        <p v-if="hint" class="mt-1.5 text-xs text-ink-500">{{ hint }}</p>
      </div>
      <div
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg"
        :class="accentClasses"
      >
        <i :class="icon"></i>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    label: string
    value: string | number
    icon: string
    accent?: 'brand' | 'emerald' | 'amber' | 'rose' | 'violet' | 'slate'
    hint?: string
  }>(),
  {
    accent: 'brand',
    hint: '',
  },
)

const accentClasses = computed(() => {
  const classes: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
    violet: 'bg-yellow-50 text-yellow-700',
    slate: 'bg-ink-100 text-ink-600',
  }
  return classes[props.accent] ?? classes.brand
})
</script>
