<template>
  <div class="flex flex-wrap gap-1.5">
    <span
      v-for="permission in activePermissions"
      :key="permission.key"
      class="badge"
      :class="permission.classes"
    >
      <i :class="permission.icon"></i>
      {{ permission.label }}
    </span>
    <span v-if="activePermissions.length === 0" class="badge bg-ink-100 text-ink-500">
      <i class="fa-solid fa-ban"></i>
      ไม่มีสิทธิ์
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AdminProfile } from '@/types'

const props = defineProps<{
  profile: AdminProfile
}>()

const allPermissions = [
  {
    key: 'can_access_personalworkschedule' as const,
    label: 'ตารางส่วนตัว',
    icon: 'fa-solid fa-user-clock',
    classes: 'bg-yellow-50 text-yellow-700',
  },
  {
    key: 'can_access_workschedule' as const,
    label: 'ตารางงาน',
    icon: 'fa-solid fa-calendar-days',
    classes: 'bg-brand-50 text-brand-700',
  },
  {
    key: 'can_access_bookingportalmanager' as const,
    label: 'จัดการจอง',
    icon: 'fa-solid fa-calendar-check',
    classes: 'bg-emerald-50 text-emerald-700',
  },
  {
    key: 'can_access_paypercase' as const,
    label: 'PayPerCase',
    icon: 'fa-solid fa-coins',
    classes: 'bg-amber-50 text-amber-700',
  },
  {
    key: 'can_access_adminhub' as const,
    label: 'TTM-AdminHub',
    icon: 'fa-solid fa-shield-halved',
    classes: 'bg-rose-50 text-rose-700',
  },
]

const activePermissions = computed(() =>
  allPermissions.filter((permission) => props.profile[permission.key]),
)
</script>
