import { supabase } from '../../../shared/api/supabase'
import type { Project, ProjectType } from '../model/types'

export async function listProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('project_names')
    .select('id, name, weight')
    .order('name')
  if (error) throw error
  return (data || []) as Project[]
}

export async function listProjectTypes(): Promise<ProjectType[]> {
  const { data, error } = await supabase
    .from('project_types')
    .select('id, name, weight')
    .order('name')
  if (error) throw error
  return (data || []) as ProjectType[]
}
