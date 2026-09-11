-- Fast windowed Gantt listing and cheaper admin activity saves.

create or replace function public.list_gantt_activities(p_from date, p_to date)
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
set search_path = public
as $$
  with access as (
    select
      public.is_admin() as is_admin,
      public.auth_trainer_id() as trainer_id
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
    where (access.is_admin or access.trainer_id is not null)
      and (
        access.is_admin
        or tp.approval_status = 'approved'
        or (
          tp.trainer_id = access.trainer_id
          and tp.approval_status in ('pending', 'rejected')
        )
      )
      and coalesce((tp.start_datetime at time zone 'Europe/Moscow')::date, tp.start_date) <= p_to
      and coalesce((tp.end_datetime at time zone 'Europe/Moscow')::date, tp.end_date) >= p_from
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
    project_names.name,
    project_names.color,
    trainers.full_name,
    activity_types.name,
    delivery_formats.name,
    roles.name,
    project_types.name,
    recurrence_types.name
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
  left join public.project_names on project_names.id = event.project_main_id
  where (access.is_admin or access.trainer_id is not null)
    and event.program_schedule_id is not null
    and not exists (
      select 1
      from public.admin_calendar_event_trainers assignment
      where assignment.event_id = event.id
    )
    and coalesce((event.start_datetime at time zone 'Europe/Moscow')::date, event.start_date) <= p_to
    and coalesce((event.end_datetime at time zone 'Europe/Moscow')::date, event.end_date) >= p_from

  order by 1;
$$;

comment on function public.list_gantt_activities(date, date) is
  'Returns flattened Gantt rows overlapping [p_from, p_to], including unassigned admin calendar events.';

revoke all on function public.list_gantt_activities(date, date) from public, anon;
grant execute on function public.list_gantt_activities(date, date) to authenticated;

create or replace function public.save_trainer_activity(
  p_record_id bigint,
  p_trainer_id bigint,
  p_participant_ids bigint[],
  p_can_manage_participants boolean,
  p_payload jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current public.trainer_projects%rowtype;
  v_payload public.trainer_projects%rowtype;
  v_group_id uuid;
  v_primary_trainer_id bigint;
begin
  if not public.is_admin() then
    raise exception 'Trainers must use submit_trainer_activity_change';
  end if;

  if coalesce(cardinality(p_participant_ids), 0) = 0 then
    raise exception 'At least one participant is required';
  end if;

  v_payload := jsonb_populate_record(null::public.trainer_projects, p_payload);
  v_primary_trainer_id := p_participant_ids[1];

  if p_record_id is null then
    v_group_id := case
      when cardinality(p_participant_ids) > 1 then gen_random_uuid()
      else null
    end;

    insert into public.trainer_projects (
      trainer_id, event_group_id, approval_status,
      project_type_id, project_main_id, project_sub,
      role_id, activity_type_id, delivery_format_id, recurrence_type_id,
      start_datetime, end_datetime, start_date, end_date,
      task_desc, comments, is_duplicate
    )
    select
      participant_id, v_group_id, 'approved',
      v_payload.project_type_id, v_payload.project_main_id,
      v_payload.project_sub, v_payload.role_id, v_payload.activity_type_id,
      v_payload.delivery_format_id, v_payload.recurrence_type_id,
      v_payload.start_datetime, v_payload.end_datetime, v_payload.start_date,
      v_payload.end_date, v_payload.task_desc, v_payload.comments,
      coalesce(v_payload.is_duplicate, false)
    from unnest(p_participant_ids) as participant_id;
    return;
  end if;

  select *
  into v_current
  from public.trainer_projects
  where id = p_record_id
  for update;

  if not found then
    raise exception 'Activity % was not found', p_record_id;
  end if;

  if v_current.event_group_id is not null then
    if not p_can_manage_participants then
      raise exception 'Only an administrator can edit a group activity row';
    end if;
    v_group_id := v_current.event_group_id;

    update public.trainer_projects
    set
      project_type_id = v_payload.project_type_id,
      project_main_id = v_payload.project_main_id,
      project_sub = v_payload.project_sub,
      role_id = v_payload.role_id,
      activity_type_id = v_payload.activity_type_id,
      delivery_format_id = v_payload.delivery_format_id,
      recurrence_type_id = v_payload.recurrence_type_id,
      start_datetime = v_payload.start_datetime,
      end_datetime = v_payload.end_datetime,
      start_date = v_payload.start_date,
      end_date = v_payload.end_date,
      task_desc = v_payload.task_desc,
      comments = v_payload.comments,
      is_duplicate = coalesce(v_payload.is_duplicate, false)
    where event_group_id = v_group_id;

    delete from public.trainer_projects
    where event_group_id = v_group_id
      and not (trainer_id = any(p_participant_ids));

    insert into public.trainer_projects (
      trainer_id, event_group_id, approval_status,
      project_type_id, project_main_id, project_sub,
      role_id, activity_type_id, delivery_format_id, recurrence_type_id,
      start_datetime, end_datetime, start_date, end_date,
      task_desc, comments, is_duplicate
    )
    select
      participant_id, v_group_id, 'approved',
      v_payload.project_type_id, v_payload.project_main_id,
      v_payload.project_sub, v_payload.role_id, v_payload.activity_type_id,
      v_payload.delivery_format_id, v_payload.recurrence_type_id,
      v_payload.start_datetime, v_payload.end_datetime, v_payload.start_date,
      v_payload.end_date, v_payload.task_desc, v_payload.comments,
      coalesce(v_payload.is_duplicate, false)
    from unnest(p_participant_ids) as participant_id
    where not exists (
      select 1
      from public.trainer_projects existing
      where existing.event_group_id = v_group_id
        and existing.trainer_id = participant_id
    );
    return;
  end if;

  v_group_id := case
    when cardinality(p_participant_ids) > 1 then gen_random_uuid()
    else null
  end;

  update public.trainer_projects
  set
    trainer_id = v_primary_trainer_id,
    event_group_id = v_group_id,
    project_type_id = v_payload.project_type_id,
    project_main_id = v_payload.project_main_id,
    project_sub = v_payload.project_sub,
    role_id = v_payload.role_id,
    activity_type_id = v_payload.activity_type_id,
    delivery_format_id = v_payload.delivery_format_id,
    recurrence_type_id = v_payload.recurrence_type_id,
    start_datetime = v_payload.start_datetime,
    end_datetime = v_payload.end_datetime,
    start_date = v_payload.start_date,
    end_date = v_payload.end_date,
    task_desc = v_payload.task_desc,
    comments = v_payload.comments,
    is_duplicate = coalesce(v_payload.is_duplicate, false)
  where id = p_record_id;

  if v_group_id is not null then
    insert into public.trainer_projects (
      trainer_id, event_group_id, approval_status,
      project_type_id, project_main_id, project_sub,
      role_id, activity_type_id, delivery_format_id, recurrence_type_id,
      start_datetime, end_datetime, start_date, end_date,
      task_desc, comments, is_duplicate
    )
    select
      participant_id, v_group_id, 'approved',
      v_payload.project_type_id, v_payload.project_main_id,
      v_payload.project_sub, v_payload.role_id, v_payload.activity_type_id,
      v_payload.delivery_format_id, v_payload.recurrence_type_id,
      v_payload.start_datetime, v_payload.end_datetime, v_payload.start_date,
      v_payload.end_date, v_payload.task_desc, v_payload.comments,
      coalesce(v_payload.is_duplicate, false)
    from unnest(p_participant_ids[2:cardinality(p_participant_ids)]) as participant_id;
  end if;
end;
$$;

grant execute on function public.save_trainer_activity(bigint, bigint, bigint[], boolean, jsonb) to authenticated;

notify pgrst, 'reload schema';
