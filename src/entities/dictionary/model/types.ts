export type DictionaryTable =
  | 'trainers'
  | 'roles'
  | 'project_types'
  | 'project_names'
  | 'activity_types'
  | 'delivery_formats'
  | 'recurrence_types'
  | 'cities'
  | 'divisions'
  | 'directions'
  | 'annual_budget_items'

export type DictionaryRecord = {
  id: number
  name?: string
  full_name?: string
  audit_index?: string | null
  description?: string | null
  weight?: number | null
  is_active?: boolean | null
  project_type_id?: number | null
  status_code?: string | null
}

export type DictionaryPayload = Omit<DictionaryRecord, 'id'> & Record<
  string,
  string | number | boolean | null | undefined
>
