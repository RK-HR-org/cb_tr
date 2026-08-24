/**
 * One-time migration: create Supabase Auth accounts for trainers without auth_user_id.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-trainer-auth.mjs
 *
 * Optional:
 *   TEMP_TRAINER_PASSWORD=your-temp-password
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const tempPassword = process.env.TEMP_TRAINER_PASSWORD || 'changeme123'
const authEmailDomain = 'cb-tr.local'

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

function toAuthEmail(login) {
  return `${login.toLowerCase()}@${authEmailDomain}`
}

async function main() {
  const { data: trainers, error } = await supabase
    .from('trainers')
    .select('id, full_name, login, auth_user_id')
    .is('auth_user_id', null)
    .order('id')

  if (error) {
    console.error('Failed to load trainers:', error.message)
    process.exit(1)
  }

  if (!trainers?.length) {
    console.log('No trainers without auth accounts.')
    return
  }

  console.log(`Migrating ${trainers.length} trainer(s)...`)

  for (const trainer of trainers) {
    const login = trainer.login || `trainer_${trainer.id}`
    console.log(`- Trainer #${trainer.id} (${trainer.full_name}) → login: ${login}`)

    const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
      email: toAuthEmail(login),
      password: tempPassword,
      email_confirm: true,
      app_metadata: {
        role: 'trainer',
        trainer_id: trainer.id,
        full_name: trainer.full_name,
      },
      user_metadata: { login },
    })

    if (createError) {
      console.error(`  ERROR: ${createError.message}`)
      continue
    }

    const { error: updateError } = await supabase
      .from('trainers')
      .update({
        login,
        auth_user_id: createdUser.user.id,
      })
      .eq('id', trainer.id)

    if (updateError) {
      console.error(`  ERROR updating trainer: ${updateError.message}`)
      await supabase.auth.admin.deleteUser(createdUser.user.id)
      continue
    }

    console.log('  OK')
  }

  console.log(`Done. Temporary password for all migrated trainers: ${tempPassword}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
