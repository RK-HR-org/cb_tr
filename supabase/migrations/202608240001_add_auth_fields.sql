-- Auth fields on trainers and JWT helper functions for RLS.

alter table public.trainers
  add column if not exists login text,
  add column if not exists auth_user_id uuid unique references auth.users (id) on delete set null;

create unique index if not exists trainers_login_unique_idx
  on public.trainers (lower(login))
  where login is not null;

alter table public.trainers
  drop constraint if exists trainers_login_format;

alter table public.trainers
  add constraint trainers_login_format check (
    login is null
    or login ~ '^[a-z0-9_]{3,32}$'
  );

comment on column public.trainers.login is
  'Unique login for trainer sign-in. Set by administrator.';
comment on column public.trainers.auth_user_id is
  'Linked Supabase Auth user for password-based sign-in.';

create or replace function public.auth_role()
returns text
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
$$;

create or replace function public.auth_trainer_id()
returns bigint
language sql
stable
security invoker
set search_path = public
as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'trainer_id', '')::bigint;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select public.auth_role() = 'admin';
$$;

create or replace function public.is_authenticated_app_user()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select public.auth_role() in ('admin', 'trainer');
$$;

comment on function public.auth_role() is
  'Returns app role from JWT app_metadata: admin or trainer.';
comment on function public.auth_trainer_id() is
  'Returns trainer_id from JWT app_metadata for trainer users.';
comment on function public.is_admin() is
  'True when the current JWT belongs to an administrator.';

-- Bootstrap a single shared admin account (login: admin, default password: adminpass).
-- Change the password in Supabase Dashboard after first deploy.
do $$
declare
  v_admin_id uuid := '00000000-0000-0000-0000-000000000001';
begin
  if exists (
    select 1
    from auth.users
    where email = 'admin@cb-tr.local'
  ) then
    return;
  end if;

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_admin_id,
    'authenticated',
    'authenticated',
    'admin@cb-tr.local',
    extensions.crypt('adminpass', extensions.gen_salt('bf')),
    now(),
    jsonb_build_object(
      'provider', 'email',
      'providers', jsonb_build_array('email'),
      'role', 'admin',
      'full_name', 'Главный Администратор'
    ),
    jsonb_build_object('login', 'admin'),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    v_admin_id,
    v_admin_id,
    jsonb_build_object(
      'sub', v_admin_id::text,
      'email', 'admin@cb-tr.local'
    ),
    'email',
    v_admin_id::text,
    now(),
    now(),
    now()
  );
end;
$$;
