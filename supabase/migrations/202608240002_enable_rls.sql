-- Row Level Security: authenticated users only, role-based access.

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from anon;

grant usage on schema public to authenticated;

-- Helper macro via repeated policies:
-- admin: full access
-- trainer: read dictionaries, own trainer row, own activities/certifications

alter table public.trainers enable row level security;
alter table public.trainer_projects enable row level security;
alter table public.trainer_certifications enable row level security;
alter table public.roles enable row level security;
alter table public.project_types enable row level security;
alter table public.project_names enable row level security;
alter table public.activity_types enable row level security;
alter table public.delivery_formats enable row level security;
alter table public.recurrence_types enable row level security;
alter table public.cities enable row level security;
alter table public.divisions enable row level security;
alter table public.directions enable row level security;
alter table public.project_statuses enable row level security;
alter table public.project_delivery_formats enable row level security;
alter table public.annual_budget_items enable row level security;
alter table public.certification_statuses enable row level security;
alter table public.material_types enable row level security;
alter table public.material_statuses enable row level security;
alter table public.project_direction_links enable row level security;
alter table public.project_materials enable row level security;
alter table public.production_calendar_days enable row level security;
alter table public.work_norm_settings enable row level security;
alter table public.program_schedules enable row level security;
alter table public.program_schedule_modules enable row level security;
alter table public.admin_calendar_events enable row level security;
alter table public.admin_calendar_event_trainers enable row level security;

-- trainers
create policy trainers_admin_all on public.trainers
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy trainers_self_select on public.trainers
  for select to authenticated
  using (id = public.auth_trainer_id());

-- trainer_projects
create policy trainer_projects_admin_all on public.trainer_projects
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy trainer_projects_self_all on public.trainer_projects
  for all to authenticated
  using (
    public.auth_trainer_id() is not null
    and (
      trainer_id = public.auth_trainer_id()
      or (
        event_group_id is not null
        and event_group_id in (
          select tp.event_group_id
          from public.trainer_projects tp
          where tp.trainer_id = public.auth_trainer_id()
            and tp.event_group_id is not null
        )
      )
    )
  )
  with check (
    public.auth_trainer_id() is not null
    and trainer_id = public.auth_trainer_id()
  );

-- trainer_certifications
create policy trainer_certifications_admin_all on public.trainer_certifications
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy trainer_certifications_self_select on public.trainer_certifications
  for select to authenticated
  using (trainer_id = public.auth_trainer_id());

-- Dictionary tables: read for all authenticated, write for admin
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'roles',
    'project_types',
    'activity_types',
    'delivery_formats',
    'recurrence_types',
    'cities',
    'divisions',
    'directions',
    'project_statuses',
    'project_delivery_formats',
    'annual_budget_items',
    'certification_statuses',
    'material_types',
    'material_statuses',
    'production_calendar_days',
    'work_norm_settings'
  ] loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_authenticated_app_user())',
      tbl || '_authenticated_select',
      tbl
    );
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      tbl || '_admin_all',
      tbl
    );
  end loop;
end;
$$;

-- Projects and related admin-managed data
create policy project_names_authenticated_select on public.project_names
  for select to authenticated
  using (public.is_authenticated_app_user());

create policy project_names_admin_all on public.project_names
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy project_direction_links_authenticated_select on public.project_direction_links
  for select to authenticated
  using (public.is_authenticated_app_user());

create policy project_direction_links_admin_all on public.project_direction_links
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy project_materials_authenticated_select on public.project_materials
  for select to authenticated
  using (public.is_authenticated_app_user());

create policy project_materials_admin_all on public.project_materials
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Program scheduling and admin calendar: admin only
create policy program_schedules_admin_all on public.program_schedules
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy program_schedule_modules_admin_all on public.program_schedule_modules
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy admin_calendar_events_admin_all on public.admin_calendar_events
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy admin_calendar_event_trainers_admin_all on public.admin_calendar_event_trainers
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Trainers can read admin calendar events they are assigned to
create policy admin_calendar_events_trainer_assigned_select on public.admin_calendar_events
  for select to authenticated
  using (
    public.auth_trainer_id() is not null
    and exists (
      select 1
      from public.admin_calendar_event_trainers assignment
      where assignment.event_id = admin_calendar_events.id
        and assignment.trainer_id = public.auth_trainer_id()
    )
  );

create policy admin_calendar_event_trainers_trainer_assigned_select
  on public.admin_calendar_event_trainers
  for select to authenticated
  using (trainer_id = public.auth_trainer_id());

-- View: trainer_effective_project_access
grant select on public.trainer_effective_project_access to authenticated;

-- Table grants for authenticated role
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- RPC functions: authenticated only
grant execute on function public.save_trainer_activity(bigint, bigint, bigint[], boolean, jsonb) to authenticated;
grant execute on function public.save_project_card(bigint, jsonb, bigint[]) to authenticated;
grant execute on function public.save_program_schedule(bigint, date, integer, text, text, jsonb) to authenticated;
grant execute on function public.sync_admin_calendar_event_trainers(bigint[], bigint[]) to authenticated;
grant execute on function public.delete_admin_calendar_events(bigint[]) to authenticated;
grant execute on function public.delete_admin_calendar_event_future_series(bigint, timestamptz) to authenticated;
