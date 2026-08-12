<script setup lang="ts">
import { ref, onMounted, h, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { DashboardLayout } from '../widgets/dashboard-layout'
import { useMessage, NButton, NSpace, NPopconfirm, NTag, type DataTableColumns } from 'naive-ui'
import { Pencil as EditIcon, Trash as DeleteIcon, Add as AddIcon } from '@vicons/ionicons5'
import {
  deleteDictionaryRecord,
  listDictionary,
  saveDictionaryRecord,
  type DictionaryPayload,
  type DictionaryRecord,
  type DictionaryTable,
} from '../entities/dictionary'

const props = withDefaults(defineProps<{
  projectsOnly?: boolean
  trainersOnly?: boolean
}>(), {
  projectsOnly: false,
  trainersOnly: false,
})

const message = useMessage()
const router = useRouter()
const showModal = ref(false)
const routeTab = () => (
  props.projectsOnly
    ? 'project_names'
    : props.trainersOnly
      ? 'trainers'
      : 'roles'
)
const activeTab = ref(routeTab())
const items = ref<DictionaryRecord[]>([])
const projectTypeNames = ref<Record<number, string>>({})
const projectSearch = ref('')
const visibleProjectStatuses = ref<string[]>([])
const loading = ref(false)
let loadRequestId = 0

const projectStatusLabels: Record<string, string> = {
  under_review: 'На рассмотрении',
  in_development: 'В разработке',
  needs_update: 'Требует актуализации',
  current: 'Актуален',
  archived: 'Архив',
}
const projectStatusOptions = Object.entries(projectStatusLabels).map(([value, label]) => ({
  value,
  label,
}))
visibleProjectStatuses.value = projectStatusOptions.map(option => option.value)

// Data states
const editingId = ref<number | null>(null)
const formData = ref({
  name: '',
  full_name: '',
  description: '',
  weight: 1.0,
  is_active: true,
})

// Helpers
const textCollator = new Intl.Collator('ru-RU', {
  numeric: true,
  sensitivity: 'base',
})

function compareText(left: unknown, right: unknown) {
  const leftText = String(left ?? '').trim()
  const rightText = String(right ?? '').trim()
  if (!leftText && rightText) return 1
  if (leftText && !rightText) return -1
  return textCollator.compare(leftText, rightText)
}

function idCol() {
  return {
    title: 'ID',
    key: 'id',
    width: 60,
    sorter: (a: any, b: any) => Number(a.id) - Number(b.id),
  }
}

function textCol(title: string, key: string) {
  return {
    title,
    key,
    sorter: (a: any, b: any) => compareText(a[key], b[key]),
  }
}

function makeActions(handleEdit: any, handleDelete: any, deleteMsg = 'Удалить эту запись?') {
  return {
    title: 'Действия',
    key: 'actions',
    width: 120,
    render(row: any) {
      return h(NSpace, null, {
        default: () => [
          h(NButton, { size: 'small', onClick: () => handleEdit(row) }, { icon: () => h(EditIcon) }),
          h(NPopconfirm, { onPositiveClick: () => handleDelete(row.id) }, {
            trigger: () => h(NButton, { size: 'small', type: 'error' }, { icon: () => h(DeleteIcon) }),
            default: () => deleteMsg
          })
        ]
      })
    }
  }
}

function weightCol() {
  return {
    title: 'Вес',
    key: 'weight',
    width: 80,
    sorter: (a: any, b: any) => Number(a.weight ?? 0) - Number(b.weight ?? 0),
    render: (row: any) => row.weight ?? '—'
  }
}

function activeCol() {
  return {
    title: 'Активен',
    key: 'is_active',
    width: 90,
    sorter: (a: any, b: any) => Number(Boolean(a.is_active)) - Number(Boolean(b.is_active)),
    render: (row: any) => h(NTag, {
      type: row.is_active ? 'success' : 'default',
      size: 'small',
      bordered: false
    }, { default: () => row.is_active ? 'Да' : 'Нет' })
  }
}

// Configuration for each dictionary
const dictConfigs: Record<string, any> = {
  trainers: {
    title: 'Тренеры',
    table: 'trainers',
    labelField: 'full_name',
    hasWeight: false,
    hasDescription: false,
    hasActive: false,
    columns: (handleEdit: any, handleDelete: any): DataTableColumns<any> => [
      idCol(),
      textCol('ФИО', 'full_name'),
      makeActions(handleEdit, handleDelete, 'Удалить этого тренера?')
    ]
  },
  roles: {
    title: 'Роли',
    table: 'roles',
    labelField: 'name',
    hasWeight: true,
    hasDescription: false,
    hasActive: false,
    columns: (handleEdit: any, handleDelete: any): DataTableColumns<any> => [
      idCol(),
      textCol('Название', 'name'),
      weightCol(),
      makeActions(handleEdit, handleDelete, 'Удалить эту роль?')
    ]
  },
  project_types: {
    title: 'Типы проектов',
    table: 'project_types',
    labelField: 'name',
    hasWeight: true,
    hasDescription: false,
    hasActive: false,
    columns: (handleEdit: any, handleDelete: any): DataTableColumns<any> => [
      idCol(),
      textCol('Тип', 'name'),
      weightCol(),
      makeActions(handleEdit, handleDelete, 'Удалить этот тип?')
    ]
  },
  project_names: {
    title: 'Проекты',
    table: 'project_names',
    labelField: 'name',
    hasWeight: true,
    hasDescription: false,
    hasActive: false,
    columns: (handleEdit: any, handleDelete: any): DataTableColumns<any> => [
      {
        title: '№',
        key: 'row_number',
        width: 60,
        render: (_row: any, index: number) => index + 1,
      },
      textCol('Проект', 'name'),
      {
        title: 'Индекс',
        key: 'audit_index',
        sorter: (a: any, b: any) => compareText(a.audit_index, b.audit_index),
        render: (row: any) => row.audit_index || '—',
      },
      {
        title: 'Статус',
        key: 'status_code',
        sorter: (a: any, b: any) => compareText(
          projectStatusLabels[a.status_code] || a.status_code,
          projectStatusLabels[b.status_code] || b.status_code,
        ),
        render: (row: any) => projectStatusLabels[row.status_code] || row.status_code || '—',
      },
      {
        title: 'Тип',
        key: 'project_type_id',
        sorter: (a: any, b: any) => compareText(
          projectTypeNames.value[a.project_type_id],
          projectTypeNames.value[b.project_type_id],
        ),
        render: (row: any) => projectTypeNames.value[row.project_type_id] || '—',
      },
      weightCol(),
      makeActions(handleEdit, handleDelete, 'Удалить этот проект?')
    ]
  },
  cities: {
    title: 'Города',
    table: 'cities',
    labelField: 'name',
    hasWeight: false,
    hasDescription: false,
    hasActive: true,
    columns: (handleEdit: any, handleDelete: any): DataTableColumns<any> => [
      idCol(),
      textCol('Город', 'name'),
      activeCol(),
      makeActions(handleEdit, handleDelete)
    ]
  },
  divisions: {
    title: 'Подразделения',
    table: 'divisions',
    labelField: 'name',
    hasWeight: false,
    hasDescription: false,
    hasActive: true,
    columns: (handleEdit: any, handleDelete: any): DataTableColumns<any> => [
      idCol(),
      textCol('Подразделение', 'name'),
      activeCol(),
      makeActions(handleEdit, handleDelete)
    ]
  },
  directions: {
    title: 'Направления',
    table: 'directions',
    labelField: 'name',
    hasWeight: false,
    hasDescription: true,
    hasActive: true,
    columns: (handleEdit: any, handleDelete: any): DataTableColumns<any> => [
      idCol(),
      textCol('Направление', 'name'),
      { ...textCol('Описание', 'description'), ellipsis: { tooltip: true } },
      activeCol(),
      makeActions(handleEdit, handleDelete)
    ]
  },
  annual_budget_items: {
    title: 'Бюджет года',
    table: 'annual_budget_items',
    labelField: 'name',
    hasWeight: false,
    hasDescription: false,
    hasActive: true,
    columns: (handleEdit: any, handleDelete: any): DataTableColumns<any> => [
      idCol(),
      textCol('Строка бюджета', 'name'),
      activeCol(),
      makeActions(handleEdit, handleDelete)
    ]
  },
  activity_types: {
    title: 'Типы активностей',
    table: 'activity_types',
    labelField: 'name',
    hasWeight: true,
    hasDescription: true,
    hasActive: true,
    columns: (handleEdit: any, handleDelete: any): DataTableColumns<any> => [
      idCol(),
      textCol('Название', 'name'),
      { ...textCol('Описание', 'description'), ellipsis: { tooltip: true } },
      weightCol(),
      activeCol(),
      makeActions(handleEdit, handleDelete)
    ]
  },
  delivery_formats: {
    title: 'Форматы выполнения',
    table: 'delivery_formats',
    labelField: 'name',
    hasWeight: true,
    hasDescription: true,
    hasActive: true,
    columns: (handleEdit: any, handleDelete: any): DataTableColumns<any> => [
      idCol(),
      textCol('Название', 'name'),
      { ...textCol('Описание', 'description'), ellipsis: { tooltip: true } },
      weightCol(),
      activeCol(),
      makeActions(handleEdit, handleDelete)
    ]
  },
  recurrence_types: {
    title: 'Периодичность',
    table: 'recurrence_types',
    labelField: 'name',
    hasWeight: true,
    hasDescription: true,
    hasActive: true,
    columns: (handleEdit: any, handleDelete: any): DataTableColumns<any> => [
      idCol(),
      textCol('Название', 'name'),
      { ...textCol('Описание', 'description'), ellipsis: { tooltip: true } },
      weightCol(),
      activeCol(),
      makeActions(handleEdit, handleDelete)
    ]
  }
}

const currentConfig = computed(() => dictConfigs[activeTab.value])
const visibleDictConfigs = computed(() => {
  if (props.projectsOnly) {
    return { project_names: dictConfigs.project_names }
  }
  if (props.trainersOnly) {
    return { trainers: dictConfigs.trainers }
  }
  return Object.fromEntries(
    Object.entries(dictConfigs).filter(([key]) => (
      key !== 'project_names' && key !== 'trainers'
    )),
  )
})
const projectStatusCounts = computed<Record<string, number>>(() => {
  const counts = Object.fromEntries(
    projectStatusOptions.map(option => [option.value, 0]),
  ) as Record<string, number>

  for (const item of items.value) {
    if (item.status_code && item.status_code in counts) {
      counts[item.status_code] += 1
    }
  }
  return counts
})
const projectFiltersActive = computed(() => (
  Boolean(projectSearch.value.trim())
  || visibleProjectStatuses.value.length !== projectStatusOptions.length
))
const filteredItems = computed(() => {
  if (activeTab.value !== 'project_names') return items.value

  const query = projectSearch.value.trim().toLocaleLowerCase('ru-RU')
  return items.value.filter((item) => {
    if (!item.status_code || !visibleProjectStatuses.value.includes(item.status_code)) {
      return false
    }
    if (!query) return true

    const projectType = item.project_type_id
      ? projectTypeNames.value[item.project_type_id]
      : ''
    const status = item.status_code
      ? projectStatusLabels[item.status_code] || item.status_code
      : ''
    return [item.id, item.name, item.audit_index, projectType, status]
      .some(value => String(value ?? '').toLocaleLowerCase('ru-RU').includes(query))
  })
})

function dictionaryErrorMessage(error: unknown) {
  const value = error as { code?: string; message?: string }
  if (value?.code === 'PGRST205') {
    return 'Схема базы данных не соответствует версии приложения. Обратитесь к администратору.'
  }
  return error instanceof Error ? error.message : 'неизвестная ошибка'
}

async function loadData(tab?: string) {
  const requestedTab = typeof tab === 'string' ? tab : activeTab.value
  const config = dictConfigs[requestedTab]
  if (!config) return

  const requestId = ++loadRequestId
  loading.value = true
  items.value = []
  try {
    const [rows, projectTypes] = await Promise.all([
      listDictionary(config.table as DictionaryTable),
      requestedTab === 'project_names'
        ? listDictionary('project_types')
        : Promise.resolve([]),
    ])
    if (requestedTab === 'project_names') {
      projectTypeNames.value = Object.fromEntries(projectTypes.map(item => [item.id, item.name || '—']))
    }
    if (requestId === loadRequestId) items.value = rows
  } catch (error: unknown) {
    if (requestId === loadRequestId) {
      items.value = []
      message.error('Ошибка загрузки: ' + dictionaryErrorMessage(error))
    }
  } finally {
    if (requestId === loadRequestId) loading.value = false
  }
}

function handleTabChange(tab: string) {
  projectSearch.value = ''
  loadData(tab)
}

watch(
  [() => props.projectsOnly, () => props.trainersOnly],
  () => {
    const nextTab = routeTab()
    if (activeTab.value === nextTab) return

    activeTab.value = nextTab
    resetProjectFilters()
    loadData(nextTab)
  },
)

function resetProjectFilters() {
  projectSearch.value = ''
  visibleProjectStatuses.value = projectStatusOptions.map(option => option.value)
}

function handleEdit(row: any) {
  if (activeTab.value === 'trainers') {
    router.push(`/admin/trainers/${row.id}/edit`)
    return
  }
  if (activeTab.value === 'project_names') {
    router.push(`/admin/projects/${row.id}/edit`)
    return
  }
  editingId.value = row.id
  const config = dictConfigs[activeTab.value]
  formData.value.name = row[config.labelField] || ''
  formData.value.full_name = row.full_name || ''
  formData.value.description = row.description || ''
  formData.value.weight = row.weight ?? 1.0
  formData.value.is_active = row.is_active ?? true
  showModal.value = true
}

async function handleDelete(id: number) {
  try {
    await deleteDictionaryRecord(currentConfig.value.table as DictionaryTable, id)
    message.success('Запись удалена')
    await loadData()
  } catch {
    message.error('Нельзя удалить: запись, возможно, используется в задачах')
  }
}

async function handleSave() {
  const config = dictConfigs[activeTab.value]
  const nameValue = config.labelField === 'full_name' ? formData.value.full_name : formData.value.name
  if (!nameValue.trim()) {
    message.warning('Заполните название')
    return
  }

  const payload: DictionaryPayload = {}
  payload[config.labelField] = nameValue

  if (config.hasDescription) payload.description = formData.value.description
  if (config.hasWeight) payload.weight = formData.value.weight
  if (config.hasActive) payload.is_active = formData.value.is_active

  loading.value = true
  try {
    await saveDictionaryRecord(
      currentConfig.value.table as DictionaryTable,
      payload,
      editingId.value,
    )
    message.success('Успешно сохранено')
    showModal.value = false
    await loadData()
  } catch (error: unknown) {
    message.error('Ошибка сохранения: ' + (error instanceof Error ? error.message : 'неизвестная ошибка'))
  } finally {
    loading.value = false
  }
}

function openAddModal() {
  if (activeTab.value === 'trainers') {
    router.push('/admin/trainers/new')
    return
  }
  if (activeTab.value === 'project_names') {
    router.push('/admin/projects/new')
    return
  }
  editingId.value = null
  formData.value = { name: '', full_name: '', description: '', weight: 1.0, is_active: true }
  showModal.value = true
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <DashboardLayout>
    <div class="mb-6">
      <n-h2 class="!m-0">
        {{ projectsOnly ? 'Проекты' : trainersOnly ? 'Тренеры' : 'Управление словарями' }}
      </n-h2>
      <n-text depth="3">
        {{ projectsOnly
          ? 'Управление карточками проектов'
          : trainersOnly
            ? 'Управление карточками тренеров'
            : 'Редактирование справочных данных системы' }}
      </n-text>
    </div>

    <n-card>
      <n-tabs
        v-model:value="activeTab"
        type="line"
        :class="{ 'single-section-tabs': projectsOnly || trainersOnly }"
        @update:value="handleTabChange"
      >
        <n-tab-pane v-for="(config, key) in visibleDictConfigs" :key="key" :name="key" :tab="config.title">
          <div class="flex items-center justify-between gap-4 mb-4">
            <div v-if="key === 'project_names'" class="flex flex-wrap items-center gap-4 flex-1">
              <n-input
                v-model:value="projectSearch"
                clearable
                placeholder="Поиск по названию, индексу, статусу или типу"
                style="max-width: 440px"
              />
              <div class="flex flex-wrap items-center gap-3">
                <n-text depth="3">Показывать статусы:</n-text>
                <n-checkbox-group v-model:value="visibleProjectStatuses">
                  <n-space wrap>
                    <n-checkbox
                      v-for="option in projectStatusOptions"
                      :key="option.value"
                      :value="option.value"
                      :label="`${option.label} (${projectStatusCounts[option.value] ?? 0})`"
                    />
                  </n-space>
                </n-checkbox-group>
              </div>
            </div>
            <div v-else />
            <n-button type="primary" @click="openAddModal">
              <template #icon><n-icon><AddIcon /></n-icon></template>
              Добавить запись
            </n-button>
          </div>

          <n-data-table
            :columns="config.columns(handleEdit, handleDelete)"
            :data="filteredItems"
            :loading="loading"
            :bordered="false"
            size="small"
          >
            <template #empty>
              <n-empty
                :description="activeTab === 'project_names' && projectFiltersActive
                  ? 'Проекты не найдены'
                  : 'Записей пока нет'"
              >
                <template #extra>
                  <n-button
                    v-if="activeTab === 'project_names' && projectFiltersActive"
                    size="small"
                    @click="resetProjectFilters"
                  >
                    Сбросить фильтры
                  </n-button>
                  <n-button v-else size="small" type="primary" @click="openAddModal">
                    Добавить первую запись
                  </n-button>
                </template>
              </n-empty>
            </template>
          </n-data-table>
        </n-tab-pane>
      </n-tabs>
    </n-card>

    <!-- Modal -->
    <n-modal
      v-model:show="showModal"
      preset="card"
      :title="editingId ? 'Редактировать' : 'Добавить'"
      class="max-w-lg"
    >
      <n-form label-placement="top">
        <!-- ФИО для тренеров -->
        <n-form-item v-if="currentConfig.labelField === 'full_name'" label="ФИО" required>
          <n-input v-model:value="formData.full_name" placeholder="Фамилия Имя Отчество" @keyup.enter="handleSave" />
        </n-form-item>

        <!-- Название для всех остальных -->
        <n-form-item v-else label="Название" required>
          <n-input v-model:value="formData.name" placeholder="Введите значение..." @keyup.enter="handleSave" />
        </n-form-item>

        <!-- Описание (только для словарей с hasDescription) -->
        <n-form-item v-if="currentConfig.hasDescription" label="Описание">
          <n-input
            v-model:value="formData.description"
            type="textarea"
            :rows="2"
            placeholder="Краткое описание значения..."
          />
        </n-form-item>

        <!-- Вес (только для словарей с весом) -->
        <n-form-item v-if="currentConfig.hasWeight" label="Вес (коэффициент нагрузки)">
          <n-input-number
            v-model:value="formData.weight"
            :min="0.1"
            :max="10"
            :step="0.1"
            :precision="1"
            style="width: 100%"
          />
          <template #feedback>
            <n-text depth="3" style="font-size: 12px">
              Используется для расчёта взвешенного индекса нагрузки тренера
            </n-text>
          </template>
        </n-form-item>

        <!-- Активен (только для словарей с активностью) -->
        <n-form-item v-if="currentConfig.hasActive" label="Активен (виден тренерам в форме)">
          <n-switch v-model:value="formData.is_active" />
        </n-form-item>

        <div class="flex justify-end gap-2 mt-4">
          <n-button @click="showModal = false">Отмена</n-button>
          <n-button type="primary" :loading="loading" @click="handleSave">Сохранить</n-button>
        </div>
      </n-form>
    </n-modal>
  </DashboardLayout>
</template>

<style scoped>
.single-section-tabs :deep(.n-tabs-nav) {
  display: none;
}

.single-section-tabs :deep(.n-tab-pane) {
  padding-top: 0;
}
</style>
