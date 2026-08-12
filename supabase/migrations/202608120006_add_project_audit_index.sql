alter table public.project_names
  add column if not exists audit_index text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.project_names'::regclass
      and conname = 'project_names_audit_index_not_blank'
  ) then
    alter table public.project_names
      add constraint project_names_audit_index_not_blank
      check (audit_index is null or btrim(audit_index) <> '');
  end if;
end;
$$;

create unique index if not exists project_names_audit_index_unique_idx
  on public.project_names (lower(btrim(audit_index)))
  where audit_index is not null;

comment on column public.project_names.audit_index is
  'Optional unique project identifier used for audit. Uniqueness ignores case and surrounding whitespace.';

notify pgrst, 'reload schema';
