export type ProductionCalendarDayType = 'holiday' | 'working_saturday'

export type ProductionCalendarDay = {
  id: number
  event_date: string
  day_type: ProductionCalendarDayType
  name: string
  created_at: string
  updated_at: string
}

export type ProductionCalendarDayPayload = {
  event_date: string
  day_type: ProductionCalendarDayType
  name: string
}

export type WorkNormSetting = {
  year: number
  training_days_per_trainer_week: number
  created_at: string
  updated_at: string
}
