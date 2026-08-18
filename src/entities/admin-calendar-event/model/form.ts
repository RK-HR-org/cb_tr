import { dateOnlyTimestamp, toLocalDateString } from '../../../shared/lib/date'
import type {
  AdminCalendarEventFormValues,
  AdminCalendarEventRecord,
  AdminCalendarEventScheduleSeed,
  RecurrenceKind,
} from './types'

export function createAdminCalendarEventForm(
  seed: AdminCalendarEventScheduleSeed | null = null,
): AdminCalendarEventFormValues {
  return {
    title: '',
    project_main_id: null,
    activity_type_id: null,
    delivery_format_id: null,
    recurrence_type_id: null,
    trainer_ids: [],
    required_trainer_count: 1,
    schedule_mode: seed?.schedule_mode ?? 'datetime',
    start_date: seed?.start_date ?? null,
    end_date: seed?.end_date ?? null,
    start_datetime: seed?.start_datetime ?? null,
    end_datetime: seed?.end_datetime ?? null,
    recurrence_until: null,
    description: '',
    comments: '',
  }
}

export function adminCalendarEventToForm(
  record: AdminCalendarEventRecord,
): AdminCalendarEventFormValues {
  return {
    title: record.title,
    project_main_id: record.project_main_id,
    activity_type_id: record.activity_type_id,
    delivery_format_id: record.delivery_format_id,
    recurrence_type_id: record.recurrence_type_id,
    trainer_ids: [],
    required_trainer_count: record.required_trainer_count,
    schedule_mode: record.start_datetime && record.end_datetime ? 'datetime' : 'date',
    start_date: dateOnlyTimestamp(record.start_date),
    end_date: dateOnlyTimestamp(record.end_date),
    start_datetime: record.start_datetime ? new Date(record.start_datetime).getTime() : null,
    end_datetime: record.end_datetime ? new Date(record.end_datetime).getTime() : null,
    recurrence_until: dateOnlyTimestamp(record.recurrence_until),
    description: record.description || '',
    comments: record.comments || '',
  }
}

export function recurrenceKindFromLabel(label: string | undefined): RecurrenceKind {
  const normalized = (label || '').toLocaleLowerCase('ru-RU')
  if (normalized.includes('ежеднев')) return 'daily'
  if (normalized.includes('еженед')) return 'weekly'
  if (normalized.includes('ежемесяч')) return 'monthly'
  if (normalized.includes('ежекварт')) return 'quarterly'
  return 'once'
}

export function defaultRecurrenceUntil(form: AdminCalendarEventFormValues): number | null {
  const start = form.schedule_mode === 'datetime' ? form.start_datetime : form.start_date
  if (!start) return null
  const startDate = new Date(start)
  return new Date(startDate.getFullYear(), 11, 31).getTime()
}

export function validateAdminCalendarEventForm(
  form: AdminCalendarEventFormValues,
  recurrenceKind: RecurrenceKind,
): string | null {
  if (!form.title.trim()) return 'Укажите название мероприятия'
  if (!form.required_trainer_count || form.required_trainer_count < 1) {
    return 'Количество тренеров должно быть не меньше одного'
  }
  const start = form.schedule_mode === 'datetime' ? form.start_datetime : form.start_date
  const end = form.schedule_mode === 'datetime' ? form.end_datetime : form.end_date
  if (!start || !end) return 'Укажите начало и окончание мероприятия'
  if (end < start || (form.schedule_mode === 'datetime' && end === start)) {
    return 'Окончание должно быть позже начала'
  }
  if (recurrenceKind !== 'once') {
    if (!form.recurrence_until) return 'Укажите дату окончания повторов'
    const startDate = new Date(start)
    const until = new Date(form.recurrence_until)
    startDate.setHours(0, 0, 0, 0)
    until.setHours(0, 0, 0, 0)
    if (until < startDate) return 'Окончание повторов не может быть раньше начала мероприятия'
  }
  return null
}

export function formSchedulePayload(form: AdminCalendarEventFormValues) {
  return form.schedule_mode === 'datetime'
    ? {
        start_datetime: new Date(form.start_datetime!).toISOString(),
        end_datetime: new Date(form.end_datetime!).toISOString(),
        start_date: null,
        end_date: null,
      }
    : {
        start_datetime: null,
        end_datetime: null,
        start_date: toLocalDateString(new Date(form.start_date!)),
        end_date: toLocalDateString(new Date(form.end_date!)),
      }
}
