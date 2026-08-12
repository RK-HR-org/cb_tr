import { supabase } from '../../../shared/api/supabase'
import type { SelectOption } from '../../../shared/types'
import type {
  Trainer,
  TrainerPayload,
  TrainerReference,
} from '../model/types'

const TRAINER_FIELDS = `
  id, full_name, city_id, division_id,
  cities (name),
  divisions (name)
`

function trainerSaveError(error: unknown) {
  const value = error as { code?: string; message?: string }

  if (value?.code === '23505') {
    return new Error('Тренер с таким ФИО уже существует.')
  }
  if (value?.code === '23503') {
    return new Error('Выбранные город или подразделение больше не существуют.')
  }
  return error
}

export async function listTrainers(): Promise<Trainer[]> {
  const { data, error } = await supabase
    .from('trainers')
    .select(TRAINER_FIELDS)
    .order('full_name')
  if (error) throw error
  return (data || []) as unknown as Trainer[]
}

export async function getTrainer(id: number | string): Promise<Trainer | null> {
  const trainerId = Number(id)
  const { data, error } = await supabase
    .from('trainers')
    .select(TRAINER_FIELDS)
    .eq('id', trainerId)
    .maybeSingle()
  if (error) throw error
  return data as unknown as Trainer | null
}

export async function getTrainerOptions(): Promise<SelectOption[]> {
  return (await listTrainers()).map(trainer => ({
    label: trainer.full_name,
    value: trainer.id,
  }))
}

export async function saveTrainer(
  payload: TrainerPayload,
  id?: number | null,
): Promise<Trainer> {
  const query = id
    ? supabase.from('trainers').update(payload).eq('id', id)
    : supabase.from('trainers').insert(payload)
  const { data, error } = await query.select(TRAINER_FIELDS).single()
  if (error) throw trainerSaveError(error)
  return data as unknown as Trainer
}

export async function listCities(): Promise<TrainerReference[]> {
  const { data, error } = await supabase
    .from('cities')
    .select('id, name')
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return data || []
}

export async function listDivisions(): Promise<TrainerReference[]> {
  const { data, error } = await supabase
    .from('divisions')
    .select('id, name')
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return data || []
}
