import { supabase } from '../../../shared/api/supabase'
import type { SelectOption } from '../../../shared/types'
import type { Trainer } from '../model/types'

export async function listTrainers(): Promise<Trainer[]> {
  const { data, error } = await supabase
    .from('trainers')
    .select('id, full_name')
    .order('full_name')
  if (error) throw error
  return (data || []) as Trainer[]
}

export async function getTrainer(id: number | string): Promise<Trainer | null> {
  const trainerId = Number(id)
  const { data, error } = await supabase
    .from('trainers')
    .select('id, full_name')
    .eq('id', trainerId)
    .maybeSingle()
  if (error) throw error
  return data as Trainer | null
}

export async function getTrainerOptions(): Promise<SelectOption[]> {
  return (await listTrainers()).map(trainer => ({
    label: trainer.full_name,
    value: trainer.id,
  }))
}
