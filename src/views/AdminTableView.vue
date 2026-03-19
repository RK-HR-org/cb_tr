<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import DashboardLayout from '../layouts/DashboardLayout.vue'
import { supabase } from '../supabase'
import { useMessage, type DataTableColumns } from 'naive-ui'
import { PeopleOutline as PeopleIcon, FolderOpenOutline as ProjectIcon, CheckmarkCircleOutline as CheckIcon } from '@vicons/ionicons5'

import { useRouter } from 'vue-router'

const message = useMessage()
const router = useRouter()
const stats = ref({
  totalTrainers: 0,
  totalProjects: 0,
  totalProjectTypes: 0
})
const loading = ref(false)
const tableLoading = ref(false)

// Row click handler
const rowProps = (row: any) => {
  return {
    style: 'cursor: pointer;',
    onClick: () => {
      router.push(`/admin/trainers/${row.id}`)
    }
  }
}

// Data for the matrix table
const trainersList = ref<any[]>([])
const rolesList = ref<any[]>([])
const projectsData = ref<any[]>([])

const tableColumns = computed((): DataTableColumns<any> => {
  const cols: DataTableColumns<any> = [
    { 
      title: 'ФИО Тренера', 
      key: 'full_name', 
      fixed: 'left', 
      width: 200,
      sorter: true,
      resizable: true
    }
  ]
  
  // Dynamic columns for each role
  rolesList.value.forEach(role => {
    cols.push({
      title: role.name,
      key: `role_${role.id}`,
      align: 'center',
      width: 150,
      sorter: (row1: any, row2: any) => (row1[`role_${role.id}`] || 0) - (row2[`role_${role.id}`] || 0),
      render: (row: any) => row[`role_${role.id}`] || 0,
      resizable: true
    })
  })

  // Total column
  cols.push({
    title: 'Всего',
    key: 'total',
    align: 'center',
    fixed: 'right',
    width: 100,
    sorter: (row1: any, row2: any) => {
      const getSum = (r: any) => rolesList.value.reduce((sum, role) => sum + (r[`role_${role.id}`] || 0), 0)
      return getSum(row1) - getSum(row2)
    },
    render: (row: any) => {
      return rolesList.value.reduce((sum, role) => sum + (row[`role_${role.id}`] || 0), 0)
    },
    resizable: true
  })

  return cols
})

const tableData = computed(() => {
  return trainersList.value.map(trainer => {
    const row: any = { 
      id: trainer.id,
      full_name: trainer.full_name 
    }
    
    // Fill role counts
    rolesList.value.forEach(role => {
      row[`role_${role.id}`] = projectsData.value.filter(
        p => p.trainer_id === trainer.id && p.role_id === role.id
      ).length
    })
    
    return row
  }).filter(row => {
    // Optional: only show trainers with at least one task
    const total = rolesList.value.reduce((sum, role) => sum + row[`role_${role.id}`], 0)
    return total > 0
  })
})

async function loadAdminData() {
  loading.value = true
  tableLoading.value = true
  
  try {
    // 1. Fetch lookup and counters
    const [trainersRes, projectsCountRes, typesRes, rolesRes, allProjectsRes] = await Promise.all([
      supabase.from('trainers').select('id, full_name').order('full_name'),
      supabase.from('trainer_projects').select('*', { count: 'exact', head: true }),
      supabase.from('project_types').select('*', { count: 'exact', head: true }),
      supabase.from('roles').select('id, name').order('id'),
      supabase.from('trainer_projects').select('trainer_id, role_id')
    ])

    stats.value.totalTrainers = trainersRes.data?.length || 0
    stats.value.totalProjects = projectsCountRes.count || 0
    stats.value.totalProjectTypes = typesRes.count || 0
    
    trainersList.value = (trainersRes.data || []).sort((a, b) => a.full_name.localeCompare(b.full_name))

    
    // Custom sort order for roles as requested by user
    const orderMap: Record<string, number> = {
      'лидирование проекта': 1,
      'основной методолог': 2,
      'курирование трека/модуля': 3,
      'участник рабочей группы': 4,
      'тренер/ведущий': 5
    }

    const rawRoles = rolesRes.data || []
    rolesList.value = [...rawRoles].sort((a, b) => {
      const orderA = orderMap[a.name.toLowerCase()] || 99
      const orderB = orderMap[b.name.toLowerCase()] || 99
      return orderA - orderB
    })

    projectsData.value = allProjectsRes.data || []
    
  } catch (error: any) {
    message.error('Ошибка загрузки данных для статистики')
  } finally {
    loading.value = false
    tableLoading.value = false
  }
}

onMounted(() => {
  loadAdminData()
})
</script>

<template>
  <DashboardLayout>
    <div class="mb-6">
      <n-h2 class="!mt-0 !mb-0">Сводная статистика (Проекты)</n-h2>
      <p class="text-gray-500 dark:text-gray-400">Показатели по всем тренерам и проектам из системы</p>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <n-card :loading="loading">
        <n-statistic label="Всего тренеров" :value="stats.totalTrainers">
          <template #prefix>
            <n-icon><PeopleIcon /></n-icon>
          </template>
        </n-statistic>
      </n-card>
      
      <n-card :loading="loading">
        <n-statistic label="Записей в проектах" :value="stats.totalProjects">
          <template #prefix>
            <n-icon><ProjectIcon /></n-icon>
          </template>
        </n-statistic>
      </n-card>

      <n-card :loading="loading">
        <n-statistic label="Типов программ" :value="stats.totalProjectTypes">
          <template #prefix>
            <n-icon><CheckIcon /></n-icon>
          </template>
        </n-statistic>
      </n-card>
    </div>

    <!-- Matrix Report Table -->
    <n-card title="Распределение задач по ролям">
      <template #header-extra>
        <n-text depth="3" class="text-xs">Показано количество выполненных задач для каждого тренера</n-text>
      </template>
      <n-data-table
        :columns="tableColumns"
        :data="tableData"
        :loading="tableLoading"
        :bordered="false"
        :row-props="rowProps"
        scroll-x="1200"
        size="small"
      />
    </n-card>
  </DashboardLayout>
</template>
