<script setup lang="ts">
import { ref, onMounted, h, computed } from 'vue'
import DashboardLayout from '../layouts/DashboardLayout.vue'
import { supabase } from '../supabase'
import { useMessage, NButton, NSpace, NPopconfirm, NTag, type DataTableColumns } from 'naive-ui'
import { Pencil as EditIcon, Trash as DeleteIcon, Add as AddIcon } from '@vicons/ionicons5'

const message = useMessage()
const loading = ref(false)
const showModal = ref(false)
const activeTab = ref('trainers')

// Data states
const items = ref<any[]>([])
const editingId = ref<number | null>(null)
const formData = ref({
  name: '',
  full_name: '',
  description: '',
  weight: 1.0,
  is_active: true,
})

// Helpers
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
    sorter: (a: any, b: any) => a.weight - b.weight,
    render: (row: any) => String(row.weight)
  }
}

function activeCol() {
  return {
    title: 'Активен',
    key: 'is_active',
    width: 90,
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
      { title: 'ID', key: 'id', width: 60 },
      { title: 'ФИО', key: 'full_name', sorter: true },
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
      { title: 'ID', key: 'id', width: 60 },
      { title: 'Название', key: 'name', sorter: true },
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
      { title: 'ID', key: 'id', width: 60 },
      { title: 'Тип', key: 'name', sorter: true },
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
      { title: 'ID', key: 'id', width: 60 },
      { title: 'Проект', key: 'name', sorter: true },
      weightCol(),
      makeActions(handleEdit, handleDelete, 'Удалить этот проект?')
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
      { title: 'ID', key: 'id', width: 60 },
      { title: 'Название', key: 'name', sorter: true },
      { title: 'Описание', key: 'description', ellipsis: { tooltip: true } },
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
      { title: 'ID', key: 'id', width: 60 },
      { title: 'Название', key: 'name', sorter: true },
      { title: 'Описание', key: 'description', ellipsis: { tooltip: true } },
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
      { title: 'ID', key: 'id', width: 60 },
      { title: 'Название', key: 'name', sorter: true },
      { title: 'Описание', key: 'description', ellipsis: { tooltip: true } },
      weightCol(),
      activeCol(),
      makeActions(handleEdit, handleDelete)
    ]
  }
}

const currentConfig = computed(() => dictConfigs[activeTab.value])

async function loadData() {
  loading.value = true
  const config = dictConfigs[activeTab.value]
  const { data, error } = await supabase
    .from(config.table)
    .select('*')
    .order('id', { ascending: true })
  
  if (error) message.error('Ошибка загрузки: ' + error.message)
  else items.value = data || []
  loading.value = false
}

function handleEdit(row: any) {
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
  const config = dictConfigs[activeTab.value]
  const { error } = await supabase.from(config.table).delete().eq('id', id)
  if (error) message.error('Нельзя удалить: запись, возможно, используется в задачах')
  else {
    message.success('Удалено')
    await loadData()
  }
}

async function handleSave() {
  const config = dictConfigs[activeTab.value]
  const nameValue = config.labelField === 'full_name' ? formData.value.full_name : formData.value.name
  if (!nameValue.trim()) {
    message.warning('Заполните название')
    return
  }

  loading.value = true
  const payload: any = {}
  payload[config.labelField] = nameValue

  if (config.hasDescription) payload.description = formData.value.description
  if (config.hasWeight) payload.weight = formData.value.weight
  if (config.hasActive) payload.is_active = formData.value.is_active

  let error
  if (editingId.value) {
    const res = await supabase.from(config.table).update(payload).eq('id', editingId.value)
    error = res.error
  } else {
    const res = await supabase.from(config.table).insert(payload)
    error = res.error
  }

  if (error) message.error('Ошибка сохранения: ' + error.message)
  else {
    message.success('Успешно сохранено')
    showModal.value = false
    await loadData()
  }
  loading.value = false
}

function openAddModal() {
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
      <n-h2 class="!m-0">Управление словарями</n-h2>
      <n-text depth="3">Редактирование справочных данных системы</n-text>
    </div>

    <n-card>
      <n-tabs type="line" v-model:value="activeTab" @update:value="loadData">
        <n-tab-pane v-for="(config, key) in dictConfigs" :key="key" :name="key" :tab="config.title">
          <div class="flex justify-end mb-4">
            <n-button type="primary" @click="openAddModal">
              <template #icon><n-icon><AddIcon /></n-icon></template>
              Добавить запись
            </n-button>
          </div>

          <n-data-table
            :columns="config.columns(handleEdit, handleDelete)"
            :data="items"
            :loading="loading"
            :bordered="false"
            size="small"
          />
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
