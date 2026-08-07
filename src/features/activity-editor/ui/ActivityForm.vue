<script setup lang="ts">
import {
  NDatePicker,
  NDivider,
  NForm,
  NFormItem,
  NGrid,
  NGridItem,
  NInput,
  NRadioButton,
  NRadioGroup,
  NSelect,
  NText,
} from 'naive-ui'
import type { ActivityFormValues } from '../../../entities/activity'
import type { ActivityReferences } from '../../../entities/activity/api/activity.api'
import type { SelectOption } from '../../../shared/types'

withDefaults(defineProps<{
  references: ActivityReferences
  trainers: SelectOption[]
  showParticipants?: boolean
  disabled?: boolean
  compact?: boolean
  groupReadOnlyNote?: boolean
}>(), {
  showParticipants: false,
  disabled: false,
  compact: false,
  groupReadOnlyNote: false,
})

const model = defineModel<ActivityFormValues>({ required: true })
</script>

<template>
  <NForm label-placement="top" class="activity-form" :disabled="disabled">
    <NFormItem v-if="showParticipants" label="Участники *">
      <NSelect
        v-model:value="model.participant_ids"
        :options="trainers"
        multiple
        filterable
        clearable
        :max-tag-count="compact ? 1 : 'responsive'"
        placeholder="Выберите одного или нескольких тренеров"
      />
    </NFormItem>
    <NText v-else-if="groupReadOnlyNote" depth="3" class="group-event-note">
      Это групповое мероприятие. Изменить его может администратор.
    </NText>

    <NGrid :cols="compact ? 1 : 2" :x-gap="16">
      <NGridItem>
        <NFormItem label="Тип проекта" required>
          <NSelect v-model:value="model.project_type_id" :options="references.projectTypes" placeholder="Выберите тип" />
        </NFormItem>
      </NGridItem>
      <NGridItem>
        <NFormItem label="Основной проект" required>
          <NSelect v-model:value="model.project_main_id" :options="references.projects" placeholder="Выберите проект" filterable />
        </NFormItem>
      </NGridItem>
    </NGrid>

    <NFormItem label="Подпроект / Тема">
      <NInput v-model:value="model.project_sub" placeholder="Напр: Статистика УБР" />
    </NFormItem>
    <NFormItem label="Роль в проекте" required>
      <NSelect v-model:value="model.role_id" :options="references.roles" placeholder="Выберите роль" />
    </NFormItem>

    <NDivider dashed class="form-divider">Классификация задачи</NDivider>
    <NGrid :cols="compact ? 1 : 2" :x-gap="16">
      <NGridItem>
        <NFormItem label="Тип активности">
          <NSelect v-model:value="model.activity_type_id" :options="references.activityTypes"
            placeholder="Что именно делали?" clearable />
        </NFormItem>
      </NGridItem>
      <NGridItem>
        <NFormItem label="Формат выполнения">
          <NSelect v-model:value="model.delivery_format_id" :options="references.deliveryFormats"
            placeholder="Как выполнялась задача?" clearable />
        </NFormItem>
      </NGridItem>
    </NGrid>
    <NFormItem label="Периодичность">
      <NSelect v-model:value="model.recurrence_type_id" :options="references.recurrenceTypes"
        placeholder="Как часто выполняете?" clearable />
    </NFormItem>

    <NFormItem label="Планирование">
      <NRadioGroup v-model:value="model.schedule_mode" name="activity-schedule-mode">
        <NRadioButton value="datetime">С точным временем</NRadioButton>
        <NRadioButton value="date">Весь день</NRadioButton>
      </NRadioGroup>
    </NFormItem>

    <NGrid v-if="model.schedule_mode === 'datetime'" :cols="compact ? 1 : 2" :x-gap="16">
      <NGridItem>
        <NFormItem label="Дата и время начала" required>
          <NDatePicker v-model:value="model.start_datetime" type="datetime" format="dd.MM.yyyy HH:mm"
            placeholder="Выберите дату и время" :time-picker-props="{ format: 'HH:mm' }" class="w-full" />
        </NFormItem>
      </NGridItem>
      <NGridItem>
        <NFormItem label="Дата и время окончания" required>
          <NDatePicker v-model:value="model.end_datetime" type="datetime" format="dd.MM.yyyy HH:mm"
            placeholder="Выберите дату и время" :time-picker-props="{ format: 'HH:mm' }" class="w-full" />
        </NFormItem>
      </NGridItem>
    </NGrid>
    <NGrid v-else :cols="compact ? 1 : 2" :x-gap="16">
      <NGridItem>
        <NFormItem label="Дата начала" required>
          <NDatePicker v-model:value="model.start_date" type="date" format="dd.MM.yyyy"
            placeholder="Выберите дату начала" class="w-full" />
        </NFormItem>
      </NGridItem>
      <NGridItem>
        <NFormItem label="Дата окончания" required>
          <NDatePicker v-model:value="model.end_date" type="date" format="dd.MM.yyyy"
            placeholder="Выберите дату окончания" class="w-full" />
        </NFormItem>
      </NGridItem>
    </NGrid>

    <NDivider dashed class="form-divider">Описание</NDivider>
    <NFormItem label="Описание задачи">
      <NInput v-model:value="model.task_desc" type="textarea" :rows="3"
        placeholder="Дополнительное описание в свободной форме..." />
    </NFormItem>
    <NFormItem label="Комментарии">
      <NInput v-model:value="model.comments" type="textarea" :rows="2" placeholder="Дополнительная информация" />
    </NFormItem>
  </NForm>
</template>

<style scoped>
.form-divider { margin:4px 0 16px }
.group-event-note { display:block; margin-bottom:16px }
:deep(.activity-form .n-form-item) { margin-bottom:12px }
</style>
