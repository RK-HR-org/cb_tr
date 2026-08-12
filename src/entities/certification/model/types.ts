export type CertificationStatus = {
  code: string
  name: string
  grants_access: boolean
}

export type TrainerCertification = {
  id: number
  trainer_id: number
  project_id: number
  status_code: string
  valid_from: string | null
  valid_until: string | null
  notes: string | null
  project_names?: { name: string } | null
  certification_statuses?: {
    name: string
    grants_access: boolean
  } | null
}

export type TrainerCertificationPayload = {
  trainer_id: number
  project_id: number
  status_code: string
  valid_from: string | null
  valid_until: string | null
  notes: string | null
}
