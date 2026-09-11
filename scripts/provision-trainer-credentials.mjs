/**
 * Create or reset Supabase Auth for all trainers and export credentials to a temp file.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/provision-trainer-credentials.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const authEmailDomain = 'cb-tr.local'
const outputPath = process.env.OUTPUT_PATH
  || join(process.cwd(), `tmp_trainer_credentials_${new Date().toISOString().slice(0, 10)}.tsv`)

const CYRILLIC = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
  э: 'e', ю: 'yu', я: 'ya',
}

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

function toAuthEmail(login) {
  return `${login.toLowerCase()}@${authEmailDomain}`
}

function transliterate(value) {
  return value
    .trim()
    .toLowerCase()
    .split('')
    .map(char => CYRILLIC[char] ?? char)
    .join('')
}

function isValidLogin(login) {
  return /^[a-z0-9_]{3,32}$/.test(login)
}

function generatePassword() {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(12)
  let password = ''
  for (let i = 0; i < 12; i += 1) {
    password += alphabet[bytes[i] % alphabet.length]
  }
  return password
}

function suggestLogin(trainer, usedLogins) {
  if (trainer.login && isValidLogin(trainer.login)) {
    return trainer.login.toLowerCase()
  }

  const surname = trainer.full_name.trim().split(/\s+/)[0] || ''
  let base = transliterate(surname).replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
  if (base.length < 3) base = `trainer_${trainer.id}`

  let login = base.slice(0, 32)
  let suffix = 2
  while (usedLogins.has(login)) {
    const trimmed = base.slice(0, Math.max(3, 32 - String(suffix).length - 1))
    login = `${trimmed}_${suffix}`
    suffix += 1
  }
  return login
}

async function main() {
  const { data: trainers, error } = await supabase
    .from('trainers')
    .select('id, full_name, login, auth_user_id')
    .order('full_name')

  if (error) {
    console.error('Failed to load trainers:', error.message)
    process.exit(1)
  }

  const usedLogins = new Set(
    trainers
      .map(trainer => trainer.login?.toLowerCase())
      .filter(Boolean),
  )

  const rows = []
  const results = []

  for (const trainer of trainers) {
    const login = suggestLogin(trainer, usedLogins)
    usedLogins.add(login)
    const password = generatePassword()
    let status = 'created'

    try {
      if (trainer.auth_user_id) {
        const { error: resetError } = await supabase.auth.admin.updateUserById(
          trainer.auth_user_id,
          { password, user_metadata: { login } },
        )
        if (resetError) throw resetError

        if (trainer.login !== login) {
          const { error: updateError } = await supabase
            .from('trainers')
            .update({ login })
            .eq('id', trainer.id)
          if (updateError) throw updateError
        }
        status = 'password_reset'
      } else {
        const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
          email: toAuthEmail(login),
          password,
          email_confirm: true,
          app_metadata: {
            role: 'trainer',
            trainer_id: trainer.id,
            full_name: trainer.full_name,
          },
          user_metadata: { login },
        })
        if (createError || !createdUser.user) {
          throw createError || new Error('Failed to create auth user')
        }

        const { error: updateError } = await supabase
          .from('trainers')
          .update({
            login,
            auth_user_id: createdUser.user.id,
          })
          .eq('id', trainer.id)

        if (updateError) {
          await supabase.auth.admin.deleteUser(createdUser.user.id)
          throw updateError
        }
      }

      rows.push({
        id: trainer.id,
        full_name: trainer.full_name,
        login,
        password,
        status,
      })
      results.push({ trainer, login, status, ok: true })
      console.log(`OK #${trainer.id} ${trainer.full_name} → ${login} (${status})`)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      results.push({ trainer, login, status: 'error', ok: false, message })
      console.error(`ERROR #${trainer.id} ${trainer.full_name}: ${message}`)
    }
  }

  const header = ['ID', 'ФИО', 'Логин', 'Пароль', 'Статус'].join('\t')
  const body = rows.map(row => [
    row.id,
    row.full_name,
    row.login,
    row.password,
    row.status === 'password_reset' ? 'пароль обновлён' : 'создан',
  ].join('\t')).join('\n')

  writeFileSync(outputPath, `\uFEFF${header}\n${body}\n`, 'utf8')

  const failed = results.filter(item => !item.ok)
  console.log('')
  console.log(`Saved credentials: ${outputPath}`)
  console.log(`Success: ${rows.length}/${trainers.length}`)
  if (failed.length) {
    console.log(`Failed: ${failed.length}`)
    process.exitCode = 1
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
