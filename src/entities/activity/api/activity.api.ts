import { supabase } from '../../../shared/api/supabase'
import type { Json } from '../../../shared/api/supabase/database.types'
import { cached } from '../../../shared/lib/cache'
import type { SelectOption } from '../../../shared/types'
import {
  listTrainerPendingRequests,
  submitActivityChange,
} from '../../activity-approval'
import type { ActivityChangeRequest } from '../../activity-approval'
import type {
  ActivityListItem,
  ActivityPayload,
  ActivityRecord,
  GanttActivityItem,
} from '../model/types'

const ACTIVITY_FIELDS = `
  id, trainer_id, approval_status, event_group_id, project_type_id, project_main_id, project_sub,
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
  return cached('activity-references', loadActivityReferences)
}

async function loadActivityReferences(): Promise<ActivityReferences> {
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

function applyPendingOverlays<T extends ActivityListItem>(
  items: T[],
  requests: ActivityChangeRequest[],
): T[] {
  const byProjectId = new Map<number, ActivityChangeRequest>()
  for (const request of requests) {
    if (request.trainer_project_id != null) {
      byProjectId.set(request.trainer_project_id, request)
    }
  }

  const merged = items.map((item) => {
    const request = byProjectId.get(item.id)
    if (!request) {
      return {
        ...item,
        approval_status: item.approval_status ?? 'approved',
      }
    }

    if (request.change_type === 'update' && request.proposed_payload) {
      return {
        ...item,
        ...request.proposed_payload,
        approval_status: item.approval_status ?? 'approved',
        pending_change_type: 'update' as const,
        pending_request_id: request.id,
      }
    }

    if (request.change_type === 'delete') {
      return {
        ...item,
        approval_status: item.approval_status ?? 'approved',
        pending_change_type: 'delete' as const,
        pending_request_id: request.id,
      }
    }

    return {
      ...item,
      approval_status: item.approval_status ?? 'approved',
      pending_change_type: request.change_type,
      pending_request_id: request.id,
    }
  })

  return merged
}

async function mergeTrainerPendingChanges<T extends ActivityListItem>(
  items: T[],
  trainerId: number,
): Promise<T[]> {
  const requests = await listTrainerPendingRequests(trainerId)
  return applyPendingOverlays(items, requests)
}

export async function listActivitiesByTrainer(trainerId: number): Promise<ActivityListItem[]> {
  const { data, error } = await supabase
    .from('trainer_projects')
    .select(ACTIVITY_LIST_FIELDS)
    .eq('trainer_id', trainerId)
    .order('id', { ascending: false })
  if (error) throw error
  const items = (data || []) as unknown as ActivityListItem[]
  return mergeTrainerPendingChanges(items, trainerId)
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

type GanttRpcRow = {
  id: number
  trainer_id: number
  approval_status: string | null
  event_group_id: string | null
  project_type_id: number | null
  project_main_id: number | null
  project_sub: string | null
  role_id: number | null
  activity_type_id: number | null
  delivery_format_id: number | null
  recurrence_type_id: number | null
  start_datetime: string | null
  end_datetime: string | null
  start_date: string | null
  end_date: string | null
  source_type: string | null
  source_schedule_key: string | null
  source_event_key: string | null
  is_duplicate: boolean | null
  task_desc: string | null
  comments: string | null
  project_name: string | null
  project_color: string | null
  trainer_full_name: string | null
  activity_type_name: string | null
  delivery_format_name: string | null
  role_name: string | null
  project_type_name: string | null
  recurrence_type_name: string | null
}

function named(name: string | null | undefined, color?: string | null) {
  if (!name && color == null) return null
  return { name: name ?? undefined, color: color ?? null }
}

function asIsoDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  if (typeof value !== 'string' || !value) return null
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value)
  return match ? match[1] : value
}

function mapGanttRow(row: GanttRpcRow): GanttActivityItem {
  return {
    id: row.id,
    trainer_id: row.trainer_id,
    approval_status: (row.approval_status as GanttActivityItem['approval_status']) ?? 'approved',
    event_group_id: row.event_group_id,
    project_type_id: row.project_type_id,
    project_main_id: row.project_main_id,
    project_sub: row.project_sub,
    role_id: row.role_id,
    activity_type_id: row.activity_type_id,
    delivery_format_id: row.delivery_format_id,
    recurrence_type_id: row.recurrence_type_id,
    start_datetime: row.start_datetime,
    end_datetime: row.end_datetime,
    start_date: asIsoDate(row.start_date),
    end_date: asIsoDate(row.end_date),
    source_type: row.source_type,
    source_schedule_key: row.source_schedule_key,
    source_event_key: row.source_event_key,
    is_duplicate: row.is_duplicate,
    task_desc: row.task_desc,
    comments: row.comments,
    project_names: named(row.project_name, row.project_color),
    trainers: { full_name: row.trainer_full_name ?? undefined },
    activity_types: named(row.activity_type_name),
    delivery_formats: named(row.delivery_format_name),
    roles: named(row.role_name),
    project_types: named(row.project_type_name),
    recurrence_types: named(row.recurrence_type_name),
  }
}

export async function listGanttActivities(options: {
  from: string
  to: string
  viewerTrainerId?: number | null
}): Promise<GanttActivityItem[]> {
  const pageSize = 1000
  const rows: GanttRpcRow[] = []
  let offset = 0

  while (true) {
    const { data, error } = await supabase
      .rpc('list_gantt_activities', {
        p_from: options.from,
        p_to: options.to,
      })
      .range(offset, offset + pageSize - 1)
    if (error) throw error
    const page = (data || []) as GanttRpcRow[]
    rows.push(...page)
    if (page.length < pageSize) break
    offset += pageSize
  }

  const items = rows.map(mapGanttRow)
  if (options.viewerTrainerId) {
    return mergeTrainerPendingChanges(items, options.viewerTrainerId)
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

  if (!command.canManageParticipants) {
    const changeType = command.recordId ? 'update' : 'create'
    await submitActivityChange(changeType, command.recordId, command.payload)
    return
  }

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
      const updateResult = await supabase
        .from('trainer_projects')
        .update(command.payload)
        .eq('id', command.recordId)
        .eq('trainer_id', command.trainerId)
      if (updateResult.error) throw updateResult.error
      return
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
  if (!canManageParticipants) {
    await submitActivityChange('delete', recordId, null)
    return
  }

  const current = await getActivity(recordId)
  if (current.event_group_id && !canManageParticipants) {
    const { error } = await supabase
      .from('trainer_projects')
      .delete()
      .eq('id', recordId)
      .eq('trainer_id', trainerId)
    if (error) throw error
    return
  }

  let query = supabase.from('trainer_projects').delete()
  query = current.event_group_id
    ? query.eq('event_group_id', current.event_group_id)
    : query.eq('id', recordId).eq('trainer_id', canManageParticipants ? current.trainer_id : trainerId)
  const { error } = await query
  if (error) throw error
}

export async function duplicateActivity(
  record: ActivityRecord,
  trainerId: number,
  canManageParticipants = true,
): Promise<void> {
  const payload: ActivityPayload = {
    project_type_id: record.project_type_id!,
    project_main_id: record.project_main_id!,
    project_sub: record.project_sub ?? '',
    role_id: record.role_id!,
    activity_type_id: record.activity_type_id,
    delivery_format_id: record.delivery_format_id,
    recurrence_type_id: record.recurrence_type_id,
    start_datetime: record.start_datetime,
    end_datetime: record.end_datetime,
    start_date: record.start_date,
    end_date: record.end_date,
    task_desc: record.task_desc ?? '',
    comments: record.comments ?? '',
    is_duplicate: true,
  }

  if (!canManageParticipants) {
    await submitActivityChange('create', null, payload)
    return
  }

  const { error } = await supabase.from('trainer_projects').insert({
    trainer_id: trainerId,
    ...payload,
    event_group_id: null,
    approval_status: 'approved',
  })
  if (error) throw error
}

export async function updateActivitySchedule(
  record: ActivityRecord,
  trainerId: number,
  canManageGroup: boolean,
  patch: Pick<ActivityPayload, 'start_date' | 'end_date' | 'start_datetime' | 'end_datetime'>,
): Promise<void> {
  if (!canManageGroup) {
    const payload: ActivityPayload = {
      project_type_id: record.project_type_id!,
      project_main_id: record.project_main_id!,
      project_sub: record.project_sub ?? '',
      role_id: record.role_id!,
      activity_type_id: record.activity_type_id,
      delivery_format_id: record.delivery_format_id,
      recurrence_type_id: record.recurrence_type_id,
      start_datetime: patch.start_datetime ?? record.start_datetime,
      end_datetime: patch.end_datetime ?? record.end_datetime,
      start_date: patch.start_date ?? record.start_date,
      end_date: patch.end_date ?? record.end_date,
      task_desc: record.task_desc ?? '',
      comments: record.comments ?? '',
      is_duplicate: record.is_duplicate ?? false,
    }
    await submitActivityChange('update', record.id, payload)
    return
  }

  if (record.event_group_id && !canManageGroup) {
    const { error } = await supabase
      .from('trainer_projects')
      .update(patch)
      .eq('id', record.id)
      .eq('trainer_id', trainerId)
    if (error) throw error
    return
  }
  let query = supabase.from('trainer_projects').update(patch)
  query = record.event_group_id
    ? query.eq('event_group_id', record.event_group_id)
    : query.eq('id', record.id).eq('trainer_id', trainerId)
  const { error } = await query
  if (error) throw error
}
