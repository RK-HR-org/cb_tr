export type ScheduleMode = 'date' | 'datetime'

export type NamedRelation = {
  name?: string
  color?: string | null
} | null

export type ActivityRecord = {
  id: number
  trainer_id: number
  event_group_id: string | null
  project_type_id: number | null
  project_main_id: number | null
  project_sub: string | null
  role_id: number | null
  activity_type_id: number | null
  delivery_format_id: number | null
  recurrence_type_id: number | null
  start_datetime: string | null
  end_datetime: string | null
  start_date: string | null
  end_date: string | null
  source_type?: string | null
  source_file?: string | null
  source_schedule_key?: string | null
  source_sheet?: string | null
  source_range?: string | null
  source_event_key?: string | null
  is_duplicate?: boolean | null
  task_desc: string | null
  comments: string | null
}

export type ActivityListItem = ActivityRecord & {
  project_types?: NamedRelation
  project_names?: NamedRelation
  roles?: NamedRelation
  activity_types?: NamedRelation
  delivery_formats?: NamedRelation
  recurrence_types?: NamedRelation
}

export type GanttActivityItem = ActivityListItem & {
  trainers?: { full_name?: string } | null
}

export type ActivityPayload = {
  project_type_id: number
  project_main_id: number
  project_sub: string
  role_id: number
  activity_type_id: number | null
  delivery_format_id: number | null
  recurrence_type_id: number | null
  start_datetime: string | null
  end_datetime: string | null
  start_date: string | null
  end_date: string | null
  task_desc: string
  comments: string
  is_duplicate: boolean
}

export type ActivityFormValues = {
  participant_ids: number[]
  project_type_id: number | null
  project_main_id: number | null
  project_sub: string
  role_id: number | null
  activity_type_id: number | null
  delivery_format_id: number | null
  recurrence_type_id: number | null
  schedule_mode: ScheduleMode
  start_date: number | null
  end_date: number | null
  start_datetime: number | null
  end_datetime: number | null
  task_desc: string
  comments: string
}

export type ActivityScheduleSeed = Partial<Pick<
  ActivityFormValues,
  'schedule_mode' | 'start_date' | 'end_date' | 'start_datetime' | 'end_datetime'
>>
