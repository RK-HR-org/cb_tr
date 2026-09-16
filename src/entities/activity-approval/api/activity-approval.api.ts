import { supabase } from '../../../shared/api/supabase'
import type { Json } from '../../../shared/api/supabase/database.types'
import type { ActivityPayload } from '../../activity/model/types'
import type {
  ActivityChangeRequest,
  ActivityChangeRequestListItem,
  ChangeType,
} from '../model/types'

const REQUEST_FIELDS = `
  id, trainer_id, trainer_project_id, change_type, status,
  proposed_payload, previous_payload,
  submitted_at, reviewed_at, reviewed_by, review_notes, result_trainer_project_id
`

export async function submitActivityChange(
  changeType: ChangeType,
  trainerProjectId: number | null,
  payload: ActivityPayload | null,
): Promise<number | null> {
  const { data, error } = await supabase.rpc('submit_trainer_activity_change', {
    p_change_type: changeType,
    p_trainer_project_id: trainerProjectId,
    p_payload: payload as unknown as Json,
  })
  if (error) throw error
  return data as number | null
}

export async function listPendingChangeRequests(): Promise<ActivityChangeRequestListItem[]> {
  const { data, error } = await supabase
    .from('activity_change_requests')
    .select(`${REQUEST_FIELDS}, trainers (full_name)`)
    .eq('status', 'pending')
    .order('submitted_at', { ascending: false })
  if (error) throw error
  return (data || []) as unknown as ActivityChangeRequestListItem[]
}

export async function countPendingChangeRequests(): Promise<number> {
  const { data, error } = await supabase.rpc('count_pending_activity_change_requests')
  if (error) throw error
  return Number(data) || 0
}

export async function getChangeRequest(id: number): Promise<ActivityChangeRequest> {
  const { data, error } = await supabase
    .from('activity_change_requests')
    .select(REQUEST_FIELDS)
    .eq('id', id)
    .single()
  if (error) throw error
  return data as unknown as ActivityChangeRequest
}

export async function listTrainerPendingRequests(
  trainerId: number,
): Promise<ActivityChangeRequest[]> {
  const { data, error } = await supabase
    .from('activity_change_requests')
    .select(REQUEST_FIELDS)
    .eq('trainer_id', trainerId)
    .in('status', ['pending', 'rejected'])
    .order('submitted_at', { ascending: false })
  if (error) throw error
  return (data || []) as unknown as ActivityChangeRequest[]
}

export async function approveChangeRequest(id: number): Promise<void> {
  const { error } = await supabase.rpc('approve_activity_change', {
    p_request_id: id,
  })
  if (error) throw error
}

export async function rejectChangeRequest(id: number, notes?: string): Promise<void> {
  const { error } = await supabase.rpc('reject_activity_change', {
    p_request_id: id,
    p_notes: notes ?? null,
  })
  if (error) throw error
}
