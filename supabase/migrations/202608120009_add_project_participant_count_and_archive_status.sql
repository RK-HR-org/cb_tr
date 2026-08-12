insert into public.project_statuses (
  code,
  name,
  is_terminal,
  sort_order,
  is_active
)
values ('archived', 'Архив', true, 50, true)
on conflict (code) do update
set name = excluded.name,
    is_terminal = excluded.is_terminal,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active;

alter table public.project_names
  add column if not exists participant_count integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.project_names'::regclass
      and conname = 'project_names_participant_count_non_negative'
  ) then
    alter table public.project_names
      add constraint project_names_participant_count_non_negative
      check (participant_count is null or participant_count >= 0);
  end if;
end
$$;

comment on column public.project_names.participant_count is
  'Optional planned or actual number of project participants.';

notify pgrst, 'reload schema';
