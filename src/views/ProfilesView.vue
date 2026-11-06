<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="font-mono text-xs font-semibold tracking-[0.08em] text-brand-600">profiles</p>
        <h2 class="mt-1 text-2xl font-semibold tracking-tight text-ink-900">ผู้ใช้และสิทธิ์</h2>
        <p class="mt-1.5 max-w-2xl text-sm leading-6 text-ink-500">
          จัดการข้อมูลผู้ใช้ บทบาท และสิทธิ์การเข้าถึงทั้ง 5 ระบบ
          การสร้างผู้ใช้ใหม่จะสร้างบัญชี Supabase Auth พร้อมโปรไฟล์ให้อัตโนมัติ
        </p>
      </div>
      <button class="btn-primary" @click="openCreate">
        <i class="fa-solid fa-user-plus"></i>
        เพิ่มผู้ใช้
      </button>
    </div>

    <section class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div class="app-card flex items-center gap-4 px-4 py-3.5">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <i class="fa-solid fa-users"></i>
        </div>
        <div>
          <p class="text-xs text-ink-500">ผู้ใช้ทั้งหมด</p>
          <p class="text-xl font-semibold text-ink-900">{{ formatNumber(profiles.length) }}</p>
        </div>
      </div>
      <div class="app-card flex items-center gap-4 px-4 py-3.5">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
          <i class="fa-solid fa-shield-halved"></i>
        </div>
        <div>
          <p class="text-xs text-ink-500">ผู้ดูแล Admin Hub</p>
          <p class="text-xl font-semibold text-ink-900">{{ formatNumber(adminCount) }}</p>
        </div>
      </div>
      <div class="app-card flex items-center gap-4 px-4 py-3.5">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-100 text-ink-500">
          <i class="fa-solid fa-ban"></i>
        </div>
        <div>
          <p class="text-xs text-ink-500">ยังไม่มีสิทธิ์ระบบใด</p>
          <p class="text-xl font-semibold text-ink-900">{{ formatNumber(noAccessCount) }}</p>
        </div>
      </div>
    </section>

    <section class="app-card">
      <div class="flex flex-wrap items-center gap-3 border-b border-ink-200 px-4 py-3.5 sm:px-5">
        <div class="relative min-w-[240px] flex-1">
          <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-ink-400">
            <i class="fa-solid fa-magnifying-glass text-sm"></i>
          </span>
          <input
            v-model="search"
            type="search"
            placeholder="ค้นหาชื่อผู้ใช้ ชื่อ-นามสกุล อีเมล หรือบทบาท..."
            class="input pl-10"
            aria-label="ค้นหาผู้ใช้"
          />
        </div>

        <select v-model="roleFilter" class="input w-auto min-w-[170px]" aria-label="กรองตามบทบาท">
          <option value="ALL">ทุกบทบาท</option>
          <option v-for="role in roles" :key="role" :value="role">{{ role }}</option>
        </select>

        <span class="ml-auto text-xs text-ink-500">
          แสดง {{ formatNumber(filteredProfiles.length) }} / {{ formatNumber(profiles.length) }} คน
        </span>
      </div>

      <div v-if="loading" class="app-card border-0 shadow-none">
        <LoadingSpinner message="กำลังโหลดรายชื่อผู้ใช้..." />
      </div>

      <div v-else-if="error" class="flex flex-col items-center gap-4 px-5 py-12 text-center">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <i class="fa-solid fa-triangle-exclamation text-xl"></i>
        </div>
        <div>
          <h3 class="text-base font-semibold text-ink-900">โหลดข้อมูลไม่สำเร็จ</h3>
          <p class="mt-1 text-sm text-ink-500">{{ error }}</p>
        </div>
        <button class="btn-secondary" @click="loadProfiles">
          <i class="fa-solid fa-rotate-right"></i>
          ลองอีกครั้ง
        </button>
      </div>

      <EmptyState
        v-else-if="filteredProfiles.length === 0"
        icon="fa-solid fa-users-slash"
        title="ไม่พบผู้ใช้"
        :description="
          profiles.length === 0
            ? 'ยังไม่มีผู้ใช้ในตาราง profiles เริ่มต้นด้วยการเพิ่มผู้ใช้คนแรก'
            : 'ลองเปลี่ยนคำค้นหาหรือตัวกรองบทบาท'
        "
      >
        <template #action>
          <button v-if="profiles.length === 0" class="btn-primary" @click="openCreate">
            <i class="fa-solid fa-user-plus"></i>
            เพิ่มผู้ใช้
          </button>
          <button v-else class="btn-secondary" @click="clearFilters">
            <i class="fa-solid fa-filter-circle-xmark"></i>
            ล้างตัวกรอง
          </button>
        </template>
      </EmptyState>

      <div v-else class="table-shell">
        <table class="data-table min-w-[1240px]">
          <thead>
            <tr>
              <th>ผู้ใช้</th>
              <th>อีเมล</th>
              <th>บทบาท</th>
              <th>สิทธิ์การเข้าถึง</th>
              <th class="min-w-[160px] whitespace-nowrap">เข้าสู่ระบบล่าสุด</th>
              <th class="min-w-[160px] whitespace-nowrap">อัปเดตล่าสุด</th>
              <th class="text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="profile in filteredProfiles" :key="profile.id">
              <td>
                <div class="flex items-center gap-3">
                  <div
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700"
                  >
                    {{ profileInitials(profile.full_name) }}
                  </div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-2">
                      <p class="truncate font-medium text-ink-900">{{ profile.full_name }}</p>
                      <span
                        v-if="profile.id === auth.profile?.id"
                        class="badge bg-brand-50 text-brand-700"
                      >
                        คุณ
                      </span>
                    </div>
                    <p class="truncate text-xs text-ink-500">@{{ profile.username }}</p>
                  </div>
                </div>
              </td>
              <td>
                <span class="text-sm text-ink-600">{{ profile.email }}</span>
              </td>
              <td>
                <span class="badge bg-ink-100 text-ink-600">{{ profile.role || '-' }}</span>
              </td>
              <td>
                <PermissionBadges :profile="profile" />
              </td>
              <td class="min-w-[160px] whitespace-nowrap text-xs text-ink-500">
                {{ formatDateTime(lastSignIns[profile.id] ?? null) }}
              </td>
              <td class="min-w-[160px] whitespace-nowrap text-xs text-ink-500">
                {{ formatDateTime(profile.updated_at) }}
              </td>
              <td>
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    class="btn-ghost btn-sm"
                    title="แก้ไขผู้ใช้"
                    aria-label="แก้ไขผู้ใช้"
                    @click="openEdit(profile)"
                  >
                    <i class="fa-solid fa-pen-to-square"></i>
                  </button>
                  <button
                    type="button"
                    class="btn-ghost btn-sm text-ink-400 hover:text-rose-600"
                    :disabled="profile.id === auth.profile?.id"
                    :title="
                      profile.id === auth.profile?.id
                        ? 'ไม่สามารถลบบัญชีของตัวเองได้'
                        : 'ลบผู้ใช้'
                    "
                    aria-label="ลบผู้ใช้"
                    @click="handleDelete(profile)"
                  >
                    <i class="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <p class="px-1 text-xs leading-5 text-ink-400">
      <i class="fa-solid fa-circle-info mr-1"></i>
      การเพิ่ม แก้ไข ลบผู้ใช้ และเวลาที่เข้าสู่ระบบล่าสุด ต้องมี Edge Function
      <code class="rounded bg-ink-200/60 px-1 py-0.5 font-mono text-[11px] text-ink-600">admin-users</code>
      เวอร์ชันล่าสุด deploy ไว้ใน Supabase แล้ว (ดูขั้นตอนใน README)
    </p>

    <ProfileFormModal
      :open="modalOpen"
      :profile="editingProfile"
      :roles="roles"
      :current-user-id="auth.profile?.id ?? ''"
      @close="modalOpen = false"
      @saved="handleSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Swal from 'sweetalert2'
import { useAuthStore } from '@/stores/auth'
import { deleteAdminUser, listLastSignIns, listProfiles } from '@/services/profiles'
import { formatDateTime, formatNumber } from '@/utils/format'
import { escapeHtml } from '@/utils/html'
import type { AdminProfile } from '@/types'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import EmptyState from '@/components/EmptyState.vue'
import PermissionBadges from '@/components/PermissionBadges.vue'
import ProfileFormModal from '@/components/ProfileFormModal.vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const profiles = ref<AdminProfile[]>([])
const lastSignIns = ref<Record<string, string | null>>({})
const loading = ref(true)
const error = ref('')
const search = ref('')
const roleFilter = ref('ALL')
const modalOpen = ref(false)
const editingProfile = ref<AdminProfile | null>(null)

const roles = computed(() =>
  Array.from(new Set(profiles.value.map((profile) => profile.role).filter(Boolean))).sort(
    (a, b) => a.localeCompare(b, 'th'),
  ),
)

const adminCount = computed(
  () => profiles.value.filter((profile) => profile.can_access_adminhub).length,
)

const noAccessCount = computed(
  () =>
    profiles.value.filter(
      (profile) =>
        !profile.can_access_personalworkschedule &&
        !profile.can_access_workschedule &&
        !profile.can_access_bookingportalmanager &&
        !profile.can_access_paypercase &&
        !profile.can_access_adminhub,
    ).length,
)

const filteredProfiles = computed(() => {
  const query = search.value.trim().toLowerCase()

  return profiles.value.filter((profile) => {
    const matchesSearch =
      !query ||
      [profile.username, profile.full_name, profile.email, profile.role].some((value) =>
        (value ?? '').toLowerCase().includes(query),
      )
    const matchesRole = roleFilter.value === 'ALL' || profile.role === roleFilter.value
    return matchesSearch && matchesRole
  })
})

function profileInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
}

async function loadProfiles() {
  if (profiles.value.length === 0) loading.value = true
  error.value = ''
  try {
    const [profileRows, signInRows] = await Promise.all([
      listProfiles(),
      listLastSignIns(),
    ])
    profiles.value = profileRows
    lastSignIns.value = signInRows
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่คาดคิด'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingProfile.value = null
  modalOpen.value = true
}

function openEdit(profile: AdminProfile) {
  editingProfile.value = profile
  modalOpen.value = true
}

function clearFilters() {
  search.value = ''
  roleFilter.value = 'ALL'
}

async function handleSaved() {
  search.value = ''
  roleFilter.value = 'ALL'
  await loadProfiles()
}

async function handleDelete(profile: AdminProfile) {
  if (profile.id === auth.profile?.id) {
    await Swal.fire('ไม่สามารถลบได้', 'ไม่สามารถลบบัญชีของตัวเองได้', 'warning')
    return
  }

  const result = await Swal.fire({
    icon: 'warning',
    title: 'ลบผู้ใช้?',
    html: `ต้องการลบ <strong>${escapeHtml(profile.full_name)}</strong> (@${escapeHtml(profile.username)}) ออกจากระบบหรือไม่<br /><span style="font-size:0.85em;color:#64748b">บัญชี Supabase Auth และโปรไฟล์จะถูกลบ</span>`,
    showCancelButton: true,
    confirmButtonText: 'ลบผู้ใช้',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#be123c',
    cancelButtonColor: '#64748b',
    reverseButtons: true,
  })

  if (!result.isConfirmed) return

  try {
    const response = await deleteAdminUser(profile.id)
    profiles.value = profiles.value.filter((item) => item.id !== profile.id)

    if (response.warning) {
      await Swal.fire({
        icon: 'warning',
        title: 'ลบโปรไฟล์แล้ว',
        text: response.warning,
      })
    } else {
      await Swal.fire({
        icon: 'success',
        title: 'ลบผู้ใช้สำเร็จ',
        text: `ลบ ${profile.full_name} ออกจากระบบแล้ว`,
        timer: 1500,
        showConfirmButton: false,
      })
    }
  } catch (err) {
    await Swal.fire(
      'ลบไม่สำเร็จ',
      err instanceof Error ? err.message : 'ลบผู้ใช้ไม่สำเร็จ',
      'error',
    )
  }
}

watch(
  () => route.query.new,
  async (value) => {
    if (value !== '1') return
    openCreate()
    await router.replace({ query: {} })
  },
)

onMounted(async () => {
  await loadProfiles()

  if (route.query.new === '1') {
    openCreate()
    await router.replace({ query: {} })
  }
})
</script>
