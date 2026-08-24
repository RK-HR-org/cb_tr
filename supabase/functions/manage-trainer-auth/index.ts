import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ManageTrainerAuthRequest =
  | { action: 'create'; trainer_id: number; login: string; password: string }
  | { action: 'reset_password'; trainer_id: number; password: string }
  | { action: 'disable'; trainer_id: number }

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return jsonResponse({ error: 'Missing Supabase environment variables' }, 500)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Authorization header required' }, 401)
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user) {
      return jsonResponse({ error: 'Invalid session' }, 401)
    }

    const role = userData.user.app_metadata?.role
    if (role !== 'admin') {
      return jsonResponse({ error: 'Admin access required' }, 403)
    }

    const body = await req.json() as ManageTrainerAuthRequest

    if (body.action === 'create') {
      const { trainer_id, login, password } = body
      if (!trainer_id || !login || !password) {
        return jsonResponse({ error: 'trainer_id, login and password are required' }, 400)
      }
      if (!isValidLogin(login)) {
        return jsonResponse({ error: 'Invalid login format' }, 400)
      }
      if (!isValidPassword(password)) {
        return jsonResponse({ error: 'Password must be at least 8 characters' }, 400)
      }

      const { data: trainer, error: trainerError } = await adminClient
        .from('trainers')
        .select('id, full_name, login, auth_user_id')
        .eq('id', trainer_id)
        .maybeSingle()

      if (trainerError || !trainer) {
        return jsonResponse({ error: 'Trainer not found' }, 404)
      }
      if (trainer.auth_user_id) {
        return jsonResponse({ error: 'Trainer already has an auth account' }, 409)
      }

      const normalizedLogin = login.toLowerCase()
      const { data: existingLogin } = await adminClient
        .from('trainers')
        .select('id')
        .ilike('login', normalizedLogin)
        .neq('id', trainer_id)
        .maybeSingle()

      if (existingLogin) {
        return jsonResponse({ error: 'Login is already taken' }, 409)
      }

      const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
        email: toAuthEmail(normalizedLogin),
        password,
        email_confirm: true,
        app_metadata: {
          role: 'trainer',
          trainer_id: trainer.id,
          full_name: trainer.full_name,
        },
        user_metadata: {
          login: normalizedLogin,
        },
      })

      if (createError || !createdUser.user) {
        return jsonResponse({ error: createError?.message || 'Failed to create auth user' }, 400)
      }

      const { error: updateError } = await adminClient
        .from('trainers')
        .update({
          login: normalizedLogin,
          auth_user_id: createdUser.user.id,
        })
        .eq('id', trainer_id)

      if (updateError) {
        await adminClient.auth.admin.deleteUser(createdUser.user.id)
        return jsonResponse({ error: updateError.message }, 400)
      }

      return jsonResponse({ success: true, auth_user_id: createdUser.user.id })
    }

    if (body.action === 'reset_password') {
      const { trainer_id, password } = body
      if (!trainer_id || !password) {
        return jsonResponse({ error: 'trainer_id and password are required' }, 400)
      }
      if (!isValidPassword(password)) {
        return jsonResponse({ error: 'Password must be at least 8 characters' }, 400)
      }

      const { data: trainer, error: trainerError } = await adminClient
        .from('trainers')
        .select('auth_user_id')
        .eq('id', trainer_id)
        .maybeSingle()

      if (trainerError || !trainer?.auth_user_id) {
        return jsonResponse({ error: 'Trainer auth account not found' }, 404)
      }

      const { error: resetError } = await adminClient.auth.admin.updateUserById(
        trainer.auth_user_id,
        { password },
      )

      if (resetError) {
        return jsonResponse({ error: resetError.message }, 400)
      }

      return jsonResponse({ success: true })
    }

    if (body.action === 'disable') {
      const { trainer_id } = body
      if (!trainer_id) {
        return jsonResponse({ error: 'trainer_id is required' }, 400)
      }

      const { data: trainer, error: trainerError } = await adminClient
        .from('trainers')
        .select('auth_user_id')
        .eq('id', trainer_id)
        .maybeSingle()

      if (trainerError || !trainer?.auth_user_id) {
        return jsonResponse({ error: 'Trainer auth account not found' }, 404)
      }

      const { error: disableError } = await adminClient.auth.admin.updateUserById(
        trainer.auth_user_id,
        { ban_duration: '876000h' },
      )

      if (disableError) {
        return jsonResponse({ error: disableError.message }, 400)
      }

      return jsonResponse({ success: true })
    }

    return jsonResponse({ error: 'Unknown action' }, 400)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return jsonResponse({ error: message }, 500)
  }
})
