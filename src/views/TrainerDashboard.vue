<script setup lang="ts">
import { ref, onMounted, h, computed } from 'vue'
import DashboardLayout from '../layouts/DashboardLayout.vue'
import { useAuthStore } from '../stores/auth'
import { supabase } from '../supabase'
import { useMessage, NTag, NButton, NSpace, NPopconfirm, NIcon, NTooltip, type DataTableColumns } from 'naive-ui'
import { Add as AddIcon, ArrowBack as BackIcon, Pencil as EditIcon, Trash as DeleteIcon, CopyOutline as CopyIcon } from '@vicons/ionicons5'
import { useRouter } from 'vue-router'

const props = defineProps<{
  id?: string // Trainer ID passed from admin route
}>()

const authStore = useAuthStore()
const message = useMessage()
const router = useRouter()

const projects = ref<any[]>([])
const loading = ref(false)
const showModal = ref(false)
const editingId = ref<number | null>(null)

// Lookup data for selects
const projectTypes = ref<any[]>([])
const projectNames = ref<any[]>([])
const roles = ref<any[]>([])
const activityTypes = ref<any[]>([])
const deliveryFormats = ref<any[]>([])
const recurrenceTypes = ref<any[]>([])

// Determine if we are in admin-view mode
const isAdminViewing = computed(() => !!props.id && authStore.profile?.role === 'admin')
const targetTrainerId = computed(() => props.id ? parseInt(props.id) : authStore.profile?.id)
const trainerName = ref('')

const entryForm = ref({
  project_type_id: null as number | null,
  project_main_id: null as number | null,
  project_sub: '',
  role_id: null as number | null,
  activity_type_id: null as number | null,
  delivery_format_id: null as number | null,
  recurrence_type_id: null as number | null,
  task_desc: '',
  comments: ''
})

const columns: DataTableColumns<any> = [
  { 
    title: 'Тип проекта', 
    key: 'project_types.name',
    width: 180,
    render: (row: any) => row.project_types?.name || '-',
    sorter: (row1: any, row2: any) => (row1.project_types?.name || '').localeCompare(row2.project_types?.name || ''),
    resizable: true
  },
  { 
    title: 'Проект', 
    key: 'project_names.name',
    width: 220,
    render: (row: any) => row.project_names?.name || '-',
    sorter: (row1: any, row2: any) => (row1.project_names?.name || '').localeCompare(row2.project_names?.name || ''),
    resizable: true
  },
  { title: 'Подпроект', key: 'project_sub', width: 180, sorter: true, resizable: true, ellipsis: { tooltip: true } },
  { 
    title: 'Роль', 
    key: 'roles.name',
    width: 160,
    render: (row: any) => h(NTag, { type: 'info', bordered: false, size: 'small' }, { default: () => row.roles?.name || '-' }),
    sorter: (row1: any, row2: any) => (row1.roles?.name || '').localeCompare(row2.roles?.name || ''),
    resizable: true
  },
  { 
    title: 'Тип активности', 
    key: 'activity_types.name',
    width: 160,
    render: (row: any) => row.activity_types?.name
      ? h(NTag, { type: 'success', bordered: false, size: 'small' }, { default: () => row.activity_types.name })
      : '-',
    sorter: (row1: any, row2: any) => (row1.activity_types?.name || '').localeCompare(row2.activity_types?.name || ''),
    resizable: true
  },
  { 
    title: 'Формат', 
    key: 'delivery_formats.name',
    width: 160,
    render: (row: any) => row.delivery_formats?.name
      ? h(NTag, { type: 'warning', bordered: false, size: 'small' }, { default: () => row.delivery_formats.name })
      : '-',
    sorter: (row1: any, row2: any) => (row1.delivery_formats?.name || '').localeCompare(row2.delivery_formats?.name || ''),
    resizable: true
  },
  { 
    title: 'Периодичность', 
    key: 'recurrence_types.name',
    width: 140,
    render: (row: any) => row.recurrence_types?.name || '-',
    sorter: (row1: any, row2: any) => (row1.recurrence_types?.name || '').localeCompare(row2.recurrence_types?.name || ''),
    resizable: true
  },
  { 
    title: 'Описание задачи', 
    key: 'task_desc', 
    width: 260, 
    render: (row: any) => {
      const textNode = h('span', { style: 'white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; display: inline-block; vertical-align: middle;' }, row.task_desc || '');
      if (!row.is_duplicate) return textNode;
      return h(NSpace, { align: 'center', wrapItem: false, size: 'small', wrap: false }, {
        default: () => [
          h(NTooltip, null, {
            trigger: () => h(NTag, { type: 'warning', size: 'small' }, {
              icon: () => h(NIcon, null, { default: () => h(CopyIcon) }),
              default: () => 'Шаблон'
            }),
            default: () => 'Это дублированная запись. Внесите изменения, чтобы снять метку шаблона.'
          }),
          textNode
        ]
      })
    },
    sorter: true, 
    resizable: true 
  },
  {
    title: 'Действия',
    key: 'actions',
    width: 140,
    fixed: 'right',
    render(row: any) {
      return h(NSpace, { justify: 'center', wrapItem: false, wrap: false, size: 'small' }, {
        default: () => [
          h(NTooltip, null, {
            trigger: () => h(NButton, {
              size: 'small',
              circle: true,
              quaternary: true,
              onClick: () => handleDuplicate(row)
            }, { icon: () => h(NIcon, null, { default: () => h(CopyIcon) }) }),
            default: () => 'Дублировать запись'
          }),
          h(NButton, {
            size: 'small',
            circle: true,
            quaternary: true,
            onClick: () => handleEdit(row)
          }, { icon: () => h(NIcon, null, { default: () => h(EditIcon) }) }),
          h(NPopconfirm, {
            onPositiveClick: () => handleDelete(row.id)
          }, {
            trigger: () => h(NButton, {
              size: 'small',
              circle: true,
              quaternary: true,
              type: 'error'
            }, { icon: () => h(NIcon, null, { default: () => h(DeleteIcon) }) }),
            default: () => 'Удалить эту запись?'
          })
        ]
      })
    }
  }
]

async function fetchTrainerName() {
  if (props.id) {
    const { data } = await supabase.from('trainers').select('full_name').eq('id', props.id).single()
    if (data) trainerName.value = data.full_name
  }
}

async function loadLookupData() {
  const [typesRes, namesRes, rolesRes, actRes, fmtRes, recRes] = await Promise.all([
    supabase.from('project_types').select('id, name').order('name'),
    supabase.from('project_names').select('id, name').order('name'),
    supabase.from('roles').select('id, name').order('name'),
    supabase.from('activity_types').select('id, name').eq('is_active', true).order('name'),
    supabase.from('delivery_formats').select('id, name').eq('is_active', true).order('name'),
    supabase.from('recurrence_types').select('id, name').eq('is_active', true).order('name'),
  ])

  if (typesRes.data) projectTypes.value = typesRes.data.map(i => ({ label: i.name, value: i.id }))
  if (namesRes.data) projectNames.value = namesRes.data.map(i => ({ label: i.name, value: i.id }))
  if (rolesRes.data) roles.value = rolesRes.data.map(i => ({ label: i.name, value: i.id }))
  if (actRes.data) activityTypes.value = actRes.data.map(i => ({ label: i.name, value: i.id }))
  if (fmtRes.data) deliveryFormats.value = fmtRes.data.map(i => ({ label: i.name, value: i.id }))
  if (recRes.data) recurrenceTypes.value = recRes.data.map(i => ({ label: i.name, value: i.id }))
}

async function loadProjects() {
  if (!targetTrainerId.value) return
  loading.value = true
  
  const { data, error } = await supabase
    .from('trainer_projects')
    .select(`
      id,
      trainer_id,
      project_type_id,
      project_main_id,
      project_sub,
      role_id,
      activity_type_id,
      delivery_format_id,
      recurrence_type_id,
      is_duplicate,
      task_desc,
      comments,
      project_types (name),
      project_names (name),
      roles (name),
      activity_types (name),
      delivery_formats (name),
      recurrence_types (name)
    `)
    .eq('trainer_id', targetTrainerId.value)
    .order('id', { ascending: false })
  
  if (error) {
    console.error(error)
    message.error('Ошибка загрузки данных')
  } else {
    projects.value = data || []
  }
  loading.value = false
}

function handleEdit(row: any) {
  editingId.value = row.id
  entryForm.value = {
    project_type_id: row.project_type_id,
    project_main_id: row.project_main_id,
    project_sub: row.project_sub || '',
    role_id: row.role_id,
    activity_type_id: row.activity_type_id ?? null,
    delivery_format_id: row.delivery_format_id ?? null,
    recurrence_type_id: row.recurrence_type_id ?? null,
    task_desc: row.task_desc || '',
    comments: row.comments || ''
  }
  showModal.value = true
}

async function handleDuplicate(row: any) {
  loading.value = true
  const payload = {
    trainer_id: targetTrainerId.value,
    project_type_id: row.project_type_id,
    project_main_id: row.project_main_id,
    project_sub: row.project_sub,
    role_id: row.role_id,
    activity_type_id: row.activity_type_id,
    delivery_format_id: row.delivery_format_id,
    recurrence_type_id: row.recurrence_type_id,
    task_desc: row.task_desc,
    comments: row.comments,
    is_duplicate: true
  }

  const { error } = await supabase.from('trainer_projects').insert(payload)
  
  if (error) {
    message.error('Ошибка дублирования: ' + error.message)
  } else {
    message.success('Запись продублирована как шаблон')
    await loadProjects()
  }
  loading.value = false
}

async function handleDelete(id: number) {
  const { error } = await supabase.from('trainer_projects').delete().eq('id', id)
  if (error) {
    message.error('Ошибка удаления: ' + error.message)
  } else {
    message.success('Запись удалена')
    await loadProjects()
  }
}

async function saveEntry() {
  if (!entryForm.value.project_type_id || !entryForm.value.project_main_id || !entryForm.value.role_id) {
    message.warning('Пожалуйста, заполните обязательные поля (Тип, Проект, Роль)')
    return
  }
  
  loading.value = true
  const payload = {
    trainer_id: targetTrainerId.value,
    project_type_id: entryForm.value.project_type_id,
    project_main_id: entryForm.value.project_main_id,
    project_sub: entryForm.value.project_sub,
    role_id: entryForm.value.role_id,
    activity_type_id: entryForm.value.activity_type_id,
    delivery_format_id: entryForm.value.delivery_format_id,
    recurrence_type_id: entryForm.value.recurrence_type_id,
    task_desc: entryForm.value.task_desc,
    comments: entryForm.value.comments,
    is_duplicate: false
  }

  let result
  if (editingId.value) {
    result = await supabase.from('trainer_projects').update(payload).eq('id', editingId.value)
  } else {
    result = await supabase.from('trainer_projects').insert(payload)
  }
  
  if (result.error) {
    message.error('Ошибка сохранения: ' + result.error.message)
  } else {
    message.success(editingId.value ? 'Запись обновлена' : 'Данные сохранены')
    closeModal()
    await loadProjects()
  }
  loading.value = false
}

function openAddModal() {
  editingId.value = null
  entryForm.value = {
    project_type_id: null,
    project_main_id: null,
    project_sub: '',
    role_id: null,
    activity_type_id: null,
    delivery_format_id: null,
    recurrence_type_id: null,
    task_desc: '',
    comments: ''
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

onMounted(async () => {
  await Promise.all([
    loadLookupData(),
    loadProjects(),
    fetchTrainerName()
  ])
})
</script>

<template>
  <DashboardLayout>
    <div class="mb-6 flex justify-between items-center">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <n-button v-if="isAdminViewing" quaternary circle @click="router.push('/admin/table')">
            <template #icon><n-icon><BackIcon /></n-icon></template>
          </n-button>
          <n-h2 class="!m-0">
            {{ isAdminViewing ? `Задачи тренера: ${trainerName}` : 'Мои проекты и задачи' }}
          </n-h2>
        </div>
        <n-text depth="3">
          {{ isAdminViewing ? `Просмотр и редактирование активности тренера под ID ${props.id}` : 'Список ваших активностей и назначенных ролей' }}
        </n-text>
      </div>
      
      <n-button type="primary" @click="openAddModal">
        <template #icon>
          <n-icon><AddIcon /></n-icon>
        </template>
        {{ isAdminViewing ? 'Добавить за тренера' : 'Добавить запись' }}
      </n-button>
    </div>

    <n-card>
      <n-data-table
        :columns="columns"
        :data="projects"
        :loading="loading"
        :bordered="false"
        scroll-x="1600"
      />
    </n-card>

    <n-modal
      v-model:show="showModal"
      preset="card"
      :title="editingId ? 'Редактировать запись' : 'Новая запись в проекте'"
      class="max-w-2xl"
    >
      <n-form label-placement="top">
        <!-- Проект -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <n-form-item label="Тип проекта" required>
            <n-select v-model:value="entryForm.project_type_id" :options="projectTypes" placeholder="Выберите тип" />
          </n-form-item>
          <n-form-item label="Основной проект" required>
            <n-select v-model:value="entryForm.project_main_id" :options="projectNames" placeholder="Выберите проект" filterable />
          </n-form-item>
        </div>

        <n-form-item label="Подпроект / Тема">
          <n-input v-model:value="entryForm.project_sub" placeholder="Напр: Статистика УБР" />
        </n-form-item>

        <n-form-item label="Ваша роль в проекте" required>
          <n-select v-model:value="entryForm.role_id" :options="roles" placeholder="Выберите роль" />
        </n-form-item>

        <n-divider dashed style="margin: 8px 0">Классификация задачи</n-divider>

        <!-- Тип активности + Формат -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <n-form-item label="Тип активности">
            <n-select
              v-model:value="entryForm.activity_type_id"
              :options="activityTypes"
              placeholder="Что именно делали?"
              clearable
            />
          </n-form-item>
          <n-form-item label="Формат выполнения">
            <n-select
              v-model:value="entryForm.delivery_format_id"
              :options="deliveryFormats"
              placeholder="Как выполнялась задача?"
              clearable
            />
          </n-form-item>
        </div>

        <!-- Периодичность -->
        <n-form-item label="Периодичность">
          <n-select
            v-model:value="entryForm.recurrence_type_id"
            :options="recurrenceTypes"
            placeholder="Как часто выполняете?"
            clearable
          />
        </n-form-item>

        <n-divider dashed style="margin: 8px 0">Описание</n-divider>

        <n-form-item label="Описание задачи">
          <n-input
            v-model:value="entryForm.task_desc"
            type="textarea"
            :rows="3"
            placeholder="Дополнительное описание в свободной форме..."
          />
        </n-form-item>

        <n-form-item label="Комментарии">
          <n-input
            v-model:value="entryForm.comments"
            type="textarea"
            :rows="2"
            placeholder="Дополнительная информация"
          />
        </n-form-item>

        <div class="flex justify-end gap-2 mt-2">
          <n-button @click="closeModal">Отмена</n-button>
          <n-button type="primary" :loading="loading" @click="saveEntry">Сохранить</n-button>
        </div>
      </n-form>
    </n-modal>
  </DashboardLayout>
</template>
