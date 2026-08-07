import { ref } from 'vue'
import { useMessage } from 'naive-ui'
import {
  deleteDictionaryRecord,
  listDictionary,
  saveDictionaryRecord,
  type DictionaryPayload,
  type DictionaryRecord,
  type DictionaryTable,
} from '../entities/dictionary'

/**
 * @deprecated Use an entity API directly. Kept as a compatibility adapter for
 * legacy dictionary components.
 */
export function useSupabaseTable<T extends DictionaryRecord = DictionaryRecord>(
  table: DictionaryTable | (() => DictionaryTable),
) {
  const message = useMessage()
  const items = ref<T[]>([])
  const loading = ref(false)
  const resolveTable = () => (typeof table === 'function' ? table() : table)

  async function load() {
    loading.value = true
    try {
      items.value = await listDictionary(resolveTable()) as T[]
      return items.value
    } catch (error: unknown) {
      message.error('Ошибка загрузки: ' + (error instanceof Error ? error.message : 'неизвестная ошибка'))
      return items.value
    } finally {
      loading.value = false
    }
  }

  async function save(
    payload: DictionaryPayload,
    id?: number | null,
    successMessage?: string,
  ) {
    loading.value = true
    try {
      await saveDictionaryRecord(resolveTable(), payload, id)
      message.success(successMessage || (id ? 'Запись обновлена' : 'Запись сохранена'))
      return true
    } catch (error: unknown) {
      message.error('Ошибка сохранения: ' + (error instanceof Error ? error.message : 'неизвестная ошибка'))
      return false
    } finally {
      loading.value = false
    }
  }

  async function remove(id: number, errorMessage?: string) {
    try {
      await deleteDictionaryRecord(resolveTable(), id)
      message.success('Запись удалена')
      return true
    } catch (error: unknown) {
      message.error(errorMessage || (error instanceof Error ? error.message : 'Ошибка удаления'))
      return false
    }
  }

  return { items, loading, load, save, remove }
}
