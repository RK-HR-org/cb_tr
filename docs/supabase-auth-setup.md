# Настройка Supabase Auth

Выполните один раз в [Supabase Dashboard](https://supabase.com/dashboard) для проекта приложения.

## Authentication → Providers → Email

- **Enable Email provider** — включён
- **Confirm email** — **выключить** (письма не отправляются)
- **Secure email change** — по желанию

## Authentication → Settings

- **Allow new users to sign up** — **выключить** (регистрация только через Edge Function администратором)

## Edge Function secrets

Для `manage-trainer-auth` Supabase подставляет автоматически:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Деплой функции:

```bash
supabase functions deploy manage-trainer-auth
```

## Учётная запись администратора

Миграция `202608240001_add_auth_fields.sql` создаёт пользователя:

| Поле | Значение |
|------|----------|
| Логин | `admin` |
| Пароль по умолчанию | `adminpass` |
| Email (технический) | `admin@cb-tr.local` |

**Смените пароль администратора** после первого входа: Authentication → Users → admin@cb-tr.local → Reset password.

## Миграция существующих тренеров

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-trainer-auth.mjs
```

Скрипт создаёт логины вида `trainer_<id>` и временный пароль из переменной `TEMP_TRAINER_PASSWORD` (по умолчанию `changeme123`).
