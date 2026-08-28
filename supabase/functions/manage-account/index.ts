import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ManageAccountRequest =
  | { action: 'change_password'; current_password: string; new_password: string }
  | { action: 'change_login'; new_login: string; current_password: string }

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function toAuthEmail(login: string) {
  return `${login.toLowerCase()}@cb-tr.local`
}

function isValidLogin(login: string) {
  return /^[a-z0-9_]{3,32}$/.test(login)
}

function isValidPassword(password: string) {
  return password.length >= 8
}

function resolveLogin(user: { email?: string; user_metadata?: Record<string, unknown> }) {
  const metadataLogin = user.user_metadata?.login
  if (typeof metadataLogin === 'string' && metadataLogin.trim()) {
    return metadataLogin.trim().toLowerCase()
  }
  if (user.email?.endsWith('@cb-tr.local')) {
    return user.email.slice(0, -'@cb-tr.local'.length).toLowerCase()
  }
  return ''
}

async function verifyCurrentPassword(
  supabaseUrl: string,
  anonKey: string,
  email: string,
  password: string,
) {
  const verifyClient = createClient(supabaseUrl, anonKey)
  const { error } = await verifyClient.auth.signInWithPassword({ email, password })
  return !error
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return jsonResponse({ error: 'Ошибка конфигурации сервера' }, 500)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Требуется авторизация' }, 401)
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user) {
      return jsonResponse({ error: 'Сессия недействительна' }, 401)
    }

    const user = userData.user
    const role = user.app_metadata?.role
    if (role !== 'admin' && role !== 'trainer') {
      return jsonResponse({ error: 'Нет доступа' }, 403)
    }

    const body = await req.json() as ManageAccountRequest
    const currentLogin = resolveLogin(user)
    const currentEmail = user.email || toAuthEmail(currentLogin)

    if (body.action === 'change_password') {
      const { current_password, new_password } = body
      if (!current_password || !new_password) {
        return jsonResponse({ error: 'Укажите текущий и новый пароль' }, 400)
      }
      if (!isValidPassword(new_password)) {
        return jsonResponse({ error: 'Новый пароль должен содержать не менее 8 символов' }, 400)
      }
      if (current_password === new_password) {
        return jsonResponse({ error: 'Новый пароль должен отличаться от текущего' }, 400)
      }

      const valid = await verifyCurrentPassword(supabaseUrl, anonKey, currentEmail, current_password)
      if (!valid) {
        return jsonResponse({ error: 'Неверный текущий пароль' }, 400)
      }

      const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
        password: new_password,
      })
      if (updateError) {
        return jsonResponse({ error: updateError.message }, 400)
      }

      return jsonResponse({ success: true })
    }

    if (body.action === 'change_login') {
      const { new_login, current_password } = body
      if (!new_login || !current_password) {
        return jsonResponse({ error: 'Укажите новый логин и текущий пароль' }, 400)
      }

      const normalizedLogin = new_login.trim().toLowerCase()
      if (!isValidLogin(normalizedLogin)) {
        return jsonResponse({ error: 'Логин: 3–32 символа, латиница, цифры и _' }, 400)
      }
      if (normalizedLogin === currentLogin) {
        return jsonResponse({ error: 'Новый логин совпадает с текущим' }, 400)
      }

      const valid = await verifyCurrentPassword(supabaseUrl, anonKey, currentEmail, current_password)
      if (!valid) {
        return jsonResponse({ error: 'Неверный текущий пароль' }, 400)
      }

      const { data: existingLogin } = await adminClient
        .from('trainers')
        .select('id')
        .ilike('login', normalizedLogin)
        .maybeSingle()

      if (existingLogin) {
        return jsonResponse({ error: 'Этот логин уже занят' }, 409)
      }

      if (role === 'trainer') {
        const trainerId = user.app_metadata?.trainer_id
        if (!trainerId) {
          return jsonResponse({ error: 'Не удалось определить профиль тренера' }, 400)
        }

        const { error: trainerUpdateError } = await adminClient
          .from('trainers')
          .update({ login: normalizedLogin })
          .eq('id', trainerId)
          .eq('auth_user_id', user.id)

        if (trainerUpdateError) {
          return jsonResponse({ error: trainerUpdateError.message }, 400)
        }
      }

      const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(user.id, {
        email: toAuthEmail(normalizedLogin),
        user_metadata: {
          ...user.user_metadata,
          login: normalizedLogin,
        },
      })

      if (authUpdateError) {
        if (role === 'trainer') {
          const trainerId = user.app_metadata?.trainer_id
          if (trainerId) {
            await adminClient
              .from('trainers')
              .update({ login: currentLogin })
              .eq('id', trainerId)
              .eq('auth_user_id', user.id)
          }
        }
        return jsonResponse({ error: authUpdateError.message }, 400)
      }

      return jsonResponse({ success: true, login: normalizedLogin })
    }

    return jsonResponse({ error: 'Неизвестное действие' }, 400)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неожиданная ошибка'
    return jsonResponse({ error: message }, 500)
  }
})
