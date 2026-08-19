import { supabase } from '../../../shared/api/supabase'
import { toLocalDateString, parseLocalDate } from '../../../shared/lib/date'
import type {
  PlannedModule,
  ProgramCalendarMode,
  ProgramGapUnit,
  ProgramScheduleDraft,
  ProductionCalendarOverride,
  ScheduleableProject,
  OccupiedDateRange,
} from '../model/types'

function clone(date: Date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()) }
function addDays(date: Date, days: number) { const result = clone(date); result.setDate(result.getDate() + days); return result }
function sameWeekdayOnOrAfter(date: Date, weekday: number) {
  const result = clone(date)
  result.setDate(result.getDate() + ((weekday - result.getDay() + 7) % 7))
  return result
}
function isWorking(date: Date, holidays: Set<string>, workingSaturdays: Set<string>) {
  const key = toLocalDateString(date)
  if (workingSaturdays.has(key)) return true
  if (holidays.has(key)) return false
  return date.getDay() !== 0 && date.getDay() !== 6
}
function nextAvailable(date: Date, weekday: number, mode: ProgramCalendarMode, holidays: Set<string>, workingSaturdays: Set<string>, after?: Date) {
  let result = sameWeekdayOnOrAfter(date, weekday)
  while (after && result <= after) result = addDays(result, weekday === 0 || weekday === 6 ? 1 : 7)
  if (mode === 'calendar') return result
  if (weekday === 0 || weekday === 6) {
    while (!isWorking(result, holidays, workingSaturdays)) result = addDays(result, 1)
  } else {
    while (!isWorking(result, holidays, workingSaturdays)) result = addDays(result, 7)
  }
  return result
}
function addDuration(start: Date, duration: number, mode: ProgramCalendarMode, holidays: Set<string>, workingSaturdays: Set<string>) {
  const days = Math.max(1, Math.ceil(duration || 1))
  if (mode === 'calendar') return addDays(start, days - 1)
  let cursor = clone(start)
  let count = 1
  while (count < days) {
    cursor = addDays(cursor, 1)
    if (isWorking(cursor, holidays, workingSaturdays)) count += 1
  }
  return cursor
}
function overlapsOccupied(start: Date, end: Date, occupied: OccupiedDateRange[]) {
  const startKey = toLocalDateString(start)
  const endKey = toLocalDateString(end)
  return occupied.some(range => range.start_date <= endKey && range.end_date >= startKey)
}

function monthAnchor(previousStart: Date, value: number, unit: ProgramGapUnit, weekday: number) {
  const months = unit === 'quarters' ? value * 3 : value
  const target = new Date(previousStart.getFullYear(), previousStart.getMonth() + months, 1)
  return sameWeekdayOnOrAfter(target, weekday)
}

export function calculateProgramSchedule(
  modules: ScheduleableProject[],
  startDate: string,
  gapValue: number,
  gapUnit: ProgramGapUnit,
  calendarMode: ProgramCalendarMode,
  overrides: ProductionCalendarOverride[] = [],
  occupied: OccupiedDateRange[] = [],
): PlannedModule[] {
  const first = parseLocalDate(startDate)
  if (!first) throw new Error('Укажите корректную дату начала программы')
  const holidayDates = new Set(overrides.filter(item => item.day_type === 'holiday').map(item => item.event_date))
  const workingSaturdayDates = new Set(overrides.filter(item => item.day_type === 'working_saturday').map(item => item.event_date))
  const ordered = [...modules].sort((a, b) => (a.module_position ?? 999) - (b.module_position ?? 999) || a.id - b.id)
  const result: PlannedModule[] = []
  let previousStart: Date | null = null
  let previousEnd: Date | null = null
  const weekday = first.getDay()

  for (const module of ordered) {
    if (!module.duration_days || module.duration_days <= 0) {
      throw new Error(`Укажите длительность модуля «${module.name}» в днях`)
    }
    let plannedStart: Date
    if (!previousStart || !previousEnd) {
      plannedStart = calendarMode === 'working'
        ? nextAvailable(first, weekday, calendarMode, holidayDates, workingSaturdayDates)
        : clone(first)
    } else if (gapUnit === 'months' || gapUnit === 'quarters') {
      const nominal = monthAnchor(previousStart, Math.max(0, gapValue), gapUnit, weekday)
      plannedStart = nextAvailable(nominal, weekday, calendarMode, holidayDates, workingSaturdayDates, previousEnd)
    } else {
      const nominal = addDays(previousEnd, 1 + Math.max(0, gapValue) * (gapUnit === 'weeks' ? 7 : 1))
      plannedStart = nextAvailable(nominal, weekday, calendarMode, holidayDates, workingSaturdayDates, previousEnd)
    }
    let plannedEnd = addDuration(plannedStart, module.duration_days, calendarMode, holidayDates, workingSaturdayDates)
    while (overlapsOccupied(plannedStart, plannedEnd, occupied)) {
      plannedStart = addDays(plannedStart, 7)
      if (calendarMode === 'working') {
        while (!isWorking(plannedStart, holidayDates, workingSaturdayDates)) plannedStart = addDays(plannedStart, 7)
      }
      plannedEnd = addDuration(plannedStart, module.duration_days, calendarMode, holidayDates, workingSaturdayDates)
    }
    result.push({
      module_project_id: module.id,
      module_position: module.module_position,
      name: module.name,
      duration_days: Number(module.duration_days),
      planned_start_date: toLocalDateString(plannedStart),
      planned_end_date: toLocalDateString(plannedEnd),
    })
    previousStart = plannedStart
    previousEnd = plannedEnd
  }
  return result
}

export async function saveProgramSchedule(draft: ProgramScheduleDraft): Promise<number> {
  const { data, error } = await supabase.rpc('save_program_schedule', {
    p_program_project_id: draft.program_project_id,
    p_start_date: draft.start_date,
    p_gap_value: draft.gap_value,
    p_gap_unit: draft.gap_unit,
    p_calendar_mode: draft.calendar_mode,
    p_modules: draft.modules.map(({ name: _name, ...module }) => module),
  })
  if (error) throw error
  return Number(data)
}

export async function listOccupiedProgramScheduleDates(): Promise<OccupiedDateRange[]> {
  const { data, error } = await supabase
    .from('admin_calendar_events')
    .select('start_date, end_date, start_datetime, end_datetime')
  if (error) throw error
  return (data || []).map(row => ({
    start_date: row.start_date || String(row.start_datetime || '').slice(0, 10),
    end_date: row.end_date || String(row.end_datetime || '').slice(0, 10),
  })).filter(row => row.start_date && row.end_date)
}
