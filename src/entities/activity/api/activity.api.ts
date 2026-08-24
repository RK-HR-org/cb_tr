import { supabase } from '../../../shared/api/supabase'
import type { Json } from '../../../shared/api/supabase/database.types'
import type { SelectOption } from '../../../shared/types'
import type {
  ActivityListItem,
  ActivityPayload,
  ActivityRecord,
  GanttActivityItem,
} from '../model/types'

const ACTIVITY_FIELDS = `
  id, trainer_id, event_group_id, project_type_id, project_main_id, project_sub,
  role_id, activity_type_id, delivery_format_id, recurrence_type_id,
  start_datetime, end_datetime, start_date, end_date,
  source_type, source_file, source_schedule_key, source_sheet, source_range, source_event_key,
  is_duplicate, task_desc, comments
`

const ACTIVITY_LIST_FIELDS = `
  ${ACTIVITY_FIELDS},
  project_types (name),
  project_names (name, color),
  roles (name),
  activity_types (name),
  delivery_formats (name),
  recurrence_types (name)
`

export type ActivityReferences = {
  projectTypes: SelectOption[]
  projects: SelectOption[]
  roles: SelectOption[]
  activityTypes: SelectOption[]
  deliveryFormats: SelectOption[]
  recurrenceTypes: SelectOption[]
}

export type SaveActivityCommand = {
  recordId: number | null
  trainerId: number
  participantIds: number[]
  canManageParticipants: boolean
  payload: ActivityPayload
}

function asOptions(
  rows: Array<{ id: number; name: string }> | null,
): SelectOption[] {
  return (rows || []).map(row => ({ label: row.name, value: row.id }))
}

function asProjectOptions(
  rows: Array<{
    id: number
    name: string
    parent_project?: { name: string } | null
  }> | null,
): SelectOption[] {
  return (rows || []).map(row => ({
    label: row.parent_project?.name
      ? `${row.parent_project.name} / ${row.name}`
      : row.name,
    value: row.id,
  }))
}

export async function getActivityReferences(): Promise<ActivityReferences> {
  const results = await Promise.all([
    supabase.from('project_types').select('id, name').order('name'),
    supabase
      .from('project_names')
      .select(`
        id, name, module_position,
        parent_project:project_names!parent_project_id (name)
      `)
      .order('parent_project_id', { ascending: true, nullsFirst: true })
      .order('module_position', { ascending: true, nullsFirst: false })
      .order('name'),
    supabase.from('roles').select('id, name').order('name'),
    supabase.from('activity_types').select('id, name').eq('is_active', true).order('name'),
    supabase.from('delivery_formats').select('id, name').eq('is_active', true).order('name'),
    supabase.from('recurrence_types').select('id, name').eq('is_active', true).order('name'),
  ])
  const error = results.find(result => result.error)?.error
  if (error) throw error

  const projectRows = results[1].data as unknown as Array<{
    id: number
    name: string
    parent_project?: { name: string } | null
  }> | null

  return {
    projectTypes: asOptions(results[0].data),
    projects: asProjectOptions(projectRows),
    roles: asOptions(results[2].data),
    activityTypes: asOptions(results[3].data),
    deliveryFormats: asOptions(results[4].data),
    recurrenceTypes: asOptions(results[5].data),
  }
}

export async function getActivity(id: number): Promise<ActivityRecord> {
  const { data, error } = await supabase
    .from('trainer_projects')
    .select(ACTIVITY_FIELDS)
    .eq('id', id)
    .single()
  if (error) throw error
  return data as unknown as ActivityRecord
}

export async function getActivityParticipantIds(record: ActivityRecord): Promise<number[]> {
  if (!record.event_group_id) return [record.trainer_id]
  const { data, error } = await supabase
    .from('trainer_projects')
    .select('trainer_id')
    .eq('event_group_id', record.event_group_id)
  if (error) throw error
  return (data || []).map(row => row.trainer_id)
}

export async function listActivitiesByTrainer(trainerId: number): Promise<ActivityListItem[]> {
  const { data, error } = await supabase
    .from('trainer_projects')
    .select(ACTIVITY_LIST_FIELDS)
    .eq('trainer_id', trainerId)
    .order('id', { ascending: false })
  if (error) throw error
  return (data || []) as unknown as ActivityListItem[]
}

export async function listCalendarActivities(trainerId: number): Promise<ActivityListItem[]> {
  const result = await listActivitiesByTrainer(trainerId)
  return result.slice().reverse()
}

export async function listAllActivities(): Promise<ActivityListItem[]> {
  const { data, error } = await supabase
    .from('trainer_projects')
    .select(ACTIVITY_LIST_FIELDS)
    .order('id', { ascending: true })
  if (error) throw error
  return (data || []) as unknown as ActivityListItem[]
}

export async function listGanttActivities(): Promise<GanttActivityItem[]> {
  const pageSize = 1000
  const items: GanttActivityItem[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('trainer_projects')
      .select(`
        id, trainer_id, event_group_id, project_type_id, project_main_id, project_sub,
        role_id, activity_type_id, delivery_format_id, recurrence_type_id,
        start_datetime, end_datetime, start_date, end_date,
        source_type, source_schedule_key, source_event_key, is_duplicate, task_desc, comments,
        project_names (name, color), trainers (full_name), activity_types (name),
        delivery_formats (name), roles (name), project_types (name), recurrence_types (name)
      `)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) throw error
    const page = (data || []) as unknown as GanttActivityItem[]
    items.push(...page)
    if (page.length < pageSize) break
    from += pageSize
  }

  const [eventsResult, assignmentsResult] = await Promise.all([
    supabase
      .from('admin_calendar_events')
      .select('id, project_main_id, title, start_date, end_date, start_datetime, end_datetime, comments, program_schedule_id, project_names(name, color)')
      .not('program_schedule_id', 'is', null),
    supabase.from('admin_calendar_event_trainers').select('event_id'),
  ])
  if (eventsResult.error) throw eventsResult.error
  if (assignmentsResult.error) throw assignmentsResult.error
  const assignedEventIds = new Set((assignmentsResult.data || []).map(row => row.event_id))
  for (const event of eventsResult.data || []) {
    if (assignedEventIds.has(event.id)) continue
    items.push({
      id: -event.id,
      trainer_id: 0,
      event_group_id: null,
      project_type_id: null,
      project_main_id: event.project_main_id,
      project_sub: null,
      role_id: null,
      activity_type_id: null,
      delivery_format_id: null,
      recurrence_type_id: null,
      start_datetime: event.start_datetime,
      end_datetime: event.end_datetime,
      start_date: event.start_date,
      end_date: event.end_date,
      source_type: 'admin_calendar_event',
      source_event_key: String(event.id),
      is_duplicate: false,
      task_desc: event.title,
      comments: event.comments,
      project_names: event.project_names,
      trainers: { full_name: 'Не назначено' },
    } as unknown as GanttActivityItem)
  }
  return items
}

async function reconcileGroupParticipants(
  groupId: string,
  participantIds: number[],
  payload: ActivityPayload,
): Promise<void> {
  const existingResult = await supabase
    .from('trainer_projects')
    .select('trainer_id')
    .eq('event_group_id', groupId)
  if (existingResult.error) throw existingResult.error

  const existingIds = (existingResult.data || []).map(row => row.trainer_id)
  const removedIds = existingIds.filter(id => !participantIds.includes(id))
  const addedIds = participantIds.filter(id => !existingIds.includes(id))

  if (removedIds.length) {
    const result = await supabase
      .from('trainer_projects')
      .delete()
      .eq('event_group_id', groupId)
      .in('trainer_id', removedIds)
    if (result.error) throw result.error
  }

  if (addedIds.length) {
    const result = await supabase.from('trainer_projects').insert(
      addedIds.map(trainerId => ({
        ...payload,
        trainer_id: trainerId,
        event_group_id: groupId,
      })),
    )
    if (result.error) throw result.error
  }
}

export async function saveActivity(command: SaveActivityCommand): Promise<void> {
  const participantIds = command.canManageParticipants
    ? command.participantIds
    : [command.trainerId]

  const rpcResult = await supabase.rpc('save_trainer_activity', {
    p_record_id: command.recordId,
    p_trainer_id: command.trainerId,
    p_participant_ids: participantIds,
    p_can_manage_participants: command.canManageParticipants,
    p_payload: command.payload as unknown as Json,
  })
  if (!rpcResult.error) return
  // Compatibility while the migration is being deployed. Once every
  // environment has the function, this fallback can be removed.
  if (!['PGRST202', '42883'].includes(rpcResult.error.code || '')) {
    throw rpcResult.error
  }

  if (!command.recordId) {
    const groupId = participantIds.length > 1 ? crypto.randomUUID() : null
    const result = await supabase.from('trainer_projects').insert(
      participantIds.map(trainerId => ({
        ...command.payload,
        trainer_id: trainerId,
        event_group_id: groupId,
      })),
    )
    if (result.error) throw result.error
    return
  }

  const current = await getActivity(command.recordId)
  if (current.event_group_id) {
    if (!command.canManageParticipants) {
      throw new Error('Групповое мероприятие может редактировать только администратор')
    }
    const updateResult = await supabase
      .from('trainer_projects')
      .update(command.payload)
      .eq('event_group_id', current.event_group_id)
    if (updateResult.error) throw updateResult.error
    await reconcileGroupParticipants(current.event_group_id, participantIds, command.payload)
    return
  }

  const groupId = participantIds.length > 1 ? crypto.randomUUID() : null
  const updateResult = await supabase
    .from('trainer_projects')
    .update({
      ...command.payload,
      trainer_id: participantIds[0],
      event_group_id: groupId,
    })
    .eq('id', command.recordId)
    .eq('trainer_id', command.canManageParticipants ? current.trainer_id : command.trainerId)
  if (updateResult.error) throw updateResult.error

  if (groupId) {
    const insertResult = await supabase.from('trainer_projects').insert(
      participantIds.slice(1).map(trainerId => ({
        ...command.payload,
        trainer_id: trainerId,
        event_group_id: groupId,
      })),
    )
    if (insertResult.error) throw insertResult.error
  }
}

export async function deleteActivity(
  recordId: number,
  trainerId: number,
  canManageParticipants: boolean,
): Promise<void> {
  const current = await getActivity(recordId)
  if (current.event_group_id && !canManageParticipants) {
    throw new Error('Групповое мероприятие может удалить только администратор')
  }

  let query = supabase.from('trainer_projects').delete()
  query = current.event_group_id
    ? query.eq('event_group_id', current.event_group_id)
    : query.eq('id', recordId).eq('trainer_id', canManageParticipants ? current.trainer_id : trainerId)
  const { error } = await query
  if (error) throw error
}

export async function duplicateActivity(record: ActivityRecord, trainerId: number): Promise<void> {
  const { error } = await supabase.from('trainer_projects').insert({
    trainer_id: trainerId,
    project_type_id: record.project_type_id,
    project_main_id: record.project_main_id,
    project_sub: record.project_sub,
    role_id: record.role_id,
    activity_type_id: record.activity_type_id,
    delivery_format_id: record.delivery_format_id,
    recurrence_type_id: record.recurrence_type_id,
    start_datetime: record.start_datetime,
    end_datetime: record.end_datetime,
    start_date: record.start_date,
    end_date: record.end_date,
    task_desc: record.task_desc,
    comments: record.comments,
    event_group_id: null,
    is_duplicate: true,
  })
  if (error) throw error
}

export async function updateActivitySchedule(
  record: ActivityRecord,
  trainerId: number,
  canManageGroup: boolean,
  patch: Pick<ActivityPayload, 'start_date' | 'end_date' | 'start_datetime' | 'end_datetime'>,
): Promise<void> {
  if (record.event_group_id && !canManageGroup) {
    throw new Error('Время группового мероприятия изменяет администратор')
  }
  let query = supabase.from('trainer_projects').update(patch)
  query = record.event_group_id
    ? query.eq('event_group_id', record.event_group_id)
    : query.eq('id', record.id).eq('trainer_id', trainerId)
  const { error } = await query
  if (error) throw error
}
