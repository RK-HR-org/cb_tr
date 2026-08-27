-- Gantt for trainers: read all activities/trainers, write own rows only.
-- Harden save_trainer_activity against cross-trainer edits.

create policy trainers_trainer_read_all on public.trainers
  for select to authenticated
  using (public.auth_trainer_id() is not null);

drop policy if exists trainer_projects_self_all on public.trainer_projects;

create policy trainer_projects_trainer_select on public.trainer_projects
  for select to authenticated
  using (public.auth_trainer_id() is not null);

create policy trainer_projects_trainer_insert on public.trainer_projects
  for insert to authenticated
  with check (
    public.auth_trainer_id() is not null
    and trainer_id = public.auth_trainer_id()
  );

create policy trainer_projects_trainer_update on public.trainer_projects
  for update to authenticated
  using (
    public.auth_trainer_id() is not null
    and trainer_id = public.auth_trainer_id()
  )
  with check (
    public.auth_trainer_id() is not null
    and trainer_id = public.auth_trainer_id()
  );

create policy trainer_projects_trainer_delete on public.trainer_projects
  for delete to authenticated
  using (
    public.auth_trainer_id() is not null
    and trainer_id = public.auth_trainer_id()
  );

create policy admin_calendar_events_trainer_read on public.admin_calendar_events
  for select to authenticated
  using (public.auth_trainer_id() is not null);

create policy admin_calendar_event_trainers_trainer_read on public.admin_calendar_event_trainers
  for select to authenticated
  using (public.auth_trainer_id() is not null);

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
  if not public.is_admin() then
    if public.auth_trainer_id() is null then
      raise exception 'Unauthorized';
    end if;
    if p_can_manage_participants then
      raise exception 'Only an administrator can manage participants';
    end if;
    if p_trainer_id <> public.auth_trainer_id() then
      raise exception 'Cannot modify another trainer''s activity';
    end if;
    if coalesce(cardinality(p_participant_ids), 0) <> 1
      or p_participant_ids[1] <> public.auth_trainer_id() then
      raise exception 'Trainers can only manage their own activities';
    end if;
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

  if not public.is_admin() then
    if v_current.trainer_id <> public.auth_trainer_id() then
      raise exception 'Cannot modify another trainer''s activity';
    end if;
    if v_current.event_group_id is not null then
      raise exception 'Only an administrator can edit a group activity';
    end if;
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
