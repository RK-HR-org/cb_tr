export type MaterialReference = {
  code: string
  name: string
}

export type ProjectMaterial = {
  id: number
  project_id: number
  type_code: string
  status_code: string
  title: string | null
  location: string | null
  description: string | null
  material_types?: { name: string } | null
  material_statuses?: { name: string } | null
}

export type ProjectMaterialPayload = {
  project_id: number
  type_code: string
  status_code: string
  title: string | null
  location: string | null
  description: string | null
}
