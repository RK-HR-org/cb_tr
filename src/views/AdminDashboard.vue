<script setup lang="ts">
import { ref, onMounted, computed, provide } from 'vue'
import DashboardLayout from '../layouts/DashboardLayout.vue'
import { supabase } from '../supabase'
import { useMessage } from 'naive-ui'
import { PeopleOutline as PeopleIcon, FolderOpenOutline as ProjectIcon, PieChartOutline as ChartIcon } from '@vicons/ionicons5'

// ECharts imports
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, PieChart, HeatmapChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent, VisualMapComponent } from 'echarts/components'
import VChart, { THEME_KEY } from 'vue-echarts'

use([
  CanvasRenderer,
  BarChart,
  PieChart,
  HeatmapChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  VisualMapComponent
])

provide(THEME_KEY, 'light')

const message = useMessage()
const loading = ref(false)

const stats = ref({
  totalTrainers: 0,
  totalTasks: 0,
  rolesCount: 0
})

const roles = ref<any[]>([])
const trainers = ref<any[]>([])
const entries = ref<any[]>([])
const projectTypes = ref<any[]>([])
const projectNames = ref<any[]>([])

// ─── Existing Charts ────────────────────────────────────────

// Chart: Role Distribution (Overall Pie)
const pieChartOption = computed(() => {
  const roleCounts: Record<string, number> = {}
  entries.value.forEach(e => {
    const roleName = roles.value.find(r => r.id === e.role_id)?.name || 'Неизвестно'
    roleCounts[roleName] = (roleCounts[roleName] || 0) + 1
  })

  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: '5%', left: 'center' },
    series: [
      {
        name: 'Роли',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: { show: false, position: 'center' },
        emphasis: {
          label: { show: true, fontSize: 16, fontWeight: 'bold' }
        },
        data: Object.entries(roleCounts).map(([name, value]) => ({ name, value }))
      }
    ]
  }
})

const barChartOption = computed(() => {
  const trainerData = trainers.value.map(t => {
    const roleStats = roles.value.map(role => {
      const roleEntries = entries.value.filter(e => e.trainer_id === t.id && e.role_id === role.id)
      const uniqueProjects = new Set(roleEntries.map(e => e.project_main_id).filter(Boolean))
      return { roleId: role.id, count: uniqueProjects.size }
    })
    const totalCount = roleStats.reduce((sum, r: any) => sum + r.count, 0)
    return { ...t, roleStats, totalCount }
  }).filter(t => t.totalCount > 0).sort((a, b) => a.totalCount - b.totalCount)

  const series = roles.value.map(role => {
    return {
      name: role.name,
      type: 'bar',
      stack: 'total',
      emphasis: { focus: 'series' },
      data: trainerData.map(t => {
        return t.roleStats.find((r: any) => r.roleId === role.id)?.count || 0
      })
    }
  })

  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { top: '5%' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value', minInterval: 1, name: 'Кол-во проектов' },
    yAxis: {
      type: 'category',
      data: trainerData.map(t => t.full_name)
    },
    series
  }
})

const uniqueRolesChartOption = computed(() => {
  const totalTrainers = trainers.value.length
  const data = roles.value.map(role => {
    const uniqueTrainersInRole = new Set(
      entries.value
        .filter(e => e.role_id === role.id)
        .map(e => e.trainer_id)
    ).size
    return {
      name: role.name,
      value: uniqueTrainersInRole
    }
  }).sort((a, b) => a.value - b.value)

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const item = params[0]
        return `${item.name}: <b>${item.value}</b> из ${totalTrainers}`
      }
    },
    grid: { left: '3%', right: '10%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'value',
      max: totalTrainers,
      interval: 1,
      name: 'Кол-во тренеров'
    },
    yAxis: {
      type: 'category',
      data: data.map(d => d.name)
    },
    series: [
      {
        name: 'Тренеров в роли',
        type: 'bar',
        data: data.map(d => d.value),
        label: {
          show: true,
          position: 'right',
          formatter: (params: any) => `${params.value} / ${totalTrainers}`
        },
        itemStyle: {
          color: '#5470c6',
          borderRadius: [0, 4, 4, 0]
        }
      }
    ]
  }
})

// ─── New Charts ─────────────────────────────────────────────

// 1. Top Projects by Number of Tasks (horizontal bar)
const topProjectsChartOption = computed(() => {
  const projectCounts: Record<number, number> = {}
  entries.value.forEach(e => {
    if (e.project_main_id) {
      projectCounts[e.project_main_id] = (projectCounts[e.project_main_id] || 0) + 1
    }
  })

  const data = Object.entries(projectCounts)
    .map(([id, count]) => ({
      name: projectNames.value.find(p => p.id === Number(id))?.name || `ID ${id}`,
      value: count
    }))
    .sort((a, b) => a.value - b.value)

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    grid: { left: '3%', right: '8%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'value',
      name: 'Кол-во задач'
    },
    yAxis: {
      type: 'category',
      data: data.map(d => d.name)
    },
    series: [
      {
        name: 'Задач',
        type: 'bar',
        data: data.map(d => d.value),
        label: {
          show: true,
          position: 'right'
        },
        itemStyle: {
          color: '#91cc75',
          borderRadius: [0, 4, 4, 0]
        }
      }
    ]
  }
})

// 3. Heatmap: Projects × Project Types
const projectTypeHeatmapOption = computed(() => {
  const typeNames = projectTypes.value.map(t => t.name).sort()
  const projNames = projectNames.value.map(p => p.name).sort()

  const data: [number, number, number][] = []
  let maxVal = 0

  projNames.forEach((pName, pIdx) => {
    const pId = projectNames.value.find(p => p.name === pName)?.id
    typeNames.forEach((tName, tIdx) => {
      const tId = projectTypes.value.find(t => t.name === tName)?.id
      const count = entries.value.filter(
        e => e.project_main_id === pId && e.project_type_id === tId
      ).length
      if (count > maxVal) maxVal = count
      data.push([tIdx, pIdx, count])
    })
  })

  return {
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        const [tIdx, pIdx, val] = params.data
        return `${projNames[pIdx]} × ${typeNames[tIdx]}: <b>${val}</b>`
      }
    },
    grid: { left: '3%', right: '3%', bottom: '10%', top: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: typeNames,
      splitArea: { show: true },
      axisLabel: { rotate: 30 }
    },
    yAxis: {
      type: 'category',
      data: projNames,
      splitArea: { show: true }
    },
    visualMap: {
      min: 0,
      max: maxVal || 1,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '0%',
      inRange: {
        color: ['#f0f0f0', '#91cc75', '#5470c6', '#ee6666']
      }
    },
    series: [
      {
        name: 'Записей',
        type: 'heatmap',
        data: data,
        label: {
          show: true,
          formatter: (params: any) => params.data[2] > 0 ? params.data[2] : ''
        },
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' }
        }
      }
    ]
  }
})

// 6. Heatmap: Trainer × Project
const trainerProjectHeatmapOption = computed(() => {
  const activeTrainers = trainers.value
    .filter(t => entries.value.some(e => e.trainer_id === t.id))
    .sort((a, b) => a.full_name.localeCompare(b.full_name))
  const trainerNamesList = activeTrainers.map(t => t.full_name)

  const activeProjectIds = [...new Set(entries.value.map(e => e.project_main_id).filter(Boolean))]
  const activeProjects = projectNames.value
    .filter(p => activeProjectIds.includes(p.id))
    .sort((a, b) => a.name.localeCompare(b.name))
  const projNamesList = activeProjects.map(p => p.name)

  const data: [number, number, number][] = []
  let maxVal = 0

  trainerNamesList.forEach((_tName, tIdx) => {
    const tId = activeTrainers[tIdx].id
    projNamesList.forEach((_pName, pIdx) => {
      const pId = activeProjects[pIdx].id
      const count = entries.value.filter(
        e => e.trainer_id === tId && e.project_main_id === pId
      ).length
      if (count > maxVal) maxVal = count
      data.push([pIdx, tIdx, count])
    })
  })

  return {
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        const [pIdx, tIdx, val] = params.data
        return `${trainerNamesList[tIdx]} × ${projNamesList[pIdx]}: <b>${val}</b>`
      }
    },
    grid: { left: '3%', right: '3%', bottom: '10%', top: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: projNamesList,
      splitArea: { show: true },
      axisLabel: { rotate: 30 }
    },
    yAxis: {
      type: 'category',
      data: trainerNamesList,
      splitArea: { show: true }
    },
    visualMap: {
      min: 0,
      max: maxVal || 1,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '0%',
      inRange: {
        color: ['#f0f0f0', '#fac858', '#ee6666', '#9a60b4']
      }
    },
    series: [
      {
        name: 'Записей',
        type: 'heatmap',
        data: data,
        label: {
          show: true,
          formatter: (params: any) => params.data[2] > 0 ? params.data[2] : ''
        },
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' }
        }
      }
    ]
  }
})

// ─── Data Loading ───────────────────────────────────────────

async function loadData() {
  loading.value = true
  try {
    const [rolesRes, trainersRes, entriesRes, typesRes, namesRes] = await Promise.all([
      supabase.from('roles').select('id, name'),
      supabase.from('trainers').select('id, full_name'),
      supabase.from('trainer_projects').select('trainer_id, role_id, project_type_id, project_main_id'),
      supabase.from('project_types').select('id, name'),
      supabase.from('project_names').select('id, name')
    ])

    roles.value = rolesRes.data || []
    trainers.value = trainersRes.data || []
    entries.value = entriesRes.data || []
    projectTypes.value = typesRes.data || []
    projectNames.value = namesRes.data || []

    stats.value.totalTrainers = trainers.value.length
    stats.value.totalTasks = entries.value.length
    stats.value.rolesCount = roles.value.length
  } catch (e) {
    message.error('Ошибка загрузки аналитики')
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<template>
  <DashboardLayout>
    <div class="mb-6">
      <n-h2 class="!m-0">Аналитический дашборд</n-h2>
      <n-text depth="3">Визуализация распределения ресурсов и ролей</n-text>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <n-card size="small">
        <n-statistic label="Всего тренеров" :value="stats.totalTrainers">
          <template #prefix><n-icon><PeopleIcon /></n-icon></template>
        </n-statistic>
      </n-card>
      <n-card size="small">
        <n-statistic label="Выполнено задач" :value="stats.totalTasks">
          <template #prefix><n-icon><ProjectIcon /></n-icon></template>
        </n-statistic>
      </n-card>
      <n-card size="small">
        <n-statistic label="Активных ролей" :value="stats.rolesCount">
          <template #prefix><n-icon><ChartIcon /></n-icon></template>
        </n-statistic>
      </n-card>
    </div>

    <!-- All charts in a resizable grid: vertical splits for rows, horizontal splits within each row -->
    <n-split direction="vertical" :resize-trigger-size="8" :default-size="0.33" style="height: 1500px">
      <template #1>
        <!-- Row 1: Pie + Stacked Bar -->
        <n-split direction="horizontal" :resize-trigger-size="8" :default-size="0.4" :min="0.2" :max="0.8" style="height: 100%">
          <template #1>
            <n-card 
              title="Доли ролей в проектах" 
              style="height: 100%"
              content-style="flex: 1; display: flex; flex-direction: column; min-height: 0;"
            >
              <div class="flex-1 min-h-0">
                <v-chart class="chart" :option="pieChartOption" autoresize />
              </div>
            </n-card>
          </template>
          <template #2>
            <n-card 
              title="Рейтинг по ролям в проектах" 
              style="height: 100%"
              content-style="flex: 1; display: flex; flex-direction: column; min-height: 0;"
            >
              <div class="flex-1 min-h-0">
                <v-chart class="chart" :option="barChartOption" autoresize />
              </div>
            </n-card>
          </template>
        </n-split>
      </template>
      <template #2>
        <n-split direction="vertical" :resize-trigger-size="8" :default-size="0.5" style="height: 100%">
          <template #1>
            <!-- Row 2: Unique trainers per role + Top projects -->
            <n-split direction="horizontal" :resize-trigger-size="8" :default-size="0.5" :min="0.1" :max="0.9" style="height: 100%">
              <template #1>
                <n-card 
                  title="Охват уникальных тренеров по ролям" 
                  style="height: 100%"
                  content-style="flex: 1; display: flex; flex-direction: column; min-height: 0;"
                >
                  <div class="flex-1 min-h-0">
                    <v-chart class="chart" :option="uniqueRolesChartOption" autoresize />
                  </div>
                </n-card>
              </template>
              <template #2>
                <n-card 
                  title="Топ проектов по количеству задач" 
                  style="height: 100%"
                  content-style="flex: 1; display: flex; flex-direction: column; min-height: 0;"
                >
                  <div class="flex-1 min-h-0">
                    <v-chart class="chart" :option="topProjectsChartOption" autoresize />
                  </div>
                </n-card>
              </template>
            </n-split>
          </template>
          <template #2>
            <!-- Row 3: Heatmaps -->
            <n-split direction="horizontal" :resize-trigger-size="8" :default-size="0.5" :min="0.1" :max="0.9" style="height: 100%">
              <template #1>
                <n-card 
                  title="Проекты × Типы проектов" 
                  style="height: 100%"
                  content-style="flex: 1; display: flex; flex-direction: column; min-height: 0;"
                >
                  <div class="flex-1 min-h-0">
                    <v-chart class="chart" :option="projectTypeHeatmapOption" autoresize />
                  </div>
                </n-card>
              </template>
              <template #2>
                <n-card 
                  title="Матрица: Тренер × Проект" 
                  style="height: 100%"
                  content-style="flex: 1; display: flex; flex-direction: column; min-height: 0;"
                >
                  <div class="flex-1 min-h-0">
                    <v-chart class="chart" :option="trainerProjectHeatmapOption" autoresize />
                  </div>
                </n-card>
              </template>
            </n-split>
          </template>
        </n-split>
      </template>
    </n-split>
  </DashboardLayout>
</template>

<style scoped>
.chart {
  width: 100%;
  height: 100%;
}
</style>
