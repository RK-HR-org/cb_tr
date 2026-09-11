<script setup lang="ts">
import { h, onMounted, ref } from 'vue'
import {
  NButton,
  NCard,
  NDataTable,
  NPopconfirm,
  NSpace,
  NTag,
  useMessage,
  type DataTableColumns,
} from 'naive-ui'
import { DashboardLayout } from '../widgets/dashboard-layout'
import {
  approveChangeRequest,
  listPendingChangeRequests,
  rejectChangeRequest,
  type ActivityChangeRequestListItem,
} from '../entities/activity-approval'
import type { ActivityPayload } from '../entities/activity'
import { ApprovalDetailModal } from '../features/activity-approval-review'

const message = useMessage()
const loading = ref(false)
const items = ref<ActivityChangeRequestListItem[]>([])
const showDetail = ref(false)
const selectedId = ref<number | null>(null)

const changeTypeLabels: Record<string, string> = {
  create: 'Создание',
  update: 'Изменение',
  delete: 'Удаление',
}

function formatSubmittedAt(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function describePayload(payload: ActivityPayload | null): string {
  if (!payload) return '—'
  const parts: string[] = []
  if (payload.task_desc) parts.push(payload.task_desc)
  if (payload.start_date && payload.end_date) {
    parts.push(`${payload.start_date} — ${payload.end_date}`)
  } else if (payload.start_datetime) {
    parts.push(String(payload.start_datetime).slice(0, 16).replace('T', ' '))
  }
  if (payload.project_main_id) parts.push(`проект #${payload.project_main_id}`)
  return parts.join(' · ') || '—'
}

function requestDescription(row: ActivityChangeRequestListItem): string {
  if (row.change_type === 'delete') {
    return describePayload(row.previous_payload)
  }
  return describePayload(row.proposed_payload)
}

async function loadItems() {
  loading.value = true
  try {
    items.value = await listPendingChangeRequests()
  } catch (error: unknown) {
    message.error(error instanceof Error ? error.message : 'Не удалось загрузить заявки')
    items.value = []
  } finally {
    loading.value = false
  }
}

onMounted(loadItems)

function openDetail(id: number) {
  selectedId.value = id
  showDetail.value = true
}

async function handleApprove(id: number) {
  try {
    await approveChangeRequest(id)
    message.success('Изменение утверждено')
    await loadItems()
  } catch (error: unknown) {
    message.error(error instanceof Error ? error.message : 'Не удалось утвердить')
  }
}

async function handleReject(id: number) {
  try {
    await rejectChangeRequest(id)
    message.success('Изменение отклонено')
    await loadItems()
  } catch (error: unknown) {
    message.error(error instanceof Error ? error.message : 'Не удалось отклонить')
  }
}

const columns: DataTableColumns<ActivityChangeRequestListItem> = [
  {
    title: 'Дата',
    key: 'submitted_at',
    width: 150,
    render: row => formatSubmittedAt(row.submitted_at),
  },
  {
    title: 'Тренер',
    key: 'trainer',
    minWidth: 160,
    render: row => row.trainers?.full_name || `#${row.trainer_id}`,
  },
  {
    title: 'Тип',
    key: 'change_type',
    width: 120,
    render: row => h(
      NTag,
      { size: 'small', type: row.change_type === 'delete' ? 'error' : 'info' },
      { default: () => changeTypeLabels[row.change_type] || row.change_type },
    ),
  },
  {
    title: 'Описание',
    key: 'description',
    minWidth: 240,
    ellipsis: { tooltip: true },
    render: row => requestDescription(row),
  },
  {
    title: 'Статус',
    key: 'status',
    width: 120,
    render: () => h(NTag, { type: 'warning', size: 'small' }, { default: () => 'На утверждении' }),
  },
  {
    title: 'Действия',
    key: 'actions',
    width: 280,
    render: row => h(NSpace, { size: 'small' }, {
      default: () => [
        h(NButton, { size: 'small', onClick: () => openDetail(row.id) }, { default: () => 'Подробнее' }),
        h(
          NPopconfirm,
          { onPositiveClick: () => handleApprove(row.id) },
          {
            trigger: () => h(NButton, { size: 'small', type: 'primary' }, { default: () => 'Утвердить' }),
            default: () => 'Утвердить это изменение?',
          },
        ),
        h(
          NPopconfirm,
          { onPositiveClick: () => handleReject(row.id) },
          {
            trigger: () => h(NButton, { size: 'small', type: 'error', secondary: true }, { default: () => 'Отклонить' }),
            default: () => 'Отклонить это изменение?',
          },
        ),
      ],
    }),
  },
]
</script>

<template>
  <DashboardLayout>
    <template #header-left>
      <h1 class="text-xl font-bold m-0">На утверждении</h1>
    </template>

    <NCard title="Заявки тренеров на изменение активностей">
      <NDataTable
        :columns="columns"
        :data="items"
        :loading="loading"
        :bordered="false"
        :row-key="row => row.id"
      />
    </NCard>

    <ApprovalDetailModal
      v-model:show="showDetail"
      :request-id="selectedId"
      @reviewed="loadItems"
    />
  </DashboardLayout>
</template>
