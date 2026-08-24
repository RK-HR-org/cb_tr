import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../../../shared/api/supabase'
import { isValidLogin, isValidPassword, toAuthEmail } from '../lib/credentials'
import { mapUserToProfile } from '../lib/map-profile'
import type { AppProfile } from '../../../shared/types'

export type SignInResult =
  | { success: true; profile: AppProfile }
  | { success: false; message: string }

type ManageTrainerAuthAction =
  | { action: 'create'; trainer_id: number; login: string; password: string }
  | { action: 'reset_password'; trainer_id: number; password: string }
  | { action: 'disable'; trainer_id: number }

async function invokeManageTrainerAuth(body: ManageTrainerAuthAction) {
  const { data, error } = await supabase.functions.invoke('manage-trainer-auth', { body })
  if (error) throw error
  if (data?.error) throw new Error(String(data.error))
  return data
}

export async function signIn(login: string, password: string): Promise<SignInResult> {
  const normalizedLogin = login.trim().toLowerCase()
  if (!normalizedLogin || !password) {
    return { success: false, message: 'Введите логин и пароль' }
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: toAuthEmail(normalizedLogin),
    password,
  })

  if (error) {
    return { success: false, message: 'Неверный логин или пароль' }
  }

  const profile = mapUserToProfile(data.user)
  if (!profile) {
    await supabase.auth.signOut()
    return { success: false, message: 'Учётная запись не имеет доступа к приложению' }
  }

  return { success: true, profile }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export function getProfileFromSession(session: Session | null): AppProfile | null {
  return mapUserToProfile(session?.user)
}

export function onAuthStateChange(
  callback: (profile: AppProfile | null, user: User | null) => void,
) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(mapUserToProfile(session?.user), session?.user ?? null)
  })
  return data.subscription
}

export async function createTrainerAuth(
  trainerId: number,
  login: string,
  password: string,
): Promise<void> {
  const normalizedLogin = login.trim().toLowerCase()
  if (!isValidLogin(normalizedLogin)) {
    throw new Error('Логин: 3–32 символа, латиница, цифры и _')
  }
  if (!isValidPassword(password)) {
    throw new Error('Пароль должен содержать не менее 8 символов')
  }
  await invokeManageTrainerAuth({
    action: 'create',
    trainer_id: trainerId,
    login: normalizedLogin,
    password,
  })
}

export async function resetTrainerPassword(
  trainerId: number,
  password: string,
): Promise<void> {
  if (!isValidPassword(password)) {
    throw new Error('Пароль должен содержать не менее 8 символов')
  }
  await invokeManageTrainerAuth({
    action: 'reset_password',
    trainer_id: trainerId,
    password,
  })
}

export async function disableTrainerAuth(trainerId: number): Promise<void> {
  await invokeManageTrainerAuth({ action: 'disable', trainer_id: trainerId })
}
