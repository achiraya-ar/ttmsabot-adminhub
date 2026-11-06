<template>
  <div class="space-y-6">
    <section class="flex flex-wrap items-start justify-between gap-4 px-1">
      <div>
        <p class="font-mono text-xs font-semibold tracking-[0.08em] text-brand-600">
          dashboard
        </p>
        <h1 class="mt-1 text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
          ศูนย์ควบคุมข้อมูล
          <span class="text-brand-600">กลุ่มงานแพทย์แผนไทยฯ</span>
        </h1>
        <p class="mt-1.5 max-w-2xl text-sm leading-6 text-ink-500">
          ภาพรวมตารางข้อมูล สิทธิ์การเข้าถึง และกิจกรรมล่าสุดของ TTM-AdminHub
        </p>
      </div>

    </section>

    <div v-if="loading" class="app-card">
      <LoadingSpinner message="กำลังโหลดภาพรวมระบบ..." />
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
      <section class="grid gap-6 xl:grid-cols-3">
        <div class="app-card xl:col-span-2">
          <div class="flex flex-wrap items-end justify-between gap-3 border-b border-brand-100 px-5 py-4 sm:px-6">
            <div>
              <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-brand-700/70">
                database tables
              </p>
              <h2 class="mt-1 text-lg font-semibold tracking-tight text-ink-900">
                ตารางในระบบ
              </h2>
              <p class="mt-0.5 text-sm text-ink-500">
                คลิกที่ตารางเพื่อเปิดหน้าจัดการ
              </p>
            </div>
            <span class="badge bg-brand-50 text-brand-700">
              {{ tableCards.length }} ตาราง
            </span>
          </div>

          <div class="divide-y divide-brand-50">
            <RouterLink
              v-for="item in tableCards"
              :key="item.table"
              :to="{ name: item.name }"
              class="group flex items-center gap-4 px-5 py-4 transition hover:bg-brand-50/50 sm:px-6"
            >
              <span
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg"
                :class="item.iconClasses"
              >
                <i :class="item.icon"></i>
              </span>
              <div class="min-w-0 flex-1">
                <p class="font-mono text-sm font-semibold text-ink-900">
                  {{ item.table }}
                </p>
                <p class="mt-0.5 text-xs text-ink-500">{{ item.label }}</p>
              </div>
              <div class="hidden text-right sm:block">
                <p class="text-xl font-semibold text-ink-900">{{ item.count }}</p>
                <p class="text-[10px] text-ink-400">{{ item.countLabel }}</p>
              </div>
              <i class="fa-solid fa-arrow-right text-xs text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600"></i>
            </RouterLink>
          </div>
        </div>

        <div class="app-card">
          <div class="border-b border-brand-100 px-5 py-4">
            <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-brand-700/70">
              profiles / access
            </p>
            <h2 class="mt-1 text-lg font-semibold tracking-tight text-ink-900">
              สิทธิ์การเข้าถึง
            </h2>
            <p class="mt-0.5 text-sm text-ink-500">
              ผู้ใช้ทั้งหมด {{ profiles.length }} คน
            </p>
          </div>

          <div class="space-y-4 px-5 py-5">
            <div v-for="item in accessOverview" :key="item.key">
              <div class="mb-1.5 flex items-center justify-between gap-2 text-xs">
                <span class="font-medium text-ink-700">{{ item.label }}</span>
                <span class="text-ink-500">
                  <strong class="text-ink-800">{{ item.count }}</strong>
                  / {{ profiles.length }}
                </span>
              </div>
              <div class="h-1.5 overflow-hidden rounded-full bg-ink-100">
                <div
                  class="h-full rounded-full bg-brand-600 transition-all duration-500"
                  :style="{ width: `${item.percent}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="grid gap-6 xl:grid-cols-3">
        <div class="app-card">
          <div class="flex items-center justify-between gap-3 border-b border-brand-100 px-5 py-4">
            <div>
              <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-brand-700/70">
                holidays
              </p>
              <h2 class="mt-1 text-lg font-semibold tracking-tight text-ink-900">
                วันหยุดถัดไป
              </h2>
            </div>
            <RouterLink
              :to="{ name: 'holidays' }"
              class="btn-ghost rounded-lg p-2"
              aria-label="ดูวันหยุดทั้งหมด"
            >
              <i class="fa-solid fa-arrow-right"></i>
            </RouterLink>
          </div>

          <div v-if="upcomingHolidays.length === 0" class="px-5 py-10 text-center text-sm text-ink-500">
            <i class="fa-regular fa-calendar mb-2 block text-2xl text-ink-300"></i>
            ยังไม่มีวันหยุดที่กำลังจะมาถึง
          </div>

          <ul v-else class="divide-y divide-brand-50">
            <li v-for="holiday in upcomingHolidays" :key="holiday.holiday_date" class="flex gap-3 px-5 py-3.5">
              <div class="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <span class="text-sm font-semibold leading-none">{{ dayOfMonth(holiday.holiday_date) }}</span>
                <span class="text-[10px] leading-none">{{ monthShort(holiday.holiday_date) }}</span>
              </div>
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-ink-800">{{ holiday.description || 'วันหยุด' }}</p>
                <p class="mt-0.5 text-xs text-ink-500">
                  {{ getDayName(holiday.holiday_date) }} · {{ formatThaiDateShort(holiday.holiday_date) }}
                </p>
              </div>
            </li>
          </ul>
        </div>

        <div class="app-card xl:col-span-2">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-brand-100 px-5 py-4 sm:px-6">
            <div>
              <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-brand-700/70">
                profiles / recent
              </p>
              <h2 class="mt-1 text-lg font-semibold tracking-tight text-ink-900">
                ผู้ใช้ล่าสุด
              </h2>
            </div>
            <RouterLink :to="{ name: 'profiles' }" class="btn-secondary btn-sm">
              ดูทั้งหมด
              <i class="fa-solid fa-arrow-right text-[10px]"></i>
            </RouterLink>
          </div>

          <div v-if="recentProfiles.length === 0" class="px-5 py-10 text-center text-sm text-ink-500">
            ยังไม่มีผู้ใช้ในระบบ
          </div>

          <div v-else class="table-shell">
            <table class="data-table min-w-[620px]">
              <thead>
                <tr>
                  <th>ผู้ใช้</th>
                  <th>บทบาท</th>
                  <th>สิทธิ์</th>
                  <th>อัปเดตล่าสุด</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="profile in recentProfiles" :key="profile.id">
                  <td>
                    <div class="flex items-center gap-3">
                      <div class="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                        {{ profileInitials(profile.full_name) }}
                      </div>
                      <div class="min-w-0">
                        <p class="truncate font-medium text-ink-900">{{ profile.full_name }}</p>
                        <p class="truncate text-xs text-ink-500">@{{ profile.username }}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="badge bg-ink-100 text-ink-600">{{ profile.role || '-' }}</span>
                  </td>
                  <td>
                    <PermissionBadges :profile="profile" />
                  </td>
                  <td class="whitespace-nowrap text-xs text-ink-500">
                    {{ formatDateTime(profile.updated_at) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { listProfiles } from '@/services/profiles'
import { listHolidays } from '@/services/holidays'
import { listTherapists } from '@/services/therapists'
import { listScheduleVersions } from '@/services/schedules'
import PermissionBadges from '@/components/PermissionBadges.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import type { AdminProfile, Holiday, ScheduleVersionRow, Therapist } from '@/types'
import {
  formatDateTime,
  formatThaiDateShort,
  getDayName,
  isUpcoming,
} from '@/utils/format'

const profiles = ref<AdminProfile[]>([])
const holidays = ref<Holiday[]>([])
const therapists = ref<Therapist[]>([])
const scheduleVersions = ref<ScheduleVersionRow[]>([])
const loading = ref(true)
const error = ref('')

const upcomingHolidays = computed(() =>
  holidays.value
    .filter((holiday) => isUpcoming(holiday.holiday_date))
    .sort((a, b) => a.holiday_date.localeCompare(b.holiday_date))
    .slice(0, 5),
)

const recentProfiles = computed(() =>
  [...profiles.value]
    .sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))
    .slice(0, 5),
)

const scheduleVersionDates = computed(
  () => new Set(scheduleVersions.value.map((row) => row.effective_from)).size,
)

const tableCards = computed(() => [
  {
    name: 'profiles',
    table: 'profiles',
    label: 'บัญชีผู้ใช้และสิทธิ์',
    count: profiles.value.length,
    countLabel: 'บัญชี',
    icon: 'fa-solid fa-users-gear',
    iconClasses: 'bg-brand-50 text-brand-700',
  },
  {
    name: 'therapists',
    table: 'therapists',
    label: 'รายชื่อนักบำบัด',
    count: therapists.value.length,
    countLabel: 'คน',
    icon: 'fa-solid fa-user-doctor',
    iconClasses: 'bg-amber-50 text-amber-700',
  },
  {
    name: 'schedule_versions',
    table: 'schedule_versions',
    label: 'เวอร์ชันเวลาและ visibility',
    count: scheduleVersionDates.value,
    countLabel: 'ช่วงวันที่',
    icon: 'fa-solid fa-calendar-week',
    iconClasses: 'bg-emerald-50 text-emerald-700',
  },
  {
    name: 'holidays',
    table: 'holidays',
    label: 'วันหยุดของโรงพยาบาล',
    count: holidays.value.length,
    countLabel: 'วัน',
    icon: 'fa-solid fa-calendar-days',
    iconClasses: 'bg-rose-50 text-rose-700',
  },
])

const accessOverview = computed(() => {
  const total = profiles.value.length || 1
  const rows = [
    {
      key: 'personal',
      label: 'ตารางงานส่วนตัว',
      count: profiles.value.filter((profile) => profile.can_access_personalworkschedule).length,
    },
    {
      key: 'workschedule',
      label: 'ตารางปฏิบัติงาน',
      count: profiles.value.filter((profile) => profile.can_access_workschedule).length,
    },
    {
      key: 'booking',
      label: 'จัดการการจอง',
      count: profiles.value.filter((profile) => profile.can_access_bookingportalmanager).length,
    },
    {
      key: 'paypercase',
      label: 'PayPerCase',
      count: profiles.value.filter((profile) => profile.can_access_paypercase).length,
    },
    {
      key: 'adminhub',
      label: 'TTM-AdminHub',
      count: profiles.value.filter((profile) => profile.can_access_adminhub).length,
    },
  ]

  return rows.map((row) => ({
    ...row,
    percent: Math.round((row.count / total) * 100),
  }))
})

function dayOfMonth(dateString: string): string {
  return dateString.slice(8, 10)
}

function monthShort(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00`)
  return date.toLocaleDateString('th-TH', { month: 'short' })
}

function profileInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
}

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const [profileRows, holidayRows, therapistRows, versionRows] = await Promise.all([
      listProfiles(),
      listHolidays(),
      listTherapists(),
      listScheduleVersions(),
    ])
    profiles.value = profileRows
    holidays.value = holidayRows
    therapists.value = therapistRows
    scheduleVersions.value = versionRows
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่คาดคิด'
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>
