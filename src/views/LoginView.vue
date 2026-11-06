<template>
  <div class="relative flex min-h-screen flex-col overflow-hidden bg-[#1b130e] text-cream-50">
    <div class="pointer-events-none absolute inset-0">
      <div class="absolute -left-24 top-10 h-80 w-80 rounded-full bg-brand-500/20 blur-3xl"></div>
      <div class="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-amber-300/10 blur-3xl"></div>
      <div
        class="absolute inset-0 opacity-[0.14]"
        style="
          background-image: radial-gradient(rgba(255, 237, 213, 0.5) 1px, transparent 1px);
          background-size: 24px 24px;
        "
      ></div>
    </div>

    <header class="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 sm:px-8">
      <div class="flex items-center gap-3">
        <img
          src="/logo.svg"
          alt="TTM-AdminHub"
          class="h-12 w-12 rounded-2xl shadow-[0_10px_24px_rgba(0,0,0,0.3)]"
        />
        <div>
          <p class="text-lg font-semibold tracking-tight">
            TTM<span class="text-brand-400">-AdminHub</span>
          </p>
          <p class="font-mono text-[9px] uppercase tracking-[0.24em] text-cream-200/50">
            Hospital Data Console
          </p>
        </div>
      </div>
      <span
        class="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-cream-200/60 sm:flex"
      >
        <span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
        Secure access
      </span>
    </header>

    <main
      class="relative z-10 flex flex-1 items-center justify-center px-6 pb-16 sm:px-8"
    >
      <section
        class="relative w-full max-w-md rounded-[36px] border border-white/10 bg-[#241812]/90 p-7 shadow-[0_30px_80px_rgba(0,0,0,0.28)] backdrop-blur sm:p-10"
      >
        <div class="mx-auto max-w-sm">
          <p class="font-mono text-xs uppercase tracking-[0.24em] text-brand-300">
            Admin access
          </p>
          <h2 class="mt-3 text-3xl font-semibold tracking-tight text-cream-50">
            เข้าสู่ระบบ
          </h2>
          <p class="mt-2 text-sm leading-6 text-cream-200/60">
            ใช้ชื่อผู้ใช้และรหัสผ่านเดียวกับระบบ TTM
          </p>

          <form class="mt-8 space-y-5" @submit.prevent="handleSubmit">
            <div>
              <label for="username" class="mb-1.5 block text-sm font-medium text-cream-200/80">
                ชื่อผู้ใช้
              </label>
              <div class="relative">
                <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-brand-300/70">
                  <i class="fa-regular fa-user text-sm"></i>
                </span>
                <input
                  id="username"
                  v-model="username"
                  type="text"
                  required
                  autocomplete="username"
                  autocapitalize="none"
                  placeholder="กรอกชื่อผู้ใช้"
                  class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pl-10 text-sm text-cream-50 outline-none transition placeholder:text-cream-200/25 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/20"
                  :disabled="auth.isLoading"
                  autofocus
                />
              </div>
            </div>

            <div>
              <label for="password" class="mb-1.5 block text-sm font-medium text-cream-200/80">
                รหัสผ่าน
              </label>
              <div class="relative">
                <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-brand-300/70">
                  <i class="fa-solid fa-lock text-sm"></i>
                </span>
                <input
                  id="password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  required
                  autocomplete="current-password"
                  placeholder="กรอกรหัสผ่าน"
                  class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pl-10 pr-11 text-sm text-cream-50 outline-none transition placeholder:text-cream-200/25 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/20"
                  :disabled="auth.isLoading"
                />
                <button
                  type="button"
                  class="absolute inset-y-0 right-0 flex items-center px-3.5 text-cream-200/50 transition hover:text-cream-50"
                  :aria-label="showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'"
                  @click="showPassword = !showPassword"
                >
                  <i :class="showPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'"></i>
                </button>
              </div>
            </div>

            <div
              v-if="errorMessage"
              class="flex items-start gap-2.5 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3.5 py-3 text-sm leading-6 text-rose-200"
              role="alert"
            >
              <i class="fa-solid fa-circle-exclamation mt-0.5"></i>
              <span>{{ errorMessage }}</span>
            </div>

            <button type="submit" class="btn-primary w-full py-3" :disabled="auth.isLoading">
              <i v-if="auth.isLoading" class="fa-solid fa-circle-notch fa-spin"></i>
              <i v-else class="fa-solid fa-arrow-right-to-bracket"></i>
              {{ auth.isLoading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ' }}
            </button>
          </form>

        </div>
      </section>
    </main>

    <footer class="relative z-10 mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-6 pb-8 text-xs text-cream-200/35 sm:px-8">
      <span>TTM-AdminHub · กลุ่มงานการแพทย์แผนไทย โรงพยาบาลสระโบสถ์</span>
      <span class="font-mono text-[10px]">profiles · therapists · schedule_versions · holidays</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const errorMessage = ref('')

async function handleSubmit() {
  errorMessage.value = ''

  if (!username.value.trim() || !password.value) {
    errorMessage.value = 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'
    return
  }

  try {
    await auth.login(username.value, password.value)
    const redirect =
      typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
        ? route.query.redirect
        : '/'
    await router.replace(redirect)
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ'
  }
}
</script>
