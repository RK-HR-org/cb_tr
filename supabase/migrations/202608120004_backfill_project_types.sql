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

notify pgrst, 'reload schema';
