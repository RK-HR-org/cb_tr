<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NButton, NModal, NPopconfirm, NSpin, useMessage } from 'naive-ui'
import {
  activityFormToPayload,
  activityToForm,
  createActivityForm,
  deleteActivity,
  getActivity,
  getActivityParticipantIds,
  getActivityReferences,
  saveActivity,
  validateActivityForm,
  type ActivityFormValues,
  type ActivityRecord,
  type ActivityScheduleSeed,
} from '../../../entities/activity'
import { getTrainerOptions } from '../../../entities/trainer'
import type { ActivityReferences } from '../../../entities/activity/api/activity.api'
import type { SelectOption } from '../../../shared/types'
import ActivityForm from './ActivityForm.vue'

const props = withDefaults(defineProps<{
  show: boolean
  recordId: number | null
  trainerId?: number | null
  canManageParticipants?: boolean
  initialSchedule?: ActivityScheduleSeed | null
  allowCopy?: boolean
}>(), {
  trainerId: null,
  canManageParticipants: true,
  initialSchedule: null,
  allowCopy: false,
})

const emit = defineEmits<{
  'update:show': [value: boolean]
  saved: []
}>()

const emptyReferences = (): ActivityReferences => ({
  projectTypes: [],
  projects: [],
  roles: [],
  activityTypes: [],
  deliveryFormats: [],
  recurrenceTypes: [],
})

const message = useMessage()
const loading = ref(false)
const saving = ref(false)
const compact = ref(window.matchMedia('(max-width: 700px)').matches)
const currentRecord = ref<ActivityRecord | null>(null)
const references = ref<ActivityReferences>(emptyReferences())
const trainers = ref<SelectOption[]>([])
const form = ref<ActivityFormValues>(createActivityForm())
const copyMode = ref(false)
const effectiveRecordId = computed(() => copyMode.value ? null : props.recordId)
const formReadOnly = computed(() => !copyMode.value && groupReadOnly())
const modalTitle = computed(() => {
  if (copyMode.value) return 'Создание копии активности'
  return props.recordId ? 'Редактирование активности' : 'Новая активность'
})

async function prepareEditor() {
  if (!props.show) {
    copyMode.value = false
    return
  }
  loading.value = true
  try {
    const [referenceData, trainerOptions] = await Promise.all([
      getActivityReferences(),
      props.canManageParticipants ? getTrainerOptions() : Promise.resolve([]),
    ])
    references.value = referenceData
    trainers.value = trainerOptions

    if (props.recordId) {
      const record = await getActivity(props.recordId)
      currentRecord.value = record
      const participantIds = await getActivityParticipantIds(record)
      form.value = activityToForm(record, participantIds)
    } else {
      currentRecord.value = null
      form.value = createActivityForm(props.trainerId, props.initialSchedule)
    }
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : 'Неизвестная ошибка'
    message.error('Не удалось открыть активность: ' + reason)
    emit('update:show', false)
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.show, props.recordId, props.trainerId, props.initialSchedule],
  prepareEditor,
  { immediate: true },
)

const groupReadOnly = () => {
  if (!currentRecord.value?.event_group_id || props.canManageParticipants) {
    return false
  }
  const ownerId = currentRecord.value.trainer_id
  if (props.trainerId != null && ownerId === props.trainerId) {
    return false
  }
  return true
}

const groupEventNote = () =>
  Boolean(
    currentRecord.value?.event_group_id
    && !props.canManageParticipants
    && props.trainerId != null
    && currentRecord.value.trainer_id === props.trainerId,
  )

function handleCopy() {
  copyMode.value = true
}

async function handleSave() {
  if (formReadOnly.value) return
  const validationError = validateActivityForm(form.value)
  if (validationError) {
    message.warning(validationError)
    return
  }
  const trainerId = props.trainerId ?? form.value.participant_ids[0]
  if (!trainerId) return

  saving.value = true
  try {
    await saveActivity({
      recordId: effectiveRecordId.value,
      trainerId,
      participantIds: form.value.participant_ids,
      canManageParticipants: props.canManageParticipants,
      payload: {
        ...activityFormToPayload(form.value),
        is_duplicate: copyMode.value,
      },
    })
    message.success(
      props.canManageParticipants
        ? (props.recordId ? 'Активность обновлена' : 'Активность добавлена')
        : (copyMode.value
          ? 'Копия отправлена на утверждение'
          : (props.recordId ? 'Изменение отправлено на утверждение' : 'Активность отправлена на утверждение')),
    )
    emit('update:show', false)
    emit('saved')
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : 'Неизвестная ошибка'
    message.error('Не удалось сохранить активность: ' + reason)
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  if (!props.recordId || groupReadOnly()) return
  const trainerId = props.trainerId ?? currentRecord.value?.trainer_id
  if (!trainerId) return

  saving.value = true
  try {
    await deleteActivity(props.recordId, trainerId, props.canManageParticipants)
    message.success(
      props.canManageParticipants
        ? 'Активность удалена'
        : 'Запрос на удаление отправлен на утверждение',
    )
    emit('update:show', false)
    emit('saved')
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : 'Неизвестная ошибка'
    message.error('Не удалось удалить активность: ' + reason)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <NModal
    :show="show"
    preset="card"
    :title="modalTitle"
    :style="{ width: compact ? 'calc(100vw - 16px)' : '672px', maxWidth: 'calc(100vw - 24px)' }"
    :content-style="{
      maxHeight: compact ? 'calc(100vh - 100px)' : 'calc(90vh - 76px)',
      overflowY: 'auto',
      padding: compact ? '12px' : '16px 20px 20px',
    }"
    :bordered="false"
    @update:show="emit('update:show', $event)"
  >
    <div v-if="loading" class="editor-loading">
      <NSpin size="large" description="Загрузка активности…" />
    </div>
    <template v-else>
      <ActivityForm
        v-model="form"
        :references="references"
        :trainers="trainers"
        :show-participants="canManageParticipants"
        :compact="compact"
        :disabled="formReadOnly"
        :group-read-only-note="formReadOnly"
        :group-event-note="groupEventNote()"
      />
      <div class="modal-actions">
        <NPopconfirm v-if="recordId && !copyMode && !formReadOnly" @positive-click="handleDelete">
          <template #trigger><NButton type="error" secondary :loading="saving">Удалить</NButton></template>
          Удалить эту активность?
        </NPopconfirm>
        <NButton
          v-if="recordId && !copyMode && allowCopy"
          secondary
          :disabled="saving"
          @click="handleCopy"
        >
          Создать копию
        </NButton>
        <span class="modal-spacer" />
        <NButton @click="emit('update:show', false)">Отмена</NButton>
        <NButton type="primary" :loading="saving" :disabled="formReadOnly" @click="handleSave">
          Сохранить
        </NButton>
      </div>
    </template>
  </NModal>
</template>

<style scoped>
.editor-loading { display:flex; min-height:240px; align-items:center; justify-content:center }
.modal-actions { display:flex; align-items:center; gap:12px }
.modal-spacer { flex:1 }
</style>
