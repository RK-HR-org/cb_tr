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
        { id: number; full_name: string },
        { id?: number; full_name: string }
      >
      roles: TableDefinition<NamedWeightedRow, NamedWeightedInsert>
      project_types: TableDefinition<NamedWeightedRow, NamedWeightedInsert>
      project_names: TableDefinition<NamedWeightedRow, NamedWeightedInsert>
      activity_types: TableDefinition<ClassifiedRow, ClassifiedInsert>
      delivery_formats: TableDefinition<ClassifiedRow, ClassifiedInsert>
      recurrence_types: TableDefinition<ClassifiedRow, ClassifiedInsert>
      trainer_projects: TableDefinition<TrainerProjectRow, TrainerProjectInsert>
    }
    Views: Record<string, never>
    Functions: {
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
