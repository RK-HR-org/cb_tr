<script setup lang="ts">
// Compatibility wrapper for older imports. The implementation lives in the
// activity-editor feature and is shared by the table, calendar and Gantt pages.
import { ActivityEditorModal } from '../features/activity-editor'
import type { ActivityScheduleSeed } from '../entities/activity'

withDefaults(defineProps<{
  show: boolean
  recordId: number | null
  trainerId?: number | null
  canManageParticipants?: boolean
  initialSchedule?: ActivityScheduleSeed | null
}>(), {
  trainerId: null,
  canManageParticipants: true,
  initialSchedule: null,
})

const emit = defineEmits<{
  'update:show': [value: boolean]
  saved: []
}>()
</script>

<template>
  <ActivityEditorModal
    :show="show"
    :record-id="recordId"
    :trainer-id="trainerId"
    :can-manage-participants="canManageParticipants"
    :initial-schedule="initialSchedule"
    @update:show="emit('update:show', $event)"
    @saved="emit('saved')"
  />
</template>
