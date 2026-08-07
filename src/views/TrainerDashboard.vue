<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import {
  NButton,
  NIcon,
  NPopconfirm,
  NSpace,
  NTag,
  NTooltip,
  type DataTableColumns,
  useMessage,
} from 'naive-ui'
import {
  Add as AddIcon,
  ArrowBack as BackIcon,
  CopyOutline as CopyIcon,
  Pencil as EditIcon,
  Trash as DeleteIcon,
} from '@vicons/ionicons5'
import { useRouter } from 'vue-router'
import { DashboardLayout } from '../widgets/dashboard-layout'
import { useAuthStore } from '../stores/auth'
import {
  deleteActivity,
  duplicateActivity,
  listActivitiesByTrainer,
  type ActivityListItem,
} from '../entities/activity'
import { getTrainer } from '../entities/trainer'
import { ActivityEditorModal } from '../features/activity-editor'
import { formatDateOnly, formatDateTime, parseLocalDate } from '../shared/lib/date'

const props = defineProps<{ id?: string }>()

const auth = useAuthStore()
const message = useMessage()
const router = useRouter()
const projects = ref<ActivityListItem[]>([])
const loading = ref(false)
const showEditor = ref(false)
const editingId = ref<number | null>(null)
const trainerName = ref('')

const isAdminViewing = computed(() => Boolean(props.id && auth.profile?.role === 'admin'))
const targetTrainerId = computed<number | null>(() => {
  const value = props.id ?? auth.profile?.id
  const id = Number(value)
  return Number.isFinite(id) && id > 0 ? id : null
})

function boundaryTime(row: ActivityListItem, boundary: 'start' | 'end') {
  const dateTime = row[`${boundary}_datetime`]
  if (dateTime) {
    const parsed = new Date(dateTime)
    if (!Number.isNaN(parsed.getTime())) return parsed.getTime()
  }
  return parseLocalDate(row[`${boundary}_date`])?.getTime() ?? 0
}

function formatBoundary(row: ActivityListItem, boundary: 'start' | 'end') {
  const dateTime = row[`${boundary}_datetime`]
  if (dateTime) return formatDateTime(dateTime)
  const dateOnly = formatDateOnly(row[`${boundary}_date`])
  return dateOnly === '-' ? dateOnly : `${dateOnly} · весь день`
}

function openCreate() {
  editingId.value = null
  showEditor.value = true
}

function openEdit(row: ActivityListItem) {
  editingId.value = row.id
  showEditor.value = true
}

async function handleDuplicate(row: ActivityListItem) {
  if (!targetTrainerId.value) return
  try {
    await duplicateActivity(row, targetTrainerId.value)
    message.success('Запись продублирована как шаблон')
    await loadProjects()
  } catch (error: unknown) {
    message.error(error instanceof Error ? error.message : 'Не удалось дублировать запись')
  }
}

async function handleDelete(row: ActivityListItem) {
  if (!targetTrainerId.value) return
  try {
    await deleteActivity(row.id, targetTrainerId.value, isAdminViewing.value)
    message.success('Запись удалена')
    await loadProjects()
  } catch (error: unknown) {
    message.error(error instanceof Error ? error.message : 'Не удалось удалить запись')
  }
}

const columns: DataTableColumns<ActivityListItem> = [
  {
    title: 'Тип проекта',
    key: 'project_type',
    width: 180,
    render: row => row.project_types?.name || (row.source_type === 'excel_gantt' ? 'Импорт Excel' : '-'),
    sorter: (a, b) => (a.project_types?.name || '').localeCompare(b.project_types?.name || ''),
    resizable: true,
  },
  {
    title: 'Проект',
    key: 'project',
    width: 220,
    render: row => row.project_names?.name || (row.source_schedule_key ? `График ${row.source_schedule_key}` : '-'),
    sorter: (a, b) => (a.project_names?.name || '').localeCompare(b.project_names?.name || ''),
    resizable: true,
  },
  {
    title: 'Начало',
    key: 'start',
    width: 180,
    render: row => formatBoundary(row, 'start'),
    sorter: (a, b) => boundaryTime(a, 'start') - boundaryTime(b, 'start'),
    resizable: true,
  },
  {
    title: 'Конец',
    key: 'end',
    width: 180,
    render: row => formatBoundary(row, 'end'),
    sorter: (a, b) => boundaryTime(a, 'end') - boundaryTime(b, 'end'),
    resizable: true,
  },
  { title: 'Подпроект', key: 'project_sub', width: 180, sorter: true, resizable: true, ellipsis: { tooltip: true } },
  {
    title: 'Роль',
    key: 'role',
    width: 160,
    render: row => h(NTag, { type: 'info', bordered: false, size: 'small' }, { default: () => row.roles?.name || '-' }),
    sorter: (a, b) => (a.roles?.name || '').localeCompare(b.roles?.name || ''),
    resizable: true,
  },
  {
    title: 'Тип активности',
    key: 'activity_type',
    width: 160,
    render: row => row.activity_types?.name
      ? h(NTag, { type: 'success', bordered: false, size: 'small' }, { default: () => row.activity_types?.name })
      : '-',
    resizable: true,
  },
  {
    title: 'Формат',
    key: 'delivery_format',
    width: 160,
    render: row => row.delivery_formats?.name
      ? h(NTag, { type: 'warning', bordered: false, size: 'small' }, { default: () => row.delivery_formats?.name })
      : '-',
    resizable: true,
  },
  {
    title: 'Периодичность',
    key: 'recurrence',
    width: 140,
    render: row => row.recurrence_types?.name || '-',
    resizable: true,
  },
  {
    title: 'Описание задачи',
    key: 'task_desc',
    width: 260,
    ellipsis: { tooltip: true },
    render: row => {
      if (!row.is_duplicate) return row.task_desc || ''
      return h(NSpace, { align: 'center', wrap: false }, {
        default: () => [
          h(NTooltip, null, {
            trigger: () => h(NTag, { type: 'warning', size: 'small' }, {
              icon: () => h(NIcon, null, { default: () => h(CopyIcon) }),
              default: () => 'Шаблон',
            }),
            default: () => 'Дублированная запись',
          }),
          row.task_desc || '',
        ],
      })
    },
  },
  {
    title: 'Действия',
    key: 'actions',
    width: 140,
    fixed: 'right',
    render: row => h(NSpace, { justify: 'center', wrap: false, size: 'small' }, {
      default: () => [
        h(NTooltip, null, {
          trigger: () => h(NButton, {
            size: 'small',
            circle: true,
            quaternary: true,
            onClick: () => handleDuplicate(row),
          }, { icon: () => h(NIcon, null, { default: () => h(CopyIcon) }) }),
          default: () => 'Дублировать запись',
        }),
        h(NButton, {
          size: 'small',
          circle: true,
          quaternary: true,
          onClick: () => openEdit(row),
        }, { icon: () => h(NIcon, null, { default: () => h(EditIcon) }) }),
        h(NPopconfirm, { onPositiveClick: () => handleDelete(row) }, {
          trigger: () => h(NButton, {
            size: 'small',
            circle: true,
            quaternary: true,
            type: 'error',
          }, { icon: () => h(NIcon, null, { default: () => h(DeleteIcon) }) }),
          default: () => 'Удалить эту запись?',
        }),
      ],
    }),
  },
]

async function loadProjects() {
  if (!targetTrainerId.value) return
  loading.value = true
  try {
    projects.value = await listActivitiesByTrainer(targetTrainerId.value)
  } catch (error: unknown) {
    message.error(error instanceof Error ? error.message : 'Ошибка загрузки данных')
  } finally {
    loading.value = false
  }
}

async function loadTrainerName() {
  if (!props.id) return
  const trainer = await getTrainer(props.id)
  trainerName.value = trainer?.full_name || ''
}

onMounted(() => Promise.all([loadProjects(), loadTrainerName()]))
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
      <n-button type="primary" @click="openCreate">
        <template #icon><n-icon><AddIcon /></n-icon></template>
        {{ isAdminViewing ? 'Добавить за тренера' : 'Добавить запись' }}
      </n-button>
    </div>

    <n-card>
      <n-data-table :columns="columns" :data="projects" :loading="loading" :bordered="false" scroll-x="1600" />
    </n-card>

    <ActivityEditorModal
      v-model:show="showEditor"
      :record-id="editingId"
      :trainer-id="targetTrainerId"
      :can-manage-participants="isAdminViewing"
      @saved="loadProjects"
    />
  </DashboardLayout>
</template>
