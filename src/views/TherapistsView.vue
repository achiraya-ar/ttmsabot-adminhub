<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="font-mono text-xs font-semibold tracking-[0.08em] text-brand-600">
          therapists
        </p>
        <h2 class="mt-1 text-2xl font-semibold tracking-tight text-ink-900">
          นักบำบัด
        </h2>
        <p class="mt-1.5 max-w-2xl text-sm leading-6 text-ink-500">
          เพิ่มและแก้ไขรายชื่อนักบำบัด สถานะการปฏิบัติงาน และเลขใบประกอบวิชาชีพ
          โดยรายชื่อที่เพิ่มได้จะดึงจาก profiles เฉพาะ role = Therapist ที่ยังไม่ได้เพิ่ม
        </p>
      </div>
      <button class="btn-primary" @click="openCreate">
        <i class="fa-solid fa-user-plus"></i>
        เพิ่มนักบำบัด
      </button>
    </div>

    <section class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div class="app-card flex items-center gap-4 px-4 py-3.5">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <i class="fa-solid fa-user-doctor"></i>
        </div>
        <div>
          <p class="text-xs text-ink-500">นักบำบัดทั้งหมด</p>
          <p class="text-xl font-semibold text-ink-900">{{ formatNumber(therapists.length) }}</p>
        </div>
      </div>
      <div class="app-card flex items-center gap-4 px-4 py-3.5">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <i class="fa-solid fa-circle-check"></i>
        </div>
        <div>
          <p class="text-xs text-ink-500">ปฏิบัติงาน</p>
          <p class="text-xl font-semibold text-ink-900">{{ formatNumber(activeCount) }}</p>
        </div>
      </div>
      <div class="app-card flex items-center gap-4 px-4 py-3.5">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-100 text-ink-500">
          <i class="fa-solid fa-circle-pause"></i>
        </div>
        <div>
          <p class="text-xs text-ink-500">ไม่ปฏิบัติงาน</p>
          <p class="text-xl font-semibold text-ink-900">{{ formatNumber(inactiveCount) }}</p>
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
            placeholder="ค้นหาชื่อนักบำบัดหรือเลขใบประกอบวิชาชีพ..."
            class="input pl-10"
            aria-label="ค้นหานักบำบัด"
          />
        </div>

        <select v-model="statusFilter" class="input w-auto min-w-[170px]" aria-label="กรองตามสถานะ">
          <option value="ALL">ทุกสถานะ</option>
          <option v-for="status in statuses" :key="status" :value="status">
            {{ statusLabel(status) }}
          </option>
        </select>

        <span class="ml-auto text-xs text-ink-500">
          แสดง {{ formatNumber(filteredTherapists.length) }} / {{ formatNumber(therapists.length) }} คน
        </span>
      </div>

      <div v-if="loading" class="app-card border-0 shadow-none">
        <LoadingSpinner message="กำลังโหลดรายชื่อนักบำบัด..." />
      </div>

      <div v-else-if="error" class="flex flex-col items-center gap-4 px-5 py-12 text-center">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <i class="fa-solid fa-triangle-exclamation text-xl"></i>
        </div>
        <div>
          <h3 class="text-base font-semibold text-ink-900">โหลดข้อมูลไม่สำเร็จ</h3>
          <p class="mt-1 text-sm text-ink-500">{{ error }}</p>
        </div>
        <button class="btn-secondary" @click="loadTherapists">
          <i class="fa-solid fa-rotate-right"></i>
          ลองอีกครั้ง
        </button>
      </div>

      <EmptyState
        v-else-if="filteredTherapists.length === 0"
        icon="fa-solid fa-user-doctor"
        title="ไม่พบนักบำบัด"
        :description="
          therapists.length === 0
            ? 'ยังไม่มีรายชื่อนักบำบัด เริ่มต้นด้วยการเพิ่มคนแรก'
            : 'ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ'
        "
      >
        <template #action>
          <button v-if="therapists.length === 0" class="btn-primary" @click="openCreate">
            <i class="fa-solid fa-user-plus"></i>
            เพิ่มนักบำบัด
          </button>
          <button v-else class="btn-secondary" @click="clearFilters">
            <i class="fa-solid fa-filter-circle-xmark"></i>
            ล้างตัวกรอง
          </button>
        </template>
      </EmptyState>

      <div v-else class="table-shell">
        <table class="data-table min-w-[800px]">
          <thead>
            <tr>
              <th>นักบำบัด</th>
              <th>เลขใบประกอบวิชาชีพ</th>
              <th>สถานะ</th>
              <th>สร้างเมื่อ</th>
              <th class="text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="therapist in filteredTherapists" :key="therapist.id">
              <td>
                <div class="flex items-center gap-3">
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                    {{ therapistInitials(therapist.name) }}
                  </div>
                  <div class="min-w-0">
                    <p class="truncate font-medium text-ink-900">{{ therapist.name }}</p>
                    <p class="truncate text-xs text-ink-500">#{{ therapist.id }}</p>
                  </div>
                </div>
              </td>
              <td>
                <span class="text-sm text-ink-600">
                  {{ therapist.license_number || '-' }}
                </span>
              </td>
              <td>
                <span class="badge" :class="statusInfo(therapist.status).classes">
                  <i :class="statusInfo(therapist.status).icon"></i>
                  {{ statusInfo(therapist.status).label }}
                </span>
              </td>
              <td class="whitespace-nowrap text-xs text-ink-500">
                {{ formatDateTime(therapist.created_at) }}
              </td>
              <td>
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    class="btn-ghost btn-sm"
                    title="แก้ไขข้อมูลนักบำบัด"
                    aria-label="แก้ไขข้อมูลนักบำบัด"
                    @click="openEdit(therapist)"
                  >
                    <i class="fa-solid fa-pen-to-square"></i>
                  </button>
                  <button
                    type="button"
                    class="btn-ghost btn-sm text-ink-400 hover:text-rose-600"
                    :disabled="deletingTherapistId === therapist.id"
                    title="ลบนักบำบัด"
                    :aria-label="`ลบนักบำบัด ${therapist.name}`"
                    @click="handleDeleteTherapist(therapist)"
                  >
                    <i
                      v-if="deletingTherapistId === therapist.id"
                      class="fa-solid fa-circle-notch fa-spin"
                    ></i>
                    <i v-else class="fa-solid fa-trash-can"></i>
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
      รายชื่อนักบำบัดจะถูกใช้ในหน้าจัดการตารางเวลา
      และใช้เป็นข้อมูลอ้างอิงของนักบำบัดในระบบ
    </p>

    <TherapistFormModal
      :open="modalOpen"
      :therapist="editingTherapist"
      :available-therapists="availableTherapistNames"
      @close="modalOpen = false"
      @saved="handleSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Swal from 'sweetalert2'
import { deleteTherapist, listTherapists } from '@/services/therapists'
import { listProfiles } from '@/services/profiles'
import { formatDateTime, formatNumber } from '@/utils/format'
import type { AdminProfile, Therapist } from '@/types'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import EmptyState from '@/components/EmptyState.vue'
import TherapistFormModal from '@/components/TherapistFormModal.vue'

const route = useRoute()
const router = useRouter()

const therapists = ref<Therapist[]>([])
const profiles = ref<AdminProfile[]>([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const statusFilter = ref('ALL')
const modalOpen = ref(false)
const editingTherapist = ref<Therapist | null>(null)
const deletingTherapistId = ref<number | null>(null)

const activeCount = computed(
  () => therapists.value.filter((therapist) => therapist.status === 'active').length,
)

const inactiveCount = computed(
  () => therapists.value.filter((therapist) => therapist.status === 'inactive').length,
)

const availableTherapistNames = computed(() => {
  const usedNames = new Set(
    therapists.value.map((therapist) => therapist.name.trim().toLowerCase()),
  )
  const namesByName = new Map<string, string>()

  profiles.value.forEach((profile) => {
    if ((profile.role ?? '').trim().toLowerCase() !== 'therapist') return
    const name = profile.full_name.trim()
    if (!name || usedNames.has(name.toLowerCase())) return
    namesByName.set(name.toLowerCase(), name)
  })

  return [...namesByName.values()].sort((a, b) => a.localeCompare(b, 'th'))
})

const statuses = computed(() =>
  Array.from(
    new Set(therapists.value.map((therapist) => therapist.status).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, 'th')),
)

const filteredTherapists = computed(() => {
  const query = search.value.trim().toLowerCase()

  return therapists.value
    .filter((therapist) => {
      const matchesSearch =
        !query ||
        [therapist.name, therapist.license_number].some((value) =>
          (value ?? '').toLowerCase().includes(query),
        )
      const matchesStatus =
        statusFilter.value === 'ALL' || therapist.status === statusFilter.value
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'th'))
})

function statusLabel(status: string): string {
  if (status === 'active') return 'ปฏิบัติงาน'
  if (status === 'inactive') return 'ไม่ปฏิบัติงาน'
  return status
}

function statusInfo(status: string): {
  label: string
  classes: string
  icon: string
} {
  if (status === 'active') {
    return {
      label: 'ปฏิบัติงาน',
      classes: 'bg-emerald-50 text-emerald-700',
      icon: 'fa-solid fa-circle-check',
    }
  }
  if (status === 'inactive') {
    return {
      label: 'ไม่ปฏิบัติงาน',
      classes: 'bg-ink-100 text-ink-500',
      icon: 'fa-solid fa-circle-pause',
    }
  }
  return {
    label: status || '-',
    classes: 'bg-amber-50 text-amber-700',
    icon: 'fa-solid fa-circle-info',
  }
}

function therapistInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
}

async function loadTherapists() {
  if (therapists.value.length === 0) loading.value = true
  error.value = ''
  try {
    const [therapistRows, profileRows] = await Promise.all([
      listTherapists(),
      listProfiles(),
    ])
    therapists.value = therapistRows
    profiles.value = profileRows
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่คาดคิด'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingTherapist.value = null
  modalOpen.value = true
}

function openEdit(therapist: Therapist) {
  editingTherapist.value = therapist
  modalOpen.value = true
}

function clearFilters() {
  search.value = ''
  statusFilter.value = 'ALL'
}

async function handleSaved() {
  search.value = ''
  statusFilter.value = 'ALL'
  await loadTherapists()
}

async function handleDeleteTherapist(therapist: Therapist) {
  const result = await Swal.fire({
    icon: 'warning',
    title: 'ลบนักบำบัด?',
    html: `ต้องการลบ <strong>${therapist.name}</strong> ใช่หรือไม่<br><span style="font-size:0.9em;color:#64748b">เวอร์ชันตารางเวลาทั้งหมดของนักบำบัดคนนี้จะถูกลบด้วย แต่ข้อมูลการจองเดิมจะไม่ถูกลบ</span>`,
    showCancelButton: true,
    confirmButtonText: 'ลบนักบำบัด',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#c2410c',
    cancelButtonColor: '#64748b',
    reverseButtons: true,
  })

  if (!result.isConfirmed) return

  deletingTherapistId.value = therapist.id
  try {
    await deleteTherapist(therapist.id)
    await Swal.fire({
      icon: 'success',
      title: 'ลบนักบำบัดแล้ว',
      text: therapist.name,
      timer: 1600,
      showConfirmButton: false,
    })
    await loadTherapists()
  } catch (err) {
    await Swal.fire(
      'ลบนักบำบัดไม่สำเร็จ',
      err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
      'error',
    )
  } finally {
    deletingTherapistId.value = null
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
  await loadTherapists()

  if (route.query.new === '1') {
    openCreate()
    await router.replace({ query: {} })
  }
})
</script>
