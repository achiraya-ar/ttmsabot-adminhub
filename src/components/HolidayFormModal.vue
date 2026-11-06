<template>
  <BaseModal
    :open="open"
    :title="isEditing ? 'แก้ไขวันหยุด' : 'เพิ่มวันหยุด'"
    :subtitle="
      isEditing
        ? 'แก้ไขวันที่หรือรายละเอียดของวันหยุด'
        : 'เพิ่มวันหยุดใหม่เข้าสู่ปฏิทินของโรงพยาบาล'
    "
    max-width="max-w-xl"
    @close="handleClose"
  >
    <form id="holiday-form" class="space-y-5" @submit.prevent="handleSubmit">
      <div>
        <label for="holiday-date" class="label">วันที่ <span class="text-rose-500">*</span></label>
        <input
          id="holiday-date"
          v-model="form.holiday_date"
          type="date"
          required
          class="input"
          :disabled="submitting"
        />
        <p v-if="form.holiday_date" class="field-hint">
          {{ getDayName(form.holiday_date) }} · {{ formatThaiDate(form.holiday_date) }}
        </p>
      </div>

      <div>
        <label for="holiday-description" class="label">รายละเอียด</label>
        <textarea
          id="holiday-description"
          v-model="form.description"
          rows="3"
          placeholder="เช่น วันสงกรานต์, วันหยุดชดเชย, วันหยุดพิเศษ"
          class="input resize-none"
          :disabled="submitting"
        ></textarea>
        <p class="field-hint">หากเว้นว่าง ระบบจะใช้ข้อความ “วันหยุด”</p>
      </div>

      <div
        v-if="isEditing"
        class="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-800"
      >
        <i class="fa-solid fa-circle-info mt-0.5"></i>
        <span>การเปลี่ยนวันที่จะอัปเดตรายการเดิม ไม่ได้สร้างรายการใหม่</span>
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
      <button type="submit" form="holiday-form" class="btn-primary" :disabled="submitting">
        <i v-if="submitting" class="fa-solid fa-circle-notch fa-spin"></i>
        <i v-else class="fa-solid fa-floppy-disk"></i>
        {{ submitting ? 'กำลังบันทึก...' : isEditing ? 'บันทึกการแก้ไข' : 'เพิ่มวันหยุด' }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import Swal from 'sweetalert2'
import BaseModal from '@/components/BaseModal.vue'
import { createHoliday, updateHoliday } from '@/services/holidays'
import type { Holiday } from '@/types'
import { formatThaiDate, getDayName } from '@/utils/format'

const props = defineProps<{
  open: boolean
  holiday: Holiday | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved', holidayDate: string): void
}>()

const submitting = ref(false)
const submitError = ref('')

const form = reactive({
  holiday_date: '',
  description: '',
})

const isEditing = computed(() => !!props.holiday)

function resetForm() {
  form.holiday_date = props.holiday?.holiday_date ?? ''
  form.description = props.holiday?.description ?? ''
  submitError.value = ''
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) resetForm()
  },
)

watch(
  () => props.holiday,
  () => {
    if (props.open) resetForm()
  },
)

async function handleSubmit() {
  submitError.value = ''

  if (!form.holiday_date) {
    submitError.value = 'กรุณาเลือกวันที่'
    return
  }

  submitting.value = true
  try {
    const payload = {
      holiday_date: form.holiday_date,
      description: form.description.trim() || 'วันหยุด',
    }

    if (props.holiday) {
      await updateHoliday(props.holiday.holiday_date, payload)
    } else {
      await createHoliday(payload)
    }

    await Swal.fire({
      icon: 'success',
      title: props.holiday ? 'บันทึกสำเร็จ' : 'เพิ่มวันหยุดสำเร็จ',
      text: `${formatThaiDate(payload.holiday_date)} · ${payload.description}`,
      timer: 1500,
      showConfirmButton: false,
    })

    emit('saved', payload.holiday_date)
    emit('close')
  } catch (err) {
    submitError.value = err instanceof Error ? err.message : 'บันทึกวันหยุดไม่สำเร็จ'
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  if (submitting.value) return
  emit('close')
}
</script>
