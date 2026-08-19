<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NAlert, NButton, NDataTable, NDatePicker, NForm, NFormItem, NGrid, NGridItem, NInputNumber, NModal, NSelect, NSpin, NText, useMessage, type DataTableColumns } from 'naive-ui'
import { calculateProgramSchedule, listOccupiedProgramScheduleDates, saveProgramSchedule, type OccupiedDateRange, type PlannedModule, type ProgramCalendarMode, type ProgramGapUnit, type ProductionCalendarOverride, type ScheduleableProject } from '../../../entities/program-schedule'
import { toLocalDateString } from '../../../shared/lib/date'
import type { Project } from '../../../entities/project'

const props = defineProps<{
  show: boolean
  program: Project
  modules: ScheduleableProject[]
  overrides: ProductionCalendarOverride[]
}>()
const emit = defineEmits<{ 'update:show': [value: boolean]; saved: [] }>()
const message = useMessage()
const saving = ref(false)
const startDate = ref<number | null>(Date.now())
const gapValue = ref<number>(props.program.module_gap_value ?? 30)
const gapUnit = ref<ProgramGapUnit>(props.program.module_gap_unit ?? 'days')
const calendarMode = ref<ProgramCalendarMode>('working')

const unitOptions = [
  { label: 'Дни', value: 'days' },
  { label: 'Недели', value: 'weeks' },
  { label: 'Месяцы (сохранить день недели)', value: 'months' },
  { label: 'Кварталы (сохранить день недели)', value: 'quarters' },
]
const modeOptions = [
  { label: 'Рабочий календарь', value: 'working' },
  { label: 'Календарные дни', value: 'calendar' },
]
const preview = ref<PlannedModule[]>([])
const error = ref<string | null>(null)
const occupied = ref<OccupiedDateRange[]>([])
const startDateString = computed(() => startDate.value ? toLocalDateString(new Date(startDate.value)) : '')
const columns: DataTableColumns<PlannedModule> = [
  { title: 'Модуль', key: 'name' },
  { title: 'Длительность', key: 'duration_days', render: row => `${row.duration_days} дн.` },
  { title: 'Начало', key: 'planned_start_date' },
  { title: 'Окончание', key: 'planned_end_date' },
]

function recalculate() {
  error.value = null
  if (!startDateString.value) { preview.value = []; error.value = 'Укажите дату начала программы'; return }
  try {
    preview.value = calculateProgramSchedule(props.modules, startDateString.value, Math.max(0, Number(gapValue.value || 0)), gapUnit.value, calendarMode.value, props.overrides, occupied.value)
  } catch (cause) {
    preview.value = []
    error.value = cause instanceof Error ? cause.message : 'Не удалось рассчитать даты модулей'
  }
}

async function submit() {
  recalculate()
  if (!preview.value.length || error.value) return
  saving.value = true
  try {
    await saveProgramSchedule({
      program_project_id: props.program.id,
      start_date: startDateString.value,
      gap_value: Math.max(0, Number(gapValue.value || 0)),
      gap_unit: gapUnit.value,
      calendar_mode: calendarMode.value,
      modules: preview.value,
    })
    message.success('Программа запланирована, мероприятия добавлены в административный календарь')
    emit('saved')
    emit('update:show', false)
  } catch (cause) {
    message.error(cause instanceof Error ? cause.message : 'Не удалось сохранить план программы')
  } finally {
    saving.value = false
  }
}

watch(() => props.show, async value => {
  if (value) {
    gapValue.value = props.program.module_gap_value ?? 30
    gapUnit.value = props.program.module_gap_unit ?? 'days'
    try { occupied.value = await listOccupiedProgramScheduleDates() } catch { occupied.value = [] }
    recalculate()
  }
})
watch([startDate, gapValue, gapUnit, calendarMode, () => props.modules, () => props.overrides], recalculate, { deep: true })
</script>

<template>
  <NModal :show="show" preset="card" title="Запланировать программу" class="program-scheduler-modal" @update:show="emit('update:show', $event)">
    <NSpin :show="saving">
      <NText depth="3">{{ program.name }}</NText>
      <NForm label-placement="top" class="mt-4">
        <NGrid :cols="2" :x-gap="16">
          <NGridItem>
            <NFormItem label="Дата начала">
              <NDatePicker v-model:value="startDate" type="date" class="w-full" />
            </NFormItem>
          </NGridItem>
          <NGridItem>
            <NFormItem label="Календарь">
              <NSelect v-model:value="calendarMode" :options="modeOptions" />
            </NFormItem>
          </NGridItem>
          <NGridItem>
            <NFormItem label="Промежуток между модулями">
              <NInputNumber v-model:value="gapValue" :min="0" :precision="0" class="w-full" />
            </NFormItem>
          </NGridItem>
          <NGridItem>
            <NFormItem label="Единица промежутка">
              <NSelect v-model:value="gapUnit" :options="unitOptions" />
            </NFormItem>
          </NGridItem>
        </NGrid>
      </NForm>
      <NAlert v-if="error" type="error" class="mb-4">{{ error }}</NAlert>
      <NAlert v-else type="info" class="mb-4">
        Для месяцев и кварталов выбирается ближайший такой же день недели в целевом периоде. В рабочем календаре праздники пропускаются.
      </NAlert>
      <NDataTable :columns="columns" :data="preview" :bordered="false" size="small" />
      <div class="form-footer mt-4">
        <NButton @click="emit('update:show', false)">Отмена</NButton>
        <NButton type="primary" :disabled="!preview.length || Boolean(error)" :loading="saving" @click="submit">Запланировать</NButton>
      </div>
    </NSpin>
  </NModal>
</template>

<style scoped>
.program-scheduler-modal { width: min(820px, 94vw); }
.form-footer { display: flex; justify-content: flex-end; gap: 8px; }
</style>
