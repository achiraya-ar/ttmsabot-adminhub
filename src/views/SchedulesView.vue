<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import Swal from 'sweetalert2'
import { listTherapists } from '@/services/therapists'
import {
  deleteAllScheduleVersions,
  deleteScheduleVersion,
  listScheduleVersions,
  saveTherapistScheduleVersion,
} from '@/services/schedules'
import type {
  DayVisibility,
  ScheduleDayPayload,
  ScheduleVersionRow,
  Therapist,
} from '@/types'
import { formatThaiDate, todayISO } from '@/utils/format'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import EmptyState from '@/components/EmptyState.vue'

const DAYS = [
  { value: 1, label: 'จันทร์' },
  { value: 2, label: 'อังคาร' },
  { value: 3, label: 'พุธ' },
  { value: 4, label: 'พฤหัสบดี' },
  { value: 5, label: 'ศุกร์' },
  { value: 6, label: 'เสาร์' },
  { value: 0, label: 'อาทิตย์' },
] as const

const DAY_VALUES = DAYS.map((day) => day.value)

function createEmptySlotState(): Record<number, Record<string, DayVisibility>> {
  return Object.fromEntries(DAY_VALUES.map((day) => [day, {}])) as Record<
    number,
    Record<string, DayVisibility>
  >
}

function sortTimes(times: string[]): string[] {
  return [...new Set(times.map((time) => time.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  )
}

function resolveSlotVisibility(row: ScheduleVersionRow, time: string): DayVisibility {
  const value = row.slot_visibility?.[time]
  if (value === 'public' || value === 'private') return value
  return row.visibility === 'private' ? 'private' : 'public'
}

function toISODate(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

function addMonths(months: number): string {
  const date = new Date()
  date.setMonth(date.getMonth() + months)
  return toISODate(date)
}

function addDays(dateString: string, days: number): string {
  const date = new Date(dateString + 'T00:00:00')
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

function isBaselineVersion(effectiveFrom: string): boolean {
  return effectiveFrom === '2000-01-01'
}

const scheduleVersions = ref<ScheduleVersionRow[]>([])
const therapistRows = ref<Therapist[]>([])
const loading = ref(true)
const error = ref('')
const savingSchedule = ref(false)
const deletingVersion = ref<string | null>(null)
const deletingAllVersions = ref(false)

const selectedTherapist = ref('')
const effectiveDate = ref(todayISO())
const slotStates = ref<Record<number, Record<string, DayVisibility>>>(createEmptySlotState())
const allTimeSlots = ref<string[]>([])
const newTimeSlot = ref('')

const today = todayISO()
const maxEffectiveDate = addMonths(12)

const therapists = computed(() => {
  const names = new Set<string>()

  therapistRows.value.forEach((therapist) => {
    if (therapist.name?.trim()) names.add(therapist.name.trim())
  })
  scheduleVersions.value.forEach((row) => {
    if (row.therapist_name?.trim()) names.add(row.therapist_name.trim())
  })

  return [...names].sort((a, b) => a.localeCompare(b, 'th'))
})

const therapistVersions = computed(() => {
  const byDate = new Map<string, ScheduleVersionRow[]>()

  scheduleVersions.value
    .filter((row) => row.therapist_name.trim() === selectedTherapist.value)
    .forEach((row) => {
      const rows = byDate.get(row.effective_from) ?? []
      rows.push(row)
      byDate.set(row.effective_from, rows)
    })

  const dates = [...byDate.keys()].sort()

  return dates.map((effectiveFrom, index) => {
    const rows = byDate.get(effectiveFrom) ?? []
    const nextDate = dates[index + 1]
    const effectiveTo = nextDate ? addDays(nextDate, -1) : null
    const baseline = isBaselineVersion(effectiveFrom)
    const status =
      effectiveFrom > today
        ? 'future'
        : effectiveTo && effectiveTo < today
          ? 'past'
          : 'current'

    const uniqueTimes = new Set<string>()
    rows.forEach((row) => {
      ;(row.time_slots ?? []).forEach((time) => uniqueTimes.add(time.trim()))
    })

    return {
      effectiveFrom,
      effectiveTo,
      isBaseline: baseline,
      fromLabel: baseline ? 'ตารางเริ่มต้น' : formatThaiDate(effectiveFrom),
      toLabel: effectiveTo ? formatThaiDate(effectiveTo) : 'ไม่กำหนด',
      status,
      statusLabel:
        status === 'future'
          ? 'อนาคต'
          : status === 'past'
            ? 'สิ้นสุดแล้ว'
            : 'กำลังใช้งาน',
      statusClasses:
        status === 'future'
          ? 'bg-brand-50 text-brand-700'
          : status === 'past'
            ? 'bg-ink-100 text-ink-500'
            : 'bg-emerald-50 text-emerald-700',
      timeCount: uniqueTimes.size,
      dayCount: rows.filter((row) => (row.time_slots ?? []).length > 0).length,
      optionLabel: `${
        baseline ? 'ตารางเริ่มต้น' : formatThaiDate(effectiveFrom)
      } • ถึง ${effectiveTo ? formatThaiDate(effectiveTo) : 'ไม่กำหนด'}`,
    }
  })
})

const selectedVersion = computed(
  () =>
    therapistVersions.value.find(
      (version) => version.effectiveFrom === effectiveDate.value,
    ) ?? null,
)

const selectedVersionRangeLabel = computed(() => {
  if (selectedVersion.value) {
    return selectedVersion.value.isBaseline
      ? `ตารางเริ่มต้นมีผลถึง ${selectedVersion.value.toLabel}`
      : `เวอร์ชันนี้มีผลตั้งแต่ ${selectedVersion.value.fromLabel} ถึง ${selectedVersion.value.toLabel}`
  }
  return `ตารางใหม่จะมีผลตั้งแต่ ${formatThaiDate(effectiveDate.value)} จนกว่าจะมีเวอร์ชันถัดไป`
})

function onVersionSelect(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (value) effectiveDate.value = value
}

const totalSelectedSlots = computed(() =>
  DAY_VALUES.reduce<number>(
    (total, day) => total + Object.keys(slotStates.value[day] ?? {}).length,
    0,
  ),
)

function errorMessage(err: unknown): string {
  const code = (err as { code?: string } | null)?.code
  if (code === '42501') {
    return 'ไม่มีสิทธิ์แก้ไขข้อมูล กรุณารัน SQL migration ในโฟลเดอร์ ttmsabot-adminhub/supabase/migrations เพื่อเพิ่ม policy สำหรับผู้ดูแลระบบ'
  }
  if (code === '42P01') {
    return 'ยังไม่มีตาราง schedule_versions กรุณารัน SQL migration ในโฟลเดอร์ ttmsabot-adminhub/supabase/migrations ก่อนใช้งาน'
  }
  return err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่คาดคิด'
}

function applyTherapistSchedule() {
  const therapist = selectedTherapist.value
  const date = effectiveDate.value
  const states = createEmptySlotState()

  DAYS.forEach((day) => {
    const matchingVersions = scheduleVersions.value
      .filter(
        (row) =>
          row.therapist_name.trim() === therapist &&
          row.day_of_week === day.value &&
          row.effective_from <= date,
      )
      .sort(
        (a, b) =>
          a.effective_from.localeCompare(b.effective_from) || a.id - b.id,
      )
    const latestVersion = matchingVersions[matchingVersions.length - 1]

    if (latestVersion) {
      sortTimes(latestVersion.time_slots ?? []).forEach((time) => {
        states[day.value][time] = resolveSlotVisibility(latestVersion, time)
      })
    }
  })

  slotStates.value = states

  const knownTimes = new Set<string>()
  Object.values(states).forEach((state) => {
    Object.keys(state).forEach((time) => knownTimes.add(time))
  })
  allTimeSlots.value = sortTimes([...knownTimes])
}

function isSlotSelected(day: number, time: string): boolean {
  return Boolean(slotStates.value[day]?.[time])
}

function slotVisibility(day: number, time: string): DayVisibility {
  return slotStates.value[day]?.[time] ?? 'public'
}

function toggleSlot(day: number, time: string) {
  const current = slotStates.value[day]?.[time]
  const next = { ...(slotStates.value[day] ?? {}) }

  if (!current) {
    next[time] = 'public'
  } else if (current === 'public') {
    next[time] = 'private'
  } else {
    delete next[time]
  }

  slotStates.value = {
    ...slotStates.value,
    [day]: next,
  }
}

function addTimeSlot() {
  const time = newTimeSlot.value.trim()
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    Swal.fire('เวลาไม่ถูกต้อง', 'กรุณาเลือกเวลาในรูปแบบ HH:MM', 'warning')
    return
  }

  if (!allTimeSlots.value.includes(time)) {
    allTimeSlots.value = sortTimes([...allTimeSlots.value, time])
  }
  newTimeSlot.value = ''
}

async function removeTimeSlot(time: string) {
  const result = await Swal.fire({
    icon: 'warning',
    title: 'ลบช่วงเวลานี้?',
    html: `ต้องการลบช่วงเวลา <strong>${time} น.</strong> ออกจากทุกวันในตารางนี้หรือไม่<br><span style="font-size:0.9em;color:#64748b">ข้อมูลการจองเดิมจะไม่ถูกลบ</span>`,
    showCancelButton: true,
    confirmButtonText: 'ลบช่วงเวลา',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#c2410c',
    cancelButtonColor: '#64748b',
    reverseButtons: true,
  })

  if (!result.isConfirmed) return

  const nextStates = { ...slotStates.value }
  DAY_VALUES.forEach((day) => {
    const nextDay = { ...(nextStates[day] ?? {}) }
    delete nextDay[time]
    nextStates[day] = nextDay
  })

  slotStates.value = nextStates
  allTimeSlots.value = allTimeSlots.value.filter((item) => item !== time)
}

async function loadData() {
  loading.value = true
  error.value = ''

  try {
    const [versionData, therapistData] = await Promise.all([
      listScheduleVersions(),
      listTherapists(),
    ])

    scheduleVersions.value = versionData
    therapistRows.value = therapistData

    if (!selectedTherapist.value || !therapists.value.includes(selectedTherapist.value)) {
      selectedTherapist.value = therapists.value[0] ?? ''
    }

    applyTherapistSchedule()
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    loading.value = false
  }
}

async function handleSaveSchedule() {
  if (!selectedTherapist.value) {
    Swal.fire('ข้อมูลไม่ครบถ้วน', 'กรุณาเลือกนักบำบัดก่อนบันทึกตารางเวลา', 'warning')
    return
  }

  if (totalSelectedSlots.value === 0) {
    await Swal.fire(
      'ไม่มีช่วงเวลาให้บันทึก',
      'กรุณาเพิ่มช่วงเวลาอย่างน้อย 1 ช่วงเวลา หรือลบเวอร์ชันนี้จากรายการเวอร์ชันด้านบน',
      'warning',
    )
    return
  }

  savingSchedule.value = true
  try {
    const days: ScheduleDayPayload[] = DAYS.map((day) => {
      const state = slotStates.value[day.value] ?? {}
      const timeSlots = sortTimes(Object.keys(state))
      const slotVisibility = Object.fromEntries(
        timeSlots.map((time) => [time, state[time] ?? 'public']),
      ) as Record<string, DayVisibility>

      const visibility =
        timeSlots.length > 0 &&
        timeSlots.every((time) => slotVisibility[time] === 'private')
          ? 'private'
          : 'public'

      return {
        day_of_week: day.value,
        time_slots: timeSlots,
        visibility,
        slot_visibility: slotVisibility,
      }
    })

    await saveTherapistScheduleVersion(
      selectedTherapist.value,
      effectiveDate.value,
      days,
    )

    await Swal.fire({
      icon: 'success',
      title: 'บันทึกตารางเวลาแล้ว',
      text: `ตารางของ ${selectedTherapist.value} จะมีผลตั้งแต่วันที่ ${formatThaiDate(effectiveDate.value)} เป็นต้นไป`,
      timer: 2200,
      showConfirmButton: false,
    })

    await loadData()
  } catch (err) {
    await Swal.fire('บันทึกตารางเวลาไม่สำเร็จ', errorMessage(err), 'error')
  } finally {
    savingSchedule.value = false
  }
}

async function handleDeleteVersion(
  effectiveFrom: string,
  fromLabel: string,
  toLabel: string,
) {
  if (!selectedTherapist.value) return

  const baselineNote = isBaselineVersion(effectiveFrom)
    ? 'นี่คือเวอร์ชันเริ่มต้น หากลบและไม่มีเวอร์ชันก่อนหน้า ช่วงเวลาก่อนเวอร์ชันถัดไปอาจไม่มีตารางเวลา'
    : 'หลังลบ ระบบจะกลับไปใช้เวอร์ชันก่อนหน้า'

  const result = await Swal.fire({
    icon: 'warning',
    title: 'ลบเวอร์ชันนี้?',
    html: `ต้องการลบเวอร์ชัน <strong>${fromLabel}</strong> (มีผลถึง ${toLabel}) ของ <strong>${selectedTherapist.value}</strong> ใช่หรือไม่<br><span style="font-size:0.9em;color:#64748b">${baselineNote} และข้อมูลการจองเดิมจะไม่ถูกลบ</span>`,
    showCancelButton: true,
    confirmButtonText: 'ลบเวอร์ชันนี้',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#c2410c',
    cancelButtonColor: '#64748b',
    reverseButtons: true,
  })

  if (!result.isConfirmed) return

  deletingVersion.value = effectiveFrom
  try {
    await deleteScheduleVersion(selectedTherapist.value, effectiveFrom)
    await Swal.fire({
      icon: 'success',
      title: 'ลบเวอร์ชันแล้ว',
      timer: 1500,
      showConfirmButton: false,
    })
    await loadData()
  } catch (err) {
    await Swal.fire('ลบเวอร์ชันไม่สำเร็จ', errorMessage(err), 'error')
  } finally {
    deletingVersion.value = null
  }
}

async function handleDeleteAllVersions() {
  if (!selectedTherapist.value) return

  const result = await Swal.fire({
    icon: 'warning',
    title: 'ลบทุกเวอร์ชัน?',
    html: `ต้องการลบตารางเวลาทั้งหมดของ <strong>${selectedTherapist.value}</strong> ใช่หรือไม่<br><span style="font-size:0.9em;color:#64748b">รวมถึงเวอร์ชันเริ่มต้น นักบำบัดคนนี้จะไม่มีตารางเวลาจนกว่าจะสร้างใหม่ ข้อมูลการจองเดิมจะไม่ถูกลบ</span>`,
    showCancelButton: true,
    confirmButtonText: 'ลบทุกเวอร์ชัน',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#c2410c',
    cancelButtonColor: '#64748b',
    reverseButtons: true,
  })

  if (!result.isConfirmed) return

  deletingAllVersions.value = true
  try {
    await deleteAllScheduleVersions(selectedTherapist.value)
    await Swal.fire({
      icon: 'success',
      title: 'ลบทุกเวอร์ชันแล้ว',
      timer: 1500,
      showConfirmButton: false,
    })
    await loadData()
  } catch (err) {
    await Swal.fire('ลบทุกเวอร์ชันไม่สำเร็จ', errorMessage(err), 'error')
  } finally {
    deletingAllVersions.value = false
  }
}

watch([selectedTherapist, effectiveDate], () => {
  if (!loading.value) applyTherapistSchedule()
})

onMounted(loadData)
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="font-mono text-xs font-semibold tracking-[0.08em] text-brand-600">
          schedule_versions
        </p>
        <h2 class="mt-1 text-2xl font-semibold tracking-tight text-ink-900">
          จัดการตารางเวลา
        </h2>
        <p class="mt-1.5 max-w-2xl text-sm leading-6 text-ink-500">
          คลิกช่องเพื่อสลับสถานะของแต่ละช่วงเวลา
          และกดไอคอนถังขยะเพื่อลบช่วงเวลาออกจากทุกวัน
        </p>
      </div>
      <button class="btn-secondary" :disabled="loading" @click="loadData">
        <i class="fa-solid fa-rotate-right" :class="{ 'fa-spin': loading }"></i>
        รีเฟรช
      </button>
    </div>

    <div v-if="loading" class="app-card">
      <LoadingSpinner message="กำลังโหลดตารางเวลา..." />
    </div>

    <div v-else-if="error" class="app-card p-6">
      <div class="flex flex-col items-center gap-4 py-8 text-center">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <i class="fa-solid fa-triangle-exclamation text-xl"></i>
        </div>
        <div>
          <h3 class="text-base font-semibold text-ink-900">โหลดข้อมูลไม่สำเร็จ</h3>
          <p class="mt-1 text-sm text-ink-500">{{ error }}</p>
        </div>
        <button class="btn-secondary" @click="loadData">
          <i class="fa-solid fa-rotate-right"></i>
          ลองอีกครั้ง
        </button>
      </div>
    </div>

    <template v-else>
      <section class="app-card">
        <div class="border-b border-brand-100 px-4 py-4 sm:px-5">
          <div class="grid gap-3 lg:grid-cols-[1.05fr_1.2fr_0.9fr_1fr]">
            <div>
              <label class="label" for="therapist-select">
                <i class="fa-solid fa-user-doctor mr-1.5 text-brand-600"></i>
                นักบำบัด
              </label>
              <select id="therapist-select" v-model="selectedTherapist" class="input">
                <option v-if="therapists.length === 0" value="">-- ไม่พบข้อมูลนักบำบัด --</option>
                <option v-for="name in therapists" :key="name" :value="name">
                  {{ name }}
                </option>
              </select>
            </div>

            <div>
              <label class="label" for="version-select">
                <i class="fa-solid fa-clock-rotate-left mr-1.5 text-brand-600"></i>
                เลือกเวอร์ชันเดิม
              </label>
              <select
                id="version-select"
                class="input"
                :value="selectedVersion?.effectiveFrom ?? ''"
                @change="onVersionSelect"
              >
                <option value="">— เลือกเวอร์ชันเดิม —</option>
                <option
                  v-for="version in therapistVersions"
                  :key="version.effectiveFrom"
                  :value="version.effectiveFrom"
                >
                  {{ version.optionLabel }} · {{ version.statusLabel }}
                </option>
              </select>
            </div>

            <div>
              <label class="label" for="effective-date">
                <i class="fa-solid fa-calendar-day mr-1.5 text-brand-600"></i>
                วันที่มีผล
              </label>
              <input
                id="effective-date"
                v-model="effectiveDate"
                type="date"
                :min="today"
                :max="maxEffectiveDate"
                class="input"
              />
            </div>

            <div>
              <label class="label" for="new-time-slot">
                <i class="fa-solid fa-plus mr-1.5 text-brand-600"></i>
                เพิ่มช่วงเวลา
              </label>
              <div class="flex gap-2">
                <input
                  id="new-time-slot"
                  v-model="newTimeSlot"
                  type="time"
                  step="60"
                  class="input"
                  @keyup.enter="addTimeSlot"
                />
                <button
                  type="button"
                  class="btn-secondary shrink-0"
                  :disabled="!newTimeSlot"
                  @click="addTimeSlot"
                >
                  <i class="fa-solid fa-plus"></i>
                </button>
              </div>
            </div>
          </div>

          <div class="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-cream-50 px-3 py-2.5 text-xs">
            <span
              class="badge"
              :class="selectedVersion ? selectedVersion.statusClasses : 'bg-emerald-50 text-emerald-700'"
            >
              <i :class="selectedVersion ? 'fa-solid fa-circle-info' : 'fa-solid fa-plus'"></i>
              {{ selectedVersion ? selectedVersion.statusLabel : 'เวอร์ชันใหม่' }}
            </span>
            <span class="text-ink-600">{{ selectedVersionRangeLabel }}</span>
            <span v-if="selectedVersion" class="text-ink-400">
              · {{ selectedVersion.timeCount }} ช่วงเวลา · {{ selectedVersion.dayCount }} วัน
            </span>

            <div class="ml-auto flex flex-wrap items-center gap-1">
              <button
                v-if="selectedVersion"
                type="button"
                class="btn-ghost btn-sm text-rose-600 hover:bg-rose-50"
                :disabled="deletingVersion === selectedVersion.effectiveFrom"
                @click="
                  handleDeleteVersion(
                    selectedVersion.effectiveFrom,
                    selectedVersion.fromLabel,
                    selectedVersion.toLabel,
                  )
                "
              >
                <i
                  v-if="deletingVersion === selectedVersion.effectiveFrom"
                  class="fa-solid fa-circle-notch fa-spin"
                ></i>
                <i v-else class="fa-solid fa-trash-can"></i>
                ลบเวอร์ชันนี้
              </button>
              <button
                v-if="therapistVersions.length > 0"
                type="button"
                class="btn-ghost btn-sm text-rose-600 hover:bg-rose-50"
                :disabled="deletingAllVersions"
                @click="handleDeleteAllVersions"
              >
                <i v-if="deletingAllVersions" class="fa-solid fa-circle-notch fa-spin"></i>
                <i v-else class="fa-solid fa-trash-can"></i>
                ลบทั้งหมด
              </button>
            </div>
          </div>

          <p class="mt-2 text-[11px] leading-5 text-ink-400">
            เลือกเวอร์ชันเดิมเพื่อแก้ไข หรือเปลี่ยนวันที่เพื่อสร้างเวอร์ชันใหม่ ·
            เวอร์ชันมีผลถึงวันก่อนหน้าเวอร์ชันถัดไป · วันใดไม่มีช่วงเวลาจะใช้เวอร์ชันก่อนหน้า
          </p>
        </div>

        <EmptyState
          v-if="therapists.length === 0"
          icon="fa-solid fa-users-slash"
          title="ไม่พบรายชื่อนักบำบัด"
          description="เพิ่มรายชื่อนักบำบัดได้จากเมนู therapists ก่อนเริ่มตั้งตารางเวลา"
        />

        <template v-else>
          <div class="flex flex-wrap items-center gap-4 px-4 py-3 text-xs text-ink-500 sm:px-5">
            <span class="inline-flex items-center gap-1.5 text-emerald-700">
              <span class="inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500 text-white">
                <i class="fa-solid fa-check"></i>
              </span>
              ลูกค้าเห็น / จองได้
            </span>
            <span class="inline-flex items-center gap-1.5 text-amber-700">
              <span class="inline-flex h-6 w-6 items-center justify-center rounded-md bg-amber-400 text-white">
                <i class="fa-solid fa-lock text-[10px]"></i>
              </span>
              ซ่อนจากลูกค้า
            </span>
            <span class="inline-flex items-center gap-1.5 text-ink-500">
              <span class="inline-flex h-6 w-6 items-center justify-center rounded-md border border-ink-200 bg-white text-ink-300">
                —
              </span>
              ปิดช่วงเวลานี้
            </span>
          </div>

          <div class="table-shell border-t border-brand-100">
            <table class="data-table min-w-[900px]">
              <thead>
                <tr>
                  <th class="w-[150px] text-center">เวลา</th>
                  <th
                    v-for="day in DAYS"
                    :key="day.value"
                    class="min-w-[100px] text-center"
                  >
                    <span class="block text-sm font-semibold normal-case tracking-normal text-ink-700">
                      {{ day.label }}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="time in allTimeSlots" :key="time">
                  <td class="whitespace-nowrap text-center text-sm font-semibold text-ink-800">
                    <div class="flex items-center justify-center gap-1.5">
                      <span>{{ time }} น.</span>
                      <button
                        type="button"
                        class="rounded-md p-1 text-ink-300 transition hover:bg-rose-50 hover:text-rose-600"
                        title="ลบช่วงเวลานี้จากทุกวัน"
                        :aria-label="`ลบช่วงเวลา ${time} น. ออกจากทุกวัน`"
                        @click="removeTimeSlot(time)"
                      >
                        <i class="fa-solid fa-trash-can text-[11px]"></i>
                      </button>
                    </div>
                  </td>
                  <td v-for="day in DAYS" :key="`${day.value}-${time}`" class="text-center">
                    <button
                      type="button"
                      class="inline-flex h-9 w-9 items-center justify-center rounded-lg border text-xs transition duration-150"
                      :class="
                        isSlotSelected(day.value, time)
                          ? slotVisibility(day.value, time) === 'public'
                            ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm'
                            : 'border-amber-400 bg-amber-400 text-white shadow-sm'
                          : 'border-ink-200 bg-white text-ink-300 hover:border-emerald-300 hover:text-emerald-600'
                      "
                      :aria-pressed="isSlotSelected(day.value, time)"
                      :aria-label="`${day.label} เวลา ${time} น. — ${
                        !isSlotSelected(day.value, time)
                          ? 'ปิด'
                          : slotVisibility(day.value, time) === 'public'
                            ? 'ลูกค้าเห็น'
                            : 'ซ่อนจากลูกค้า'
                      }`"
                      @click="toggleSlot(day.value, time)"
                    >
                      <template v-if="isSlotSelected(day.value, time)">
                        <i
                          :class="
                            slotVisibility(day.value, time) === 'public'
                              ? 'fa-solid fa-check'
                              : 'fa-solid fa-lock'
                          "
                        ></i>
                      </template>
                      <span v-else>—</span>
                    </button>
                  </td>
                </tr>

                <tr v-if="allTimeSlots.length === 0">
                  <td :colspan="DAYS.length + 1" class="py-10 text-center text-sm text-ink-500">
                    ยังไม่มีช่วงเวลาในระบบ กรุณาเพิ่มช่วงเวลาใหม่ด้านบน
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            class="flex flex-wrap items-center justify-between gap-3 border-t border-brand-100 px-4 py-4 sm:px-5"
          >
            <div>
              <p class="text-sm text-ink-500">
                <i class="fa-solid fa-clock mr-1.5 text-brand-600"></i>
                {{ selectedTherapist || 'นักบำบัด' }} มี
                <strong class="text-ink-800">{{ totalSelectedSlots }}</strong>
                ช่วงเวลาต่อสัปดาห์
              </p>
              <p class="mt-0.5 text-xs text-ink-500">
                {{ selectedVersionRangeLabel }}
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <button
                type="button"
                class="btn-primary"
                :disabled="savingSchedule"
                @click="handleSaveSchedule"
              >
                <i v-if="savingSchedule" class="fa-solid fa-circle-notch fa-spin"></i>
                <i v-else class="fa-solid fa-floppy-disk"></i>
                {{ savingSchedule ? 'กำลังบันทึก...' : 'บันทึกเวอร์ชันตารางเวลา' }}
              </button>
            </div>
          </div>
        </template>
      </section>
    </template>
  </div>
</template>
