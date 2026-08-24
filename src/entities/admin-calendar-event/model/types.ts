import type { ScheduleMode } from '../../activity'

export type AdminCalendarEventRecord = {
  id: number
  series_id: string
  copied_from_event_id: number | null
  trainer_event_group_id: string | null
  program_schedule_id: number | null
  program_schedule_module_id: number | null
  project_main_id: number | null
  activity_type_id: number | null
  delivery_format_id: number | null
  recurrence_type_id: number | null
  title: string
  required_trainer_count: number
  start_datetime: string | null
  end_datetime: string | null
  start_date: string | null
  end_date: string | null
  recurrence_until: string | null
  occurrence_index: number
  description: string | null
  comments: string | null
  created_at: string
  updated_at: string
}

export type AdminCalendarEventListItem = AdminCalendarEventRecord & {
  project_names?: { name?: string; color?: string | null } | null
  activity_types?: { name?: string } | null
  delivery_formats?: { name?: string } | null
  recurrence_types?: { name?: string } | null
}

export type AdminCalendarEventPayload = {
  series_id: string
  copied_from_event_id: number | null
  project_main_id: number | null
  activity_type_id: number | null
  delivery_format_id: number | null
  recurrence_type_id: number | null
  title: string
  required_trainer_count: number
  start_datetime: string | null
  end_datetime: string | null
  start_date: string | null
  end_date: string | null
  recurrence_until: string | null
  occurrence_index: number
  description: string
  comments: string
}

export type AdminCalendarEventFormValues = {
  title: string
  project_main_id: number | null
  activity_type_id: number | null
  delivery_format_id: number | null
  recurrence_type_id: number | null
  trainer_ids: number[]
  required_trainer_count: number | null
  schedule_mode: ScheduleMode
  start_date: number | null
  end_date: number | null
  start_datetime: number | null
  end_datetime: number | null
  recurrence_until: number | null
  description: string
  comments: string
}

export type AdminCalendarEventScheduleSeed = Partial<Pick<
  AdminCalendarEventFormValues,
  'schedule_mode' | 'start_date' | 'end_date' | 'start_datetime' | 'end_datetime'
>>

export type RecurrenceKind = 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly'
