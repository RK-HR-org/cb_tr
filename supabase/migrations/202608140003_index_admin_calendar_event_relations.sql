create index if not exists admin_calendar_events_copied_from_idx
  on public.admin_calendar_events(copied_from_event_id);

create index if not exists admin_calendar_events_project_idx
  on public.admin_calendar_events(project_main_id);

create index if not exists admin_calendar_events_activity_type_idx
  on public.admin_calendar_events(activity_type_id);

create index if not exists admin_calendar_events_delivery_format_idx
  on public.admin_calendar_events(delivery_format_id);

create index if not exists admin_calendar_events_recurrence_type_idx
  on public.admin_calendar_events(recurrence_type_id);
