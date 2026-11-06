<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-950/45 p-4 backdrop-blur-[2px] sm:items-center sm:p-6"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        @click.self="emit('close')"
      >
        <div
          class="my-auto w-full overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-2xl"
          :class="maxWidth"
        >
          <div class="flex items-start justify-between gap-4 border-b border-ink-200 px-5 py-4 sm:px-6">
            <div>
              <h2 class="text-lg font-semibold text-ink-900">{{ title }}</h2>
              <p v-if="subtitle" class="mt-1 text-sm text-ink-500">{{ subtitle }}</p>
            </div>
            <button
              type="button"
              class="btn-ghost -mr-2 -mt-1 rounded-full p-2"
              aria-label="ปิดหน้าต่าง"
              @click="emit('close')"
            >
              <i class="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          <div class="max-h-[calc(100vh-13rem)] overflow-y-auto px-5 py-5 sm:px-6">
            <slot />
          </div>

          <div
            v-if="$slots.footer"
            class="flex flex-wrap items-center justify-end gap-3 border-t border-ink-200 bg-ink-50/70 px-5 py-4 sm:px-6"
          >
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    subtitle?: string
    maxWidth?: string
  }>(),
  {
    subtitle: '',
    maxWidth: 'max-w-2xl',
  },
)

const emit = defineEmits<{
  (e: 'close'): void
}>()

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.open) emit('close')
}

watch(
  () => props.open,
  (isOpen) => {
    document.body.style.overflow = isOpen ? 'hidden' : ''

    if (isOpen) {
      window.addEventListener('keydown', handleKeydown)
    } else {
      window.removeEventListener('keydown', handleKeydown)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.18s ease;
}

.modal-enter-active > div,
.modal-leave-active > div {
  transition:
    transform 0.18s ease,
    opacity 0.18s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > div,
.modal-leave-to > div {
  transform: translateY(10px) scale(0.98);
  opacity: 0;
}
</style>
