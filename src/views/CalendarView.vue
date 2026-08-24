<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin, { type EventResizeDoneArg } from '@fullcalendar/interaction'
import ruLocale from '@fullcalendar/core/locales/ru'
import type {
  CalendarOptions,
  DateSelectArg,
  EventClickArg,
  EventDropArg,
  EventInput,
} from '@fullcalendar/core'
import {
  NButton,
  NCard,
  NSelect,
  NSpin,
  NText,
  useMessage,
  useThemeVars,
} from 'naive-ui'
import { DashboardLayout } from '../widgets/dashboard-layout'
import { useAuthStore } from '../stores/auth'
import {
  listCalendarActivities,
  updateActivitySchedule,
  type ActivityListItem,
  type ActivityScheduleSeed,
} from '../entities/activity'
import { getTrainerOptions } from '../entities/trainer'
import {
  listProductionCalendarDays,
  type ProductionCalendarDay,
} from '../entities/production-calendar'
import { ActivityEditorModal } from '../features/activity-editor'
import {
  DEFAULT_ADMIN_EVENTS_EXPORT_YEAR,
  downloadAdminEventsXlsx,
  listAdminCalendarEvents,
  updateAdminCalendarEventSchedule,
  type AdminCalendarEventListItem,
  type AdminCalendarEventScheduleSeed,
} from '../entities/admin-calendar-event'
import { AdminCalendarEventEditorModal } from '../features/admin-calendar-event-editor'
import {
  toExclusiveEndDate,
  toInclusiveEndDate,
  toLocalDateString,
} from '../shared/lib/date'
import type { SelectOption } from '../shared/types'

const auth = useAuthStore()
const message = useMessage()
const themeVars = useThemeVars()
const calendarRef = ref<InstanceType<typeof FullCalendar> | null>(null)
const loading = ref(false)
const exportingEvents = ref(false)
const showActivityEditor = ref(false)
const editingActivityId = ref<number | null>(null)
const activityEditorSchedule = ref<ActivityScheduleSeed | null>(null)
const showAdminEventEditor = ref(false)
const editingAdminEventId = ref<number | null>(null)
const adminEventEditorSchedule = ref<AdminCalendarEventScheduleSeed | null>(null)
const records = ref<ActivityListItem[]>([])
const adminEvents = ref<AdminCalendarEventListItem[]>([])
const trainers = ref<SelectOption[]>([])
const productionCalendarDays = ref<ProductionCalendarDay[]>([])
const selectedTrainerId = ref<number | null>(null)
const mediaQuery = window.matchMedia('(max-width: 700px)')
const compact = ref(mediaQuery.matches)
const palette = ['#2563eb', '#16a34a', '#9333ea', '#ea580c', '#0891b2', '#db2777', '#4f46e5', '#65a30d']

const isAdmin = computed(() => auth.profile?.role === 'admin')
const targetTrainerId = computed<number | null>(() => {
  const value = isAdmin.value ? selectedTrainerId.value : auth.profile?.id
  const id = Number(value)
  return Number.isFinite(id) && id > 0 ? id : null
})

function projectColor(id: number | null) {
  return id ? palette[Math.abs(id) % palette.length] : themeVars.value.primaryColor
}

const activityEvents = computed<EventInput[]>(() =>
  records.value.flatMap(record => {
    const timed = Boolean(record.start_datetime && record.end_datetime)
    const start = timed ? record.start_datetime : record.start_date
    const end = timed
      ? record.end_datetime
      : record.end_date
        ? toExclusiveEndDate(record.end_date)
        : null
    if (!start || !end) return []

    return [{
      id: 'activity-' + record.id,
      title: record.task_desc?.trim()
        || record.project_names?.name
        || (record.source_schedule_key ? `График ${record.source_schedule_key}` : 'Событие'),
      start,
      end,
      allDay: !timed,
      backgroundColor: projectColor(record.project_main_id),
      borderColor: projectColor(record.project_main_id),
      editable: isAdmin.value || !record.event_group_id,
      extendedProps: { record },
    }]
  }),
)

const administratorEvents = computed<EventInput[]>(() =>
  adminEvents.value.flatMap(record => {
    const timed = Boolean(record.start_datetime && record.end_datetime)
    const start = timed ? record.start_datetime : record.start_date
    const end = timed
      ? record.end_datetime
      : record.end_date ? toExclusiveEndDate(record.end_date) : null
    if (!start || !end) return []
    const color = projectColor(record.project_main_id)
    return [{
      id: 'admin-event-' + record.id,
      title: record.title + ' · тренеров: ' + record.required_trainer_count,
      start,
      end,
      allDay: !timed,
      backgroundColor: color,
      borderColor: color,
      editable: isAdmin.value,
      extendedProps: { adminEvent: record },
    }]
  }),
)

const productionCalendarEvents = computed<EventInput[]>(() =>
  productionCalendarDays.value.flatMap((day) => {
    const end = toExclusiveEndDate(day.event_date)
    if (!end) return []
    return [{
      id: `production-calendar-${day.id}`,
      title: day.name,
      start: day.event_date,
      end,
      allDay: true,
      display: 'background',
      backgroundColor: day.day_type === 'holiday'
        ? 'rgba(239, 68, 68, 0.20)'
        : 'rgba(234, 179, 8, 0.24)',
      classNames: [day.day_type === 'holiday' ? 'production-holiday' : 'production-working-saturday'],
      extendedProps: { productionCalendarDay: day },
    }]
  }),
)

const events = computed<EventInput[]>(() => [
  ...productionCalendarEvents.value,
  ...(isAdmin.value ? administratorEvents.value : []),
  ...activityEvents.value,
])

function openCreate(
  start = new Date(),
  end = new Date(Date.now() + 3600000),
  allDay = false,
) {
  const schedule = allDay
    ? {
        schedule_mode: 'date' as const,
        start_date: start.getTime(),
        end_date: new Date(end.getTime() - 86400000).getTime(),
      }
    : {
        schedule_mode: 'datetime' as const,
        start_datetime: start.getTime(),
        end_datetime: end.getTime(),
      }
  if (isAdmin.value) {
    editingAdminEventId.value = null
    adminEventEditorSchedule.value = schedule
    showAdminEventEditor.value = true
  } else {
    editingActivityId.value = null
    activityEditorSchedule.value = schedule
    showActivityEditor.value = true
  }
}

function handleSelect(info: DateSelectArg) {
  openCreate(info.start, info.end, info.allDay)
  calendarRef.value?.getApi().unselect()
}

function handleEventClick(info: EventClickArg) {
  const adminEvent = info.event.extendedProps.adminEvent as AdminCalendarEventListItem | undefined
  if (adminEvent && isAdmin.value) {
    editingAdminEventId.value = adminEvent.id
    adminEventEditorSchedule.value = null
    showAdminEventEditor.value = true
    return
  }
  const item = info.event.extendedProps.record as ActivityListItem | undefined
  if (!item) return
  editingActivityId.value = item.id
  activityEditorSchedule.value = null
  showActivityEditor.value = true
}

async function persistDates(
  adminEvent: AdminCalendarEventListItem | undefined,
  item: ActivityListItem | undefined,
  start: Date | null,
  end: Date | null,
  allDay: boolean,
  revert: () => void,
) {
  if (!start || !end || (!adminEvent && !item)) return revert()

  const patch = allDay
    ? {
        start_date: toLocalDateString(start),
        end_date: toInclusiveEndDate(end),
        start_datetime: null,
        end_datetime: null,
      }
    : {
        start_date: null,
        end_date: null,
        start_datetime: start.toISOString(),
        end_datetime: end.toISOString(),
      }

  try {
    if (adminEvent) {
      await updateAdminCalendarEventSchedule(adminEvent.id, patch)
      Object.assign(adminEvent, patch)
      message.success('Период мероприятия обновлён')
    } else if (item && targetTrainerId.value) {
      await updateActivitySchedule(item, targetTrainerId.value, isAdmin.value, patch)
      Object.assign(item, patch)
      message.success('Период активности обновлён')
    } else {
      revert()
    }
  } catch (error: unknown) {
    revert()
    message.error(error instanceof Error ? error.message : 'Не удалось изменить время')
  }
}

function handleDrop(info: EventDropArg) {
  void persistDates(
    info.event.extendedProps.adminEvent as AdminCalendarEventListItem | undefined,
    info.event.extendedProps.record as ActivityListItem | undefined,
    info.event.start, info.event.end, info.event.allDay, info.revert,
  )
}

function handleResize(info: EventResizeDoneArg) {
  void persistDates(
    info.event.extendedProps.adminEvent as AdminCalendarEventListItem | undefined,
    info.event.extendedProps.record as ActivityListItem | undefined,
    info.event.start, info.event.end, info.event.allDay, info.revert,
  )
}

const calendarOptions = computed<CalendarOptions>(() => ({
  plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
  locale: ruLocale,
  initialView: compact.value ? 'timeGridDay' : 'dayGridMonth',
  headerToolbar: compact.value
    ? { left: 'prev,next', center: 'title', right: 'today' }
    : { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek' },
  buttonText: { today: 'Сегодня', month: 'Месяц', week: 'Неделя', day: 'День', list: 'Список' },
  events: events.value,
  editable: true,
  allDayMaintainDuration: true,
  selectable: true,
  selectMirror: true,
  nowIndicator: true,
  firstDay: 1,
  slotMinTime: '06:00:00',
  slotMaxTime: '23:00:00',
  slotDuration: '00:30:00',
  snapDuration: '00:15:00',
  scrollTime: '08:00:00',
  height: '100%',
  expandRows: true,
  dayMaxEvents: true,
  longPressDelay: 450,
  eventLongPressDelay: 450,
  selectLongPressDelay: 450,
  select: handleSelect,
  eventClick: handleEventClick,
  eventDrop: handleDrop,
  eventResize: handleResize,
  eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
}))

async function exportAdminEvents() {
  exportingEvents.value = true
  try {
    const events = await listAdminCalendarEvents()
    const count = downloadAdminEventsXlsx(events, DEFAULT_ADMIN_EVENTS_EXPORT_YEAR)
    if (!count) {
      message.warning(`Нет мероприятий на ${DEFAULT_ADMIN_EVENTS_EXPORT_YEAR} год`)
      return
    }
    message.success(`Выгружено мероприятий: ${count}`)
  } catch (error: unknown) {
    message.error(error instanceof Error ? error.message : 'Не удалось выгрузить мероприятия')
  } finally {
    exportingEvents.value = false
  }
}

async function loadEvents() {
  const currentCalendarDate = calendarRef.value?.getApi().getDate()
  loading.value = true
  try {
    const [loadedAdminEvents, loadedActivities] = await Promise.all([
      isAdmin.value ? listAdminCalendarEvents() : Promise.resolve([]),
      targetTrainerId.value ? listCalendarActivities(targetTrainerId.value) : Promise.resolve([]),
    ])
    adminEvents.value = loadedAdminEvents
    records.value = loadedActivities
    loading.value = false
    await nextTick()
    const calendarApi = calendarRef.value?.getApi()
    if (calendarApi) {
      calendarApi.updateSize()
      if (currentCalendarDate) calendarApi.gotoDate(currentCalendarDate)
    }
  } catch (error: unknown) {
    adminEvents.value = []
    records.value = []
    message.error(error instanceof Error ? error.message : 'Не удалось загрузить календарь')
  } finally { loading.value = false }
}

async function changeTrainer(value: number | null) {
  selectedTrainerId.value = value
  await loadEvents()
}

async function loadTrainers() {
  if (!isAdmin.value) return
  trainers.value = await getTrainerOptions()
}

async function handleMedia(event: MediaQueryListEvent) {
  compact.value = event.matches
  await nextTick()
  calendarRef.value?.getApi().changeView(event.matches ? 'timeGridDay' : 'timeGridWeek')
}

onMounted(async () => {
  mediaQuery.addEventListener('change', handleMedia)
  try {
    const [, productionDays] = await Promise.all([
      loadTrainers(),
      listProductionCalendarDays(),
    ])
    productionCalendarDays.value = productionDays
    await loadEvents()
  } catch (error: unknown) {
    message.error(error instanceof Error ? error.message : 'Не удалось загрузить данные календаря')
  }
})
onBeforeUnmount(() => mediaQuery.removeEventListener('change', handleMedia))
</script>

<template>
  <DashboardLayout>
    <div class="calendar-page">
      <div class="calendar-heading">
        <div>
          <n-h2 class="!m-0">{{ isAdmin ? 'Календарь администратора' : 'Мой календарь' }}</n-h2>
          <NText depth="3">
            {{ isAdmin
              ? 'Планируйте мероприятия и требуемое количество тренеров'
              : 'Выделите время для новой активности или нажмите на существующую запись' }}
          </NText>
        </div>
        <div class="calendar-actions">
          <NSelect v-if="isAdmin" :value="selectedTrainerId" :options="trainers" filterable
            clearable placeholder="Дополнительно показать тренера" class="trainer-select"
            @update:value="changeTrainer" />
          <NButton
            v-if="isAdmin"
            :loading="exportingEvents"
            @click="exportAdminEvents"
          >
            Выгрузить мероприятия
          </NButton>
          <NButton type="primary" :disabled="!isAdmin && !targetTrainerId" @click="openCreate()">
            {{ isAdmin ? 'Добавить мероприятие' : 'Добавить активность' }}
          </NButton>
        </div>
      </div>

      <div class="calendar-legend" aria-label="Обозначения производственного календаря">
        <span><i class="legend-swatch legend-swatch--holiday" />Праздничный / нерабочий день</span>
        <span><i class="legend-swatch legend-swatch--working" />Рабочая суббота</span>
      </div>

      <NCard class="calendar-card" :content-style="{ height: '100%', padding: compact ? '8px' : '16px' }">
        <div v-if="loading" class="calendar-state"><NSpin size="large" description="Загрузка календаря…" /></div>
        <FullCalendar v-else ref="calendarRef" class="trainer-calendar" :options="calendarOptions" />
      </NCard>
    </div>

    <ActivityEditorModal
      v-model:show="showActivityEditor"
      :record-id="editingActivityId"
      :trainer-id="targetTrainerId"
      :can-manage-participants="isAdmin"
      :initial-schedule="activityEditorSchedule"
      @saved="loadEvents"
    />
    <AdminCalendarEventEditorModal
      v-if="isAdmin"
      v-model:show="showAdminEventEditor"
      :record-id="editingAdminEventId"
      :initial-schedule="adminEventEditorSchedule"
      @saved="loadEvents"
    />
  </DashboardLayout>
</template>

<style scoped>
.calendar-page { display:flex; min-height:0; flex:1; flex-direction:column; gap:16px }
.calendar-heading,.calendar-actions { display:flex; align-items:center; gap:12px }
.calendar-heading { justify-content:space-between }
.calendar-legend { display:flex; flex-wrap:wrap; gap:16px; margin-top:-6px; font-size:13px; color:v-bind('themeVars.textColor3') }
.calendar-legend span { display:inline-flex; align-items:center; gap:6px }
.legend-swatch { width:16px; height:12px; border-radius:3px }
.legend-swatch--holiday { background:rgba(239,68,68,.28); border:1px solid rgba(220,38,38,.45) }
.legend-swatch--working { background:rgba(234,179,8,.32); border:1px solid rgba(202,138,4,.5) }
.trainer-select { width:280px }
.calendar-card {
  height:calc(100vh - 210px);
  min-height:620px;
  flex:none;
  overflow:hidden;
  border-radius:12px;
}
.calendar-state { display:flex; height:100%; align-items:center; justify-content:center }
.trainer-calendar { height:100% }
:deep(.fc) {
  --fc-border-color: v-bind('themeVars.borderColor');
  --fc-page-bg-color: v-bind('themeVars.cardColor');
  --fc-neutral-bg-color: v-bind('themeVars.tableHeaderColor');
  --fc-list-event-hover-bg-color: v-bind('themeVars.hoverColor');
  --fc-today-bg-color: color-mix(in srgb, v-bind('themeVars.primaryColor') 10%, transparent);
  color:v-bind('themeVars.textColor1'); font-family:v-bind('themeVars.fontFamily')
}
:deep(.fc .fc-button-primary) { border-color:v-bind('themeVars.primaryColor'); background:v-bind('themeVars.primaryColor') }
:deep(.fc .fc-button-primary:hover),:deep(.fc .fc-button-primary:not(:disabled).fc-button-active) {
  border-color:v-bind('themeVars.primaryColorHover'); background:v-bind('themeVars.primaryColorHover')
}
:deep(.fc .fc-scrollgrid),:deep(.fc-theme-standard td),:deep(.fc-theme-standard th) { border-color:v-bind('themeVars.borderColor') }
:deep(.fc .fc-day-sat),
:deep(.fc .fc-day-sun) {
  background-color:color-mix(in srgb, v-bind('themeVars.textColor3') 8%, transparent);
}
:deep(.fc .fc-col-header-cell.fc-day-sat),
:deep(.fc .fc-col-header-cell.fc-day-sun) {
  background-color:color-mix(in srgb, v-bind('themeVars.textColor3') 12%, transparent);
}
:deep(.fc .fc-bg-event.production-holiday) { background:rgba(239,68,68,.22); opacity:1 }
:deep(.fc .fc-bg-event.production-working-saturday) { background:rgba(234,179,8,.28); opacity:1 }
@media (max-width:700px) {
  .calendar-heading,.calendar-actions { align-items:stretch; flex-direction:column }
  .trainer-select { width:100% }
  .calendar-card { height:680px; min-height:560px }
  :deep(.fc .fc-toolbar-title) { font-size:1.05rem }
  :deep(.fc .fc-button) { padding:.35em .55em }
}
</style>
