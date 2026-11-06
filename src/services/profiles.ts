import { supabase } from '@/lib/supabase'
import { PROFILE_COLUMNS } from '@/services/auth'
import type { AdminProfile, AuthUserInfo, ProfileFormPayload } from '@/types'

export interface UpdateAdminUserPayload extends ProfileFormPayload {
  id: string
}

export interface AdminUserResponse {
  ok: boolean
  id?: string
  warning?: string
  users?: AuthUserInfo[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function getFunctionErrorMessage(error: unknown): Promise<string> {
  if (!isRecord(error)) return 'เรียก Edge Function ไม่สำเร็จ'

  const context = error.context
  if (context instanceof Response) {
    try {
      const body = await context.clone().json()
      if (isRecord(body)) {
        if (typeof body.error === 'string') {
          if (body.error === 'Unknown action') {
            return 'Edge Function "admin-users" เป็นเวอร์ชันเก่า กรุณา deploy โค้ดล่าสุดจาก supabase/functions/admin-users/index.ts แล้วลองใหม่'
          }
          return body.error
        }
        if (typeof body.message === 'string') {
          if (context.status === 404) {
            return 'ยังไม่ได้ deploy Edge Function "admin-users" กรุณาดูขั้นตอนใน README'
          }
          return body.message
        }
      }
    } catch {
      // Response did not contain JSON.
    }
  }

  if (typeof error.message === 'string') {
    if (
      context instanceof Response &&
      context.status === 404
    ) {
      return 'ยังไม่ได้ deploy Edge Function "admin-users" กรุณาดูขั้นตอนใน README'
    }
    if (
      error.message.includes('Failed to send a request to the Edge Function') ||
      error.message.includes('Failed to fetch') ||
      error.message.includes('Requested function was not found')
    ) {
      return 'ยังไม่ได้ deploy Edge Function "admin-users" กรุณาดูขั้นตอนใน README'
    }
    return error.message
  }

  return 'เรียก Edge Function ไม่สำเร็จ'
}

async function invokeAdminUsers(
  body: Record<string, unknown>,
): Promise<AdminUserResponse> {
  const { data, error } = await supabase.functions.invoke('admin-users', { body })

  if (error) throw new Error(await getFunctionErrorMessage(error))

  if (isRecord(data) && typeof data.error === 'string') {
    throw new Error(data.error)
  }

  return (data as AdminUserResponse | null) ?? { ok: true }
}

export async function listLastSignIns(): Promise<Record<string, string | null>> {
  try {
    const response = await invokeAdminUsers({ action: 'last-sign-ins' })
    return Object.fromEntries(
      (response.users ?? []).map((user) => [user.id, user.last_sign_in_at]),
    )
  } catch (err) {
    console.warn('Cannot load last sign-in times:', err)
    return {}
  }
}

export async function listProfiles(): Promise<AdminProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .order('username', { ascending: true })

  if (error) throw error
  return (data as AdminProfile[] | null) ?? []
}

export async function createAdminUser(
  payload: ProfileFormPayload,
): Promise<AdminUserResponse> {
  return invokeAdminUsers({ action: 'create', ...payload })
}

export async function updateAdminUser(
  payload: UpdateAdminUserPayload,
): Promise<AdminUserResponse> {
  return invokeAdminUsers({ action: 'update', ...payload })
}

export async function deleteAdminUser(
  id: string,
): Promise<AdminUserResponse> {
  return invokeAdminUsers({ action: 'delete', id })
}
