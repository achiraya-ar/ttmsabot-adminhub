<template>
  <BaseModal
    :open="open"
    :title="isEditing ? 'แก้ไขข้อมูลนักบำบัด' : 'เพิ่มนักบำบัด'"
    :subtitle="
      isEditing
        ? 'แก้ไขชื่อ สถานะ และเลขใบประกอบวิชาชีพ'
        : 'เพิ่มรายชื่อนักบำบัดใหม่เข้าสู่ระบบ'
    "
    max-width="max-w-lg"
    @close="handleClose"
  >
    <form id="therapist-form" class="space-y-5" @submit.prevent="handleSubmit">
      <div>
        <label for="therapist-name" class="label">
          ชื่อนักบำบัด <span class="text-rose-500">*</span>
        </label>
        <input
          id="therapist-name"
          v-model="form.name"
          type="text"
          required
          placeholder="เช่น ทิพวัลย์"
          class="input"
          :disabled="submitting"
        />
      </div>

      <div>
        <label for="therapist-license" class="label">เลขใบประกอบวิชาชีพ</label>
        <input
          id="therapist-license"
          v-model="form.license_number"
          type="text"
          placeholder="ถ้ามี"
          class="input"
          :disabled="submitting"
        />
      </div>

      <div>
        <label for="therapist-status" class="label">สถานะ</label>
        <select
          id="therapist-status"
          v-model="form.status"
          class="input"
          :disabled="submitting"
        >
          <option value="active">ปฏิบัติงาน</option>
          <option value="inactive">ไม่ปฏิบัติงาน</option>
          <option v-if="hasCustomStatus" :value="customStatus">
            {{ customStatus }}
          </option>
        </select>
      </div>

      <div
        v-if="submitError"
        class="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm leading-6 text-rose-700"
        role="alert"
      >
        <i class="fa-solid fa-circle-exclamation mt-0.5"></i>
        <span>{{ submitError }}</span>
      </div>
    </form>

    <template #footer>
      <button type="button" class="btn-secondary" :disabled="submitting" @click="handleClose">
        ยกเลิก
      </button>
      <button type="submit" form="therapist-form" class="btn-primary" :disabled="submitting">
        <i v-if="submitting" class="fa-solid fa-circle-notch fa-spin"></i>
        <i v-else class="fa-solid fa-floppy-disk"></i>
        {{ submitting ? 'กำลังบันทึก...' : isEditing ? 'บันทึกการแก้ไข' : 'เพิ่มนักบำบัด' }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import Swal from 'sweetalert2'
import BaseModal from '@/components/BaseModal.vue'
import { createTherapist, updateTherapist } from '@/services/therapists'
import type { Therapist } from '@/types'

const props = defineProps<{
  open: boolean
  therapist: Therapist | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
}>()

const submitting = ref(false)
const submitError = ref('')

const form = reactive({
  name: '',
  status: 'active',
  license_number: '',
})

const isEditing = computed(() => !!props.therapist)

const hasCustomStatus = computed(() => {
  const status = props.therapist?.status
  return !!status && status !== 'active' && status !== 'inactive'
})

const customStatus = computed(() =>
  hasCustomStatus.value ? (props.therapist?.status ?? '') : '',
)

function resetForm() {
  form.name = props.therapist?.name ?? ''
  form.status = props.therapist?.status ?? 'active'
  form.license_number = props.therapist?.license_number ?? ''
  submitError.value = ''
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) resetForm()
  },
)

watch(
  () => props.therapist,
  () => {
    if (props.open) resetForm()
  },
)

async function handleSubmit() {
  submitError.value = ''

  if (!form.name.trim()) {
    submitError.value = 'กรุณากรอกชื่อนักบำบัด'
    return
  }

  submitting.value = true
  try {
    const payload = {
      name: form.name.trim(),
      status: form.status || 'active',
      license_number: form.license_number.trim() || null,
    }

    if (props.therapist) {
      await updateTherapist(props.therapist.id, payload)
    } else {
      await createTherapist(payload)
    }

    await Swal.fire({
      icon: 'success',
      title: props.therapist ? 'บันทึกสำเร็จ' : 'เพิ่มนักบำบัดสำเร็จ',
      text: payload.name,
      timer: 1500,
      showConfirmButton: false,
    })

    emit('saved')
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
