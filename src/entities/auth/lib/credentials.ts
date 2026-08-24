export const AUTH_EMAIL_DOMAIN = 'cb-tr.local'

export function toAuthEmail(login: string): string {
  return `${login.trim().toLowerCase()}@${AUTH_EMAIL_DOMAIN}`
}

export function isValidLogin(login: string): boolean {
  return /^[a-z0-9_]{3,32}$/.test(login.trim().toLowerCase())
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8
}
