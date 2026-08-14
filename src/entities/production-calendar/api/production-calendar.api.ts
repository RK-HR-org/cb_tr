import { supabase } from '../../../shared/api/supabase'
import type {
  ProductionCalendarDay,
  ProductionCalendarDayPayload,
  WorkNormSetting,
} from '../model/types'

function calendarError(error: unknown) {
  const value = error as { code?: string; message?: string }
  if (value?.code === '23505') {
    return new Error('На эту дату уже добавлено событие производственного календаря.')
  }
  if (value?.code === 'PGRST205'
    || value?.message?.includes('production_calendar_days')
    || value?.message?.includes('work_norm_settings')) {
    return new Error('Схема базы данных не соответствует версии приложения. Обратитесь к администратору.')
  }
  return error
}

export async function listProductionCalendarDays(): Promise<ProductionCalendarDay[]> {
  const { data, error } = await supabase
    .from('production_calendar_days')
    .select('id, event_date, day_type, name, created_at, updated_at')
    .order('event_date')
  if (error) throw calendarError(error)
  return data || []
}

export async function saveProductionCalendarDay(
  payload: ProductionCalendarDayPayload,
  id?: number | null,
): Promise<ProductionCalendarDay> {
  const result = id
    ? await supabase
        .from('production_calendar_days')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('id, event_date, day_type, name, created_at, updated_at')
        .single()
    : await supabase
        .from('production_calendar_days')
        .insert(payload)
        .select('id, event_date, day_type, name, created_at, updated_at')
        .single()
  if (result.error) throw calendarError(result.error)
  return result.data
}

export async function deleteProductionCalendarDay(id: number): Promise<void> {
  const { error } = await supabase
    .from('production_calendar_days')
    .delete()
    .eq('id', id)
  if (error) throw calendarError(error)
}

export async function getWorkNormSetting(year: number): Promise<WorkNormSetting | null> {
  const { data, error } = await supabase
    .from('work_norm_settings')
    .select('year, training_days_per_trainer_week, created_at, updated_at')
    .eq('year', year)
    .maybeSingle()
  if (error) throw calendarError(error)
  return data
    ? {
        ...data,
        training_days_per_trainer_week: Number(data.training_days_per_trainer_week),
      }
    : null
}

export async function saveWorkNormSetting(
  year: number,
  trainingDaysPerTrainerWeek: number,
): Promise<WorkNormSetting> {
  const { data, error } = await supabase
    .from('work_norm_settings')
    .upsert({
      year,
      training_days_per_trainer_week: trainingDaysPerTrainerWeek,
      updated_at: new Date().toISOString(),
    })
    .select('year, training_days_per_trainer_week, created_at, updated_at')
    .single()
  if (error) throw calendarError(error)
  return {
    ...data,
    training_days_per_trainer_week: Number(data.training_days_per_trainer_week),
  }
}

export async function getWorkNormCounters(): Promise<{
  trainerCount: number
  applicationProgramCount: number
}> {
  const [trainerResult, projectResult] = await Promise.all([
    supabase.from('trainers').select('id', { count: 'exact', head: true }),
    supabase
      .from('project_names')
      .select('id', { count: 'exact', head: true })
      .eq('is_in_application_campaign', true)
      .is('parent_project_id', null),
  ])

  if (trainerResult.error) throw trainerResult.error
  if (projectResult.error) throw projectResult.error
  return {
    trainerCount: trainerResult.count || 0,
    applicationProgramCount: projectResult.count || 0,
  }
}
