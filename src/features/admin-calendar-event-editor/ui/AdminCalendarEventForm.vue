<script setup lang=ts>
import {
  NAlert, NDatePicker, NDivider, NForm, NFormItem, NGrid, NGridItem,
  NInput, NInputNumber, NRadioButton, NRadioGroup, NSelect,
} from 'naive-ui'
import type { AdminCalendarEventFormValues } from '../../../entities/admin-calendar-event'
import type { ActivityReferences } from '../../../entities/activity/api/activity.api'

withDefaults(defineProps<{
  references: ActivityReferences
  compact?: boolean
  recurring?: boolean
  editingOccurrence?: boolean
}>(), { compact: false, recurring: false, editingOccurrence: false })

const model = defineModel<AdminCalendarEventFormValues>({ required: true })
</script>

<template>
  <NForm label-placement=top class=admin-event-form>
    <NAlert v-if=editingOccurrence type=info :show-icon=false class=occurrence-note>
      Изменения применятся только к выбранной дате. Для похожего мероприятия или новой серии
      используйте кнопку «Создать копию».
    </NAlert>
    <NFormItem label="Название мероприятия" required>
      <NInput v-model:value="model.title" placeholder="Например, тренинг «Деловая репутация»" />
    </NFormItem>
    <NGrid :cols="compact ? 1 : 2" :x-gap="16">
      <NGridItem>
        <NFormItem label="Проект / программа / модуль">
          <NSelect v-model:value="model.project_main_id" :options="references.projects"
            placeholder="Необязательная привязка" filterable clearable />
        </NFormItem>
      </NGridItem>
      <NGridItem>
        <NFormItem label="Требуется тренеров" required>
          <NInputNumber v-model:value="model.required_trainer_count" :min="1" :max="999"
            :precision="0" placeholder="Количество" class="w-full" />
        </NFormItem>
      </NGridItem>
    </NGrid>
    <NDivider dashed class="form-divider">Классификация</NDivider>
    <NGrid :cols="compact ? 1 : 2" :x-gap="16">
      <NGridItem>
        <NFormItem label="Тип мероприятия">
          <NSelect v-model:value="model.activity_type_id" :options="references.activityTypes"
            placeholder="Выберите тип" clearable />
        </NFormItem>
      </NGridItem>
      <NGridItem>
        <NFormItem label="Формат проведения">
          <NSelect v-model:value="model.delivery_format_id" :options="references.deliveryFormats"
            placeholder="Выберите формат" clearable />
        </NFormItem>
      </NGridItem>
    </NGrid>
    <NGrid :cols="compact || !recurring ? 1 : 2" :x-gap="16">
      <NGridItem>
        <NFormItem label="Периодичность">
          <NSelect v-model:value="model.recurrence_type_id" :options="references.recurrenceTypes"
            placeholder="Единоразово" :disabled="editingOccurrence" clearable />
        </NFormItem>
      </NGridItem>
      <NGridItem v-if="recurring">
        <NFormItem label="Повторять по" required>
          <NDatePicker v-model:value="model.recurrence_until" type="date" format="dd.MM.yyyy"
            placeholder="Последняя дата серии" :disabled="editingOccurrence" class="w-full" />
        </NFormItem>
      </NGridItem>
    </NGrid>
    <NFormItem label="Планирование">
      <NRadioGroup v-model:value="model.schedule_mode" name="admin-event-schedule-mode">
        <NRadioButton value="datetime">С точным временем</NRadioButton>
        <NRadioButton value="date">Весь день</NRadioButton>
      </NRadioGroup>
    </NFormItem>
    <NGrid v-if="model.schedule_mode === 'datetime'" :cols="compact ? 1 : 2" :x-gap="16">
      <NGridItem>
        <NFormItem label="Дата и время начала" required>
          <NDatePicker v-model:value="model.start_datetime" type="datetime" format="dd.MM.yyyy HH:mm"
            :time-picker-props="{ format: 'HH:mm' }" placeholder="Начало" class="w-full" />
        </NFormItem>
      </NGridItem>
      <NGridItem>
        <NFormItem label="Дата и время окончания" required>
          <NDatePicker v-model:value="model.end_datetime" type="datetime" format="dd.MM.yyyy HH:mm"
            :time-picker-props="{ format: 'HH:mm' }" placeholder="Окончание" class="w-full" />
        </NFormItem>
      </NGridItem>
    </NGrid>
    <NGrid v-else :cols="compact ? 1 : 2" :x-gap="16">
      <NGridItem><NFormItem label="Дата начала" required>
        <NDatePicker v-model:value="model.start_date" type="date" format="dd.MM.yyyy" class="w-full" />
      </NFormItem></NGridItem>
      <NGridItem><NFormItem label="Дата окончания" required>
        <NDatePicker v-model:value="model.end_date" type="date" format="dd.MM.yyyy" class="w-full" />
      </NFormItem></NGridItem>
    </NGrid>
    <NDivider dashed class="form-divider">Описание</NDivider>
    <NFormItem label="Описание">
      <NInput v-model:value="model.description" type="textarea" :rows="3" placeholder="Содержание мероприятия" />
    </NFormItem>
    <NFormItem label="Комментарии">
      <NInput v-model:value="model.comments" type="textarea" :rows="2" placeholder="Дополнительная информация" />
    </NFormItem>
  </NForm>
</template>

<style scoped>
.form-divider { margin:4px 0 16px }
.occurrence-note { margin-bottom:16px }
:deep(.admin-event-form .n-form-item) { margin-bottom:12px }
</style>
