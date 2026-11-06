export interface AdminProfile {
  id: string
  username: string
  full_name: string
  role: string
  email: string
  updated_at: string | null
  can_access_personalworkschedule: boolean
  can_access_workschedule: boolean
  can_access_bookingportalmanager: boolean
  can_access_paypercase: boolean
  can_access_adminhub: boolean
}

export interface ProfilePermissions {
  can_access_personalworkschedule: boolean
  can_access_workschedule: boolean
  can_access_bookingportalmanager: boolean
  can_access_paypercase: boolean
  can_access_adminhub: boolean
}

export interface ProfileFormPayload extends ProfilePermissions {
  username: string
  full_name: string
  email: string
  role: string
  password?: string
}

export interface Holiday {
  holiday_date: string
  description: string | null
  created_at: string | null
}

export interface HolidayPayload {
  holiday_date: string
  description: string
}

export interface Therapist {
  id: number
  created_at: string | null
  name: string
  status: string
  license_number: string | null
}

export interface TherapistFormPayload {
  name: string
  status: string
  license_number: string | null
}

export type DayVisibility = 'public' | 'private'

export interface ScheduleVersionRow {
  id: number
  therapist_name: string
  day_of_week: number
  time_slots: string[] | null
  visibility: DayVisibility | string | null
  slot_visibility: Record<string, DayVisibility> | null
  effective_from: string
  created_at: string | null
}

export interface ScheduleDayPayload {
  day_of_week: number
  time_slots: string[]
  visibility: DayVisibility
  slot_visibility: Record<string, DayVisibility>
}
