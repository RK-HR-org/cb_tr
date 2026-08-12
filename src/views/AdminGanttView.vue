<script setup lang="ts">
import { computed, nextTick, ref, onMounted } from 'vue'
import { DashboardLayout } from '../widgets/dashboard-layout'
import { ActivityEditorModal } from '../features/activity-editor'
import { useMessage, useThemeVars, NButton, NButtonGroup, NCard, NDatePicker, NEmpty, NSpin, NText, NTooltip } from 'naive-ui'
import { useRouter } from 'vue-router'
import {
  Gantt,
  type GanttRowData,
  type GanttTaskEvent,
  type GanttZoomLevel,
} from '@dizzy_yakov/vue-gantt'
import { ru } from 'date-fns/locale'
import '@dizzy_yakov/vue-gantt/styles.css'
import { listGanttActivities } from '../entities/activity'
import { listTrainers } from '../entities/trainer'

const router = useRouter()
const message = useMessage()
const themeVars = useThemeVars()
const loading = ref(true)
const rows = ref<GanttRowData[]>([])
const loadedEventCount = ref(0)
const loadedAssignmentCount = ref(0)
const showActivityEditor = ref(false)
const editingActivityId = ref<number | null>(null)
const zoom = ref('week')
const selectedDate = ref<number>(Date.now())
const ganttRef = ref<{
  scrollToDate: (date: Date | string | number, options?: { align?: 'start' | 'center'; behavior?: ScrollBehavior }) => void
  scrollToToday: (options?: { align?: 'start' | 'center'; behavior?: ScrollBehavior }) => void
} | null>(null)

const initialDate = new Date()
const timelineStart = ref(startOfNavigationRange(initialDate))
const timelineEnd = ref(endOfNavigationRange(initialDate))
const zoomLevels = ref<GanttZoomLevel[]>([
  { id: 'day', label: 'День', tiers: ['day'], columnWidth: 80 },
  { id: 'week', label: 'Неделя', tiers: ['week', 'day'], columnWidth: 70 },
  { id: 'month', label: 'Месяц', tiers: ['month', 'week'], columnWidth: 80 },
  { id: 'quarter', label: 'Квартал', tiers: ['quarter', 'month'], columnWidth: 100 },
  { id: 'year', label: 'Год', tiers: ['year', 'quarter'], columnWidth: 120 },
])

const ganttTheme = computed<Record<string, string>>(() => ({
  '--gantt-font': themeVars.value.fontFamily,
  '--gantt-color': themeVars.value.textColor2,
  '--gantt-surface': themeVars.value.cardColor,
  '--gantt-grid-color': themeVars.value.borderColor,
  '--gantt-grid-border': `1px solid ${themeVars.value.borderColor}`,
  '--gantt-group-header-bg': themeVars.value.tableHeaderColor,
  '--gantt-group-header-color': themeVars.value.textColor1,
  '--gantt-bar-bg': `color-mix(in srgb, ${themeVars.value.primaryColor} 24%, ${themeVars.value.cardColor})`,
  '--gantt-bar-color': themeVars.value.textColor1,
  '--gantt-progress-bg': themeVars.value.primaryColor,
  '--gantt-group-bar-bg': themeVars.value.dividerColor,
  '--gantt-group-bar-progress-bg': themeVars.value.primaryColor,
  '--gantt-summary-bar-bg': themeVars.value.dividerColor,
  '--gantt-summary-bar-progress-bg': themeVars.value.primaryColor,
  '--gantt-row-hover-bg': themeVars.value.hoverColor,
  '--gantt-today-color': themeVars.value.errorColor,
  '--gantt-today-column-bg': `color-mix(in srgb, ${themeVars.value.errorColor} 7%, transparent)`,
  '--gantt-nonworking-bg': `color-mix(in srgb, ${themeVars.value.textColor3} 10%, transparent)`,
  '--gantt-marker-color': themeVars.value.textColor3,
  '--gantt-tooltip-bg': themeVars.value.popoverColor,
  '--gantt-tooltip-color': themeVars.value.textColor1,
  '--gantt-tooltip-shadow': themeVars.value.boxShadow2,
}))

async function setZoom(level: string) {
  zoom.value = level
  await scrollToToday()
}

function startOfNavigationRange(date: Date) {
  return new Date(date.getFullYear() - 1, 0, 1)
}

function endOfNavigationRange(date: Date) {
  return new Date(date.getFullYear() + 1, 11, 31, 23, 59, 59, 999)
}

async function scrollToDate(timestamp: number) {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return

  if (date < timelineStart.value) timelineStart.value = startOfNavigationRange(date)
  if (date > timelineEnd.value) timelineEnd.value = endOfNavigationRange(date)

  await nextTick()
  requestAnimationFrame(() => {
    ganttRef.value?.scrollToDate(date, { align: 'center', behavior: 'smooth' })
  })
}

async function navigateToToday(behavior: ScrollBehavior) {
  const today = new Date()
  selectedDate.value = today.getTime()

  if (today < timelineStart.value) timelineStart.value = startOfNavigationRange(today)
  if (today > timelineEnd.value) timelineEnd.value = endOfNavigationRange(today)

  await nextTick()
  requestAnimationFrame(() => {
    ganttRef.value?.scrollToToday({ align: 'center', behavior })
  })
}

async function scrollToToday() {
  await navigateToToday('smooth')
}

type ProjectDateFields = {
  start_datetime?: unknown
  end_datetime?: unknown
  start_date?: unknown
  end_date?: unknown
}

type ResolvedProjectRange = {
  start: Date
  end: Date
  displayStart: string
  displayEnd: string
  allDay: boolean
}

function validDateTime(value: unknown) {
  if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date)) return null
  const parsed = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function localDateOnly(value: unknown) {
  if (typeof value !== 'string') return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const parsed = new Date(year, month - 1, day)
  if (
    parsed.getFullYear() !== year
    || parsed.getMonth() !== month - 1
    || parsed.getDate() !== day
  ) return null
  return parsed
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(value)
}

function resolveProjectRange(item: ProjectDateFields): ResolvedProjectRange | null {
  const timedStart = validDateTime(item.start_datetime)
  const timedEnd = validDateTime(item.end_datetime)
  if (timedStart && timedEnd && timedEnd > timedStart) {
    return {
      start: timedStart,
      end: timedEnd,
      displayStart: formatDateTime(timedStart),
      displayEnd: formatDateTime(timedEnd),
      allDay: false,
    }
  }

  const allDayStart = localDateOnly(item.start_date)
  const inclusiveEnd = localDateOnly(item.end_date)
  if (!allDayStart || !inclusiveEnd || inclusiveEnd < allDayStart) return null

  const exclusiveEnd = new Date(inclusiveEnd)
  exclusiveEnd.setDate(exclusiveEnd.getDate() + 1)
  return {
    start: allDayStart,
    end: exclusiveEnd,
    displayStart: String(item.start_date),
    displayEnd: String(item.end_date),
    allDay: true,
  }
}

function includeProjectDates(items: ProjectDateFields[]) {
  for (const item of items) {
    const range = resolveProjectRange(item)
    if (!range) continue
    for (const date of [range.start, range.end]) {
      if (date < timelineStart.value) timelineStart.value = startOfNavigationRange(date)
      if (date > timelineEnd.value) timelineEnd.value = endOfNavigationRange(date)
    }
  }
}

function tooltipValue(task: unknown, key: string) {
  const value = task as { name?: string; meta?: Record<string, unknown> }
  const field = key === 'name' ? value.name : value.meta?.[key]
  return typeof field === 'string' || typeof field === 'number' ? String(field) : ''
}

function summaryRowValue(row: unknown, key: 'name' | 'progress') {
  const value = row as { name?: string; progress?: number }
  return key === 'progress' ? value.progress ?? 0 : value.name ?? ''
}

function summaryRowLabel(row: unknown) {
  const value = row as { id?: string; name?: string }
  if (!value.id?.startsWith('trainer-')) return value.name ?? ''

  const taskCount = rows.value.filter(
    item => item.parentId === value.id && (item.tasks?.length ?? 0) > 0,
  ).length

  return taskCount ? `${value.name}: ${taskCount} задач` : value.name || ''
}

function summaryTooltipItems(row: unknown) {
  const value = row as { id?: string }
  if (!value.id) return []

  const descendantIds = new Set<string>([value.id])
  let changed = true
  while (changed) {
    changed = false
    for (const item of rows.value) {
      if (item.parentId && descendantIds.has(item.parentId) && !descendantIds.has(item.id)) {
        descendantIds.add(item.id)
        changed = true
      }
    }
  }

  const grouped = new Map<string, { name: string; starts: string[]; ends: string[]; count: number }>()
  for (const item of rows.value) {
    if (!descendantIds.has(item.id)) continue
    for (const task of item.tasks || []) {
      const data = task as any
      const name = String(data.name || data.meta?.description || 'Задача')
      const group = grouped.get(name) || { name, starts: [], ends: [], count: 0 }
      if (data.start) group.starts.push(String(data.start))
      if (data.end) group.ends.push(String(data.end))
      group.count += 1
      grouped.set(name, group)
    }
  }

  return Array.from(grouped.values()).map(item => ({
    name: item.name,
    start: item.starts.sort()[0] || '',
    end: item.ends.sort().at(-1) || '',
    count: item.count,
  }))
}

function buildRows(items: any[], trainerRecords: any[]): GanttRowData[] {
  type TrainerTask = {
    task: any
    start: number
    name: string
  }
  type TrainerBucket = {
    id: string
    name: string
    tasks: TrainerTask[]
  }

  const trainers = new Map<string, TrainerBucket>()

  trainerRecords.forEach((trainer: any) => {
    const trainerId = String(trainer.id)
    trainers.set(trainerId, {
      id: `trainer-${trainerId}`,
      name: trainer.full_name || 'Тренер',
      tasks: [],
    })
  })

  items.forEach((item: any, index: number) => {
    const trainerId = String(item.trainer_id ?? `unknown-trainer-${index}`)
    const trainerName = item.trainers?.full_name ?? trainers.get(trainerId)?.name ?? 'Тренер'
    const range = resolveProjectRange(item)

    if (!range) return

    if (!trainers.has(trainerId)) {
      trainers.set(trainerId, {
        id: `trainer-${trainerId}`,
        name: trainerName,
        tasks: [],
      })
    }

    const description = String(item.task_desc || '').trim()
      || item.project_names?.name
      || 'Без описания'
    const projectName = item.project_names?.name
      ?? (item.source_schedule_key ? `График ${item.source_schedule_key}` : 'Без проекта')
    const subName = item.project_sub ? String(item.project_sub) : null
    const itemId = item.id ?? `fallback-${index}`
    const task = {
      id: String(itemId),
      name: description,
      start: range.start,
      end: range.end,
      progress: item.progress ?? 0,
      meta: {
        trainer: trainerName,
        project: projectName,
        subproject: subName,
        description,
        activity: item.activity_types?.name || '',
        format: item.delivery_formats?.name || '',
        role: item.roles?.name || '',
        start: range.displayStart,
        end: range.displayEnd,
        allDay: range.allDay,
        eventGroupId: item.event_group_id || '',
      },
    }

    const trainer = trainers.get(trainerId)!
    trainer.tasks.push({
      task,
      start: range.start.getTime(),
      name: description,
    })
  })

  const result: GanttRowData[] = []
  trainers.forEach((trainer) => {
    const tasks = trainer.tasks
      .sort((left, right) => left.start - right.start || left.name.localeCompare(right.name, 'ru'))
      .map(({ task }) => task)

    result.push({
      id: trainer.id,
      name: trainer.name,
      tasks,
    })
  })

  return result
}

async function loadGanttData() {
  loading.value = true
  try {
    const [trainersData, allProjects] = await Promise.all([
      listTrainers(),
      listGanttActivities(),
    ])
    const projectItems = allProjects.filter(item => resolveProjectRange(item))
    loadedAssignmentCount.value = projectItems.length
    loadedEventCount.value = new Set(
      projectItems.map((item: any) => item.event_group_id || `row-${item.id}`),
    ).size
    includeProjectDates(projectItems)
    rows.value = buildRows(projectItems, trainersData)
  } catch (err: any) {
    message.error('Ошибка загрузки данных Ганта: ' + err.message)
    rows.value = []
  } finally {
    loading.value = false
    if (rows.value.length) {
      await nextTick()
      await navigateToToday('auto')
    }
  }
}

function editTask(event: GanttTaskEvent) {
  const id = Number(event.task.id)
  if (!Number.isInteger(id)) {
    message.warning('Не удалось определить запись активности')
    return
  }
  editingActivityId.value = id
  showActivityEditor.value = true
}

onMounted(() => {
  loadGanttData()
})
</script>

<template>
  <DashboardLayout>
    <div class="mb-6 flex justify-between items-center">
      <div>
        <n-h2 class="!m-0">Гант диаграмма</n-h2>
        <n-text depth="3">Задачи тренеров во времени</n-text>
      </div>
      <n-button type="primary" @click="router.push('/admin/table')">Вернуться к таблице</n-button>
    </div>

    <n-card
      class="gantt-card h-[calc(100vh-150px)]"
      :bordered="true"
      :content-style="{ height: '100%', padding: '16px' }"
    >
      <div v-if="loading" class="h-full flex items-center justify-center">
        <NSpin size="large" description="Загрузка диаграммы…" />
      </div>
      <div v-else class="flex h-full flex-col overflow-hidden">
        <div class="mb-4 flex flex-wrap items-center gap-3">
          <NText depth="3">Масштаб:</NText>
          <NButtonGroup>
            <NButton
              v-for="level in zoomLevels"
              :key="level.id"
              size="small"
              :type="zoom === level.id ? 'primary' : 'default'"
              @click="setZoom(level.id)"
            >
              {{ level.label }}
            </NButton>
          </NButtonGroup>
          <div class="navigation-divider" aria-hidden="true" />
          <NButton size="small" @click="scrollToToday">Сегодня</NButton>
          <NDatePicker
            v-model:value="selectedDate"
            type="date"
            size="small"
            :clearable="false"
            format="dd.MM.yyyy"
            placeholder="Перейти к дате"
            class="date-navigation"
            @update:value="scrollToDate"
          />
          <NText depth="3">
            Событий: {{ loadedEventCount }} · назначений: {{ loadedAssignmentCount }}
          </NText>
        </div>
        <div v-if="rows.length" class="gantt-shell flex-1 min-h-0 overflow-hidden" :style="ganttTheme">
          <Gantt
            ref="ganttRef"
            class="h-full w-full"
            :style="{ minHeight: '0px' }"
            :rows="rows"
            :sidebar-width="360"
            :row-height="42"
            :header-row-height="34"
            :group-header-height="38"
            timeline-mode="infinite"
            :tooltip="true"
            :non-working="true"
            :locale="ru"
            :start-date="timelineStart"
            :end-date="timelineEnd"
            :zoom="zoom"
            :zoom-levels="zoomLevels"
            @task-click="editTask"
            aria-label="Задачи тренеров по времени"
            height="100%"
          >
            <template #summaryBar="{ row, collapsed, left, width }">
              <NTooltip v-if="collapsed" trigger="hover" placement="top">
                <template #trigger>
                  <div
                    class="project-summary-bar"
                    :style="{ left: `${left}px`, width: `${width}px` }"
                  >
                    <div
                      class="project-summary-bar__progress"
                      :style="{ width: `${summaryRowValue(row, 'progress')}%` }"
                    />
                    <span class="project-summary-bar__label">{{ summaryRowLabel(row) }}</span>
                  </div>
                </template>
                <div class="summary-tooltip">
                  <strong>{{ summaryRowLabel(row) }}</strong>
                  <div
                    v-for="item in summaryTooltipItems(row)"
                    :key="item.name"
                    class="summary-tooltip__item"
                  >
                    <span>{{ item.name }}</span>
                    <small>{{ item.start }} — {{ item.end }} · задач: {{ item.count }}</small>
                  </div>
                </div>
              </NTooltip>
              <div
                v-else
                class="project-summary-bracket"
                :style="{ left: `${left}px`, width: `${width}px` }"
              />
            </template>
            <template #tooltip="{ task }">
              <div class="task-tooltip">
                <strong>{{ tooltipValue(task, 'name') }}</strong>
                <span><b>Тренер:</b> {{ tooltipValue(task, 'trainer') }}</span>
                <span v-if="tooltipValue(task, 'project')"><b>Проект:</b> {{ tooltipValue(task, 'project') }}</span>
                <span v-if="tooltipValue(task, 'subproject')"><b>Подпроект:</b> {{ tooltipValue(task, 'subproject') }}</span>
                <span v-if="tooltipValue(task, 'role')"><b>Роль:</b> {{ tooltipValue(task, 'role') }}</span>
                <span v-if="tooltipValue(task, 'activity')"><b>Активность:</b> {{ tooltipValue(task, 'activity') }}</span>
                <span v-if="tooltipValue(task, 'format')"><b>Формат:</b> {{ tooltipValue(task, 'format') }}</span>
                <span v-if="tooltipValue(task, 'description')"><b>Описание:</b> {{ tooltipValue(task, 'description') }}</span>
                <span><b>Период:</b> {{ tooltipValue(task, 'start') }} — {{ tooltipValue(task, 'end') }}</span>
              </div>
            </template>
          </Gantt>
        </div>
        <div v-else class="flex flex-1 items-center justify-center">
          <NEmpty description="Нет проектов с указанными датами" />
        </div>
      </div>
    </n-card>
    <ActivityEditorModal
      v-model:show="showActivityEditor"
      :record-id="editingActivityId"
      @saved="loadGanttData"
    />
  </DashboardLayout>
</template>

<style scoped>
.gantt-card {
  border-radius: 12px;
}

.gantt-shell {
  background: var(--gantt-surface);
  border: 1px solid var(--gantt-grid-color);
  border-radius: 8px;
}

.navigation-divider {
  width: 1px;
  height: 22px;
  background: v-bind('themeVars.dividerColor');
}

.date-navigation {
  width: 160px;
}

:deep(.gantt-root) {
  min-height: 0;
  background: var(--gantt-surface);
}

.task-tooltip {
  display: flex;
  max-width: 360px;
  flex-direction: column;
  gap: 3px;
  white-space: normal;
}

.task-tooltip strong {
  margin-bottom: 3px;
  font-size: 13px;
}

.project-summary-bar {
  position: absolute;
  top: 50%;
  height: 60%;
  min-width: 1px;
  overflow: hidden;
  border-radius: var(--gantt-bar-radius, 4px);
  background: var(--gantt-bar-bg);
  color: var(--gantt-bar-color);
  transform: translateY(-50%);
}

.project-summary-bar__progress {
  position: absolute;
  inset: 0 auto 0 0;
  background: var(--gantt-progress-bg);
}

.project-summary-bar__label {
  position: relative;
  z-index: 1;
  display: block;
  overflow: hidden;
  padding: 0 8px;
  font-size: var(--gantt-bar-font-size, 0.8em);
  line-height: calc(var(--gantt-row-height, 42px) * 0.6);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-summary-bracket {
  position: absolute;
  top: 50%;
  height: var(--gantt-summary-bracket-thickness, 2px);
  min-width: 1px;
  background: var(--gantt-summary-bracket-color);
  transform: translateY(-50%);
}

.summary-tooltip {
  display: flex;
  min-width: 220px;
  max-width: 380px;
  flex-direction: column;
  gap: 6px;
}

.summary-tooltip > strong {
  margin-bottom: 2px;
}

.summary-tooltip__item {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.summary-tooltip__item + .summary-tooltip__item {
  border-top: 1px solid color-mix(in srgb, currentColor 22%, transparent);
  padding-top: 6px;
}

.summary-tooltip__item small {
  opacity: 0.75;
}
</style>
