import { supabase } from '../../../shared/api/supabase'
import type {
  CertificationStatus,
  TrainerCertification,
  TrainerCertificationPayload,
} from '../model/types'

const CERTIFICATION_FIELDS = `
  id, trainer_id, project_id, status_code, valid_from, valid_until, notes,
  project_names (name),
  certification_statuses (name, grants_access)
`

function certificationSaveError(error: unknown) {
  const value = error as { code?: string; message?: string }
  if (value?.code === '23505') {
    return new Error('Допуск к этому проекту у тренера уже существует.')
  }
  if (value?.code === '23514') {
    return new Error('Дата окончания допуска не может быть раньше даты начала.')
  }
  if (value?.code === '23503') {
    return new Error('Выбранный проект или статус больше не существует.')
  }
  return error
}

export async function listCertificationStatuses(): Promise<CertificationStatus[]> {
  const { data, error } = await supabase
    .from('certification_statuses')
    .select('code, name, grants_access')
    .eq('is_active', true)
    .order('sort_order')
  if (error) throw error
  return data || []
}

export async function listTrainerCertifications(
  trainerId: number,
): Promise<TrainerCertification[]> {
  const { data, error } = await supabase
    .from('trainer_certifications')
    .select(CERTIFICATION_FIELDS)
    .eq('trainer_id', trainerId)
    .order('id')
  if (error) throw error
  return (data || []) as unknown as TrainerCertification[]
}

export async function saveTrainerCertification(
  payload: TrainerCertificationPayload,
  id?: number | null,
): Promise<void> {
  const result = id
    ? await supabase
        .from('trainer_certifications')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
    : await supabase
        .from('trainer_certifications')
        .insert(payload)
  if (result.error) throw certificationSaveError(result.error)
}

export async function deleteTrainerCertification(id: number): Promise<void> {
  const { error } = await supabase
    .from('trainer_certifications')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function listEffectiveProjectIds(
  trainerId: number,
): Promise<number[]> {
  const { data, error } = await supabase
    .from('trainer_effective_project_access')
    .select('project_id')
    .eq('trainer_id', trainerId)
  if (error) throw error
  return (data || [])
    .map(row => row.project_id)
    .filter((projectId): projectId is number => projectId !== null)
}
