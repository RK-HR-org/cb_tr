alter table public.admin_calendar_events
  add column if not exists trainer_event_group_id uuid;

create table if not exists public.admin_calendar_event_trainers (
  event_id bigint not null references public.admin_calendar_events(id) on delete cascade,
  trainer_id bigint not null references public.trainers(id) on delete restrict,
  trainer_project_id bigint not null unique references public.trainer_projects(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (event_id, trainer_id)
);

create index if not exists admin_calendar_event_trainers_trainer_idx
  on public.admin_calendar_event_trainers(trainer_id);
create index if not exists admin_calendar_event_trainers_event_idx
  on public.admin_calendar_event_trainers(event_id);

grant select, insert, update, delete on table public.admin_calendar_event_trainers to anon, authenticated;

create or replace function public.sync_admin_calendar_event_trainers(
  p_event_ids bigint[],
  p_trainer_ids bigint[] default '{}'::bigint[]
)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_event_id bigint;
  v_trainer_id bigint;
  v_trainer_project_id bigint;
  v_event_group_id uuid;
  v_event record;
begin
  foreach v_event_id in array coalesce(p_event_ids, '{}'::bigint[]) loop
    select e.id, e.project_main_id, e.activity_type_id, e.delivery_format_id,
      e.recurrence_type_id, e.start_datetime, e.end_datetime, e.start_date,
      e.end_date, e.title, e.description, e.comments,
      coalesce(e.trainer_event_group_id, gen_random_uuid()) as event_group_id,
      project.project_type_id
    into v_event
    from public.admin_calendar_events e
    left join public.project_names project on project.id = e.project_main_id
    where e.id = v_event_id;

    if not found then
      raise exception 'Administrative event % was not found', v_event_id;
    end if;

    v_event_group_id := v_event.event_group_id;
    update public.admin_calendar_events
    set trainer_event_group_id = v_event_group_id, updated_at = now()
    where id = v_event_id and trainer_event_group_id is null;

    delete from public.trainer_projects trainer_project
    using public.admin_calendar_event_trainers assignment
    where assignment.event_id = v_event_id
      and assignment.trainer_project_id = trainer_project.id
      and not (trainer_project.trainer_id = any(coalesce(p_trainer_ids, '{}'::bigint[])));

    delete from public.admin_calendar_event_trainers assignment
    where assignment.event_id = v_event_id
      and not (assignment.trainer_id = any(coalesce(p_trainer_ids, '{}'::bigint[])));

    update public.trainer_projects trainer_project
    set project_type_id = v_event.project_type_id,
      project_main_id = v_event.project_main_id,
      activity_type_id = v_event.activity_type_id,
      delivery_format_id = v_event.delivery_format_id,
      recurrence_type_id = v_event.recurrence_type_id,
      start_datetime = v_event.start_datetime,
      end_datetime = v_event.end_datetime,
      start_date = v_event.start_date,
      end_date = v_event.end_date,
      task_desc = v_event.title,
      comments = coalesce(v_event.description, v_event.comments),
      event_group_id = v_event_group_id,
      source_type = 'admin_calendar_event',
      source_event_key = v_event_id::text,
      is_duplicate = false
    from public.admin_calendar_event_trainers assignment
    where assignment.event_id = v_event_id
      and assignment.trainer_project_id = trainer_project.id;

    foreach v_trainer_id in array coalesce(p_trainer_ids, '{}'::bigint[]) loop
      if not exists (select 1 from public.admin_calendar_event_trainers assignment
        where assignment.event_id = v_event_id and assignment.trainer_id = v_trainer_id) then
        insert into public.trainer_projects (
          trainer_id, project_type_id, project_main_id, activity_type_id,
          delivery_format_id, recurrence_type_id, start_datetime, end_datetime,
          start_date, end_date, event_group_id, source_type, source_event_key,
          is_duplicate, task_desc, comments
        ) values (
          v_trainer_id, v_event.project_type_id, v_event.project_main_id,
          v_event.activity_type_id, v_event.delivery_format_id, v_event.recurrence_type_id,
          v_event.start_datetime, v_event.end_datetime, v_event.start_date, v_event.end_date,
          v_event_group_id, 'admin_calendar_event', v_event_id::text,
          false, v_event.title, coalesce(v_event.description, v_event.comments)
        ) returning id into v_trainer_project_id;

        insert into public.admin_calendar_event_trainers (event_id, trainer_id, trainer_project_id)
        values (v_event_id, v_trainer_id, v_trainer_project_id);
      end if;
    end loop;
  end loop;
end;
$$;

create or replace function public.delete_admin_calendar_events(p_event_ids bigint[])
returns integer
language plpgsql
set search_path = public
as $$
declare v_deleted integer;
begin
  delete from public.trainer_projects trainer_project
  using public.admin_calendar_event_trainers assignment
  where assignment.event_id = any(coalesce(p_event_ids, '{}'::bigint[]))
    and assignment.trainer_project_id = trainer_project.id;
  delete from public.admin_calendar_events
  where id = any(coalesce(p_event_ids, '{}'::bigint[]));
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

create or replace function public.delete_admin_calendar_event_future_series(
  p_event_id bigint, p_now timestamptz default now()
)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_series_id uuid;
  v_event_ids bigint[];
begin
  select series_id into v_series_id from public.admin_calendar_events where id = p_event_id;
  if v_series_id is null then return 0; end if;
  select coalesce(array_agg(id), '{}'::bigint[]) into v_event_ids
  from public.admin_calendar_events
  where series_id = v_series_id
    and ((start_datetime is not null and start_datetime >= p_now)
      or (start_date is not null and start_date >= (p_now at time zone 'Europe/Moscow')::date));
  return public.delete_admin_calendar_events(v_event_ids);
end;
$$;
