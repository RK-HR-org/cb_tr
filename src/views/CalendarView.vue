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
  NEmpty,
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
import { ActivityEditorModal } from '../features/activity-editor'
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
const showEditor = ref(false)
const editingId = ref<number | null>(null)
const editorSchedule = ref<ActivityScheduleSeed | null>(null)
const records = ref<ActivityListItem[]>([])
const trainers = ref<SelectOption[]>([])
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

const events = computed<EventInput[]>(() =>
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
      id: String(record.id),
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

function openCreate(
  start = new Date(),
  end = new Date(Date.now() + 3600000),
  allDay = false,
) {
  editingId.value = null
  editorSchedule.value = allDay
    ? {
        schedule_mode: 'date',
        start_date: start.getTime(),
        end_date: new Date(end.getTime() - 86400000).getTime(),
      }
    : {
        schedule_mode: 'datetime',
        start_datetime: start.getTime(),
        end_datetime: end.getTime(),
      }
  showEditor.value = true
}

function handleSelect(info: DateSelectArg) {
  openCreate(info.start, info.end, info.allDay)
  calendarRef.value?.getApi().unselect()
}

function handleEventClick(info: EventClickArg) {
  const item = info.event.extendedProps.record as ActivityListItem
  editingId.value = item.id
  editorSchedule.value = null
  showEditor.value = true
}

async function persistDates(
  id: string,
  start: Date | null,
  end: Date | null,
  allDay: boolean,
  revert: () => void,
) {
  if (!start || !end || !targetTrainerId.value) return revert()
  const item = records.value.find(record => record.id === Number(id))
  if (!item) return revert()

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
    await updateActivitySchedule(item, targetTrainerId.value, isAdmin.value, patch)
    Object.assign(item, patch)
    message.success('Период активности обновлён')
  } catch (error: unknown) {
    revert()
    message.error(error instanceof Error ? error.message : 'Не удалось изменить время')
  }
}

function handleDrop(info: EventDropArg) {
  void persistDates(info.event.id, info.event.start, info.event.end, info.event.allDay, info.revert)
}

function handleResize(info: EventResizeDoneArg) {
  void persistDates(info.event.id, info.event.start, info.event.end, info.event.allDay, info.revert)
}

const calendarOptions = computed<CalendarOptions>(() => ({
  plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
  locale: ruLocale,
  initialView: compact.value ? 'timeGridDay' : 'timeGridWeek',
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

async function loadEvents() {
  if (!targetTrainerId.value) {
    records.value = []
    return
  }
  loading.value = true
  try {
    records.value = await listCalendarActivities(targetTrainerId.value)
    await nextTick()
    calendarRef.value?.getApi().updateSize()
  } catch (error: unknown) {
    records.value = []
    message.error(error instanceof Error ? error.message : 'Не удалось загрузить календарь')
  } finally {
    loading.value = false
  }
}

async function changeTrainer(value: number | null) {
  selectedTrainerId.value = value
  await loadEvents()
}

async function loadTrainers() {
  if (!isAdmin.value) return
  trainers.value = await getTrainerOptions()
  selectedTrainerId.value = trainers.value[0]?.value ?? null
}

async function handleMedia(event: MediaQueryListEvent) {
  compact.value = event.matches
  await nextTick()
  calendarRef.value?.getApi().changeView(event.matches ? 'timeGridDay' : 'timeGridWeek')
}

onMounted(async () => {
  mediaQuery.addEventListener('change', handleMedia)
  try {
    await loadTrainers()
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
          <n-h2 class="!m-0">{{ isAdmin ? 'Календарь тренеров' : 'Мой календарь' }}</n-h2>
          <NText depth="3">Выделите время для новой активности или нажмите на существующую запись</NText>
        </div>
        <div class="calendar-actions">
          <NSelect v-if="isAdmin" :value="selectedTrainerId" :options="trainers" filterable
            placeholder="Выберите тренера" class="trainer-select" @update:value="changeTrainer" />
          <NButton type="primary" :disabled="!targetTrainerId" @click="openCreate()">Добавить активность</NButton>
        </div>
      </div>

      <NCard class="calendar-card" :content-style="{ height: '100%', padding: compact ? '8px' : '16px' }">
        <div v-if="loading" class="calendar-state"><NSpin size="large" description="Загрузка календаря…" /></div>
        <div v-else-if="isAdmin && !targetTrainerId" class="calendar-state"><NEmpty description="Нет доступных тренеров" /></div>
        <FullCalendar v-else ref="calendarRef" class="trainer-calendar" :options="calendarOptions" />
      </NCard>
    </div>

    <ActivityEditorModal
      v-model:show="showEditor"
      :record-id="editingId"
      :trainer-id="targetTrainerId"
      :can-manage-participants="isAdmin"
      :initial-schedule="editorSchedule"
      @saved="loadEvents"
    />
  </DashboardLayout>
</template>

<style scoped>
.calendar-page { display:flex; min-height:0; flex:1; flex-direction:column; gap:16px }
.calendar-heading,.calendar-actions { display:flex; align-items:center; gap:12px }
.calendar-heading { justify-content:space-between }
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
@media (max-width:700px) {
  .calendar-heading,.calendar-actions { align-items:stretch; flex-direction:column }
  .trainer-select { width:100% }
  .calendar-card { height:680px; min-height:560px }
  :deep(.fc .fc-toolbar-title) { font-size:1.05rem }
  :deep(.fc .fc-button) { padding:.35em .55em }
}
</style>
