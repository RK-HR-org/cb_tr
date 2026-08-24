const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/

export const DEFAULT_PROJECT_COLOR = '#2563eb'

export function normalizeProjectColor(value: string | null | undefined): string | null {
  const color = value?.trim()
  if (!color) return null
  return HEX_COLOR_PATTERN.test(color) ? color : null
}

export function resolveProjectColor(
  projectMainId: number | null,
  projectColor: string | null | undefined,
  fallback: (projectId: number | null) => string,
): string {
  return normalizeProjectColor(projectColor) ?? fallback(projectMainId)
}
