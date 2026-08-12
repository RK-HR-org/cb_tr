insert into public.project_statuses (code, name, is_terminal, sort_order, is_active)
values
  ('under_review', 'На рассмотрении', false, 10, true),
  ('in_development', 'В разработке', false, 20, true),
  ('needs_update', 'Требует актуализации', false, 30, true),
  ('current', 'Актуален', true, 40, true)
on conflict (code) do update
set
  name = excluded.name,
  is_terminal = excluded.is_terminal,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

update public.project_names
set status_code = 'current'
where status_code = 'completed';

alter table public.project_names
  alter column status_code set default 'under_review';

delete from public.project_statuses
where code = 'completed';

notify pgrst, 'reload schema';
