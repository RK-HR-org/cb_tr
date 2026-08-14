export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type TableDefinition<Row, Insert, Update = Partial<Insert>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

type NamedWeightedRow = {
  id: number
  name: string
  weight: number | null
}

type NamedWeightedInsert = {
  id?: number
  name: string
  weight?: number | null
}

type ClassifiedRow = NamedWeightedRow & {
  description: string | null
  is_active: boolean
}

type ClassifiedInsert = NamedWeightedInsert & {
  description?: string | null
  is_active?: boolean
}

type ActiveNamedRow = {
  id: number
  name: string
  is_active: boolean
}

type ActiveNamedInsert = {
  id?: number
  name: string
  is_active?: boolean
}

type CodeDictionaryRow = {
  code: string
  name: string
  sort_order: number
  is_active: boolean
}

type CodeDictionaryInsert = {
  code: string
  name: string
  sort_order?: number
  is_active?: boolean
}

export type TrainerRow = {
  id: number
  full_name: string
  city_id: number | null
  division_id: number | null
}

export type TrainerInsert = {
  id?: number
  full_name: string
  city_id?: number | null
  division_id?: number | null
}

export type ProjectRow = {
  id: number
  name: string
  audit_index: string | null
  weight: number | null
  status_code: string
  project_type_id: number | null
  parent_project_id: number | null
  module_position: number | null
  customer: string | null
  lead_methodologist_id: number | null
  target_audience: string | null
  goals: string | null
  short_description: string | null
  duration_days: number | null
  duration_hours: number | null
  participant_count: number | null
  is_in_application_campaign: boolean
  central_office_format_code: string | null
  main_department_format_code: string | null
  annual_budget_item_id: number | null
}

export type ProjectInsert = {
  id?: number
  name: string
  audit_index?: string | null
  weight?: number | null
  status_code?: string
  project_type_id?: number | null
  parent_project_id?: number | null
  module_position?: number | null
  customer?: string | null
  lead_methodologist_id?: number | null
  target_audience?: string | null
  goals?: string | null
  short_description?: string | null
  duration_days?: number | null
  duration_hours?: number | null
  participant_count?: number | null
  is_in_application_campaign?: boolean
  central_office_format_code?: string | null
  main_department_format_code?: string | null
  annual_budget_item_id?: number | null
}

export type TrainerCertificationRow = {
  id: number
  trainer_id: number
  project_id: number
  status_code: string
  valid_from: string | null
  valid_until: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type TrainerCertificationInsert = {
  id?: number
  trainer_id: number
  project_id: number
  status_code?: string
  valid_from?: string | null
  valid_until?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
}

export type ProjectMaterialRow = {
  id: number
  project_id: number
  type_code: string
  status_code: string
  title: string | null
  location: string | null
  description: string | null
  created_at: string
  updated_at: string
}

export type ProjectMaterialInsert = {
  id?: number
  project_id: number
  type_code: string
  status_code?: string
  title?: string | null
  location?: string | null
  description?: string | null
  created_at?: string
  updated_at?: string
}

export type ProductionCalendarDayRow = {
  id: number
  event_date: string
  day_type: 'holiday' | 'working_saturday'
  name: string
  created_at: string
  updated_at: string
}

export type ProductionCalendarDayInsert = {
  id?: number
  event_date: string
  day_type: 'holiday' | 'working_saturday'
  name: string
  created_at?: string
  updated_at?: string
}

export type WorkNormSettingRow = {
  year: number
  training_days_per_trainer_week: number
  created_at: string
  updated_at: string
}

export type WorkNormSettingInsert = {
  year: number
  training_days_per_trainer_week?: number
  created_at?: string
  updated_at?: string
}

export type TrainerProjectRow = {
  id: number
  trainer_id: number
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
  event_group_id: string | null
  source_type: string | null
  source_file: string | null
  source_schedule_key: string | null
  source_sheet: string | null
  source_range: string | null
  source_event_key: string | null
  is_duplicate: boolean
  task_desc: string | null
  comments: string | null
}

export type TrainerProjectInsert = {
  id?: number
  trainer_id: number
  project_type_id?: number | null
  project_main_id?: number | null
  project_sub?: string | null
  role_id?: number | null
  activity_type_id?: number | null
  delivery_format_id?: number | null
  recurrence_type_id?: number | null
  start_datetime?: string | null
  end_datetime?: string | null
  start_date?: string | null
  end_date?: string | null
  event_group_id?: string | null
  source_type?: string | null
  source_file?: string | null
  source_schedule_key?: string | null
  source_sheet?: string | null
  source_range?: string | null
  source_event_key?: string | null
  is_duplicate?: boolean
  task_desc?: string | null
  comments?: string | null
}

export type Database = {
  public: {
    Tables: {
      trainers: TableDefinition<
        TrainerRow,
        TrainerInsert
      >
      roles: TableDefinition<NamedWeightedRow, NamedWeightedInsert>
      project_types: TableDefinition<NamedWeightedRow, NamedWeightedInsert>
      project_names: TableDefinition<ProjectRow, ProjectInsert>
      activity_types: TableDefinition<ClassifiedRow, ClassifiedInsert>
      delivery_formats: TableDefinition<ClassifiedRow, ClassifiedInsert>
      recurrence_types: TableDefinition<ClassifiedRow, ClassifiedInsert>
      trainer_projects: TableDefinition<TrainerProjectRow, TrainerProjectInsert>
      cities: TableDefinition<ActiveNamedRow, ActiveNamedInsert>
      divisions: TableDefinition<ActiveNamedRow, ActiveNamedInsert>
      directions: TableDefinition<
        ActiveNamedRow & { description: string | null },
        ActiveNamedInsert & { description?: string | null }
      >
      project_statuses: TableDefinition<
        CodeDictionaryRow & { is_terminal: boolean },
        CodeDictionaryInsert & { is_terminal?: boolean }
      >
      project_delivery_formats: TableDefinition<CodeDictionaryRow, CodeDictionaryInsert>
      annual_budget_items: TableDefinition<ActiveNamedRow, ActiveNamedInsert>
      certification_statuses: TableDefinition<
        CodeDictionaryRow & { grants_access: boolean },
        CodeDictionaryInsert & { grants_access?: boolean }
      >
      material_types: TableDefinition<CodeDictionaryRow, CodeDictionaryInsert>
      material_statuses: TableDefinition<
        CodeDictionaryRow & { is_complete: boolean },
        CodeDictionaryInsert & { is_complete?: boolean }
      >
      project_direction_links: TableDefinition<
        { project_id: number; direction_id: number },
        { project_id: number; direction_id: number }
      >
      trainer_certifications: TableDefinition<
        TrainerCertificationRow,
        TrainerCertificationInsert
      >
      project_materials: TableDefinition<ProjectMaterialRow, ProjectMaterialInsert>
      production_calendar_days: TableDefinition<
        ProductionCalendarDayRow,
        ProductionCalendarDayInsert
      >
      work_norm_settings: TableDefinition<WorkNormSettingRow, WorkNormSettingInsert>
    }
    Views: {
      trainer_effective_project_access: {
        Row: {
          trainer_id: number | null
          project_id: number | null
          granted_by_project_id: number | null
          certification_id: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      save_project_card: {
        Args: {
          p_project_id: number | null
          p_payload: Json
          p_direction_ids?: number[]
        }
        Returns: number
      }
      save_trainer_activity: {
        Args: {
          p_record_id: number | null
          p_trainer_id: number
          p_participant_ids: number[]
          p_can_manage_participants: boolean
          p_payload: Json
        }
        Returns: undefined
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
