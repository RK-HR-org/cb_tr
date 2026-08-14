import { supabase } from '../../../shared/api/supabase'
import type {
  DictionaryPayload,
  DictionaryRecord,
  DictionaryTable,
} from '../model/types'

export async function listDictionary(table: DictionaryTable): Promise<DictionaryRecord[]> {
  if (table === 'project_names') {
    const { data, error } = await supabase
      .from('project_names')
      .select(`
        id, name, audit_index, weight, status_code, project_type_id,
        parent_project_id, is_in_application_campaign
      `)
      .order('id', { ascending: true })
    if (error) throw error
    return (data || []) as DictionaryRecord[]
  }

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .order('id', { ascending: true })
  if (error) throw error
  return (data || []) as DictionaryRecord[]
}

export async function saveDictionaryRecord(
  table: DictionaryTable,
  payload: DictionaryPayload,
  id?: number | null,
): Promise<void> {
  const result = id
    ? await supabase.from(table).update(payload).eq('id', id)
    : await supabase.from(table).insert(payload as never)
  if (result.error) throw result.error
}

export async function deleteDictionaryRecord(
  table: DictionaryTable,
  id: number,
): Promise<void> {
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw error
}
