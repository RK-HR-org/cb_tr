-- PostgREST sends JSON strings, so (date, date) was not resolved and the Gantt RPC
-- returned an error / empty set. Accept text and cast inside. Alias output columns.

drop function if exists public.list_gantt_activities(date, date);

create or replace function public.list_gantt_activities(p_from text, p_to text)
returns table (
  id bigint,
  trainer_id bigint,
  approval_status text,
  event_group_id uuid,
  project_type_id bigint,
  project_main_id bigint,
  project_sub text,
  role_id bigint,
  activity_type_id bigint,
  delivery_format_id bigint,
  recurrence_type_id bigint,
  start_datetime timestamptz,
  end_datetime timestamptz,
  start_date date,
  end_date date,
  source_type text,
  source_schedule_key text,
  source_event_key text,
  is_duplicate boolean,
  task_desc text,
  comments text,
  project_name text,
  project_color text,
  trainer_full_name text,
  activity_type_name text,
  delivery_format_name text,
  role_name text,
  project_type_name text,
  recurrence_type_name text
)
language sql
stable
security definer
set search_path = public, auth
as $$
  with params as (
    select p_from::date as range_from, p_to::date as range_to
  ),
  access as (
    select
      coalesce(
        auth.jwt() -> 'app_metadata' ->> 'role',
        auth.jwt() -> 'user_metadata' ->> 'role',
        ''
      ) = 'admin' as is_admin,
      nullif(auth.jwt() -> 'app_metadata' ->> 'trainer_id', '')::bigint as trainer_id
  ),
  visible_activities as (
    select
      tp.id,
      tp.trainer_id,
      tp.approval_status,
      tp.event_group_id,
      tp.project_type_id,
      tp.project_main_id,
      tp.project_sub,
      tp.role_id,
      tp.activity_type_id,
      tp.delivery_format_id,
      tp.recurrence_type_id,
      tp.start_datetime,
      tp.end_datetime,
      tp.start_date,
      tp.end_date,
      tp.source_type,
      tp.source_schedule_key,
      tp.source_event_key,
      tp.is_duplicate,
      tp.task_desc,
      tp.comments
    from public.trainer_projects tp
    cross join access
    cross join params
    where (access.is_admin or access.trainer_id is not null)
      and (
        access.is_admin
        or tp.approval_status = 'approved'
        or (
          tp.trainer_id = access.trainer_id
          and tp.approval_status in ('pending', 'rejected')
        )
      )
      and coalesce((tp.start_datetime at time zone 'Europe/Moscow')::date, tp.start_date) <= params.range_to
      and coalesce((tp.end_datetime at time zone 'Europe/Moscow')::date, tp.end_date) >= params.range_from
  )
  select
    activity.id,
    activity.trainer_id,
    activity.approval_status,
    activity.event_group_id,
    activity.project_type_id,
    activity.project_main_id,
    activity.project_sub,
    activity.role_id,
    activity.activity_type_id,
    activity.delivery_format_id,
    activity.recurrence_type_id,
    activity.start_datetime,
    activity.end_datetime,
    activity.start_date,
    activity.end_date,
    activity.source_type,
    activity.source_schedule_key,
    activity.source_event_key,
    activity.is_duplicate,
    activity.task_desc,
    activity.comments,
    project_names.name as project_name,
    project_names.color as project_color,
    trainers.full_name as trainer_full_name,
    activity_types.name as activity_type_name,
    delivery_formats.name as delivery_format_name,
    roles.name as role_name,
    project_types.name as project_type_name,
    recurrence_types.name as recurrence_type_name
  from visible_activities activity
  left join public.trainers on trainers.id = activity.trainer_id
  left join public.project_names on project_names.id = activity.project_main_id
  left join public.activity_types on activity_types.id = activity.activity_type_id
  left join public.delivery_formats on delivery_formats.id = activity.delivery_format_id
  left join public.roles on roles.id = activity.role_id
  left join public.project_types on project_types.id = activity.project_type_id
  left join public.recurrence_types on recurrence_types.id = activity.recurrence_type_id

  union all

  select
    (-event.id)::bigint,
    0::bigint,
    'approved'::text,
    null::uuid,
    null::bigint,
    event.project_main_id,
    null::text,
    null::bigint,
    null::bigint,
    null::bigint,
    null::bigint,
    event.start_datetime,
    event.end_datetime,
    event.start_date,
    event.end_date,
    'admin_calendar_event'::text,
    null::text,
    event.id::text,
    false,
    event.title,
    event.comments,
    project_names.name,
    project_names.color,
    'Не назначено'::text,
    null::text,
    null::text,
    null::text,
    null::text,
    null::text
  from public.admin_calendar_events event
  cross join access
  cross join params
  left join public.project_names on project_names.id = event.project_main_id
  where (access.is_admin or access.trainer_id is not null)
    and event.program_schedule_id is not null
    and not exists (
      select 1
      from public.admin_calendar_event_trainers assignment
      where assignment.event_id = event.id
    )
    and coalesce((event.start_datetime at time zone 'Europe/Moscow')::date, event.start_date) <= params.range_to
    and coalesce((event.end_datetime at time zone 'Europe/Moscow')::date, event.end_date) >= params.range_from

  order by 1;
$$;

comment on function public.list_gantt_activities(text, text) is
  'Returns flattened Gantt rows overlapping [p_from, p_to], including unassigned admin calendar events.';

revoke all on function public.list_gantt_activities(text, text) from public, anon;
grant execute on function public.list_gantt_activities(text, text) to authenticated;

notify pgrst, 'reload schema';
