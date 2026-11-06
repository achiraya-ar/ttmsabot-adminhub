import { supabase } from '@/lib/supabase'
import type { AdminProfile } from '@/types'

export const PROFILE_COLUMNS =
  'id, username, full_name, role, email, updated_at, can_access_personalworkschedule, can_access_workschedule, can_access_bookingportalmanager, can_access_paypercase, can_access_adminhub' as const

function translateAuthError(message: string): string {
  if (message === 'Invalid login credentials') {
    return 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
  }
  if (message.includes('Email not confirmed')) {
    return 'อีเมลนี้ยังไม่ได้รับการยืนยัน กรุณาติดต่อผู้ดูแลระบบ'
  }
  if (message.includes('Too many requests')) {
    return 'พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่'
  }
  return message
}

export async function findProfileByUsername(
  username: string,
): Promise<AdminProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('username', username.trim())
    .maybeSingle()

  if (error) throw error
  return (data as AdminProfile | null) ?? null
}

export async function loginWithUsername(
  username: string,
  password: string,
): Promise<AdminProfile> {
  const profile = await findProfileByUsername(username)
  if (!profile) throw new Error('ไม่พบชื่อผู้ใช้นี้ในระบบ')

  const { data, error } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password,
  })

  if (error) throw new Error(translateAuthError(error.message))
  if (!data.user) throw new Error('ไม่สามารถเข้าสู่ระบบได้')

  if (!profile.can_access_adminhub) {
    await supabase.auth.signOut().catch(() => undefined)
    throw new Error('บัญชีนี้ไม่มีสิทธิ์เข้าถึงระบบจัดการผู้ดูแล')
  }

  return profile
}

export async function getSessionProfile(): Promise<AdminProfile | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) return null

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', session.user.id)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('ไม่พบข้อมูลโปรไฟล์สำหรับบัญชีนี้')
  return data as AdminProfile
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}
