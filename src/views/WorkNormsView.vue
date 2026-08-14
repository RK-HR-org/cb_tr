<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from 'vue'
import {
  NButton,
  NPopconfirm,
  NTag,
  useMessage,
  type DataTableColumns,
} from 'naive-ui'
import { DashboardLayout } from '../widgets/dashboard-layout'
import {
  deleteProductionCalendarDay,
  getWorkNormCounters,
  getWorkNormSetting,
  listProductionCalendarDays,
  saveProductionCalendarDay,
  saveWorkNormSetting,
  type ProductionCalendarDay,
  type ProductionCalendarDayPayload,
  type ProductionCalendarDayType,
} from '../entities/production-calendar'
import { dateOnlyTimestamp, formatDateOnly, toLocalDateString } from '../shared/lib/date'

const message = useMessage()
const loading = ref(false)
const settingsLoading = ref(false)
const modalOpen = ref(false)
const calendarExpandedNames = ref<string[]>([])
const editingId = ref<number | null>(null)
const days = ref<ProductionCalendarDay[]>([])
const selectedYear = ref(2027)
const trainingDaysPerTrainerWeek = ref(2)
const trainerCount = ref(0)
const applicationProgramCount = ref(0)
const calendarExpanded = computed(() => calendarExpandedNames.value.includes('calendar'))
const form = ref({
  event_date: null as number | null,
  day_type: 'holiday' as ProductionCalendarDayType,
  name: '',
})

const dayTypeOptions = [
  { label: 'Праздничный / нерабочий день', value: 'holiday' },
  { label: 'Рабочая суббота', value: 'working_saturday' },
]

const yearOptions = computed(() => {
  const years = new Set(days.value.map(item => Number(item.event_date.slice(0, 4))))
  years.add(2027)
  return [...years]
    .sort((left, right) => right - left)
    .map(year => ({ label: String(year), value: year }))
})

const filteredDays = computed(() => days.value.filter(
  item => Number(item.event_date.slice(0, 4)) === selectedYear.value,
))

const holidayCount = computed(() => filteredDays.value.filter(
  item => item.day_type === 'holiday',
).length)
const workingSaturdayCount = computed(() => filteredDays.value.filter(
  item => item.day_type === 'working_saturday',
).length)

function dateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

const workingDayCount = computed(() => {
  const holidays = new Set(filteredDays.value
    .filter(item => item.day_type === 'holiday')
    .map(item => item.event_date))
  const workingSaturdays = new Set(filteredDays.value
    .filter(item => item.day_type === 'working_saturday')
    .map(item => item.event_date))
  const cursor = new Date(selectedYear.value, 0, 1)
  const end = new Date(selectedYear.value + 1, 0, 1)
  let count = 0

  while (cursor < end) {
    const key = dateKey(cursor)
    const dayOfWeek = cursor.getDay()
    if ((!holidays.has(key) && dayOfWeek >= 1 && dayOfWeek <= 5) || workingSaturdays.has(key)) {
      count += 1
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return count
})

const workingWeekCount = computed(() => workingDayCount.value / 5)
const trainingDayCount = computed(() => (
  workingWeekCount.value * trainerCount.value * trainingDaysPerTrainerWeek.value
))

const numberFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 })
const formatNumber = (value: number) => numberFormatter.format(value)

const columns: DataTableColumns<ProductionCalendarDay> = [
  {
    title: 'Дата',
    key: 'event_date',
    width: 140,
    sorter: (left, right) => left.event_date.localeCompare(right.event_date),
    render: row => formatDateOnly(row.event_date),
  },
  {
    title: 'Тип дня',
    key: 'day_type',
    width: 230,
    sorter: (left, right) => left.day_type.localeCompare(right.day_type),
    render: row => h(NTag, {
      type: row.day_type === 'holiday' ? 'error' : 'warning',
      bordered: false,
    }, {
      default: () => row.day_type === 'holiday'
        ? 'Праздничный / нерабочий'
        : 'Рабочая суббота',
    }),
  },
  {
    title: 'Наименование',
    key: 'name',
    sorter: (left, right) => left.name.localeCompare(right.name, 'ru'),
  },
  {
    title: 'Действия',
    key: 'actions',
    width: 190,
    render: row => h('div', { class: 'table-actions' }, [
      h(NButton, { size: 'small', onClick: () => openEdit(row) }, { default: () => 'Изменить' }),
      h(NPopconfirm, { onPositiveClick: () => removeDay(row.id) }, {
        trigger: () => h(NButton, { size: 'small', type: 'error' }, { default: () => 'Удалить' }),
        default: () => 'Удалить дату из производственного календаря?',
      }),
    ]),
  },
]

async function loadDays() {
  loading.value = true
  try {
    days.value = await listProductionCalendarDays()
  } catch (error) {
    message.error(error instanceof Error ? error.message : 'Не удалось загрузить производственный календарь')
  } finally {
    loading.value = false
  }
}

async function loadMetrics() {
  try {
    const counters = await getWorkNormCounters()
    trainerCount.value = counters.trainerCount
    applicationProgramCount.value = counters.applicationProgramCount
  } catch (error) {
    message.error(error instanceof Error ? error.message : 'Не удалось загрузить показатели')
  }
}

async function loadSetting(year: number) {
  settingsLoading.value = true
  try {
    const setting = await getWorkNormSetting(year)
    trainingDaysPerTrainerWeek.value = setting?.training_days_per_trainer_week ?? 2
  } catch (error) {
    message.error(error instanceof Error ? error.message : 'Не удалось загрузить норму тренинг-дней')
  } finally {
    settingsLoading.value = false
  }
}

async function saveSetting() {
  settingsLoading.value = true
  try {
    await saveWorkNormSetting(selectedYear.value, trainingDaysPerTrainerWeek.value)
    message.success('Норма тренинг-дней сохранена')
  } catch (error) {
    message.error(error instanceof Error ? error.message : 'Не удалось сохранить норму тренинг-дней')
  } finally {
    settingsLoading.value = false
  }
}

function openCreate(type: ProductionCalendarDayType = 'holiday') {
  editingId.value = null
  form.value = { event_date: null, day_type: type, name: '' }
  modalOpen.value = true
}

function openEdit(day: ProductionCalendarDay) {
  editingId.value = day.id
  form.value = {
    event_date: dateOnlyTimestamp(day.event_date),
    day_type: day.day_type,
    name: day.name,
  }
  modalOpen.value = true
}

async function submit() {
  if (!form.value.event_date) {
    message.warning('Выберите дату')
    return
  }
  if (!form.value.name.trim()) {
    message.warning('Укажите наименование')
    return
  }

  const payload: ProductionCalendarDayPayload = {
    event_date: toLocalDateString(new Date(form.value.event_date)),
    day_type: form.value.day_type,
    name: form.value.name.trim(),
  }

  loading.value = true
  try {
    await saveProductionCalendarDay(payload, editingId.value)
    modalOpen.value = false
    selectedYear.value = Number(payload.event_date.slice(0, 4))
    await loadDays()
    message.success('Производственный календарь обновлён')
  } catch (error) {
    message.error(error instanceof Error ? error.message : 'Не удалось сохранить дату')
  } finally {
    loading.value = false
  }
}

async function removeDay(id: number) {
  try {
    await deleteProductionCalendarDay(id)
    await loadDays()
    message.success('Дата удалена')
  } catch (error) {
    message.error(error instanceof Error ? error.message : 'Не удалось удалить дату')
  }
}

watch(selectedYear, year => loadSetting(year))
onMounted(() => Promise.all([loadDays(), loadMetrics(), loadSetting(selectedYear.value)]))
</script>

<template>
  <DashboardLayout>
    <div class="page-heading">
      <div>
        <n-h2 class="!m-0">Нормирование работы тренеров</n-h2>
        <n-text depth="3">Производственный календарь и исходные данные для расчётов</n-text>
      </div>
      <NSelect v-model:value="selectedYear" :options="yearOptions" class="year-select" />
    </div>

    <n-alert type="info" class="mb-4">
      Даты действуют для всех тренеров. Праздничные дни выделяются красным, рабочие субботы — жёлтым в календаре и на диаграмме Ганта.
    </n-alert>

    <div class="summary-grid metrics-grid">
      <NCard size="small">
        <n-statistic label="Всего рабочих дней" :value="workingDayCount" />
      </NCard>
      <NCard size="small">
        <n-statistic label="Всего рабочих недель" :value="formatNumber(workingWeekCount)" />
      </NCard>
      <NCard size="small">
        <n-statistic label="Всего тренинг-дней" :value="formatNumber(trainingDayCount)" />
        <n-text depth="3" class="metric-note">{{ trainerCount }} тренеров</n-text>
      </NCard>
      <NCard size="small">
        <n-statistic label="Всего программ в заявочной" :value="applicationProgramCount" />
      </NCard>
    </div>

    <NCard size="small" class="norm-card">
      <div class="norm-setting">
        <div>
          <n-text strong>Тренинг-дней на одного тренера в неделю</n-text>
          <div><n-text depth="3">Используется для расчёта общей ёмкости команды</n-text></div>
        </div>
        <div class="norm-setting-control">
          <NInputNumber
            v-model:value="trainingDaysPerTrainerWeek"
            :min="0"
            :max="7"
            :step="0.5"
            :precision="1"
            :disabled="settingsLoading"
            class="norm-input"
          />
          <NButton type="primary" :loading="settingsLoading" @click="saveSetting">Сохранить</NButton>
        </div>
      </div>
    </NCard>

    <NCollapse v-model:expanded-names="calendarExpandedNames" class="calendar-collapse">
      <NCollapseItem name="calendar">
        <template #header>
          <div>
            <n-h3 class="!m-0">Производственный календарь</n-h3>
            <n-text depth="3">
              {{ holidayCount }} нерабочих дней · {{ workingSaturdayCount }} рабочих суббот
            </n-text>
          </div>
        </template>
        <template #header-extra>
          <n-text depth="3">{{ calendarExpanded ? 'Скрыть' : 'Показать' }}</n-text>
        </template>
        <div class="calendar-content" @click.stop>
          <div class="table-toolbar">
            <n-text depth="3">Даты можно редактировать, удалять и добавлять</n-text>
            <div class="heading-actions">
              <NButton @click="openCreate('working_saturday')">Добавить рабочую субботу</NButton>
              <NButton type="primary" @click="openCreate('holiday')">Добавить праздничный день</NButton>
            </div>
          </div>
          <NDataTable
            :columns="columns"
            :data="filteredDays"
            :loading="loading"
            :bordered="false"
            :pagination="{ pageSize: 25 }"
          />
        </div>
      </NCollapseItem>
    </NCollapse>

    <NModal
      v-model:show="modalOpen"
      preset="card"
      :title="editingId ? 'Изменить особый день' : 'Добавить особый день'"
      class="day-modal"
    >
      <NForm label-placement="top">
        <NFormItem label="Дата" required>
          <NDatePicker
            v-model:value="form.event_date"
            type="date"
            format="dd.MM.yyyy"
            :clearable="false"
            class="w-full"
          />
        </NFormItem>
        <NFormItem label="Тип дня" required>
          <NSelect v-model:value="form.day_type" :options="dayTypeOptions" />
        </NFormItem>
        <NFormItem label="Наименование" required>
          <NInput v-model:value="form.name" placeholder="Например, День России" @keyup.enter="submit" />
        </NFormItem>
        <div class="modal-actions">
          <NButton @click="modalOpen = false">Отмена</NButton>
          <NButton type="primary" :loading="loading" @click="submit">Сохранить</NButton>
        </div>
      </NForm>
    </NModal>
  </DashboardLayout>
</template>

<style scoped>
.page-heading,.heading-actions,.table-toolbar,.modal-actions,.table-actions { display:flex; align-items:center; gap:12px }
.page-heading,.table-toolbar { justify-content:space-between }
.page-heading { margin-bottom:16px }
.summary-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:16px; margin-bottom:16px }
.norm-card { margin-bottom:16px; border-radius:12px }
.norm-setting,.norm-setting-control { display:flex; align-items:center; justify-content:space-between; gap:12px }
.norm-input { width:120px }
.metric-note { display:block; margin-top:4px }
.calendar-collapse { padding:16px 20px; border:1px solid var(--n-border-color); border-radius:12px; background:var(--n-color) }
.calendar-content { padding-top:16px }
.table-toolbar { margin-bottom:16px }
.year-select { width:120px }
.modal-actions,.table-actions { justify-content:flex-end }
.day-modal { width:min(560px,92vw) }
@media (max-width:700px) {
  .page-heading,.heading-actions,.table-toolbar { align-items:stretch; flex-direction:column }
  .summary-grid { grid-template-columns:1fr }
  .year-select { width:100% }
  .norm-setting,.norm-setting-control { align-items:stretch; flex-direction:column }
  .norm-input { width:100% }
}
</style>
