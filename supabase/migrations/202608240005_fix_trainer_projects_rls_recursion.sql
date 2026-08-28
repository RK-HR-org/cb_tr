-- Fix infinite RLS recursion: trainer_projects policy referenced the same table.

create or replace function public.trainer_owned_event_group_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select distinct tp.event_group_id
  from public.trainer_projects tp
  where tp.trainer_id = public.auth_trainer_id()
    and tp.event_group_id is not null;
$$;

drop policy if exists trainer_projects_self_all on public.trainer_projects;

create policy trainer_projects_self_all on public.trainer_projects
  for all to authenticated
  using (
    public.auth_trainer_id() is not null
    and (
      trainer_id = public.auth_trainer_id()
      or (
        event_group_id is not null
        and event_group_id in (select public.trainer_owned_event_group_ids())
      )
    )
  )
  with check (
    public.auth_trainer_id() is not null
    and trainer_id = public.auth_trainer_id()
  );

notify pgrst, 'reload schema';
