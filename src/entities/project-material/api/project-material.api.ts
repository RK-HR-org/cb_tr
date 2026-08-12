import { supabase } from '../../../shared/api/supabase'
import type {
  MaterialReference,
  ProjectMaterial,
  ProjectMaterialPayload,
} from '../model/types'

const MATERIAL_FIELDS = `
  id, project_id, type_code, status_code, title, location, description,
  material_types (name),
  material_statuses (name)
`

function materialApiError(error: unknown) {
  const value = error as { code?: string; message?: string }
  if (value?.code === 'PGRST205' || value?.message?.includes('project_materials')) {
    return new Error(
      'Схема базы данных не соответствует версии приложения. Обратитесь к администратору.',
    )
  }
  return error
}

export async function listMaterialTypes(): Promise<MaterialReference[]> {
  const { data, error } = await supabase
    .from('material_types')
    .select('code, name')
    .eq('is_active', true)
    .order('sort_order')
  if (error) throw materialApiError(error)
  return data || []
}

export async function listMaterialStatuses(): Promise<MaterialReference[]> {
  const { data, error } = await supabase
    .from('material_statuses')
    .select('code, name')
    .eq('is_active', true)
    .order('sort_order')
  if (error) throw materialApiError(error)
  return data || []
}

export async function listProjectMaterials(
  projectId: number,
): Promise<ProjectMaterial[]> {
  const { data, error } = await supabase
    .from('project_materials')
    .select(MATERIAL_FIELDS)
    .eq('project_id', projectId)
    .order('id')
  if (error) throw materialApiError(error)
  return (data || []) as unknown as ProjectMaterial[]
}

export async function saveProjectMaterial(
  payload: ProjectMaterialPayload,
  id?: number | null,
): Promise<void> {
  const result = id
    ? await supabase
        .from('project_materials')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
    : await supabase.from('project_materials').insert(payload)
  if (result.error) throw materialApiError(result.error)
}

export async function deleteProjectMaterial(id: number): Promise<void> {
  const { error } = await supabase
    .from('project_materials')
    .delete()
    .eq('id', id)
  if (error) throw materialApiError(error)
}
