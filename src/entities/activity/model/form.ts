import { dateOnlyTimestamp, toLocalDateString } from '../../../shared/lib/date'
import type {
  ActivityFormValues,
  ActivityPayload,
  ActivityRecord,
  ActivityScheduleSeed,
} from './types'

export function createActivityForm(
  trainerId: number | null = null,
  seed: ActivityScheduleSeed | null = null,
): ActivityFormValues {
  return {
    participant_ids: trainerId ? [trainerId] : [],
    project_type_id: null,
    project_main_id: null,
    project_sub: '',
    role_id: null,
    activity_type_id: null,
    delivery_format_id: null,
    recurrence_type_id: null,
    schedule_mode: seed?.schedule_mode ?? 'datetime',
    start_date: seed?.start_date ?? null,
    end_date: seed?.end_date ?? null,
    start_datetime: seed?.start_datetime ?? null,
    end_datetime: seed?.end_datetime ?? null,
    task_desc: '',
    comments: '',
  }
}

export function activityToForm(
  record: ActivityRecord,
  participantIds: number[],
): ActivityFormValues {
  return {
    participant_ids: participantIds,
    project_type_id: record.project_type_id,
    project_main_id: record.project_main_id,
    project_sub: record.project_sub || '',
    role_id: record.role_id,
    activity_type_id: record.activity_type_id,
    delivery_format_id: record.delivery_format_id,
    recurrence_type_id: record.recurrence_type_id,
    schedule_mode: record.start_datetime && record.end_datetime ? 'datetime' : 'date',
    start_date: dateOnlyTimestamp(record.start_date),
    end_date: dateOnlyTimestamp(record.end_date),
    start_datetime: record.start_datetime ? new Date(record.start_datetime).getTime() : null,
    end_datetime: record.end_datetime ? new Date(record.end_datetime).getTime() : null,
    task_desc: record.task_desc || '',
    comments: record.comments || '',
  }
}

export function validateActivityForm(form: ActivityFormValues): string | null {
  if (!form.participant_ids.length) return 'Выберите хотя бы одного участника'
  if (!form.project_type_id || !form.project_main_id || !form.role_id) {
    return 'Заполните тип проекта, проект и роль'
  }
  if (form.schedule_mode === 'datetime') {
    if (!form.start_datetime || !form.end_datetime) {
      return 'Укажите дату и время начала и окончания'
    }
    if (form.end_datetime <= form.start_datetime) {
      return 'Окончание должно быть позже начала'
    }
  } else {
    if (!form.start_date || !form.end_date) return 'Укажите даты начала и окончания'
    if (form.end_date < form.start_date) {
      return 'Дата окончания не может быть раньше даты начала'
    }
  }
  return null
}

export function activityFormToPayload(form: ActivityFormValues): ActivityPayload {
  if (!form.project_type_id || !form.project_main_id || !form.role_id) {
    throw new Error('Форма активности не прошла валидацию')
  }

  const datePayload = form.schedule_mode === 'datetime'
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

  return {
    project_type_id: form.project_type_id,
    project_main_id: form.project_main_id,
    project_sub: form.project_sub,
    role_id: form.role_id,
    activity_type_id: form.activity_type_id,
    delivery_format_id: form.delivery_format_id,
    recurrence_type_id: form.recurrence_type_id,
    ...datePayload,
    task_desc: form.task_desc,
    comments: form.comments,
    is_duplicate: false,
  }
}
