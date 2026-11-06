import { supabase } from '@/lib/supabase'
import type { ScheduleDayPayload, ScheduleVersionRow } from '@/types'

const DATE_STRING_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function isDateString(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_STRING_PATTERN.test(value.trim())) return false
  const date = new Date(value.trim() + 'T00:00:00')
  return !Number.isNaN(date.getTime())
}

function sortTimeSlots(times: string[]): string[] {
  return [...new Set(times.map((time) => time.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  )
}

export async function listScheduleVersions(): Promise<ScheduleVersionRow[]> {
  const { data, error } = await supabase
    .from('schedule_versions')
    .select(
      'id, therapist_name, day_of_week, time_slots, visibility, slot_visibility, effective_from, created_at',
    )
    .order('effective_from', { ascending: true })

  if (error) throw error
  return (data as ScheduleVersionRow[] | null) ?? []
}

/**
 * บันทึกตารางเวลาเป็นเวอร์ชันใหม่ที่มีผลตั้งแต่วันที่กำหนด
 * เขียนครบทั้ง 7 วัน เพื่อให้วันใดไม่มีช่วงเวลา = ปิดรับวันนั้นอย่างชัดเจน
 */
export async function saveTherapistScheduleVersion(
  therapistName: string,
  effectiveFrom: string,
  days: ScheduleDayPayload[],
): Promise<void> {
  const therapist = therapistName.trim()
  if (!therapist) throw new Error('ไม่พบชื่อพนักงาน')
  if (!isDateString(effectiveFrom)) throw new Error('รูปแบบวันที่ไม่ถูกต้อง')

  const preparedDays = days.map((day) => ({
    day_of_week: day.day_of_week,
    time_slots: sortTimeSlots(day.time_slots),
    visibility: day.visibility === 'private' ? 'private' : 'public',
    slot_visibility: Object.fromEntries(
      Object.entries(day.slot_visibility).map(([time, visibility]) => [
        time,
        visibility === 'private' ? 'private' : 'public',
      ]),
    ),
  }))

  // บันทึกเฉพาะวันที่มีช่วงเวลา ไม่สร้างแถวว่างในฐานข้อมูล
  const rows = preparedDays
    .filter((day) => day.time_slots.length > 0)
    .map((day) => ({
      therapist_name: therapist,
      day_of_week: day.day_of_week,
      time_slots: day.time_slots,
      visibility: day.visibility,
      slot_visibility: day.slot_visibility,
      effective_from: effectiveFrom,
    }))

  if (rows.length > 0) {
    const { error } = await supabase
      .from('schedule_versions')
      .upsert(rows, { onConflict: 'therapist_name,day_of_week,effective_from' })

    if (error) throw error
  }

  // ถ้ามีแถวเดิมของวันที่ถูกเคลียร์ช่วงเวลาออก ให้ลบแถวนั้นด้วย
  const emptyDays = preparedDays
    .filter((day) => day.time_slots.length === 0)
    .map((day) => day.day_of_week)

  if (emptyDays.length > 0) {
    const { error } = await supabase
      .from('schedule_versions')
      .delete()
      .eq('therapist_name', therapist)
      .eq('effective_from', effectiveFrom)
      .in('day_of_week', emptyDays)

    if (error) throw error
  }
}

export async function deleteScheduleVersion(
  therapistName: string,
  effectiveFrom: string,
): Promise<void> {
  const { error } = await supabase
    .from('schedule_versions')
    .delete()
    .eq('therapist_name', therapistName.trim())
    .eq('effective_from', effectiveFrom)

  if (error) throw error
}

export async function deleteAllScheduleVersions(
  therapistName: string,
): Promise<void> {
  const { error } = await supabase
    .from('schedule_versions')
    .delete()
    .eq('therapist_name', therapistName.trim())

  if (error) throw error
}
