import { supabase } from '@/lib/supabase'
import type { Therapist, TherapistFormPayload } from '@/types'

const THERAPIST_COLUMNS = 'id, created_at, name, status, license_number'

function translateTherapistError(error: { code?: string; message: string }): Error {
  if (error.code === '23505') {
    return new Error('ข้อมูลนักบำบัดซ้ำในระบบ (ชื่อหรือเลขใบประกอบวิชาชีพอาจมีอยู่แล้ว)')
  }
  return new Error(error.message)
}

async function ensureNameAvailable(name: string, excludeId?: number): Promise<void> {
  let query = supabase
    .from('therapists')
    .select('id')
    .eq('name', name)
    .limit(1)

  if (excludeId !== undefined) {
    query = query.neq('id', excludeId)
  }

  const { data, error } = await query
  if (error) throw error
  if (data && data.length > 0) {
    throw new Error('ชื่อนักบำบัดนี้มีอยู่ในระบบแล้ว')
  }
}

export async function listTherapists(): Promise<Therapist[]> {
  const { data, error } = await supabase
    .from('therapists')
    .select(THERAPIST_COLUMNS)
    .order('name', { ascending: true })

  if (error) throw error
  return (data as Therapist[] | null) ?? []
}

export async function createTherapist(payload: TherapistFormPayload): Promise<void> {
  const name = payload.name.trim()
  if (!name) throw new Error('กรุณากรอกชื่อนักบำบัด')

  await ensureNameAvailable(name)

  const { error } = await supabase.from('therapists').insert({
    name,
    status: payload.status || 'active',
    license_number: payload.license_number?.trim() || null,
  })

  if (error) throw translateTherapistError(error)
}

export async function updateTherapist(
  id: number,
  payload: TherapistFormPayload,
): Promise<void> {
  const name = payload.name.trim()
  if (!name) throw new Error('กรุณากรอกชื่อนักบำบัด')

  await ensureNameAvailable(name, id)

  const { error } = await supabase
    .from('therapists')
    .update({
      name,
      status: payload.status || 'active',
      license_number: payload.license_number?.trim() || null,
    })
    .eq('id', id)

  if (error) throw translateTherapistError(error)
}
