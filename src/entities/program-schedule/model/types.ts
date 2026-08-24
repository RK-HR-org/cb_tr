import type { Project } from '../../project'
import type { ProductionCalendarDay } from '../../production-calendar'

export type ProgramGapUnit = 'days' | 'weeks' | 'months' | 'quarters'
export type ProgramCalendarMode = 'working' | 'calendar'

export type PlannedModule = {
  module_project_id: number
  module_position: number | null
  name: string
  duration_days: number
  planned_start_date: string
  planned_end_date: string
}

export type ProgramScheduleDraft = {
  program_project_id: number
  start_date: string
  gap_value: number
  gap_unit: ProgramGapUnit
  calendar_mode: ProgramCalendarMode
  modules: PlannedModule[]
}

export type ScheduleableProject = Pick<
  Project,
  'id' | 'name' | 'module_position' | 'duration_days' | 'parent_project_id'
>

export type ProductionCalendarOverride = Pick<ProductionCalendarDay, 'event_date' | 'day_type'>
export type OccupiedDateRange = { start_date: string; end_date: string }
