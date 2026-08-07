alter table public.trainer_projects
  add column if not exists event_group_id uuid;

create index if not exists trainer_projects_event_group_id_idx
  on public.trainer_projects (event_group_id)
  where event_group_id is not null;

create unique index if not exists trainer_projects_event_group_trainer_uidx
  on public.trainer_projects (event_group_id, trainer_id)
  where event_group_id is not null;

comment on column public.trainer_projects.event_group_id is
  'Shared identifier for copies of one calendar event assigned to several trainers.';
