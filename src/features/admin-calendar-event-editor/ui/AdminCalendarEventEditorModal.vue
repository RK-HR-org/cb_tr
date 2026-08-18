<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NButton, NModal, NPopconfirm, NSpin, useMessage } from 'naive-ui'
import {
  adminCalendarEventToForm, createAdminCalendarEventForm, defaultRecurrenceUntil,
  deleteAdminCalendarEvent, getAdminCalendarEvent, getAdminCalendarEventTrainerIds,
  listFutureAdminCalendarEventIds, recurrenceKindFromLabel,
  saveAdminCalendarEvent, validateAdminCalendarEventForm,
  syncAdminCalendarEventTrainers,
  type AdminCalendarEventFormValues, type AdminCalendarEventRecord,
  type AdminCalendarEventScheduleSeed,
} from '../../../entities/admin-calendar-event'
import { getActivityReferences, type ActivityReferences } from '../../../entities/activity/api/activity.api'
import { getTrainerOptions } from '../../../entities/trainer'
import type { SelectOption } from '../../../shared/types'
import AdminCalendarEventForm from './AdminCalendarEventForm.vue'

const props = withDefaults(defineProps<{
  show: boolean
  recordId: number | null
  initialSchedule?: AdminCalendarEventScheduleSeed | null
}>(), { initialSchedule: null })
const emit = defineEmits<{ 'update:show': [value: boolean]; saved: [] }>()
const emptyReferences = (): ActivityReferences => ({
  projectTypes: [], projects: [], roles: [], activityTypes: [], deliveryFormats: [], recurrenceTypes: [],
})
const message = useMessage()
const loading = ref(false)
const saving = ref(false)
const copyMode = ref(false)
const compact = ref(window.matchMedia('(max-width: 700px)').matches)
const currentRecord = ref<AdminCalendarEventRecord | null>(null)
const references = ref<ActivityReferences>(emptyReferences())
const trainerOptions = ref<SelectOption[]>([])
const form = ref<AdminCalendarEventFormValues>(createAdminCalendarEventForm())
const recurrenceLabel = computed(() => references.value.recurrenceTypes
  .find(option => option.value === form.value.recurrence_type_id)?.label)
const recurrenceKind = computed(() => recurrenceKindFromLabel(recurrenceLabel.value))
const recurring = computed(() => recurrenceKind.value !== 'once')
const effectiveRecordId = computed(() => copyMode.value ? null : props.recordId)
const modalTitle = computed(() => copyMode.value
  ? 'Копия мероприятия'
  : props.recordId ? 'Редактирование мероприятия' : 'Новое мероприятие')
const canDeleteFutureSeries = computed(() => Boolean(
  props.recordId && currentRecord.value?.recurrence_until,
))

async function prepareEditor() {
  if (!props.show) return
  loading.value = true
  copyMode.value = false
  try {
    const [referenceData, loadedTrainerOptions] = await Promise.all([
      getActivityReferences(),
      getTrainerOptions(),
    ])
    references.value = referenceData
    trainerOptions.value = loadedTrainerOptions
    if (props.recordId) {
      const record = await getAdminCalendarEvent(props.recordId)
      currentRecord.value = record
      form.value = adminCalendarEventToForm(record)
      form.value.trainer_ids = await getAdminCalendarEventTrainerIds(record.id)
    } else {
      currentRecord.value = null
      form.value = createAdminCalendarEventForm(props.initialSchedule)
    }
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : 'Неизвестная ошибка'
    message.error('Не удалось открыть мероприятие: ' + reason)
    emit('update:show', false)
  } finally { loading.value = false }
}

watch(() => [props.show, props.recordId, props.initialSchedule], prepareEditor, { immediate: true })
watch(() => [
  recurrenceKind.value,
  form.value.schedule_mode,
  form.value.start_datetime,
  form.value.start_date,
], ([kind]) => {
  if (kind === 'once') {
    if (!props.recordId || copyMode.value) form.value.recurrence_until = null
  } else if (!form.value.recurrence_until) {
    form.value.recurrence_until = defaultRecurrenceUntil(form.value)
  }
})

function handleCopy() {
  if (!currentRecord.value) return
  copyMode.value = true
  const oneTime = references.value.recurrenceTypes.find(option => recurrenceKindFromLabel(option.label) === 'once')
  form.value.recurrence_type_id = oneTime?.value ?? null
  form.value.recurrence_until = null
  message.info('Заготовка копии готова. Измените даты или другие параметры и сохраните её')
}

async function handleSave() {
  const validationError = validateAdminCalendarEventForm(form.value, recurrenceKind.value)
  if (validationError) return message.warning(validationError)
  saving.value = true
  try {
    const saved = await saveAdminCalendarEvent({
      recordId: effectiveRecordId.value,
      copiedFromEventId: copyMode.value ? currentRecord.value?.id ?? null : null,
      form: form.value,
      recurrenceKind: recurrenceKind.value,
    })
    const assignmentEventIds = copyMode.value || !props.recordId
      ? saved.eventIds
      : await listFutureAdminCalendarEventIds(saved.eventIds[0])
    await syncAdminCalendarEventTrainers(assignmentEventIds, form.value.trainer_ids)
    message.success(saved.count > 1
      ? 'Создана серия: ' + saved.count + ' мероприятий'
      : effectiveRecordId.value ? 'Мероприятие обновлено' : 'Мероприятие добавлено')
    emit('update:show', false)
    emit('saved')
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : 'Неизвестная ошибка'
    message.error('Не удалось сохранить мероприятие: ' + reason)
  } finally { saving.value = false }
}

async function handleDelete() {
  await performDelete(false)
}

async function handleDeleteFutureSeries() {
  await performDelete(true)
}

async function performDelete(futureSeries: boolean) {
  if (!props.recordId || copyMode.value) return
  saving.value = true
  try {
    const deletedCount = await deleteAdminCalendarEvent(props.recordId, futureSeries)
    message.success(futureSeries
      ? 'Удалено будущих мероприятий: ' + deletedCount
      : 'Мероприятие удалено')
    emit('update:show', false)
    emit('saved')
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : 'Неизвестная ошибка'
    message.error('Не удалось удалить мероприятие: ' + reason)
  } finally { saving.value = false }
}
</script>

<template>
  <NModal :show="show" preset="card" :title="modalTitle"
    :style="{ width: compact ? 'calc(100vw - 16px)' : '700px', maxWidth: 'calc(100vw - 24px)' }"
    :content-style="{ maxHeight: compact ? 'calc(100vh - 100px)' : 'calc(90vh - 76px)',
      overflowY: 'auto', padding: compact ? '12px' : '16px 20px 20px' }"
    :bordered="false" @update:show="emit('update:show', $event)">
    <div v-if="loading" class="editor-loading"><NSpin size="large" description="Загрузка мероприятия…" /></div>
    <template v-else>
      <AdminCalendarEventForm v-model="form" :references="references" :compact="compact"
        :recurring="recurring" :editing-occurrence="Boolean(props.recordId && !copyMode)" />
      <div class="trainer-assignment">
        <div class="trainer-assignment-heading">
          <div>
            <div class="trainer-assignment-title">Тренеры</div>
            <div class="trainer-assignment-note">
              Назначенные тренеры увидят мероприятие в календаре и ганте.
              Для серии назначение применяется к будущим датам.
            </div>
          </div>
          <NButton secondary size="small" :disabled="saving || !trainerOptions.length"
            @click="form.trainer_ids = trainerOptions.map(option => option.value)">
            Добавить всех
          </NButton>
        </div>
        <NSelect v-model:value="form.trainer_ids" :options="trainerOptions" multiple filterable clearable
          :max-tag-count="compact ? 1 : 'responsive'" placeholder="Выберите тренеров по одному" />
      </div>
      <div class="modal-actions">
        <NPopconfirm v-if="props.recordId && !copyMode" @positive-click="handleDelete">
          <template #trigger><NButton type="error" secondary :loading="saving">Удалить</NButton></template>
          Удалить выбранное мероприятие?
        </NPopconfirm>
        <NPopconfirm v-if="canDeleteFutureSeries && !copyMode" @positive-click="handleDeleteFutureSeries">
          <template #trigger>
            <NButton type="warning" secondary :loading="saving">Удалить будущие в серии</NButton>
          </template>
          Удалить все будущие даты этой серии, сохранив прошедшие мероприятия?
        </NPopconfirm>
        <NButton v-if="props.recordId && !copyMode" secondary :disabled="saving" @click="handleCopy">
          Создать копию
        </NButton>
        <span class="modal-spacer" />
        <NButton @click="emit('update:show', false)">Отмена</NButton>
        <NButton type="primary" :loading="saving" @click="handleSave">Сохранить</NButton>
      </div>
    </template>
  </NModal>
</template>

<style scoped>
.editor-loading { display:flex; min-height:240px; align-items:center; justify-content:center }
.modal-actions { display:flex; align-items:center; gap:12px; flex-wrap:wrap }
.modal-spacer { flex:1 }
.trainer-assignment { margin:4px 0 18px; padding:14px; border:1px solid var(--n-border-color); border-radius:8px }
.trainer-assignment-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:10px }
.trainer-assignment-title { font-weight:600 }
.trainer-assignment-note { margin-top:4px; color:var(--n-text-color-3); font-size:12px; line-height:1.4 }
</style>
