import * as XLSX from 'xlsx'
import { dateOnlyTimestamp, formatDateOnly, formatDateTime } from '../../../shared/lib/date'
import type { AdminCalendarEventListItem } from '../model/types'

export const DEFAULT_ADMIN_EVENTS_EXPORT_YEAR = 2027

const EXPORT_COLUMNS = ['Событие', 'Дата', 'Количество тренеров', 'Формат'] as const

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

function formatEventDate(event: AdminCalendarEventListItem): string {
  if (event.start_datetime) {
    return formatDateTime(event.start_datetime)
  }
  if (event.start_date) {
    return formatDateOnly(event.start_date)
  }
  return '-'
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
  const rows = filterAdminEventsForYear(events, year).map(event => ({
    'Событие': event.title,
    'Дата': formatEventDate(event),
    'Количество тренеров': event.required_trainer_count,
    'Формат': event.delivery_formats?.name?.trim() || '-',
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows, { header: [...EXPORT_COLUMNS] })
  worksheet['!cols'] = [
    { wch: 40 },
    { wch: 18 },
    { wch: 22 },
    { wch: 24 },
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Мероприятия')
  XLSX.writeFile(workbook, `meropriyatiya-${year}.xlsx`)

  return rows.length
}
