-- Mark the approval request before deleting its activity. Both foreign keys on
-- the request are cleared by ON DELETE SET NULL, but the approval status remains.
create or replace function public.approve_activity_change(p_request_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.activity_change_requests%rowtype;
  v_payload public.trainer_projects%rowtype;
  v_row public.trainer_projects%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can approve changes';
  end if;

  select *
  into v_request
  from public.activity_change_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Request % was not found', p_request_id;
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Request % is not pending', p_request_id;
  end if;

  if v_request.change_type = 'create' then
    update public.trainer_projects
    set approval_status = 'approved'
    where id = v_request.trainer_project_id;

    update public.activity_change_requests
    set
      status = 'approved',
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      result_trainer_project_id = v_request.trainer_project_id
    where id = p_request_id;
    return;
  end if;

  if v_request.change_type = 'update' then
    select *
    into v_row
    from public.trainer_projects
    where id = v_request.trainer_project_id
    for update;

    if not found then
      raise exception 'Activity % was not found', v_request.trainer_project_id;
    end if;

    v_payload := jsonb_populate_record(v_row, v_request.proposed_payload);

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
      is_duplicate = coalesce(v_payload.is_duplicate, false),
      approval_status = 'approved'
    where id = v_request.trainer_project_id;

    update public.activity_change_requests
    set
      status = 'approved',
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      result_trainer_project_id = v_request.trainer_project_id
    where id = p_request_id;
    return;
  end if;

  -- Set the request status while the referenced activity still exists. Deleting
  -- it afterwards clears the FK fields through ON DELETE SET NULL.
  update public.activity_change_requests
  set
    status = 'approved',
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    result_trainer_project_id = v_request.trainer_project_id
  where id = p_request_id;

  delete from public.trainer_projects
  where id = v_request.trainer_project_id;
end;
$$;
