alter table public.program_schedules
  add column if not exists source_reference text;

create unique index if not exists program_schedules_source_reference_uidx
  on public.program_schedules(source_reference)
  where source_reference is not null;

notify pgrst, 'reload schema';
