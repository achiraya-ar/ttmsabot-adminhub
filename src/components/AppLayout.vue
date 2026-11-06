<template>
  <div class="min-h-screen bg-cream-100">
    <div class="h-1 w-full bg-gradient-to-r from-brand-800 via-brand-500 to-amber-300"></div>

    <header
      class="sticky top-0 z-40 border-b border-white/10 bg-[#1b130e]/95 text-cream-50 shadow-[0_12px_30px_rgba(27,19,14,0.18)] backdrop-blur"
    >
      <div class="mx-auto flex h-[76px] w-full max-w-[1500px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <RouterLink :to="{ name: 'dashboard' }" class="flex items-center gap-3">
          <img
            src="/logo.svg"
            alt="TTM-AdminHub"
            class="h-11 w-11 rounded-2xl shadow-[0_8px_18px_rgba(0,0,0,0.28)]"
          />
          <div class="leading-tight">
            <p class="text-lg font-semibold tracking-tight">
              TTM<span class="text-brand-400">-AdminHub</span>
            </p>
            <p class="font-mono text-[9px] uppercase tracking-[0.24em] text-cream-200/50">
              Hospital Data Console
            </p>
          </div>
        </RouterLink>

        <nav class="ml-5 hidden items-center gap-1 lg:flex">
          <RouterLink
            v-for="item in tableNavItems"
            :key="item.name"
            :to="{ name: item.name }"
            class="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition"
            :class="navLinkClass(item.name)"
            :aria-current="isActive(item.name) ? 'page' : undefined"
          >
            <i
              :class="item.icon"
              class="text-[12px]"
              :style="{ color: isActive(item.name) ? undefined : '#fdba74' }"
            ></i>
            <span class="font-mono text-[12px] font-medium">{{ item.label }}</span>
          </RouterLink>
        </nav>

        <div class="ml-auto flex items-center gap-2.5">
          <div class="hidden text-right xl:block">
            <p class="text-sm font-semibold text-cream-50">{{ auth.displayName }}</p>
            <p class="font-mono text-[10px] uppercase tracking-wider text-cream-200/50">
              {{ auth.profile?.role || 'ผู้ดูแลระบบ' }}
            </p>
          </div>
          <div
            class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-semibold text-white ring-2 ring-brand-400/30"
          >
            {{ initials }}
          </div>
          <button
            type="button"
            class="rounded-lg p-2 text-cream-200/60 transition hover:bg-white/10 hover:text-rose-300"
            title="ออกจากระบบ"
            aria-label="ออกจากระบบ"
            @click="handleLogout"
          >
            <i class="fa-solid fa-right-from-bracket"></i>
          </button>
          <button
            type="button"
            class="rounded-lg p-2 text-cream-200/70 transition hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="เปิดเมนู"
            @click="mobileOpen = !mobileOpen"
          >
            <i :class="mobileOpen ? 'fa-solid fa-xmark' : 'fa-solid fa-bars'" class="text-lg"></i>
          </button>
        </div>
      </div>

      <Transition name="mobile-nav">
        <div v-if="mobileOpen" class="border-t border-white/10 bg-[#1b130e] px-4 pb-4 pt-2 lg:hidden">
          <RouterLink
            :to="{ name: 'dashboard' }"
            class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition"
            :class="
              isActive('dashboard')
                ? 'bg-cream-50 text-ink-900'
                : 'text-cream-200/75 hover:bg-white/10 hover:text-white'
            "
            @click="mobileOpen = false"
          >
            <i class="fa-solid fa-gauge-high text-[12px] text-brand-300"></i>
            <span class="font-mono text-[12px]">dashboard</span>
            <span class="ml-auto text-xs text-cream-200/50">ภาพรวมระบบ</span>
          </RouterLink>

          <p class="px-3 pb-1 pt-3 font-mono text-[9px] uppercase tracking-[0.22em] text-cream-200/40">
            ตารางใน Supabase
          </p>
          <div class="grid gap-1">
            <RouterLink
              v-for="item in tableNavItems"
              :key="item.name"
              :to="{ name: item.name }"
              class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition"
              :class="
                isActive(item.name)
                  ? 'bg-cream-50 text-ink-900'
                  : 'text-cream-200/75 hover:bg-white/10 hover:text-white'
              "
              @click="mobileOpen = false"
            >
              <i :class="item.icon" class="text-[12px] text-brand-300"></i>
              <span class="font-mono text-[12px]">{{ item.label }}</span>
              <span class="ml-auto text-xs text-cream-200/50">{{ item.subtitle }}</span>
            </RouterLink>
          </div>
        </div>
      </Transition>
    </header>

    <div class="border-b border-brand-100/80 bg-cream-50/70">
      <div
        class="mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:px-8"
      >
        <div class="flex items-center gap-2 text-xs text-ink-500">
          <RouterLink
            :to="{ name: 'dashboard' }"
            class="font-semibold text-brand-700 hover:text-brand-800"
          >
            TTM-AdminHub
          </RouterLink>
          <i class="fa-solid fa-chevron-right text-[8px] text-ink-300"></i>
          <span class="font-mono font-semibold text-ink-900">{{ pageTitle }}</span>
          <span class="badge bg-brand-50 text-brand-700">{{ pageSubtitle }}</span>
        </div>
        <p class="text-xs text-ink-500">{{ todayLabel }}</p>
      </div>
    </div>

    <main class="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <RouterView v-slot="{ Component }">
        <Transition name="page-fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>

    <footer
      class="mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-between gap-2 px-4 pb-8 text-xs text-ink-400 sm:px-6 lg:px-8"
    >
      <span>TTM-AdminHub · ศูนย์ควบคุมข้อมูลกลุ่มงานแพทย์แผนไทยฯ</span>
      <span class="font-mono text-[10px]">profiles · therapists · schedule_versions · holidays</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import Swal from 'sweetalert2'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const mobileOpen = ref(false)

const tableNavItems = [
  {
    name: 'profiles',
    label: 'profiles',
    subtitle: 'ผู้ใช้และสิทธิ์',
    icon: 'fa-solid fa-users-gear',
  },
  {
    name: 'therapists',
    label: 'therapists',
    subtitle: 'นักบำบัด',
    icon: 'fa-solid fa-user-doctor',
  },
  {
    name: 'schedule_versions',
    label: 'schedule_versions',
    subtitle: 'เวอร์ชันตารางเวลา',
    icon: 'fa-solid fa-calendar-week',
  },
  {
    name: 'holidays',
    label: 'holidays',
    subtitle: 'วันหยุด',
    icon: 'fa-solid fa-calendar-days',
  },
]

const pageTitles: Record<string, string> = {
  dashboard: 'dashboard',
  profiles: 'profiles',
  therapists: 'therapists',
  schedule_versions: 'schedule_versions',
  holidays: 'holidays',
}

const pageSubtitles: Record<string, string> = {
  dashboard: 'ภาพรวมระบบ',
  profiles: 'ผู้ใช้และสิทธิ์',
  therapists: 'นักบำบัด',
  schedule_versions: 'เวอร์ชันตารางเวลา',
  holidays: 'วันหยุด',
}

const pageTitle = computed(() => {
  const name = typeof route.name === 'string' ? route.name : ''
  return pageTitles[name] ?? (typeof route.meta.title === 'string' ? route.meta.title : 'TTM-AdminHub')
})

const pageSubtitle = computed(() => {
  const name = typeof route.name === 'string' ? route.name : ''
  return pageSubtitles[name] ?? ''
})

const todayLabel = new Date().toLocaleDateString('th-TH', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

const initials = computed(() => {
  const name = auth.displayName.trim()
  if (!name) return 'AD'
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
})

function isActive(name: string): boolean {
  return route.name === name
}

function navLinkClass(name: string): string {
  return isActive(name)
    ? 'bg-cream-50 text-ink-900 shadow-[0_8px_20px_rgba(0,0,0,0.18)]'
    : 'text-cream-200/70 hover:bg-white/10 hover:text-white'
}

watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false
  },
)

async function handleLogout() {
  const result = await Swal.fire({
    icon: 'question',
    title: 'ออกจากระบบ?',
    text: 'คุณต้องการออกจาก TTM-AdminHub ใช่หรือไม่',
    showCancelButton: true,
    confirmButtonText: 'ออกจากระบบ',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#c2410c',
    cancelButtonColor: '#64748b',
    reverseButtons: true,
  })

  if (!result.isConfirmed) return

  await auth.logout()
  await router.replace({ name: 'login' })
}
</script>

<style scoped>
.mobile-nav-enter-active,
.mobile-nav-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}

.mobile-nav-enter-from,
.mobile-nav-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
