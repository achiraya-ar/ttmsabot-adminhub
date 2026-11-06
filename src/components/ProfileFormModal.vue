<template>
  <BaseModal
    :open="open"
    :title="isEditing ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'"
    :subtitle="
      isEditing
        ? 'แก้ไขข้อมูลโปรไฟล์ บทบาท และสิทธิ์การเข้าถึงระบบ'
        : 'สร้างบัญชี Supabase Auth และโปรไฟล์ผู้ใช้ใหม่'
    "
    max-width="max-w-3xl"
    @close="handleClose"
  >
    <form id="profile-form" class="space-y-6" @submit.prevent="handleSubmit">
      <section>
        <div class="mb-4 flex items-center gap-2">
          <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-xs text-brand-700">
            <i class="fa-regular fa-id-card"></i>
          </span>
          <h3 class="text-sm font-semibold text-ink-900">ข้อมูลผู้ใช้</h3>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label for="profile-username" class="label">ชื่อผู้ใช้ <span class="text-rose-500">*</span></label>
            <input
              id="profile-username"
              v-model="form.username"
              type="text"
              required
              autocomplete="off"
              autocapitalize="none"
              placeholder="เช่น somchai"
              class="input"
              :disabled="submitting"
            />
          </div>

          <div>
            <label for="profile-fullname" class="label">ชื่อ-นามสกุล <span class="text-rose-500">*</span></label>
            <input
              id="profile-fullname"
              v-model="form.full_name"
              type="text"
              required
              autocomplete="off"
              placeholder="เช่น สมชาย ใจดี"
              class="input"
              :disabled="submitting"
            />
            <p class="field-hint">ใช้เป็นชื่อที่แสดงในระบบ และใช้จับคู่กับชื่อนักหัตถการ</p>
          </div>

          <div>
            <label for="profile-email" class="label">อีเมล <span class="text-rose-500">*</span></label>
            <input
              id="profile-email"
              v-model="form.email"
              type="email"
              required
              autocomplete="off"
              placeholder="name@hospital.go.th"
              class="input"
              :disabled="submitting"
            />
            <p class="field-hint">
              ใช้สำหรับ Supabase Auth
              <template v-if="isEditing"> · การเปลี่ยนอีเมลจะเปลี่ยนทั้ง Auth และ profiles</template>
            </p>
          </div>

          <div>
            <label for="profile-role" class="label">บทบาท <span class="text-rose-500">*</span></label>
            <input
              id="profile-role"
              v-model="form.role"
              type="text"
              required
              list="role-suggestions"
              placeholder="เช่น Therapist, Manager, Staff"
              class="input"
              :disabled="submitting"
            />
            <datalist id="role-suggestions">
              <option v-for="role in roleSuggestions" :key="role" :value="role"></option>
            </datalist>
            <p class="field-hint">บทบาทใน personalworkschedule ใช้แยกเมนูผู้จัดการและนักหัตถการ</p>
          </div>
        </div>
      </section>

      <section class="border-t border-ink-200 pt-6">
        <div class="mb-4 flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-xs text-amber-700">
              <i class="fa-solid fa-key"></i>
            </span>
            <h3 class="text-sm font-semibold text-ink-900">
              {{ isEditing ? 'เปลี่ยนรหัสผ่าน (ไม่บังคับ)' : 'รหัสผ่าน' }}
            </h3>
          </div>
          <span v-if="isEditing" class="text-xs text-ink-500">เว้นว่างไว้หากไม่ต้องการเปลี่ยน</span>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label for="profile-password" class="label">
              {{ isEditing ? 'รหัสผ่านใหม่' : 'รหัสผ่าน' }}
              <span v-if="!isEditing" class="text-rose-500">*</span>
            </label>
            <input
              id="profile-password"
              v-model="form.password"
              type="password"
              :required="!isEditing"
              autocomplete="new-password"
              placeholder="อย่างน้อย 6 ตัวอักษร"
              class="input"
              :disabled="submitting"
            />
          </div>
          <div>
            <label for="profile-confirm-password" class="label">ยืนยันรหัสผ่าน</label>
            <input
              id="profile-confirm-password"
              v-model="form.confirmPassword"
              type="password"
              :required="!isEditing"
              autocomplete="new-password"
              placeholder="กรอกรหัสผ่านอีกครั้ง"
              class="input"
              :disabled="submitting"
            />
          </div>
        </div>
      </section>

      <section class="border-t border-ink-200 pt-6">
        <div class="mb-4 flex items-center gap-2">
          <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-xs text-emerald-700">
            <i class="fa-solid fa-shield-halved"></i>
          </span>
          <div>
            <h3 class="text-sm font-semibold text-ink-900">สิทธิ์การเข้าถึงระบบ</h3>
            <p class="text-xs text-ink-500">เลือกแอปที่ผู้ใช้คนนี้สามารถเข้าใช้งานได้</p>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label
            v-for="permission in permissionOptions"
            :key="permission.key"
            class="flex cursor-pointer items-start gap-3 rounded-xl border border-ink-200 bg-white p-3.5 transition hover:border-brand-200 hover:bg-brand-50/30"
            :class="{ 'opacity-60': permission.key === 'can_access_adminhub' && isSelf }"
          >
            <input
              v-model="form[permission.key]"
              type="checkbox"
              class="mt-1 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-200"
              :disabled="submitting || (permission.key === 'can_access_adminhub' && isSelf)"
            />
            <span class="min-w-0">
              <span class="flex items-center gap-2 text-sm font-medium text-ink-800">
                <i :class="[permission.icon, permission.iconClasses]"></i>
                {{ permission.label }}
              </span>
              <span class="mt-1 block text-xs leading-5 text-ink-500">
                {{ permission.description }}
              </span>
              <span
                v-if="permission.key === 'can_access_adminhub' && isSelf"
                class="mt-1 block text-[11px] font-medium text-amber-600"
              >
                ไม่สามารถเพิกถอนสิทธิ์ผู้ดูแลของตัวเองได้
              </span>
            </span>
          </label>
        </div>
      </section>

      <div
        v-if="submitError"
        class="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm leading-6 text-rose-700"
        role="alert"
      >
        <i class="fa-solid fa-circle-exclamation mt-0.5"></i>
        <span>{{ submitError }}</span>
      </div>

      <div
        class="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-800"
      >
        <i class="fa-solid fa-circle-info mt-0.5"></i>
        <span>
          การบันทึกข้อมูลผู้ใช้ทุกครั้งต้องมี Edge Function
          <code class="rounded bg-amber-100 px-1 py-0.5 font-mono text-[11px]">admin-users</code>
          ซึ่ง deploy ไว้ใน Supabase แล้ว (ดูขั้นตอนใน README)
        </span>
      </div>
    </form>

    <template #footer>
      <button type="button" class="btn-secondary" :disabled="submitting" @click="handleClose">
        ยกเลิก
      </button>
      <button type="submit" form="profile-form" class="btn-primary" :disabled="submitting">
        <i v-if="submitting" class="fa-solid fa-circle-notch fa-spin"></i>
        <i v-else class="fa-solid fa-floppy-disk"></i>
        {{ submitting ? 'กำลังบันทึก...' : isEditing ? 'บันทึกการแก้ไข' : 'สร้างผู้ใช้' }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import Swal from 'sweetalert2'
import BaseModal from '@/components/BaseModal.vue'
import {
  createAdminUser,
  updateAdminUser,
} from '@/services/profiles'
import type { AdminProfile } from '@/types'

interface ProfileFormState {
  username: string
  full_name: string
  email: string
  role: string
  password: string
  confirmPassword: string
  can_access_personalworkschedule: boolean
  can_access_workschedule: boolean
  can_access_bookingportalmanager: boolean
  can_access_paypercase: boolean
  can_access_adminhub: boolean
}

const props = defineProps<{
  open: boolean
  profile: AdminProfile | null
  roles: string[]
  currentUserId: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved', id?: string): void
}>()

const submitting = ref(false)
const submitError = ref('')

const form = reactive<ProfileFormState>({
  username: '',
  full_name: '',
  email: '',
  role: '',
  password: '',
  confirmPassword: '',
  can_access_personalworkschedule: false,
  can_access_workschedule: false,
  can_access_bookingportalmanager: false,
  can_access_paypercase: false,
  can_access_adminhub: false,
})

const isEditing = computed(() => !!props.profile)
const isSelf = computed(() => props.profile?.id === props.currentUserId)

const roleSuggestions = computed(() =>
  Array.from(new Set([...props.roles, 'Manager', 'Therapist', 'Staff'])).filter(Boolean),
)

const permissionOptions = [
  {
    key: 'can_access_personalworkschedule' as const,
    label: 'ตารางงานส่วนตัว',
    description: 'เข้า ttmsabot-personalworkschedule เพื่อดูตารางและค่าตอบแทนของตัวเอง',
    icon: 'fa-solid fa-user-clock',
    iconClasses: 'text-yellow-600',
  },
  {
    key: 'can_access_workschedule' as const,
    label: 'ตารางปฏิบัติงาน',
    description: 'เข้า ttmsabot-workschedule เพื่อดูตารางนัดหมายรวมของทั้งกลุ่มงาน',
    icon: 'fa-solid fa-calendar-days',
    iconClasses: 'text-brand-600',
  },
  {
    key: 'can_access_bookingportalmanager' as const,
    label: 'จัดการการจอง',
    description: 'เข้า ttmsabot-bookingportalmanager เพื่อจองคิว ยกเลิก และจัดการผู้ป่วย',
    icon: 'fa-solid fa-calendar-check',
    iconClasses: 'text-emerald-600',
  },
  {
    key: 'can_access_paypercase' as const,
    label: 'ค่าตอบแทน (PayPerCase)',
    description: 'เข้า ttmsabot-paypercase-webapp เพื่อนำเข้าและดูข้อมูลค่าตอบแทน',
    icon: 'fa-solid fa-coins',
    iconClasses: 'text-amber-600',
  },
  {
    key: 'can_access_adminhub' as const,
    label: 'TTM-AdminHub',
    description: 'เข้า TTM-AdminHub เพื่อจัดการผู้ใช้ สิทธิ์ นักบำบัด และตารางเวลา',
    icon: 'fa-solid fa-shield-halved',
    iconClasses: 'text-rose-600',
  },
]

function resetForm() {
  const profile = props.profile
  form.username = profile?.username ?? ''
  form.full_name = profile?.full_name ?? ''
  form.email = profile?.email ?? ''
  form.role = profile?.role ?? ''
  form.password = ''
  form.confirmPassword = ''
  form.can_access_personalworkschedule = profile?.can_access_personalworkschedule ?? false
  form.can_access_workschedule = profile?.can_access_workschedule ?? false
  form.can_access_bookingportalmanager = profile?.can_access_bookingportalmanager ?? false
  form.can_access_paypercase = profile?.can_access_paypercase ?? false
  form.can_access_adminhub = profile?.can_access_adminhub ?? false
  submitError.value = ''
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) resetForm()
  },
)

watch(
  () => props.profile,
  () => {
    if (props.open) resetForm()
  },
)

function validate(): string | null {
  if (!form.username.trim()) return 'กรุณากรอกชื่อผู้ใช้'
  if (!form.full_name.trim()) return 'กรุณากรอกชื่อ-นามสกุล'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    return 'รูปแบบอีเมลไม่ถูกต้อง'
  }
  if (!form.role.trim()) return 'กรุณากรอกบทบาท'

  if (!isEditing.value || form.password) {
    if (form.password.length < 6) return 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'
    if (form.password !== form.confirmPassword) return 'รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน'
  }

  if (isSelf.value && !form.can_access_adminhub) {
    return 'ไม่สามารถเพิกถอนสิทธิ์ผู้ดูแลของตัวเองได้'
  }

  return null
}

async function handleSubmit() {
  submitError.value = ''
  const validationError = validate()
  if (validationError) {
    submitError.value = validationError
    return
  }

  submitting.value = true
  try {
    const payload = {
      username: form.username.trim(),
      full_name: form.full_name.trim(),
      email: form.email.trim().toLowerCase(),
      role: form.role.trim(),
      can_access_personalworkschedule: form.can_access_personalworkschedule,
      can_access_workschedule: form.can_access_workschedule,
      can_access_bookingportalmanager: form.can_access_bookingportalmanager,
      can_access_paypercase: form.can_access_paypercase,
      can_access_adminhub: form.can_access_adminhub,
    }

    if (!props.profile) {
      await createAdminUser({
        ...payload,
        password: form.password,
      })
      await Swal.fire({
        icon: 'success',
        title: 'สร้างผู้ใช้สำเร็จ',
        text: `เพิ่ม ${payload.full_name} เข้าระบบแล้ว`,
        timer: 1600,
        showConfirmButton: false,
      })
      emit('saved')
      emit('close')
      return
    }

    await updateAdminUser({
      id: props.profile.id,
      ...payload,
      password: form.password || undefined,
    })

    await Swal.fire({
      icon: 'success',
      title: 'บันทึกสำเร็จ',
      text: 'อัปเดตข้อมูลผู้ใช้แล้ว',
      timer: 1500,
      showConfirmButton: false,
    })
    emit('saved', props.profile.id)
    emit('close')
  } catch (err) {
    submitError.value = err instanceof Error ? err.message : 'บันทึกข้อมูลไม่สำเร็จ'
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  if (submitting.value) return
  emit('close')
}
</script>
