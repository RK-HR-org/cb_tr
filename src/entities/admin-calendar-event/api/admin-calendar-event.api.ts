import { supabase } from '../../../shared/api/supabase'
import { toLocalDateString } from '../../../shared/lib/date'
import { listProductionCalendarDays } from '../../production-calendar'
import { formSchedulePayload } from '../model/form'
import type {
  AdminCalendarEventFormValues,
  AdminCalendarEventListItem,
  AdminCalendarEventPayload,
  AdminCalendarEventRecord,
  RecurrenceKind,
} from '../model/types'

const EVENT_FIELDS = `
  id, series_id, copied_from_event_id, trainer_event_group_id, program_schedule_id, program_schedule_module_id, project_main_id, activity_type_id,
  delivery_format_id, recurrence_type_id, title, required_trainer_count,
  start_datetime, end_datetime, start_date, end_date, recurrence_until,
  occurrence_index, description, comments, created_at, updated_at
`

const EVENT_LIST_FIELDS = `
  ${EVENT_FIELDS},
  project_names (name, color), activity_types (name), delivery_formats (name), recurrence_types (name)
`

export async function listAdminCalendarEvents(): Promise<AdminCalendarEventListItem[]> {
  const { data, error } = await supabase
    .from('admin_calendar_events')
    .select(EVENT_LIST_FIELDS)
    .order('start_date', { ascending: true, nullsFirst: false })
    .order('start_datetime', { ascending: true, nullsFirst: false })
    .order('id', { ascending: true })
  if (error) throw error
  return (data || []) as unknown as AdminCalendarEventListItem[]
}

export async function getAdminCalendarEvent(id: number): Promise<AdminCalendarEventRecord> {
  const { data, error } = await supabase
    .from('admin_calendar_events')
    .select(EVENT_FIELDS)
    .eq('id', id)
    .single()
  if (error) throw error
  return data as unknown as AdminCalendarEventRecord
}

export async function getAdminCalendarEventTrainerIds(id: number): Promise<number[]> {
  const { data, error } = await supabase
    .from('admin_calendar_event_trainers')
    .select('trainer_id')
    .eq('event_id', id)
  if (error) throw error
  return (data || []).map(row => row.trainer_id)
}

export async function listFutureAdminCalendarEventIds(id: number): Promise<number[]> {
  const event = await getAdminCalendarEvent(id)
  if (!event.recurrence_until) return [id]
  const { data, error } = await supabase
    .from('admin_calendar_events')
    .select('id, start_datetime, start_date')
    .eq('series_id', event.series_id)
  if (error) throw error
  const now = new Date()
  const today = toLocalDateString(now)
  return (data || []).filter(row => row.start_datetime
    ? new Date(row.start_datetime) >= now
    : Boolean(row.start_date && row.start_date >= today)).map(row => row.id)
}

function cloneDate(value: Date): Date {
  return new Date(value.getTime())
}

function dateAtSameTime(source: Date, year: number, month: number, day: number): Date | null {
  const result = new Date(
    year,
    month,
    day,
    source.getHours(),
    source.getMinutes(),
    source.getSeconds(),
    source.getMilliseconds(),
  )
  return result.getFullYear() === year && result.getMonth() === month && result.getDate() === day
    ? result
    : null
}

function nextMonthlyOccurrence(
  source: Date,
  previousOffset: number,
  everyMonths: number,
): { date: Date; offset: number } {
  let offset = previousOffset + everyMonths
  while (true) {
    const absoluteMonth = source.getMonth() + offset
    const year = source.getFullYear() + Math.floor(absoluteMonth / 12)
    const month = ((absoluteMonth % 12) + 12) % 12
    const candidate = dateAtSameTime(source, year, month, source.getDate())
    if (candidate) return { date: candidate, offset }
    offset += everyMonths
  }
}

function eventDate(form: AdminCalendarEventFormValues, edge: 'start' | 'end'): Date {
  const value = form.schedule_mode === 'datetime'
    ? (edge === 'start' ? form.start_datetime : form.end_datetime)
    : (edge === 'start' ? form.start_date : form.end_date)
  return new Date(value!)
}

function isWorkingDate(
  date: Date,
  holidayDates: Set<string>,
  workingSaturdayDates: Set<string>,
): boolean {
  const key = toLocalDateString(date)
  if (workingSaturdayDates.has(key)) return true
  if (holidayDates.has(key)) return false
  const day = date.getDay()
  return day !== 0 && day !== 6
}

async function buildOccurrencePayloads(
  form: AdminCalendarEventFormValues,
  recurrenceKind: RecurrenceKind,
  copiedFromEventId: number | null,
): Promise<AdminCalendarEventPayload[]> {
  const seriesId = crypto.randomUUID()
  const initialStart = eventDate(form, 'start')
  const initialEnd = eventDate(form, 'end')
  const until = recurrenceKind === 'once'
    ? cloneDate(initialStart)
    : new Date(form.recurrence_until!)
  until.setHours(23, 59, 59, 999)

  const overrides = recurrenceKind === 'daily' ? await listProductionCalendarDays() : []
  const holidayDates = new Set(
    overrides.filter(day => day.day_type === 'holiday').map(day => day.event_date),
  )
  const workingSaturdayDates = new Set(
    overrides.filter(day => day.day_type === 'working_saturday').map(day => day.event_date),
  )

  const base = {
    series_id: seriesId,
    copied_from_event_id: copiedFromEventId,
    project_main_id: form.project_main_id,
    activity_type_id: form.activity_type_id,
    delivery_format_id: form.delivery_format_id,
    recurrence_type_id: form.recurrence_type_id,
    title: form.title.trim(),
    required_trainer_count: form.required_trainer_count!,
    recurrence_until: recurrenceKind === 'once'
      ? null
      : toLocalDateString(new Date(form.recurrence_until!)),
    description: form.description.trim(),
    comments: form.comments.trim(),
  }

  const durationMs = initialEnd.getTime() - initialStart.getTime()
  const allDayDuration = Math.round(durationMs / 86400000)
  const occurrences: AdminCalendarEventPayload[] = []
  let step = 0
  let monthOffset = 0

  while (occurrences.length < 400) {
    let start: Date
    if (recurrenceKind === 'daily') {
      start = cloneDate(initialStart)
      start.setDate(start.getDate() + step)
    } else if (recurrenceKind === 'weekly') {
      start = cloneDate(initialStart)
      start.setDate(start.getDate() + step * 7)
    } else if (recurrenceKind === 'monthly' || recurrenceKind === 'quarterly') {
      if (step === 0) {
        start = cloneDate(initialStart)
      } else {
        const next = nextMonthlyOccurrence(
          initialStart,
          monthOffset,
          recurrenceKind === 'monthly' ? 1 : 3,
        )
        start = next.date
        monthOffset = next.offset
      }
    } else {
      start = cloneDate(initialStart)
    }
    if (start > until) break

    const include = recurrenceKind !== 'daily'
      || step === 0
      || isWorkingDate(start, holidayDates, workingSaturdayDates)
    if (include) {
      const end = form.schedule_mode === 'datetime'
        ? new Date(start.getTime() + durationMs)
        : (() => {
            const value = cloneDate(start)
            value.setDate(value.getDate() + allDayDuration)
            return value
          })()
      const schedule = form.schedule_mode === 'datetime'
        ? {
            start_datetime: start.toISOString(),
            end_datetime: end.toISOString(),
            start_date: null,
            end_date: null,
          }
        : {
            start_datetime: null,
            end_datetime: null,
            start_date: toLocalDateString(start),
            end_date: toLocalDateString(end),
          }
      occurrences.push({
        ...base,
        ...schedule,
        occurrence_index: occurrences.length,
      })
    }

    if (recurrenceKind === 'once') break
    step += 1
  }

  if (!occurrences.length) throw new Error('Не удалось сформировать даты повторяющегося мероприятия')
  if (occurrences.length >= 400) {
    throw new Error('Серия содержит больше 400 мероприятий. Сократите период повторения')
  }
  return occurrences
}

export async function saveAdminCalendarEvent(command: {
  recordId: number | null
  copiedFromEventId: number | null
  form: AdminCalendarEventFormValues
  recurrenceKind: RecurrenceKind
}): Promise<{ count: number; eventIds: number[] }> {
  if (command.recordId) {
    const current = await getAdminCalendarEvent(command.recordId)
    const schedule = formSchedulePayload(command.form)
    const { error } = await supabase
      .from('admin_calendar_events')
      .update({
        project_main_id: command.form.project_main_id,
        activity_type_id: command.form.activity_type_id,
        delivery_format_id: command.form.delivery_format_id,
        recurrence_type_id: command.form.recurrence_type_id,
        title: command.form.title.trim(),
        required_trainer_count: command.form.required_trainer_count!,
        recurrence_until: current.recurrence_until,
        description: command.form.description.trim(),
        comments: command.form.comments.trim(),
        updated_at: new Date().toISOString(),
        ...schedule,
      })
      .eq('id', command.recordId)
    if (error) throw error
    return { count: 1, eventIds: [command.recordId] }
  }

  const rows = await buildOccurrencePayloads(
    command.form,
    command.recurrenceKind,
    command.copiedFromEventId,
  )
  const { data, error } = await supabase.from('admin_calendar_events').insert(rows).select('id')
  if (error) throw error
  return { count: rows.length, eventIds: (data || []).map(row => row.id) }
}

export async function syncAdminCalendarEventTrainers(
  eventIds: number[],
  trainerIds: number[],
): Promise<void> {
  if (!eventIds.length) return
  const { error } = await supabase.rpc('sync_admin_calendar_event_trainers', {
    p_event_ids: eventIds,
    p_trainer_ids: trainerIds,
  })
  if (error) throw error
}

export async function deleteAdminCalendarEvent(id: number, futureSeries = false): Promise<number> {
  if (futureSeries) {
    const { data, error } = await supabase.rpc('delete_admin_calendar_event_future_series', {
      p_event_id: id,
    })
    if (error) throw error
    return Number(data || 0)
  }
  const { data, error } = await supabase.rpc('delete_admin_calendar_events', {
    p_event_ids: [id],
  })
  if (error) throw error
  return Number(data || 0)
}

export async function updateAdminCalendarEventSchedule(
  id: number,
  patch: Pick<
    AdminCalendarEventPayload,
    'start_date' | 'end_date' | 'start_datetime' | 'end_datetime'
  >,
): Promise<void> {
  const { error } = await supabase
    .from('admin_calendar_events')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
