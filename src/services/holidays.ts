import { supabase } from '@/lib/supabase'
import type { Holiday, HolidayPayload } from '@/types'

const HOLIDAY_COLUMNS = 'holiday_date, description, created_at'

function translateHolidayError(error: { code?: string; message: string }): Error {
  if (error.code === '23505') {
    return new Error('วันหยุดวันที่นี้มีอยู่ในระบบแล้ว')
  }
  return new Error(error.message)
}

export async function listHolidays(): Promise<Holiday[]> {
  const { data, error } = await supabase
    .from('holidays')
    .select(HOLIDAY_COLUMNS)
    .order('holiday_date', { ascending: true })

  if (error) throw error
  return (data as Holiday[] | null) ?? []
}

async function ensureHolidayDateAvailable(
  holidayDate: string,
  excludeDate?: string,
): Promise<void> {
  if (excludeDate && holidayDate === excludeDate) return

  const { data, error } = await supabase
    .from('holidays')
    .select('holiday_date')
    .eq('holiday_date', holidayDate)
    .limit(1)

  if (error) throw error
  if (data && data.length > 0) {
    throw new Error('วันหยุดวันที่นี้มีอยู่ในระบบแล้ว')
  }
}

export async function createHoliday(payload: HolidayPayload): Promise<void> {
  await ensureHolidayDateAvailable(payload.holiday_date)

  const { error } = await supabase.from('holidays').insert({
    holiday_date: payload.holiday_date,
    description: payload.description.trim() || 'วันหยุด',
  })

  if (error) throw translateHolidayError(error)
}

export async function updateHoliday(
  originalDate: string,
  payload: HolidayPayload,
): Promise<void> {
  await ensureHolidayDateAvailable(payload.holiday_date, originalDate)

  const { error } = await supabase
    .from('holidays')
    .update({
      holiday_date: payload.holiday_date,
      description: payload.description.trim() || 'วันหยุด',
    })
    .eq('holiday_date', originalDate)

  if (error) throw translateHolidayError(error)
}

export async function deleteHoliday(holidayDate: string): Promise<void> {
  const { error } = await supabase
    .from('holidays')
    .delete()
    .eq('holiday_date', holidayDate)

  if (error) throw error
}

export interface CopyHolidaysResult {
  copied: number
  updated: number
  skippedInvalid: number
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

function mapHolidayToYear(dateString: string, targetYear: number): string | null {
  const source = new Date(dateString + 'T00:00:00')
  if (Number.isNaN(source.getTime())) return null

  const month = source.getMonth() + 1
  const day = source.getDate()

  if (month === 2 && day === 29 && !isLeapYear(targetYear)) {
    return null
  }

  return `${targetYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * คัดลอกวันหยุดจากปีต้นทางไปยังปีปลายทาง
 * รายการวันที่ซ้ำกับปีปลายทางจะถูกอัปเดตด้วยข้อมูลจากปีต้นทาง
 */
export async function copyHolidaysToYear(
  sourceYear: number,
  targetYear: number,
): Promise<CopyHolidaysResult> {
  if (!Number.isInteger(sourceYear) || !Number.isInteger(targetYear)) {
    throw new Error('ปีไม่ถูกต้อง')
  }
  if (sourceYear === targetYear) {
    throw new Error('ปีต้นทางและปีปลายทางต้องไม่ใช่ปีเดียวกัน')
  }

  const sourceStart = `${sourceYear}-01-01`
  const sourceEnd = `${sourceYear}-12-31`
  const targetStart = `${targetYear}-01-01`
  const targetEnd = `${targetYear}-12-31`

  const [sourceResult, targetResult] = await Promise.all([
    supabase
      .from('holidays')
      .select('holiday_date, description')
      .gte('holiday_date', sourceStart)
      .lte('holiday_date', sourceEnd)
      .order('holiday_date', { ascending: true }),
    supabase
      .from('holidays')
      .select('holiday_date')
      .gte('holiday_date', targetStart)
      .lte('holiday_date', targetEnd),
  ])

  if (sourceResult.error) throw sourceResult.error
  if (targetResult.error) throw targetResult.error

  const sourceHolidays = (sourceResult.data ?? []) as Array<{
    holiday_date: string
    description: string | null
  }>
  const targetDates = new Set(
    ((targetResult.data ?? []) as Array<{ holiday_date: string }>).map(
      (item) => item.holiday_date,
    ),
  )

  let copied = 0
  let updated = 0
  let skippedInvalid = 0
  const rows: Array<{ holiday_date: string; description: string }> = []

  sourceHolidays.forEach((holiday) => {
    const targetDate = mapHolidayToYear(holiday.holiday_date, targetYear)
    if (!targetDate) {
      skippedInvalid++
      return
    }

    if (targetDates.has(targetDate)) {
      updated++
    } else {
      copied++
      targetDates.add(targetDate)
    }

    rows.push({
      holiday_date: targetDate,
      description: holiday.description?.trim() || 'วันหยุด',
    })
  })

  if (rows.length > 0) {
    const { error } = await supabase
      .from('holidays')
      .upsert(rows, { onConflict: 'holiday_date' })

    if (error) throw translateHolidayError(error)
  }

  return {
    copied,
    updated,
    skippedInvalid,
  }
}
