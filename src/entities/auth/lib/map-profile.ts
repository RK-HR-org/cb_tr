import type { User } from '@supabase/supabase-js'
import type { AppProfile } from '../../../shared/types'

type AppMetadata = {
  role?: string
  trainer_id?: number
  full_name?: string
}

export function mapUserToProfile(user: User | null | undefined): AppProfile | null {
  if (!user) return null

  const metadata = user.app_metadata as AppMetadata
  const role = metadata.role

  if (role === 'admin') {
    return {
      id: user.id,
      role: 'admin',
      full_name: metadata.full_name || 'Главный Администратор',
    }
  }

  if (role === 'trainer' && metadata.trainer_id) {
    return {
      id: metadata.trainer_id,
      role: 'trainer',
      full_name: metadata.full_name || 'Тренер',
    }
  }

  return null
}
