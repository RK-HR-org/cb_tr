alter table public.project_names
  add column if not exists duration_days numeric,
  add column if not exists duration_hours numeric;

alter table public.project_names
  add constraint project_names_duration_days_non_negative
    check (duration_days is null or duration_days >= 0),
  add constraint project_names_duration_hours_non_negative
    check (duration_hours is null or duration_hours >= 0);

comment on column public.project_names.duration_days is
  'Optional project or module duration in days. May be used independently of duration_hours.';
comment on column public.project_names.duration_hours is
  'Optional project or module duration in hours. May be used independently of duration_days.';
