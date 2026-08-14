create table if not exists public.work_norm_settings (
  year integer primary key,
  training_days_per_trainer_week numeric(5, 2) not null default 2,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint work_norm_settings_year_check check (year between 2000 and 2200),
  constraint work_norm_settings_training_days_check
    check (training_days_per_trainer_week between 0 and 7)
);

comment on table public.work_norm_settings is
  'Year-specific parameters used to calculate trainer workload capacity.';

insert into public.work_norm_settings (year, training_days_per_trainer_week)
values (2027, 2)
on conflict (year) do nothing;

grant select, insert, update, delete on table public.work_norm_settings
  to anon, authenticated;

notify pgrst, 'reload schema';
