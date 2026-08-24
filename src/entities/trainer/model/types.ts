export type Trainer = {
  id: number
  full_name: string
  city_id: number | null
  division_id: number | null
  login: string | null
  auth_user_id: string | null
  cities?: { name: string } | null
  divisions?: { name: string } | null
}

export type TrainerPayload = {
  full_name: string
  city_id: number | null
  division_id: number | null
  login?: string | null
}

export type TrainerCreate = TrainerPayload
export type TrainerUpdate = Partial<TrainerPayload>

export type TrainerReference = {
  id: number
  name: string
}
