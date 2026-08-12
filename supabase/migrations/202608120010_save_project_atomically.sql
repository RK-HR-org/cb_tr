create or replace function public.save_project_card(
  p_project_id bigint,
  p_payload jsonb,
  p_direction_ids bigint[] default '{}'::bigint[]
)
returns bigint
language plpgsql
set search_path = public
as $$
declare
  v_project_id bigint;
begin
  if p_project_id is null then
    insert into public.project_names (
      name,
      audit_index,
      weight,
      status_code,
      project_type_id,
      parent_project_id,
      module_position,
      customer,
      lead_methodologist_id,
      target_audience,
      goals,
      short_description,
      duration_days,
      duration_hours,
      participant_count,
      central_office_format_code,
      main_department_format_code,
      annual_budget_item_id
    )
    values (
      nullif(btrim(p_payload->>'name'), ''),
      nullif(btrim(p_payload->>'audit_index'), ''),
      coalesce((p_payload->>'weight')::numeric, 1),
      coalesce(nullif(p_payload->>'status_code', ''), 'under_review'),
      (p_payload->>'project_type_id')::bigint,
      (p_payload->>'parent_project_id')::bigint,
      (p_payload->>'module_position')::integer,
      nullif(btrim(p_payload->>'customer'), ''),
      (p_payload->>'lead_methodologist_id')::bigint,
      nullif(btrim(p_payload->>'target_audience'), ''),
      nullif(btrim(p_payload->>'goals'), ''),
      nullif(btrim(p_payload->>'short_description'), ''),
      (p_payload->>'duration_days')::numeric,
      (p_payload->>'duration_hours')::numeric,
      (p_payload->>'participant_count')::integer,
      nullif(p_payload->>'central_office_format_code', ''),
      nullif(p_payload->>'main_department_format_code', ''),
      (p_payload->>'annual_budget_item_id')::bigint
    )
    returning id into v_project_id;
  else
    update public.project_names
    set name = nullif(btrim(p_payload->>'name'), ''),
        audit_index = nullif(btrim(p_payload->>'audit_index'), ''),
        weight = coalesce((p_payload->>'weight')::numeric, 1),
        status_code = coalesce(nullif(p_payload->>'status_code', ''), 'under_review'),
        project_type_id = (p_payload->>'project_type_id')::bigint,
        parent_project_id = (p_payload->>'parent_project_id')::bigint,
        module_position = (p_payload->>'module_position')::integer,
        customer = nullif(btrim(p_payload->>'customer'), ''),
        lead_methodologist_id = (p_payload->>'lead_methodologist_id')::bigint,
        target_audience = nullif(btrim(p_payload->>'target_audience'), ''),
        goals = nullif(btrim(p_payload->>'goals'), ''),
        short_description = nullif(btrim(p_payload->>'short_description'), ''),
        duration_days = (p_payload->>'duration_days')::numeric,
        duration_hours = (p_payload->>'duration_hours')::numeric,
        participant_count = (p_payload->>'participant_count')::integer,
        central_office_format_code = nullif(p_payload->>'central_office_format_code', ''),
        main_department_format_code = nullif(p_payload->>'main_department_format_code', ''),
        annual_budget_item_id = (p_payload->>'annual_budget_item_id')::bigint
    where id = p_project_id
    returning id into v_project_id;

    if v_project_id is null then
      raise exception 'Project % not found', p_project_id using errcode = 'P0002';
    end if;
  end if;

  delete from public.project_direction_links
  where project_id = v_project_id;

  insert into public.project_direction_links (project_id, direction_id)
  select v_project_id, direction_id
  from unnest(coalesce(p_direction_ids, '{}'::bigint[])) as direction_id;

  return v_project_id;
end;
$$;

revoke all on function public.save_project_card(bigint, jsonb, bigint[]) from public;
grant execute on function public.save_project_card(bigint, jsonb, bigint[]) to anon, authenticated;

notify pgrst, 'reload schema';
