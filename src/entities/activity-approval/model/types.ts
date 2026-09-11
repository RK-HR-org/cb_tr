import type { ActivityPayload } from '../../activity/model/types'

export type ChangeType = 'create' | 'update' | 'delete'
export type RequestStatus = 'pending' | 'approved' | 'rejected'
export type ApprovalStatus = 'approved' | 'pending' | 'rejected'

export type ActivityChangeRequest = {
  id: number
  trainer_id: number
  trainer_project_id: number | null
  change_type: ChangeType
  status: RequestStatus
  proposed_payload: ActivityPayload | null
  previous_payload: ActivityPayload | null
  submitted_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  review_notes: string | null
  result_trainer_project_id: number | null
}

export type ActivityChangeRequestListItem = ActivityChangeRequest & {
  trainers?: { full_name?: string } | null
}

export type PendingChangeOverlay = {
  changeType: ChangeType
  requestId: number
}
