<script setup lang="ts">
import { ref, onMounted, h } from 'vue'
import DashboardLayout from '../layouts/DashboardLayout.vue'
import { supabase } from '../supabase'
import { useMessage, NButton, NSpace, NPopconfirm } from 'naive-ui'
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
  description: '' // specifically for project_names or general
})

// Configuration for each dictionary
const dictConfigs: Record<string, any> = {
  trainers: {
    title: 'Тренеры',
    table: 'trainers',
    labelField: 'full_name',
    columns: (handleEdit: any, handleDelete: any) => [
      { title: 'ID', key: 'id', width: 80 },
      { title: 'ФИО', key: 'full_name', sorter: 'default' },
      {
        title: 'Действия',
        key: 'actions',
        width: 150,
        render(row: any) {
          return h(NSpace, null, {
            default: () => [
              h(NButton, { size: 'small', onClick: () => handleEdit(row) }, { icon: () => h(EditIcon) }),
              h(NPopconfirm, { onPositiveClick: () => handleDelete(row.id) }, {
                trigger: () => h(NButton, { size: 'small', type: 'error' }, { icon: () => h(DeleteIcon) }),
                default: () => 'Удалить эту запись?'
              })
            ]
          })
        }
      }
    ]
  },
  roles: {
    title: 'Роли',
    table: 'roles',
    labelField: 'name',
    columns: (handleEdit: any, handleDelete: any) => [
      { title: 'ID', key: 'id', width: 80 },
      { title: 'Название', key: 'name', sorter: 'default' },
      {
        title: 'Действия',
        key: 'actions',
        width: 150,
        render(row: any) {
          return h(NSpace, null, {
            default: () => [
              h(NButton, { size: 'small', onClick: () => handleEdit(row) }, { icon: () => h(EditIcon) }),
              h(NPopconfirm, { onPositiveClick: () => handleDelete(row.id) }, {
                trigger: () => h(NButton, { size: 'small', type: 'error' }, { icon: () => h(DeleteIcon) }),
                default: () => 'Удалить эту роль?'
              })
            ]
          })
        }
      }
    ]
  },
  project_types: {
    title: 'Типы проектов',
    table: 'project_types',
    labelField: 'name',
    columns: (handleEdit: any, handleDelete: any) => [
      { title: 'ID', key: 'id', width: 80 },
      { title: 'Тип', key: 'name', sorter: 'default' },
      {
        title: 'Действия',
        key: 'actions',
        width: 150,
        render(row: any) {
          return h(NSpace, null, {
            default: () => [
              h(NButton, { size: 'small', onClick: () => handleEdit(row) }, { icon: () => h(EditIcon) }),
              h(NPopconfirm, { onPositiveClick: () => handleDelete(row.id) }, {
                trigger: () => h(NButton, { size: 'small', type: 'error' }, { icon: () => h(DeleteIcon) }),
                default: () => 'Удалить этот тип?'
              })
            ]
          })
        }
      }
    ]
  },
  project_names: {
    title: 'Проекты',
    table: 'project_names',
    labelField: 'name',
    columns: (handleEdit: any, handleDelete: any) => [
      { title: 'ID', key: 'id', width: 80 },
      { title: 'Проект', key: 'name', sorter: 'default' },
      {
        title: 'Действия',
        key: 'actions',
        width: 150,
        render(row: any) {
          return h(NSpace, null, {
            default: () => [
              h(NButton, { size: 'small', onClick: () => handleEdit(row) }, { icon: () => h(EditIcon) }),
              h(NPopconfirm, { onPositiveClick: () => handleDelete(row.id) }, {
                trigger: () => h(NButton, { size: 'small', type: 'error' }, { icon: () => h(DeleteIcon) }),
                default: () => 'Удалить этот проект?'
              })
            ]
          })
        }
      }
    ]
  }
}

async function loadData() {
  loading.value = true
  const config = dictConfigs[activeTab.value]
  const { data, error } = await supabase
    .from(config.table)
    .select('*')
    .order('id', { ascending: false })
  
  if (error) message.error('Ошибка загрузки: ' + error.message)
  else items.value = data || []
  loading.value = false
}

function handleEdit(row: any) {
  editingId.value = row.id
  const config = dictConfigs[activeTab.value]
  formData.value.name = row[config.labelField]
  showModal.value = true
}

async function handleDelete(id: number) {
  const config = dictConfigs[activeTab.value]
  const { error } = await supabase.from(config.table).delete().eq('id', id)
  if (error) message.error('Нельзя удалить: возможно запись используется в задачах')
  else {
    message.success('Удалено')
    await loadData()
  }
}

async function handleSave() {
  if (!formData.value.name.trim()) return
  
  loading.value = true
  const config = dictConfigs[activeTab.value]
  const payload: any = {}
  payload[config.labelField] = formData.value.name

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
  formData.value.name = ''
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

    <n-modal v-model:show="showModal" preset="card" :title="editingId ? 'Редактировать' : 'Добавить'" class="max-w-md">
      <n-form-item label="Наименование" required>
        <n-input v-model:value="formData.name" placeholder="Введите значение..." @keyup.enter="handleSave" />
      </n-form-item>
      <div class="flex justify-end gap-2 mt-4">
        <n-button @click="showModal = false">Отмена</n-button>
        <n-button type="primary" :loading="loading" @click="handleSave">Сохранить</n-button>
      </div>
    </n-modal>
  </DashboardLayout>
</template>
