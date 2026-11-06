<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="font-mono text-xs font-semibold tracking-[0.08em] text-brand-600">holidays</p>
        <h2 class="mt-1 text-2xl font-semibold tracking-tight text-ink-900">จัดการวันหยุด</h2>
        <p class="mt-1.5 max-w-2xl text-sm leading-6 text-ink-500">
          เพิ่ม แก้ไข และลบวันหยุดของโรงพยาบาล
          ข้อมูลนี้ถูกใช้ร่วมกับระบบจองคิวและตารางปฏิบัติงาน
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          class="btn-secondary"
          :disabled="isCopying"
          :title="`คัดลอกวันหยุดจากปี พ.ศ. ${copySourceYear + 543} ไปยังปี พ.ศ. ${copyTargetYear + 543}`"
          @click="handleCopyToNextYear"
        >
          <i v-if="isCopying" class="fa-solid fa-circle-notch fa-spin"></i>
          <i v-else class="fa-solid fa-copy"></i>
          {{ isCopying ? 'กำลังคัดลอก...' : 'คัดลอกไปปีถัดไป' }}
        </button>
        <button class="btn-primary" @click="openCreate">
          <i class="fa-solid fa-calendar-plus"></i>
          เพิ่มวันหยุด
        </button>
      </div>
    </div>

    <section class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div class="app-card flex items-center gap-4 px-4 py-3.5">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
          <i class="fa-solid fa-calendar-days"></i>
        </div>
        <div>
          <p class="text-xs text-ink-500">วันหยุดทั้งหมด</p>
          <p class="text-xl font-semibold text-ink-900">{{ formatNumber(holidays.length) }}</p>
        </div>
      </div>
      <div class="app-card flex items-center gap-4 px-4 py-3.5">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <i class="fa-solid fa-calendar-check"></i>
        </div>
        <div>
          <p class="text-xs text-ink-500">วันหยุดปี {{ currentYear + 543 }}</p>
          <p class="text-xl font-semibold text-ink-900">{{ formatNumber(thisYearCount) }}</p>
        </div>
      </div>
      <div class="app-card flex items-center gap-4 px-4 py-3.5">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <i class="fa-solid fa-clock"></i>
        </div>
        <div>
          <p class="text-xs text-ink-500">กำลังจะมาถึง</p>
          <p class="text-xl font-semibold text-ink-900">{{ formatNumber(upcomingCount) }}</p>
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
            placeholder="ค้นหารายละเอียดหรือวันที่..."
            class="input pl-10"
            aria-label="ค้นหาวันหยุด"
          />
        </div>

        <select v-model="yearFilter" class="input w-auto min-w-[170px]" aria-label="กรองตามปี">
          <option value="ALL">ทุกปี</option>
          <option v-for="year in years" :key="year" :value="String(year)">
            ปี {{ year + 543 }} ({{ year }})
          </option>
        </select>

        <span class="ml-auto text-xs text-ink-500">
          แสดง {{ formatNumber(filteredHolidays.length) }} / {{ formatNumber(holidays.length) }} รายการ
        </span>
      </div>

      <div v-if="loading" class="app-card border-0 shadow-none">
        <LoadingSpinner message="กำลังโหลดวันหยุด..." />
      </div>

      <div v-else-if="error" class="flex flex-col items-center gap-4 px-5 py-12 text-center">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <i class="fa-solid fa-triangle-exclamation text-xl"></i>
        </div>
        <div>
          <h3 class="text-base font-semibold text-ink-900">โหลดข้อมูลไม่สำเร็จ</h3>
          <p class="mt-1 text-sm text-ink-500">{{ error }}</p>
        </div>
        <button class="btn-secondary" @click="loadHolidays">
          <i class="fa-solid fa-rotate-right"></i>
          ลองอีกครั้ง
        </button>
      </div>

      <EmptyState
        v-else-if="filteredHolidays.length === 0"
        icon="fa-solid fa-calendar-xmark"
        title="ไม่พบวันหยุด"
        :description="
          holidays.length === 0
            ? 'ยังไม่มีวันหยุดในระบบ เริ่มต้นด้วยการเพิ่มวันหยุดรายการแรก'
            : 'ลองเปลี่ยนปีหรือคำค้นหา'
        "
      >
        <template #action>
          <button v-if="holidays.length === 0" class="btn-primary" @click="openCreate">
            <i class="fa-solid fa-calendar-plus"></i>
            เพิ่มวันหยุด
          </button>
          <button v-else class="btn-secondary" @click="clearFilters">
            <i class="fa-solid fa-filter-circle-xmark"></i>
            ล้างตัวกรอง
          </button>
        </template>
      </EmptyState>

      <div v-else class="table-shell">
        <table class="data-table min-w-[820px]">
          <thead>
            <tr>
              <th>วันที่</th>
              <th>วัน</th>
              <th>รายละเอียด</th>
              <th>สถานะ</th>
              <th>สร้างเมื่อ</th>
              <th class="text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="holiday in filteredHolidays" :key="holiday.holiday_date">
              <td class="whitespace-nowrap">
                <div class="flex items-center gap-3">
                  <div class="flex h-11 w-11 flex-col items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                    <span class="text-sm font-semibold leading-none">{{ dayOfMonth(holiday.holiday_date) }}</span>
                    <span class="text-[10px] leading-none">{{ monthShort(holiday.holiday_date) }}</span>
                  </div>
                  <div>
                    <p class="font-medium text-ink-900">{{ formatThaiDate(holiday.holiday_date) }}</p>
                    <p class="text-xs text-ink-500">{{ holiday.holiday_date }}</p>
                  </div>
                </div>
              </td>
              <td class="whitespace-nowrap text-sm text-ink-600">
                {{ getDayName(holiday.holiday_date) }}
              </td>
              <td>
                <span class="text-sm text-ink-700">{{ holiday.description || 'วันหยุด' }}</span>
              </td>
              <td>
                <span class="badge" :class="holidayStatus(holiday.holiday_date).classes">
                  <i :class="holidayStatus(holiday.holiday_date).icon"></i>
                  {{ holidayStatus(holiday.holiday_date).label }}
                </span>
              </td>
              <td class="whitespace-nowrap text-xs text-ink-500">
                {{ formatDateTime(holiday.created_at) }}
              </td>
              <td>
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    class="btn-ghost btn-sm"
                    title="แก้ไขวันหยุด"
                    aria-label="แก้ไขวันหยุด"
                    @click="openEdit(holiday)"
                  >
                    <i class="fa-solid fa-pen-to-square"></i>
                  </button>
                  <button
                    type="button"
                    class="btn-ghost btn-sm text-ink-400 hover:text-rose-600"
                    title="ลบวันหยุด"
                    aria-label="ลบวันหยุด"
                    @click="handleDelete(holiday)"
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

    <HolidayFormModal
      :open="modalOpen"
      :holiday="editingHoliday"
      @close="modalOpen = false"
      @saved="handleSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Swal from 'sweetalert2'
import { copyHolidaysToYear, deleteHoliday, listHolidays } from '@/services/holidays'
import type { Holiday } from '@/types'
import {
  formatDateTime,
  formatNumber,
  formatThaiDate,
  getDayName,
  getYear,
  isUpcoming,
  todayISO,
} from '@/utils/format'
import { escapeHtml } from '@/utils/html'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import EmptyState from '@/components/EmptyState.vue'
import HolidayFormModal from '@/components/HolidayFormModal.vue'

const route = useRoute()
const router = useRouter()

const holidays = ref<Holiday[]>([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const currentYear = new Date().getFullYear()
const yearFilter = ref(String(currentYear))
const modalOpen = ref(false)
const editingHoliday = ref<Holiday | null>(null)
const isCopying = ref(false)

const copySourceYear = computed(() =>
  yearFilter.value === 'ALL' ? currentYear : Number(yearFilter.value),
)
const copyTargetYear = computed(() => copySourceYear.value + 1)

const years = computed(() => {
  const values = new Set<number>([currentYear - 1, currentYear, currentYear + 1])
  holidays.value.forEach((holiday) => values.add(getYear(holiday.holiday_date)))
  return Array.from(values).sort((a, b) => b - a)
})

const thisYearCount = computed(
  () => holidays.value.filter((holiday) => getYear(holiday.holiday_date) === currentYear).length,
)

const upcomingCount = computed(
  () => holidays.value.filter((holiday) => isUpcoming(holiday.holiday_date)).length,
)

const filteredHolidays = computed(() => {
  const query = search.value.trim().toLowerCase()

  return holidays.value
    .filter((holiday) => {
      const matchesYear =
        yearFilter.value === 'ALL' || getYear(holiday.holiday_date) === Number(yearFilter.value)
      const matchesSearch =
        !query ||
        holiday.holiday_date.includes(query) ||
        (holiday.description ?? '').toLowerCase().includes(query)
      return matchesYear && matchesSearch
    })
    .sort((a, b) => a.holiday_date.localeCompare(b.holiday_date))
})

function dayOfMonth(dateString: string): string {
  return dateString.slice(8, 10)
}

function monthShort(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00`)
  return date.toLocaleDateString('th-TH', { month: 'short' })
}

function holidayStatus(dateString: string): {
  label: string
  classes: string
  icon: string
} {
  const today = todayISO()
  if (dateString === today) {
    return {
      label: 'วันนี้',
      classes: 'bg-amber-50 text-amber-700',
      icon: 'fa-solid fa-star',
    }
  }
  if (dateString > today) {
    return {
      label: 'กำลังจะมาถึง',
      classes: 'bg-emerald-50 text-emerald-700',
      icon: 'fa-solid fa-clock',
    }
  }
  return {
    label: 'ผ่านแล้ว',
    classes: 'bg-ink-100 text-ink-500',
    icon: 'fa-solid fa-check',
  }
}

async function loadHolidays() {
  if (holidays.value.length === 0) loading.value = true
  error.value = ''
  try {
    holidays.value = await listHolidays()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่คาดคิด'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingHoliday.value = null
  modalOpen.value = true
}

function openEdit(holiday: Holiday) {
  editingHoliday.value = holiday
  modalOpen.value = true
}

async function handleCopyToNextYear() {
  const sourceYear = copySourceYear.value
  const targetYear = copyTargetYear.value
  const sourceCount = holidays.value.filter(
    (holiday) => getYear(holiday.holiday_date) === sourceYear,
  ).length

  if (sourceCount === 0) {
    await Swal.fire(
      'ไม่พบวันหยุด',
      `ปี พ.ศ. ${sourceYear + 543} ยังไม่มีวันหยุดให้คัดลอก`,
      'warning',
    )
    return
  }

  const confirm = await Swal.fire({
    icon: 'question',
    title: 'คัดลอกวันหยุดไปปีถัดไป?',
    html: `คัดลอกวันหยุดจากปี <strong>พ.ศ. ${sourceYear + 543}</strong> ไปยังปี <strong>พ.ศ. ${targetYear + 543}</strong><br>พบวันหยุด ${sourceCount} รายการ<br><span style="font-size:0.9em;color:#64748b">รายการที่มีอยู่แล้วจะถูกอัปเดตด้วยรายละเอียดจากปีต้นทาง และสามารถแก้ไขภายหลังได้</span>`,
    showCancelButton: true,
    confirmButtonText: 'คัดลอกวันหยุด',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#c2410c',
    cancelButtonColor: '#64748b',
    reverseButtons: true,
  })

  if (!confirm.isConfirmed) return

  isCopying.value = true
  try {
    const copyResult = await copyHolidaysToYear(sourceYear, targetYear)
    const details = [
      `คัดลอกใหม่ ${copyResult.copied} รายการ`,
      copyResult.updated
        ? `อัปเดตทับ ${copyResult.updated} รายการที่มีอยู่แล้ว`
        : '',
      copyResult.skippedInvalid
        ? `ข้าม ${copyResult.skippedInvalid} รายการที่ไม่สามารถเลื่อนปีได้`
        : '',
    ]
      .filter(Boolean)
      .join('<br>')

    await Swal.fire({
      icon: copyResult.copied > 0 ? 'success' : 'info',
      title: copyResult.copied > 0 ? 'คัดลอกวันหยุดแล้ว' : 'ไม่มีรายการใหม่',
      html: details || 'ไม่พบวันหยุดที่ต้องคัดลอก',
      confirmButtonColor: '#c2410c',
    })

    yearFilter.value = String(targetYear)
    await loadHolidays()
  } catch (err) {
    await Swal.fire(
      'คัดลอกวันหยุดไม่สำเร็จ',
      err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
      'error',
    )
  } finally {
    isCopying.value = false
  }
}

function clearFilters() {
  search.value = ''
  yearFilter.value = 'ALL'
}

async function handleSaved(holidayDate: string) {
  search.value = ''
  yearFilter.value = String(getYear(holidayDate))
  await loadHolidays()
}

async function handleDelete(holiday: Holiday) {
  const result = await Swal.fire({
    icon: 'warning',
    title: 'ลบวันหยุด?',
    html: `ต้องการลบ <strong>${escapeHtml(formatThaiDate(holiday.holiday_date))}</strong><br />“${escapeHtml(holiday.description || 'วันหยุด')}” หรือไม่`,
    showCancelButton: true,
    confirmButtonText: 'ลบวันหยุด',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#be123c',
    cancelButtonColor: '#64748b',
    reverseButtons: true,
  })

  if (!result.isConfirmed) return

  try {
    await deleteHoliday(holiday.holiday_date)
    holidays.value = holidays.value.filter((item) => item.holiday_date !== holiday.holiday_date)

    if (
      yearFilter.value !== 'ALL' &&
      !holidays.value.some(
        (item) => getYear(item.holiday_date) === Number(yearFilter.value),
      )
    ) {
      yearFilter.value = 'ALL'
    }

    await Swal.fire({
      icon: 'success',
      title: 'ลบวันหยุดสำเร็จ',
      timer: 1400,
      showConfirmButton: false,
    })
  } catch (err) {
    await Swal.fire(
      'ลบไม่สำเร็จ',
      err instanceof Error ? err.message : 'เกิดข้อผิดพลาด',
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
  await loadHolidays()

  if (route.query.new === '1') {
    openCreate()
    await router.replace({ query: {} })
  }
})
</script>
