export type DictionaryTable =
  | 'trainers'
  | 'roles'
  | 'project_types'
  | 'project_names'
  | 'activity_types'
  | 'delivery_formats'
  | 'recurrence_types'

export type DictionaryRecord = {
  id: number
  name?: string
  full_name?: string
  description?: string | null
  weight?: number | null
  is_active?: boolean | null
}

export type DictionaryPayload = Omit<DictionaryRecord, 'id'> & Record<
  string,
  string | number | boolean | null | undefined
>
