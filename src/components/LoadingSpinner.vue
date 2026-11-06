<template>
  <div class="flex flex-col items-center justify-center gap-3 py-12 text-ink-500">
    <i class="fa-solid fa-circle-notch fa-spin text-2xl text-brand-600"></i>
    <p class="text-sm">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    message?: string
  }>(),
  {
    message: 'กำลังโหลดข้อมูล...',
  },
)
</script>
