import { supabase } from '../../../shared/api/supabase'
import type {
  AnnualBudgetItem,
  Project,
  ProjectDirection,
  ProjectPayload,
  ProjectReference,
  ProjectType,
} from '../model/types'

const PROJECT_FIELDS = `
  id, name, audit_index, weight, status_code, project_type_id, parent_project_id, module_position,
  customer, lead_methodologist_id, target_audience, goals, short_description,
  duration_days, duration_hours, participant_count, central_office_format_code,
  main_department_format_code, annual_budget_item_id,
  project_type:project_types!project_names_project_type_id_fkey (id, name),
  parent_project:project_names!parent_project_id (id, name),
  lead_methodologist:trainers!project_names_lead_methodologist_id_fkey (id, full_name),
  project_direction_links (
    direction_id,
    directions (name)
  )
`

function projectSaveError(error: unknown) {
  const value = error as { code?: string; message?: string }
  const errorMessage = value?.message || ''
  if (value?.code === '23505' && errorMessage.includes('audit_index')) {
    return new Error('Проект с таким индексом уже существует.')
  }
  if (value?.code === '23514') {
    if (errorMessage.includes('Modules can only be added')) {
      return new Error('Модули можно добавлять только в проект типа «Модульная программа».')
    }
    if (errorMessage.includes('A project with modules')) {
      return new Error('Нельзя изменить тип проекта, пока в нём есть модули.')
    }
  }

  if (errorMessage.includes('project_type_id')) {
    return new Error(
      'Схема базы данных не соответствует версии приложения. Обратитесь к администратору.',
    )
  }

  if (errorMessage.includes('duration_days') || errorMessage.includes('duration_hours')) {
    return new Error(
      'Схема базы данных не соответствует версии приложения. Обратитесь к администратору.',
    )
  }

  const missingSchema = value?.code === '42703'
    || value?.code === 'PGRST204'
    || value?.code === 'PGRST205'
    || errorMessage.includes('does not exist')
    || errorMessage.includes('schema cache')

  if (missingSchema) {
    return new Error(
      'Схема базы данных не соответствует версии приложения. Обратитесь к администратору.',
    )
  }

  return error
}

export async function listProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('project_names')
    .select(PROJECT_FIELDS)
    .order('parent_project_id', { ascending: true, nullsFirst: true })
    .order('module_position', { ascending: true, nullsFirst: false })
    .order('name')
  if (error) throw projectSaveError(error)
  return (data || []) as unknown as Project[]
}

export async function listProjectTypes(): Promise<ProjectType[]> {
  const { data, error } = await supabase
    .from('project_types')
    .select('id, name, weight')
    .order('name')
  if (error) throw error
  return (data || []) as ProjectType[]
}

export async function getProject(id: number | string): Promise<Project | null> {
  const projectId = Number(id)
  const { data, error } = await supabase
    .from('project_names')
    .select(PROJECT_FIELDS)
    .eq('id', projectId)
    .maybeSingle()
  if (error) throw projectSaveError(error)
  return data as unknown as Project | null
}

export async function listProjectStatuses(): Promise<ProjectReference[]> {
  const { data, error } = await supabase
    .from('project_statuses')
    .select('code, name')
    .eq('is_active', true)
    .order('sort_order')
  if (error) throw error
  return data || []
}

export async function listProjectDeliveryFormats(): Promise<ProjectReference[]> {
  const { data, error } = await supabase
    .from('project_delivery_formats')
    .select('code, name')
    .eq('is_active', true)
    .order('sort_order')
  if (error) throw error
  return data || []
}

export async function listAnnualBudgetItems(): Promise<AnnualBudgetItem[]> {
  const { data, error } = await supabase
    .from('annual_budget_items')
    .select('id, name')
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return data || []
}

export async function listDirections(): Promise<ProjectDirection[]> {
  const { data, error } = await supabase
    .from('directions')
    .select('id, name')
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return data || []
}

export async function saveProject(
  payload: ProjectPayload,
  id?: number | null,
): Promise<Project> {
  const { direction_ids: directionIds, ...projectPayload } = payload
  const { data: projectId, error } = await supabase.rpc('save_project_card', {
    p_project_id: id ?? null,
    p_payload: projectPayload,
    p_direction_ids: directionIds,
  })
  if (error) throw projectSaveError(error)

  const project = await getProject(projectId)
  if (!project) throw new Error('Сохранённый проект не найден')
  return project
}
