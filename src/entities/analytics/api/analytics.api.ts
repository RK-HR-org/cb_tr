import { supabase } from '../../../shared/api/supabase'

export type NamedItem = { id: number; name: string }
export type TrainerSummary = { id: number; full_name: string }
export type AnalyticsEntry = {
  trainer_id: number
  role_id: number | null
  project_type_id: number | null
  project_main_id: number | null
}

export async function getDashboardAnalyticsData() {
  const results = await Promise.all([
    supabase.from('roles').select('id, name'),
    supabase.from('trainers').select('id, full_name'),
    supabase.from('trainer_projects').select('trainer_id, role_id, project_type_id, project_main_id'),
    supabase.from('project_types').select('id, name'),
    supabase.from('project_names').select('id, name'),
  ])
  const error = results.find(result => result.error)?.error
  if (error) throw error
  return {
    roles: (results[0].data || []) as NamedItem[],
    trainers: (results[1].data || []) as TrainerSummary[],
    entries: (results[2].data || []) as AnalyticsEntry[],
    projectTypes: (results[3].data || []) as NamedItem[],
    projects: (results[4].data || []) as NamedItem[],
  }
}

export async function getTrainerRoleMatrixData() {
  const results = await Promise.all([
    supabase.from('trainers').select('id, full_name').order('full_name'),
    supabase.from('trainer_projects').select('*', { count: 'exact', head: true }),
    supabase.from('project_types').select('*', { count: 'exact', head: true }),
    supabase.from('roles').select('id, name').order('id'),
    supabase.from('trainer_projects').select('trainer_id, role_id'),
  ])
  const error = results.find(result => result.error)?.error
  if (error) throw error
  return {
    trainers: (results[0].data || []) as TrainerSummary[],
    activityCount: results[1].count || 0,
    projectTypeCount: results[2].count || 0,
    roles: (results[3].data || []) as NamedItem[],
    assignments: (results[4].data || []) as Array<{ trainer_id: number; role_id: number | null }>,
  }
}
