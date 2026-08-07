export type Trainer = {
  id: number
  full_name: string
}

export type TrainerCreate = Omit<Trainer, 'id'>
export type TrainerUpdate = Partial<TrainerCreate>
