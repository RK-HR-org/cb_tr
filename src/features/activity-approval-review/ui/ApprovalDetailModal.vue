<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { NButton, NModal, NSpin, NTable, NTag, useMessage } from 'naive-ui'
import {
  approveChangeRequest,
  getChangeRequest,
  rejectChangeRequest,
  type ActivityChangeRequest,
} from '../../../entities/activity-approval'
import {
  getActivityReferences,
  type ActivityReferences,
} from '../../../entities/activity/api/activity.api'
import type { ActivityPayload } from '../../../entities/activity'
import { parseLocalDate } from '../../../shared/lib/date'

const props = defineProps<{
  show: boolean
  requestId: number | null
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  reviewed: []
}>()

const message = useMessage()
const loading = ref(false)
const saving = ref(false)
const showFullDescription = ref(false)
const request = ref<ActivityChangeRequest | null>(null)
const references = ref<ActivityReferences | null>(null)

const emptyReferences = (): ActivityReferences => ({
  projectTypes: [],
  projects: [],
  roles: [],
  activityTypes: [],
  deliveryFormats: [],
  recurrenceTypes: [],
})

const changeTypeLabels: Record<string, string> = {
  create: 'Создание',
  update: 'Изменение',
  delete: 'Удаление',
}

const fieldLabels: Record<keyof ActivityPayload, string> = {
  project_type_id: 'Тип проекта',
  project_main_id: 'Проект',
  project_sub: 'Подпроект',
  role_id: 'Роль',
  activity_type_id: 'Тип активности',
  delivery_format_id: 'Формат',
  recurrence_type_id: 'Периодичность',
  start_datetime: 'Начало',
  end_datetime: 'Окончание',
  start_date: 'Дата начала',
  end_date: 'Дата окончания',
  task_desc: 'Описание задачи',
  comments: 'Комментарии',
  is_duplicate: 'Дубликат',
}

const referenceLookup = computed(() => {
  const refs = references.value ?? emptyReferences()
  const toMap = (items: Array<{ label: string; value: number | string }>) =>
    new Map(items.map(item => [Number(item.value), item.label]))

  return {
    project_type_id: toMap(refs.projectTypes),
    project_main_id: toMap(refs.projects),
    role_id: toMap(refs.roles),
    activity_type_id: toMap(refs.activityTypes),
    delivery_format_id: toMap(refs.deliveryFormats),
    recurrence_type_id: toMap(refs.recurrenceTypes),
  }
})

function resolveDate(value: unknown): Date | null {
  if (value == null || value === '') return null
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return parseLocalDate(value)
  }
  const parsed = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatShortDate(value: unknown): string {
  const date = resolveDate(value)
  if (!date) return '—'
  return format(date, 'dd MMM yy', { locale: ru })
}

function formatShortDateTime(value: unknown): string {
  const date = resolveDate(value)
  if (!date) return '—'
  return format(date, 'dd MMM yy HH:mm', { locale: ru })
}

function formatPayloadValue(key: keyof ActivityPayload, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'да' : 'нет'

  if (key in referenceLookup.value) {
    const label = referenceLookup.value[key as keyof typeof referenceLookup.value].get(Number(value))
    return label ?? '—'
  }

  if (key === 'start_date' || key === 'end_date') {
    return formatShortDate(value)
  }

  if (key === 'start_datetime' || key === 'end_datetime') {
    return formatShortDateTime(value)
  }

  return String(value)
}

const diffRows = computed(() => {
  if (!request.value || request.value.change_type !== 'update') return []
  const previous = request.value.previous_payload
  const proposed = request.value.proposed_payload
  if (!previous || !proposed) return []

  return (Object.keys(fieldLabels) as Array<keyof ActivityPayload>)
    .map((key: keyof ActivityPayload) => {
      const before = formatPayloadValue(key, previous[key])
      const after = formatPayloadValue(key, proposed[key])
      if (before === after) return null
      return { key, label: fieldLabels[key], before, after }
    })
    .filter(Boolean) as Array<{ key: string; label: string; before: string; after: string }>
})

function payloadRows(payload: ActivityPayload | null) {
  if (!payload) return []
  return (Object.keys(fieldLabels) as Array<keyof ActivityPayload>).map(key => ({
    label: fieldLabels[key],
    value: formatPayloadValue(key, payload[key]),
  }))
}

function activityNameFromPayload(payload: ActivityPayload | null): string | null {
  if (!payload) return null
  const taskDesc = payload.task_desc?.trim()
  if (taskDesc) return taskDesc

  const projectName = referenceLookup.value.project_main_id.get(Number(payload.project_main_id))
  if (projectName) return projectName

  const projectType = referenceLookup.value.project_type_id.get(Number(payload.project_type_id))
  if (projectType) return projectType

  return null
}

const activityDisplayName = computed(() => {
  if (!request.value) return null

  if (request.value.change_type === 'delete') {
    return activityNameFromPayload(request.value.previous_payload)
  }

  return activityNameFromPayload(request.value.proposed_payload)
    ?? activityNameFromPayload(request.value.previous_payload)
})

const activitySummary = computed(() => {
  if (!request.value) return null
  const payload = request.value.change_type === 'delete'
    ? request.value.previous_payload
    : request.value.proposed_payload
  if (!payload) return null

  const parts: string[] = []
  const project = referenceLookup.value.project_main_id.get(Number(payload.project_main_id))
  if (project) parts.push(project)
  if (payload.start_date && payload.end_date) {
    parts.push(`${formatShortDate(payload.start_date)} — ${formatShortDate(payload.end_date)}`)
  } else if (payload.start_datetime) {
    parts.push(formatShortDateTime(payload.start_datetime))
  }
  return parts.join(' · ') || null
})

async function loadRequest() {
  if (!props.show || !props.requestId) {
    request.value = null
    references.value = null
    showFullDescription.value = false
    return
  }
  loading.value = true
  try {
    const [loadedRequest, loadedReferences] = await Promise.all([
      getChangeRequest(props.requestId),
      getActivityReferences(),
    ])
    request.value = loadedRequest
    references.value = loadedReferences
  } catch (error: unknown) {
    message.error(error instanceof Error ? error.message : 'Не удалось загрузить заявку')
    emit('update:show', false)
  } finally {
    loading.value = false
  }
}

watch(() => [props.show, props.requestId], loadRequest, { immediate: true })

async function handleApprove() {
  if (!request.value) return
  saving.value = true
  try {
    await approveChangeRequest(request.value.id)
    message.success('Изменение утверждено')
    emit('update:show', false)
    emit('reviewed')
  } catch (error: unknown) {
    message.error(error instanceof Error ? error.message : 'Не удалось утвердить')
  } finally {
    saving.value = false
  }
}

async function handleReject() {
  if (!request.value) return
  saving.value = true
  try {
    await rejectChangeRequest(request.value.id)
    message.success('Изменение отклонено')
    emit('update:show', false)
    emit('reviewed')
  } catch (error: unknown) {
    message.error(error instanceof Error ? error.message : 'Не удалось отклонить')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <NModal
    :show="show"
    preset="card"
    title="Заявка на изменение"
    style="width: 720px; max-width: calc(100vw - 24px)"
    @update:show="emit('update:show', $event)"
  >
    <div v-if="loading" class="modal-loading">
      <NSpin size="large" />
    </div>
    <template v-else-if="request">
      <div class="request-meta">
        <NTag type="info">{{ changeTypeLabels[request.change_type] || request.change_type }}</NTag>
        <span>ID заявки: {{ request.id }}</span>
        <span v-if="activityDisplayName">Активность: {{ activityDisplayName }}</span>
        <NButton tertiary size="small" @click="showFullDescription = true">
          Полное описание
        </NButton>
      </div>

      <p v-if="activitySummary" class="activity-summary">{{ activitySummary }}</p>

      <p v-if="request.change_type === 'delete'" class="warning">
        Тренер запросил удаление этой активности. После утверждения запись будет удалена.
      </p>

      <template v-if="request.change_type === 'update'">
        <h4 class="section-title">Изменения</h4>
        <NTable v-if="diffRows.length" :bordered="false" :single-line="false" size="small">
          <thead>
            <tr>
              <th>Поле</th>
              <th>Было</th>
              <th>Стало</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in diffRows" :key="row.key">
              <td>{{ row.label }}</td>
              <td>{{ row.before }}</td>
              <td>{{ row.after }}</td>
            </tr>
          </tbody>
        </NTable>
        <p v-else class="muted">Нет отличий в payload.</p>
      </template>

      <template v-else-if="request.change_type === 'create'">
        <p class="muted">Новая активность будет создана после утверждения. Подробности — в полном описании.</p>
      </template>

      <div class="modal-actions">
        <NButton @click="emit('update:show', false)">Закрыть</NButton>
        <span class="spacer" />
        <NButton type="error" secondary :loading="saving" @click="handleReject">Отклонить</NButton>
        <NButton type="primary" :loading="saving" @click="handleApprove">Утвердить</NButton>
      </div>
    </template>
  </NModal>

  <NModal
    v-model:show="showFullDescription"
    preset="card"
    :title="activityDisplayName ? `Полное описание: ${activityDisplayName}` : 'Полное описание активности'"
    style="width: 720px; max-width: calc(100vw - 24px)"
  >
    <template v-if="request">
      <template v-if="request.change_type === 'update'">
        <h4 class="section-title">Текущее состояние</h4>
        <NTable :bordered="false" :single-line="false" size="small">
          <tbody>
            <tr v-for="row in payloadRows(request.previous_payload)" :key="`prev-${row.label}`">
              <td>{{ row.label }}</td>
              <td>{{ row.value }}</td>
            </tr>
          </tbody>
        </NTable>

        <h4 class="section-title">После изменения</h4>
        <NTable :bordered="false" :single-line="false" size="small">
          <tbody>
            <tr v-for="row in payloadRows(request.proposed_payload)" :key="`next-${row.label}`">
              <td>{{ row.label }}</td>
              <td>{{ row.value }}</td>
            </tr>
          </tbody>
        </NTable>
      </template>

      <template v-else-if="request.change_type === 'create'">
        <NTable :bordered="false" :single-line="false" size="small">
          <tbody>
            <tr v-for="row in payloadRows(request.proposed_payload)" :key="row.label">
              <td>{{ row.label }}</td>
              <td>{{ row.value }}</td>
            </tr>
          </tbody>
        </NTable>
      </template>

      <template v-else>
        <NTable :bordered="false" :single-line="false" size="small">
          <tbody>
            <tr v-for="row in payloadRows(request.previous_payload)" :key="row.label">
              <td>{{ row.label }}</td>
              <td>{{ row.value }}</td>
            </tr>
          </tbody>
        </NTable>
      </template>
    </template>
  </NModal>
</template>

<style scoped>
.modal-loading { display: flex; min-height: 200px; align-items: center; justify-content: center }
.request-meta { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 16px }
.activity-summary { margin: 0 0 12px; color: var(--n-text-color-2) }
.section-title { margin: 16px 0 8px; font-weight: 600 }
.warning { color: var(--n-error-color); margin: 12px 0 }
.muted { color: var(--n-text-color-3) }
.modal-actions { display: flex; align-items: center; gap: 12px; margin-top: 20px }
.spacer { flex: 1 }
</style>
