export type Project = {
  id: number
  name: string
  audit_index: string | null
  weight?: number | null
  status_code: string
  project_type_id: number | null
  parent_project_id: number | null
  module_position: number | null
  customer: string | null
  lead_methodologist_id: number | null
  target_audience: string | null
  goals: string | null
  short_description: string | null
  duration_days: number | null
  duration_hours: number | null
  participant_count: number | null
  central_office_format_code: string | null
  main_department_format_code: string | null
  annual_budget_item_id: number | null
  project_type?: { id: number; name: string } | null
  parent_project?: { id: number; name: string } | null
  lead_methodologist?: { id: number; full_name: string } | null
  project_direction_links?: Array<{
    direction_id: number
    directions?: { name: string } | null
  }>
}

export type ProjectPayload = {
  name: string
  audit_index: string | null
  weight: number | null
  status_code: string
  project_type_id: number
  parent_project_id: number | null
  module_position: number | null
  customer: string | null
  lead_methodologist_id: number | null
  target_audience: string | null
  goals: string | null
  short_description: string | null
  duration_days: number | null
  duration_hours: number | null
  participant_count: number | null
  central_office_format_code: string | null
  main_department_format_code: string | null
  annual_budget_item_id: number | null
  direction_ids: number[]
}

export type ProjectType = {
  id: number
  name: string
  weight?: number | null
}

export type ProjectReference = {
  code: string
  name: string
}

export type ProjectDirection = {
  id: number
  name: string
}

export type AnnualBudgetItem = {
  id: number
  name: string
}
