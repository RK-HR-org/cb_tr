create or replace function public.save_trainer_activity(
  p_record_id bigint,
  p_trainer_id bigint,
  p_participant_ids bigint[],
  p_can_manage_participants boolean,
  p_payload jsonb
) returns void
language plpgsql
set search_path = public
as $$
declare
  v_current public.trainer_projects%rowtype;
  v_payload public.trainer_projects%rowtype;
  v_group_id uuid;
  v_primary_trainer_id bigint;
begin
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
      trainer_id, event_group_id, project_type_id, project_main_id, project_sub,
      role_id, activity_type_id, delivery_format_id, recurrence_type_id,
      start_datetime, end_datetime, start_date, end_date,
      task_desc, comments, is_duplicate
    )
    select
      participant_id, v_group_id, v_payload.project_type_id, v_payload.project_main_id,
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

  if not p_can_manage_participants and v_current.trainer_id <> p_trainer_id then
    raise exception 'The activity belongs to another trainer';
  end if;

  if v_current.event_group_id is not null then
    if not p_can_manage_participants then
      raise exception 'Only an administrator can edit a group activity';
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
      trainer_id, event_group_id, project_type_id, project_main_id, project_sub,
      role_id, activity_type_id, delivery_format_id, recurrence_type_id,
      start_datetime, end_datetime, start_date, end_date,
      task_desc, comments, is_duplicate
    )
    select
      participant_id, v_group_id, v_payload.project_type_id, v_payload.project_main_id,
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
      trainer_id, event_group_id, project_type_id, project_main_id, project_sub,
      role_id, activity_type_id, delivery_format_id, recurrence_type_id,
      start_datetime, end_datetime, start_date, end_date,
      task_desc, comments, is_duplicate
    )
    select
      participant_id, v_group_id, v_payload.project_type_id, v_payload.project_main_id,
      v_payload.project_sub, v_payload.role_id, v_payload.activity_type_id,
      v_payload.delivery_format_id, v_payload.recurrence_type_id,
      v_payload.start_datetime, v_payload.end_datetime, v_payload.start_date,
      v_payload.end_date, v_payload.task_desc, v_payload.comments,
      coalesce(v_payload.is_duplicate, false)
    from unnest(p_participant_ids[2:cardinality(p_participant_ids)]) as participant_id;
  end if;
end;
$$;

comment on function public.save_trainer_activity(bigint, bigint, bigint[], boolean, jsonb) is
  'Atomically creates or updates an activity and reconciles its trainer participants.';
