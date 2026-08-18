do $$
declare
  v_duplicate_id bigint;
  v_primary_id bigint;
begin
  select id
  into v_duplicate_id
  from public.trainers
  where full_name = 'Авраменко Юлиана';

  select id
  into v_primary_id
  from public.trainers
  where full_name = 'Авраменко Юлианна';

  if v_duplicate_id is null then
    return;
  end if;

  if v_primary_id is null then
    raise exception 'Primary trainer Авраменко Юлианна was not found';
  end if;

  -- A group event can contain a trainer only once. Keep the primary trainer's
  -- copy if both records are already linked to the same event.
  delete from public.trainer_projects duplicate_activity
  using public.trainer_projects primary_activity
  where duplicate_activity.trainer_id = v_duplicate_id
    and primary_activity.trainer_id = v_primary_id
    and duplicate_activity.event_group_id is not null
    and primary_activity.event_group_id = duplicate_activity.event_group_id;

  update public.trainer_projects
  set trainer_id = v_primary_id
  where trainer_id = v_duplicate_id;

  update public.tasks
  set trainer_id = v_primary_id
  where trainer_id = v_duplicate_id;

  update public.project_names
  set lead_methodologist_id = v_primary_id
  where lead_methodologist_id = v_duplicate_id;

  -- A trainer can have only one certification per project. Keep the primary
  -- record in the unlikely case that both profiles certify the same project.
  delete from public.trainer_certifications duplicate_certification
  using public.trainer_certifications primary_certification
  where duplicate_certification.trainer_id = v_duplicate_id
    and primary_certification.trainer_id = v_primary_id
    and duplicate_certification.project_id = primary_certification.project_id;

  update public.trainer_certifications
  set trainer_id = v_primary_id,
      updated_at = now()
  where trainer_id = v_duplicate_id;

  delete from public.trainers
  where id = v_duplicate_id;
end
$$;
