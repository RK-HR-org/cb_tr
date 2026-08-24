# Подключение Supabase для CLI и деплоя

## Что уже сделано

- Установлен Supabase CLI (`supabase --version`)
- В репозитории выполнен `supabase init` → `supabase/config.toml`

## Что нужно от вас (один раз)

### 1. Данные проекта Supabase

Из [Dashboard](https://supabase.com/dashboard) → ваш проект → **Project Settings → API**:

| Переменная | Где взять |
|------------|-----------|
| **Project ref** | General → Reference ID |
| **VITE_SUPABASE_URL** | API → Project URL |
| **VITE_SUPABASE_ANON_KEY** | API → anon public |
| **Database password** | Database → Database password |

Скопируйте `.env.example` в `.env.local` и заполните `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`.

### 2. Авторизация CLI

**Вариант A:** в терминале:

```powershell
supabase login
```

**Вариант B:** Access Token из Dashboard → Account → Access Tokens:

```powershell
$env:SUPABASE_ACCESS_TOKEN="sbp_..."
```

### 3. Привязка репозитория к проекту

```powershell
cd c:\Projects\cb_tr
supabase link --project-ref ВАШ_PROJECT_REF --password "ВАШ_DB_PASSWORD"
```

## Команды после привязки

```powershell
supabase db push
supabase functions deploy manage-trainer-auth
```

```powershell
$env:SUPABASE_URL="https://....supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="..."
node scripts/migrate-trainer-auth.mjs
```

## Dashboard (вручную)

Authentication → Email: выключить **Confirm email** и **Allow sign-ups**.
