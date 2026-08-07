export type SelectOption = {
  label: string
  value: number
}

export type AppRole = 'admin' | 'trainer'

export type AppProfile = {
  id: number | string
  role: AppRole
  full_name: string
}
