alter table public.project_names
  add column if not exists project_type_id bigint
    references public.project_types(id) on delete restrict;

create index if not exists project_names_project_type_id_idx
  on public.project_names (project_type_id);

insert into public.project_types (name, weight)
select 'Модульная программа', 1
where not exists (
  select 1
  from public.project_types
  where lower(btrim(name)) = lower('Модульная программа')
);

-- Preserve an existing project classification when activities consistently point
-- to a type. Legacy programs are mapped to the dedicated modular-program type.
update public.project_names as project
set project_type_id = activity_type.project_type_id
from (
  select project_main_id, min(project_type_id) as project_type_id
  from public.trainer_projects
  where project_main_id is not null
    and project_type_id is not null
  group by project_main_id
  having count(distinct project_type_id) = 1
) as activity_type
where project.id = activity_type.project_main_id
  and project.project_type_id is null;

update public.project_names as project
set project_type_id = modular_type.id
from (
  select min(id) as id
  from public.project_types
  where lower(btrim(name)) = lower('Модульная программа')
) as modular_type
where project.kind_code = 'program'
  and modular_type.id is not null;

alter table public.project_names
  drop column if exists kind_code;

drop table if exists public.project_kinds;

create or replace function public.validate_project_module_parent()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.parent_project_id is not null and not exists (
    select 1
    from public.project_names as parent
    join public.project_types as parent_type
      on parent_type.id = parent.project_type_id
    where parent.id = new.parent_project_id
      and lower(btrim(parent_type.name)) = lower('Модульная программа')
  ) then
    raise exception 'Modules can only be added to a project of type "Модульная программа"'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.project_names as child
    where child.parent_project_id = new.id
  ) and not exists (
    select 1
    from public.project_types as current_type
    where current_type.id = new.project_type_id
      and lower(btrim(current_type.name)) = lower('Модульная программа')
  ) then
    raise exception 'A project with modules must have type "Модульная программа"'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_project_module_parent
  on public.project_names;
create trigger validate_project_module_parent
before insert or update of parent_project_id, project_type_id
on public.project_names
for each row
execute function public.validate_project_module_parent();

comment on column public.project_names.project_type_id is
  'Project type from project_types. Only projects of type "Модульная программа" can contain modules.';
comment on column public.project_names.parent_project_id is
  'A module belongs to at most one parent project of type "Модульная программа". Null means a top-level project.';

notify pgrst, 'reload schema';
