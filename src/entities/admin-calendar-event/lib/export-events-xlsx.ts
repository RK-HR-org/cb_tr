import * as XLSX from 'xlsx'
import {
  dateOnlyTimestamp,
  formatDateOnly,
  formatDateTime,
  parseLocalDate,
} from '../../../shared/lib/date'
import type { AdminCalendarEventListItem } from '../model/types'

export const DEFAULT_ADMIN_EVENTS_EXPORT_YEAR = 2027

const EXPORT_COLUMNS = [
  'Событие',
  'Дата начала',
  'Дата окончания',
  'Количество дней',
  'Количество тренеров',
  'Формат',
] as const

const MS_PER_DAY = 86400000

function getEventStartYear(event: AdminCalendarEventListItem): number | null {
  if (event.start_date) {
    return Number.parseInt(event.start_date.slice(0, 4), 10)
  }
  if (event.start_datetime) {
    return new Date(event.start_datetime).getFullYear()
  }
  return null
}

function getEventSortKey(event: AdminCalendarEventListItem): number {
  if (event.start_datetime) {
    return new Date(event.start_datetime).getTime()
  }
  if (event.start_date) {
    return dateOnlyTimestamp(event.start_date) ?? Number.MAX_SAFE_INTEGER
  }
  return Number.MAX_SAFE_INTEGER
}

function countInclusiveCalendarDays(start: Date, end: Date): number {
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  return Math.max(1, Math.round((endDay.getTime() - startDay.getTime()) / MS_PER_DAY) + 1)
}

function eventExportSchedule(event: AdminCalendarEventListItem): {
  start: string
  end: string
  days: number
} {
  if (event.start_datetime) {
    const start = new Date(event.start_datetime)
    const end = event.end_datetime ? new Date(event.end_datetime) : start
    return {
      start: formatDateTime(start),
      end: formatDateTime(end),
      days: countInclusiveCalendarDays(start, end),
    }
  }

  if (event.start_date) {
    const start = parseLocalDate(event.start_date)
    const end = parseLocalDate(event.end_date ?? event.start_date)
    if (!start || !end) {
      return { start: '-', end: '-', days: 1 }
    }
    return {
      start: formatDateOnly(event.start_date),
      end: formatDateOnly(event.end_date ?? event.start_date),
      days: countInclusiveCalendarDays(start, end),
    }
  }

  return { start: '-', end: '-', days: 1 }
}

export function filterAdminEventsForYear(
  events: AdminCalendarEventListItem[],
  year: number,
): AdminCalendarEventListItem[] {
  return events
    .filter(event => getEventStartYear(event) === year)
    .sort((left, right) => getEventSortKey(left) - getEventSortKey(right))
}

export function downloadAdminEventsXlsx(
  events: AdminCalendarEventListItem[],
  year = DEFAULT_ADMIN_EVENTS_EXPORT_YEAR,
): number {
  const rows = filterAdminEventsForYear(events, year).map(event => {
    const schedule = eventExportSchedule(event)
    return {
      'Событие': event.title,
      'Дата начала': schedule.start,
      'Дата окончания': schedule.end,
      'Количество дней': schedule.days,
      'Количество тренеров': event.required_trainer_count,
      'Формат': event.delivery_formats?.name?.trim() || '-',
    }
  })

  const worksheet = XLSX.utils.json_to_sheet(rows, { header: [...EXPORT_COLUMNS] })
  worksheet['!cols'] = [
    { wch: 40 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 22 },
    { wch: 24 },
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Мероприятия')
  XLSX.writeFile(workbook, `meropriyatiya-${year}.xlsx`)

  return rows.length
}
