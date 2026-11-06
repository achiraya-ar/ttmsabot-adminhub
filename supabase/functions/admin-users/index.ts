// =====================================================================
//  Supabase Edge Function: admin-users
//  Creates / updates / deletes Supabase Auth users + profiles rows.
//
//  Deploy with Supabase Dashboard > Edge Functions or:
//    supabase functions deploy admin-users
//
//  The caller must be authenticated and have profiles.can_access_adminhub = true.
//  SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided
//  automatically by Supabase Edge Functions.
// =====================================================================

import {
  createClient,
  type SupabaseClient,
} from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const PERMISSION_KEYS = [
  'can_access_personalworkschedule',
  'can_access_workschedule',
  'can_access_bookingportalmanager',
  'can_access_paypercase',
  'can_access_adminhub',
] as const

type PermissionKey = (typeof PERMISSION_KEYS)[number]

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`กรุณาระบุ${label}`)
  }
  return value.trim()
}

function asBoolean(value: unknown): boolean {
  return value === true
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function translateAuthError(message: string): string {
  if (message.includes('already registered') || message.includes('already been registered')) {
    return 'อีเมลนี้ถูกใช้งานแล้ว'
  }
  if (message.includes('Password should be')) {
    return 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร (ข้อกำหนดของ Supabase Auth)'
  }
  if (message.includes('Invalid email')) {
    return 'รูปแบบอีเมลไม่ถูกต้อง'
  }
  return message
}

function buildPermissionPayload(
  body: Record<string, unknown>,
): Record<PermissionKey, boolean> {
  return {
    can_access_personalworkschedule: asBoolean(body.can_access_personalworkschedule),
    can_access_workschedule: asBoolean(body.can_access_workschedule),
    can_access_bookingportalmanager: asBoolean(body.can_access_bookingportalmanager),
    can_access_paypercase: asBoolean(body.can_access_paypercase),
    can_access_adminhub: asBoolean(body.can_access_adminhub),
  }
}

async function ensureUniqueUsername(
  admin: SupabaseClient,
  username: string,
  excludeId?: string,
): Promise<void> {
  let query = admin.from('profiles').select('id').eq('username', username).limit(1)
  if (excludeId) query = query.neq('id', excludeId)

  const { data, error } = await query.maybeSingle()
  if (error) throw new Error(error.message)
  if (data) throw new Error('ชื่อผู้ใช้นี้ถูกใช้งานแล้ว')
}

async function createUser(
  admin: SupabaseClient,
  body: Record<string, unknown>,
): Promise<Response> {
  const username = requiredString(body.username, 'ชื่อผู้ใช้')
  const fullName = requiredString(body.full_name, 'ชื่อ')
  const email = requiredString(body.email, 'อีเมล').toLowerCase()
  const password = requiredString(body.password, 'รหัสผ่าน')
  const role = requiredString(body.role, 'บทบาท')

  if (!isValidEmail(email)) throw new Error('รูปแบบอีเมลไม่ถูกต้อง')
  if (password.length < 6) throw new Error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')

  await ensureUniqueUsername(admin, username)

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      username,
      full_name: fullName,
    },
  })

  if (createError) throw new Error(translateAuthError(createError.message))
  if (!created.user) throw new Error('สร้างบัญชี Supabase Auth ไม่สำเร็จ')

  const profilePayload = {
    id: created.user.id,
    username,
    full_name: fullName,
    email,
    role,
    updated_at: new Date().toISOString(),
    ...buildPermissionPayload(body),
  }

  // Some projects create a profile automatically via a trigger.
  const { data: existingProfile, error: existingError } = await admin
    .from('profiles')
    .select('id')
    .eq('id', created.user.id)
    .maybeSingle()

  if (existingError) {
    await admin.auth.admin.deleteUser(created.user.id).catch(() => undefined)
    throw new Error(existingError.message)
  }

  const { id: createdId, ...profileFields } = profilePayload

  const profileResult = existingProfile
    ? await admin.from('profiles').update(profileFields).eq('id', createdId)
    : await admin.from('profiles').insert(profilePayload)

  if (profileResult.error) {
    // Roll back the Auth user so we do not leave an orphan account.
    await admin.auth.admin.deleteUser(created.user.id).catch(() => undefined)
    throw new Error(profileResult.error.message)
  }

  return json({ ok: true, id: created.user.id })
}

async function createProfile(
  admin: SupabaseClient,
  body: Record<string, unknown>,
): Promise<Response> {
  const id = requiredString(body.id, 'id')
  const username = requiredString(body.username, 'ชื่อผู้ใช้')
  const fullName = requiredString(body.full_name, 'ชื่อ')
  const email = requiredString(body.email, 'อีเมล').toLowerCase()
  const role = requiredString(body.role, 'บทบาท')

  if (!isValidEmail(email)) throw new Error('รูปแบบอีเมลไม่ถูกต้อง')

  const { data: authUser, error: authError } = await admin.auth.admin.getUserById(id)
  if (authError || !authUser.user) {
    throw new Error('ไม่พบผู้ใช้ใน Supabase Auth')
  }

  if ((authUser.user.email ?? '').toLowerCase() !== email) {
    throw new Error('อีเมลไม่ตรงกับบัญชี Supabase Auth')
  }

  await ensureUniqueUsername(admin, username)

  const { data: existingById, error: existingByIdError } = await admin
    .from('profiles')
    .select('id')
    .eq('id', id)
    .maybeSingle()
  if (existingByIdError) throw new Error(existingByIdError.message)
  if (existingById) throw new Error('ผู้ใช้นี้มีโปรไฟล์อยู่แล้ว')

  const { data: existingByEmail, error: existingByEmailError } = await admin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()
  if (existingByEmailError) throw new Error(existingByEmailError.message)
  if (existingByEmail) throw new Error('อีเมลนี้มีโปรไฟล์อยู่แล้ว')

  const { error: insertError } = await admin.from('profiles').insert({
    id,
    username,
    full_name: fullName,
    email,
    role,
    updated_at: new Date().toISOString(),
    ...buildPermissionPayload(body),
  })

  if (insertError) throw new Error(insertError.message)

  return json({ ok: true, id })
}

async function updateUser(
  admin: SupabaseClient,
  callerId: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const id = requiredString(body.id, 'id')

  const { data: currentProfile, error: currentError } = await admin
    .from('profiles')
    .select('email, can_access_adminhub')
    .eq('id', id)
    .maybeSingle()

  if (currentError) throw new Error(currentError.message)
  if (!currentProfile) throw new Error('ไม่พบผู้ใช้ที่ต้องการแก้ไข')

  const username = requiredString(body.username, 'ชื่อผู้ใช้')
  const fullName = requiredString(body.full_name, 'ชื่อ')
  const role = requiredString(body.role, 'บทบาท')
  const permissions = buildPermissionPayload(body)
  const email = requiredString(body.email, 'อีเมล').toLowerCase()

  if (!isValidEmail(email)) {
    throw new Error('รูปแบบอีเมลไม่ถูกต้อง')
  }

  const newPassword = typeof body.password === 'string' ? body.password : ''
  if (newPassword.length > 0 && newPassword.length < 6) {
    throw new Error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
  }

  if (id === callerId && !permissions.can_access_adminhub) {
    throw new Error('ไม่สามารถเพิกถอนสิทธิ์ผู้ดูแลของตัวเองได้')
  }

  await ensureUniqueUsername(admin, username, id)

  const profileUpdates = {
    username,
    full_name: fullName,
    email,
    role,
    updated_at: new Date().toISOString(),
    ...permissions,
  }

  // Update the profile first. If the Auth update fails and the email changed,
  // we try to restore the previous email so username lookup keeps working.
  const { error: profileError } = await admin
    .from('profiles')
    .update(profileUpdates)
    .eq('id', id)

  if (profileError) throw new Error(profileError.message)

  const authUpdates: {
    email?: string
    email_confirm?: boolean
    password?: string
  } = {}

  if (email !== (currentProfile.email ?? '').toLowerCase()) {
    authUpdates.email = email
    authUpdates.email_confirm = true
  }

  if (newPassword.length > 0) {
    authUpdates.password = newPassword
  }

  if (Object.keys(authUpdates).length > 0) {
    const { error: authError } = await admin.auth.admin.updateUserById(id, authUpdates)

    if (authError) {
      if (authUpdates.email) {
        await admin.from('profiles').update({ email: currentProfile.email }).eq('id', id)
      }
      throw new Error(translateAuthError(authError.message))
    }
  }

  return json({ ok: true })
}

interface AuthUserRecord {
  id: string
  email?: string | null
  created_at?: string | null
  last_sign_in_at?: string | null
}

async function getAllAuthUsers(admin: SupabaseClient): Promise<AuthUserRecord[]> {
  const users: AuthUserRecord[] = []
  const perPage = 1000
  let page = 1

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(error.message)

    const pageUsers = (data?.users ?? []) as AuthUserRecord[]
    users.push(...pageUsers)

    if (pageUsers.length < perPage) break
    page++
  }

  return users
}

async function listLastSignIns(admin: SupabaseClient): Promise<Response> {
  const users = await getAllAuthUsers(admin)

  return json({
    ok: true,
    users: users.map((user) => ({
      id: user.id,
      email: user.email ?? null,
      created_at: user.created_at ?? null,
      last_sign_in_at: user.last_sign_in_at ?? null,
    })),
  })
}

async function deleteUser(
  admin: SupabaseClient,
  callerId: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const id = requiredString(body.id, 'id')

  if (id === callerId) {
    throw new Error('ไม่สามารถลบบัญชีของตัวเองได้')
  }

  const { error: profileError } = await admin.from('profiles').delete().eq('id', id)
  if (profileError) throw new Error(profileError.message)

  const { error: authError } = await admin.auth.admin.deleteUser(id)

  if (authError && !authError.message.toLowerCase().includes('not found')) {
    return json({
      ok: true,
      warning: `ลบโปรไฟล์แล้ว แต่ลบบัญชี Supabase Auth ไม่สำเร็จ: ${authError.message}`,
    })
  }

  return json({ ok: true })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: 'Missing Supabase server configuration' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!accessToken) return json({ error: 'Unauthorized' }, 401)

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const caller = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const {
    data: { user: callerUser },
    error: callerError,
  } = await caller.auth.getUser(accessToken)

  if (callerError || !callerUser) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const { data: callerProfile, error: callerProfileError } = await admin
    .from('profiles')
    .select('can_access_adminhub')
    .eq('id', callerUser.id)
    .maybeSingle()

  if (callerProfileError) {
    return json({ error: callerProfileError.message }, 500)
  }

  if (!callerProfile?.can_access_adminhub) {
    return json({ error: 'Forbidden: admin access required' }, 403)
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  try {
    switch (body.action) {
      case 'create':
        return await createUser(admin, body)
      case 'create-profile':
        return await createProfile(admin, body)
      case 'update':
        return await updateUser(admin, callerUser.id, body)
      case 'delete':
        return await deleteUser(admin, callerUser.id, body)
      case 'last-sign-ins':
        return await listLastSignIns(admin)
      default:
        return json({ error: 'Unknown action' }, 400)
    }
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : 'Unexpected error' },
      400,
    )
  }
})
