import { supabase } from '../../../shared/api/supabase'
import type {
  DictionaryPayload,
  DictionaryRecord,
  DictionaryTable,
} from '../model/types'

export async function listDictionary(table: DictionaryTable): Promise<DictionaryRecord[]> {
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
