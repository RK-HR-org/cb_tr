<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NButton,
  NPopconfirm,
  NTag,
  useMessage,
  type DataTableColumns,
} from 'naive-ui'
import {
  deleteProjectMaterial,
  listMaterialStatuses,
  listMaterialTypes,
  listProjectMaterials,
  saveProjectMaterial,
  type MaterialReference,
  type ProjectMaterial,
  type ProjectMaterialPayload,
} from '../../../entities/project-material'
import {
  getProject,
  listAnnualBudgetItems,
  listDirections,
  listProjectDeliveryFormats,
  listProjects,
  listProjectStatuses,
  listProjectTypes,
  saveProject,
  type AnnualBudgetItem,
  type Project,
  type ProjectDirection,
  type ProjectReference,
  type ProjectType,
} from '../../../entities/project'
import { listTrainers, type Trainer } from '../../../entities/trainer'
import { listProductionCalendarDays, type ProductionCalendarDay } from '../../../entities/production-calendar'
import { ProgramSchedulerModal } from '../../program-scheduler'

const props = defineProps<{
  projectId: number | null
  initialParentProjectId?: number | null
}>()

const emit = defineEmits<{
  saved: [projectId: number]
}>()

const message = useMessage()
const router = useRouter()
const loading = ref(false)
const activeTab = ref('general')
const materialModalOpen = ref(false)
const editingMaterialId = ref<number | null>(null)
const projects = ref<Project[]>([])
const trainers = ref<Trainer[]>([])
const statuses = ref<ProjectReference[]>([])
const projectTypes = ref<ProjectType[]>([])
const directions = ref<ProjectDirection[]>([])
const projectDeliveryFormats = ref<ProjectReference[]>([])
const annualBudgetItems = ref<AnnualBudgetItem[]>([])
const materialTypes = ref<MaterialReference[]>([])
const materialStatuses = ref<MaterialReference[]>([])
const materials = ref<ProjectMaterial[]>([])
const materialsError = ref<string | null>(null)
const materialsLoaded = ref(false)
const savedProjectTypeId = ref<number | null>(null)
const currentProject = ref<Project | null>(null)
const productionCalendarDays = ref<ProductionCalendarDay[]>([])
const schedulerOpen = ref(false)

const MODULAR_PROGRAM_TYPE_NAME = 'Модульная программа'
const normalizedTypeName = (name: string) => name.trim().toLocaleLowerCase('ru-RU')
const normalizedAuditIndex = (value: string) => value.trim().toLocaleLowerCase('ru-RU')
const isModularProgramType = (projectTypeId: number | null) => {
  const projectType = projectTypes.value.find(item => item.id === projectTypeId)
  return projectType
    ? normalizedTypeName(projectType.name) === normalizedTypeName(MODULAR_PROGRAM_TYPE_NAME)
    : false
}

const form = ref({
  name: '',
  audit_index: '',
  weight: 1,
  status_code: 'under_review',
  project_type_id: null as number | null,
  parent_project_id: props.initialParentProjectId ?? null as number | null,
  module_position: null as number | null,
  customer: '',
  lead_methodologist_id: null as number | null,
  target_audience: '',
  goals: '',
  short_description: '',
  duration_days: null as number | null,
  duration_hours: null as number | null,
  participant_count: null as number | null,
  is_in_application_campaign: false,
  module_gap_value: 30 as number | null,
  module_gap_unit: 'days' as 'days' | 'weeks' | 'months' | 'quarters' | null,
  central_office_format_code: null as string | null,
  main_department_format_code: null as string | null,
  annual_budget_item_id: null as number | null,
  direction_ids: [] as number[],
})

const materialForm = ref<ProjectMaterialPayload>({
  project_id: props.projectId ?? 0,
  type_code: 'presentation',
  status_code: 'not_started',
  title: null,
  location: null,
  description: null,
})

const statusOptions = computed(() => statuses.value.map(item => ({
  label: item.name,
  value: item.code,
})))
const projectTypeOptions = computed(() => projectTypes.value.map(item => ({
  label: item.name,
  value: item.id,
})))
const parentOptions = computed(() => projects.value
  .filter(project => project.id !== props.projectId && isModularProgramType(project.project_type_id))
  .map(project => ({ label: project.name, value: project.id })))
const auditIndexDuplicate = computed(() => {
  const value = normalizedAuditIndex(form.value.audit_index)
  if (!value) return false
  return projects.value.some(project => (
    project.id !== props.projectId
      && project.audit_index !== null
      && normalizedAuditIndex(project.audit_index) === value
  ))
})
const isModule = computed(() => form.value.parent_project_id !== null)
const canAddModules = computed(() => Boolean(
  props.projectId
    && form.value.project_type_id === savedProjectTypeId.value
    && isModularProgramType(savedProjectTypeId.value),
))
const methodologistOptions = computed(() => trainers.value.map(trainer => ({
  label: trainer.full_name,
  value: trainer.id,
})))
const directionOptions = computed(() => directions.value.map(item => ({
  label: item.name,
  value: item.id,
})))
const projectDeliveryFormatOptions = computed(() => projectDeliveryFormats.value.map(item => ({
  label: item.name,
  value: item.code,
})))
const annualBudgetOptions = computed(() => annualBudgetItems.value.map(item => ({
  label: item.name,
  value: item.id,
})))
const materialTypeOptions = computed(() => materialTypes.value.map(item => ({
  label: item.name,
  value: item.code,
})))
const materialStatusOptions = computed(() => materialStatuses.value.map(item => ({
  label: item.name,
  value: item.code,
})))

const materialColumns: DataTableColumns<ProjectMaterial> = [
  {
    title: 'Материал',
    key: 'type',
    render: row => row.title || row.material_types?.name || row.type_code,
  },
  {
    title: 'Статус',
    key: 'status',
    render: row => h(NTag, { bordered: false, size: 'small' }, {
      default: () => row.material_statuses?.name || row.status_code,
    }),
  },
  {
    title: 'Расположение',
    key: 'location',
    ellipsis: { tooltip: true },
    render: row => row.location || '—',
  },
  {
    title: 'Действия',
    key: 'actions',
    width: 150,
    render: row => h('div', { class: 'editor-actions' }, [
      h(NButton, { size: 'small', onClick: () => openMaterial(row) }, {
        default: () => 'Изменить',
      }),
      h(NPopconfirm, { onPositiveClick: () => removeMaterial(row.id) }, {
        trigger: () => h(NButton, { size: 'small', type: 'error' }, {
          default: () => 'Удалить',
        }),
        default: () => 'Удалить материал?',
      }),
    ]),
  },
]

async function load() {
  loading.value = true
  try {
    const results = await Promise.allSettled([
      listProjects(),
      listTrainers(),
      listProjectStatuses(),
      listProjectTypes(),
      listDirections(),
      listProjectDeliveryFormats(),
      listAnnualBudgetItems(),
      listMaterialTypes(),
      listMaterialStatuses(),
      listProductionCalendarDays(),
      props.projectId ? getProject(props.projectId) : Promise.resolve(null),
    ])

    const [
      projectRows,
      trainerRows,
      statusRows,
      projectTypeRows,
      directionRows,
      projectDeliveryFormatRows,
      annualBudgetRows,
      materialTypeRows,
      materialStatusRows,
      productionCalendarRows,
      projectResult,
    ] = results

    projects.value = projectRows.status === 'fulfilled' ? projectRows.value : []
    trainers.value = trainerRows.status === 'fulfilled' ? trainerRows.value : []
    statuses.value = statusRows.status === 'fulfilled' && statusRows.value.length
      ? statusRows.value
      : [
          { code: 'under_review', name: 'На рассмотрении' },
          { code: 'in_development', name: 'В разработке' },
          { code: 'needs_update', name: 'Требует актуализации' },
          { code: 'current', name: 'Актуален' },
          { code: 'archived', name: 'Архив' },
        ]
    if (projectTypeRows.status === 'rejected') throw projectTypeRows.reason
    projectTypes.value = projectTypeRows.value
    directions.value = directionRows.status === 'fulfilled' ? directionRows.value : []
    projectDeliveryFormats.value = projectDeliveryFormatRows.status === 'fulfilled'
      ? projectDeliveryFormatRows.value
      : [
          { code: 'in_person', name: 'Очно' },
          { code: 'online', name: 'Онлайн' },
          { code: 'hybrid', name: 'Очно/онлайн' },
        ]
    annualBudgetItems.value = annualBudgetRows.status === 'fulfilled' ? annualBudgetRows.value : []
    materialTypes.value = materialTypeRows.status === 'fulfilled' && materialTypeRows.value.length
      ? materialTypeRows.value
      : [
          { code: 'presentation', name: 'Презентация' },
          { code: 'scenario', name: 'Сценарий' },
          { code: 'methodological_materials', name: 'Методические материалы' },
        ]
    materialStatuses.value = materialStatusRows.status === 'fulfilled' && materialStatusRows.value.length
      ? materialStatusRows.value
      : [
          { code: 'not_started', name: 'Не начат' },
          { code: 'in_progress', name: 'В работе' },
          { code: 'ready', name: 'Готов' },
          { code: 'needs_update', name: 'Требует актуализации' },
        ]
    productionCalendarDays.value = productionCalendarRows.status === 'fulfilled' ? productionCalendarRows.value : []

    if (projectResult.status === 'rejected') throw projectResult.reason
    const project = projectResult.value

    if (project) {
      currentProject.value = project
      form.value = {
        name: project.name,
        audit_index: project.audit_index ?? '',
        weight: project.weight ?? 1,
        status_code: project.status_code,
        project_type_id: project.project_type_id,
        parent_project_id: project.parent_project_id,
        module_position: project.module_position,
        customer: project.customer ?? '',
        lead_methodologist_id: project.lead_methodologist_id,
        target_audience: project.target_audience ?? '',
        goals: project.goals ?? '',
        short_description: project.short_description ?? '',
        duration_days: project.duration_days,
        duration_hours: project.duration_hours,
        participant_count: project.participant_count,
        is_in_application_campaign: project.is_in_application_campaign,
        module_gap_value: project.module_gap_value,
        module_gap_unit: project.module_gap_unit,
        central_office_format_code: project.central_office_format_code,
        main_department_format_code: project.main_department_format_code,
        annual_budget_item_id: project.annual_budget_item_id,
        direction_ids: (project.project_direction_links || []).map(link => link.direction_id),
      }
      savedProjectTypeId.value = project.project_type_id
    } else if (props.projectId) {
      throw new Error('Проект не найден')
    }
  } catch (error) {
    message.error(error instanceof Error ? error.message : 'Не удалось загрузить карточку проекта')
  } finally {
    loading.value = false
  }
}

async function handleTabChange(tab: string) {
  if (tab !== 'materials' || !props.projectId || materialsLoaded.value) return
  materialsLoaded.value = true
  try {
    materials.value = await listProjectMaterials(props.projectId)
    materialsError.value = null
  } catch (error) {
    materials.value = []
    materialsError.value = error instanceof Error
      ? error.message
      : 'Не удалось загрузить материалы проекта'
  }
}

function createModule() {
  if (!props.projectId) return
  router.push({
    path: '/admin/projects/new',
    query: {
      parentProjectId: String(props.projectId),
    },
  })
}

function editModule(id: number) {
  router.push(`/admin/projects/${id}/edit`)
}

async function submitProject() {
  if (!form.value.name.trim()) {
    message.warning('Укажите название проекта')
    return
  }
  if (!form.value.project_type_id) {
    message.warning('Выберите тип проекта')
    return
  }
  if (auditIndexDuplicate.value) {
    message.warning('Проект с таким индексом уже существует')
    return
  }

  loading.value = true
  try {
    const project = await saveProject({
      name: form.value.name.trim(),
      audit_index: form.value.audit_index.trim() || null,
      weight: form.value.weight,
      status_code: form.value.status_code,
      project_type_id: form.value.project_type_id,
      parent_project_id: form.value.parent_project_id,
      module_position: isModule.value ? form.value.module_position : null,
      customer: form.value.customer.trim() || null,
      lead_methodologist_id: form.value.lead_methodologist_id,
      target_audience: form.value.target_audience.trim() || null,
      goals: form.value.goals.trim() || null,
      short_description: form.value.short_description.trim() || null,
      duration_days: form.value.duration_days,
      duration_hours: form.value.duration_hours,
      participant_count: form.value.participant_count,
      is_in_application_campaign: form.value.is_in_application_campaign,
      module_gap_value: isModularProgramType(form.value.project_type_id) ? form.value.module_gap_value : null,
      module_gap_unit: isModularProgramType(form.value.project_type_id) ? form.value.module_gap_unit : null,
      central_office_format_code: form.value.central_office_format_code,
      main_department_format_code: form.value.main_department_format_code,
      annual_budget_item_id: form.value.annual_budget_item_id,
      direction_ids: form.value.direction_ids,
    }, props.projectId)
    savedProjectTypeId.value = project.project_type_id
    currentProject.value = project
    message.success('Карточка проекта сохранена')
    emit('saved', project.id)
  } catch (error) {
    message.error(error instanceof Error ? error.message : 'Не удалось сохранить проект')
  } finally {
    loading.value = false
  }
}

function openMaterial(material?: ProjectMaterial) {
  if (!props.projectId) {
    message.info('Сначала сохраните карточку проекта')
    return
  }
  editingMaterialId.value = material?.id ?? null
  materialForm.value = {
    project_id: props.projectId,
    type_code: material?.type_code ?? 'presentation',
    status_code: material?.status_code ?? 'not_started',
    title: material?.title ?? null,
    location: material?.location ?? null,
    description: material?.description ?? null,
  }
  materialModalOpen.value = true
}

async function submitMaterial() {
  loading.value = true
  try {
    await saveProjectMaterial(materialForm.value, editingMaterialId.value)
    materials.value = await listProjectMaterials(materialForm.value.project_id)
    materialModalOpen.value = false
    message.success('Материал сохранён')
  } catch (error) {
    message.error(error instanceof Error ? error.message : 'Не удалось сохранить материал')
  } finally {
    loading.value = false
  }
}

async function removeMaterial(id: number) {
  if (!props.projectId) return
  try {
    await deleteProjectMaterial(id)
    materials.value = await listProjectMaterials(props.projectId)
    message.success('Материал удалён')
  } catch (error) {
    message.error(error instanceof Error ? error.message : 'Не удалось удалить материал')
  }
}

onMounted(load)
</script>

<template>
  <NSpin :show="loading">
    <NTabs v-model:value="activeTab" type="line" animated @update:value="handleTabChange">
      <NTabPane name="general" tab="Основное">
        <NForm label-placement="top">
          <NFormItem label="Название" required>
            <NInput v-model:value="form.name" />
          </NFormItem>
          <NFormItem
            label="Индекс"
            :validation-status="auditIndexDuplicate ? 'error' : undefined"
            :feedback="auditIndexDuplicate ? 'Проект с таким индексом уже существует' : undefined"
          >
            <NInput
              v-model:value="form.audit_index"
              placeholder="Идентификатор для аудита"
            />
          </NFormItem>
          <NGrid :cols="3" :x-gap="16">
            <NGridItem>
              <NFormItem label="Тип проекта" required>
                <NSelect
                  v-model:value="form.project_type_id"
                  :options="projectTypeOptions"
                  filterable
                />
              </NFormItem>
            </NGridItem>
            <NGridItem>
              <NFormItem label="Статус" required>
                <NSelect v-model:value="form.status_code" :options="statusOptions" />
              </NFormItem>
            </NGridItem>
            <NGridItem>
              <NFormItem label="Вес нагрузки">
                <NInputNumber v-model:value="form.weight" :min="0.1" :step="0.1" class="w-full" />
              </NFormItem>
            </NGridItem>
          </NGrid>
          <NFormItem label="В заявочной компании">
            <NSwitch v-model:value="form.is_in_application_campaign">
              <template #checked>Да</template>
              <template #unchecked>Нет</template>
            </NSwitch>
          </NFormItem>

          <NGrid v-if="isModule" :cols="2" :x-gap="16">
            <NGridItem>
              <NFormItem label="Родительская программа" required>
                <NSelect
                  v-model:value="form.parent_project_id"
                  :options="parentOptions"
                  filterable
                />
              </NFormItem>
            </NGridItem>
            <NGridItem>
              <NFormItem label="Порядок модуля">
                <NInputNumber v-model:value="form.module_position" :min="1" class="w-full" />
              </NFormItem>
            </NGridItem>
          </NGrid>

          <NGrid :cols="2" :x-gap="16">
            <NGridItem>
              <NFormItem label="Заказчик">
                <NInput v-model:value="form.customer" />
              </NFormItem>
            </NGridItem>
            <NGridItem>
              <NFormItem label="Основной методолог">
                <NSelect
                  v-model:value="form.lead_methodologist_id"
                  :options="methodologistOptions"
                  filterable
                  clearable
                />
              </NFormItem>
            </NGridItem>
          </NGrid>

          <NDivider title-placement="left">Формат проведения</NDivider>
          <NGrid :cols="2" :x-gap="16">
            <NGridItem>
              <NFormItem label="ЦА (центральный аппарат)">
                <NSelect
                  v-model:value="form.central_office_format_code"
                  :options="projectDeliveryFormatOptions"
                  clearable
                />
              </NFormItem>
            </NGridItem>
            <NGridItem>
              <NFormItem label="ГУ (главное управление)">
                <NSelect
                  v-model:value="form.main_department_format_code"
                  :options="projectDeliveryFormatOptions"
                  clearable
                />
              </NFormItem>
            </NGridItem>
          </NGrid>

          <NFormItem label="Бюджет года">
            <NSelect
              v-model:value="form.annual_budget_item_id"
              :options="annualBudgetOptions"
              filterable
              clearable
              placeholder="Выберите строку бюджета"
            />
          </NFormItem>

          <NFormItem label="Направления">
            <NSelect
              v-model:value="form.direction_ids"
              :options="directionOptions"
              multiple
              filterable
              clearable
            />
          </NFormItem>
          <NFormItem label="Целевая аудитория">
            <NInput v-model:value="form.target_audience" type="textarea" :rows="2" />
          </NFormItem>
          <NFormItem label="Цели">
            <NInput v-model:value="form.goals" type="textarea" :rows="3" />
          </NFormItem>
          <NFormItem label="Краткое описание">
            <NInput v-model:value="form.short_description" type="textarea" :rows="3" />
          </NFormItem>
          <NGrid :cols="3" :x-gap="16">
            <NGridItem>
              <NFormItem label="Продолжительность, дней">
                <NInputNumber
                  v-model:value="form.duration_days"
                  :min="0"
                  :step="0.5"
                  clearable
                  placeholder="Например, 2"
                  class="w-full"
                />
              </NFormItem>
            </NGridItem>
            <NGridItem>
              <NFormItem label="Продолжительность, часов">
                <NInputNumber
                  v-model:value="form.duration_hours"
                  :min="0"
                  :step="0.5"
                  clearable
                  placeholder="Например, 4"
                  class="w-full"
                />
              </NFormItem>
            </NGridItem>
            <NGridItem>
              <NFormItem label="Количество участников">
                <NInputNumber
                  v-model:value="form.participant_count"
                  :min="0"
                  :step="1"
                  :precision="0"
                  clearable
                  placeholder="Например, 20"
                  class="w-full"
                />
              </NFormItem>
            </NGridItem>
          </NGrid>
          <NGrid v-if="isModularProgramType(form.project_type_id) && !isModule" :cols="2" :x-gap="16">
            <NGridItem>
              <NFormItem label="Промежуток между модулями">
                <NInputNumber v-model:value="form.module_gap_value" :min="0" :precision="0" clearable placeholder="Например, 30" class="w-full" />
              </NFormItem>
            </NGridItem>
            <NGridItem>
              <NFormItem label="Единица промежутка">
                <NSelect v-model:value="form.module_gap_unit" :options="[
                  { label: 'Дни', value: 'days' },
                  { label: 'Недели', value: 'weeks' },
                  { label: 'Месяцы', value: 'months' },
                  { label: 'Кварталы', value: 'quarters' },
                ]" clearable />
              </NFormItem>
            </NGridItem>
          </NGrid>
          <div class="form-footer">
            <NButton type="primary" :loading="loading" @click="submitProject">
              Сохранить
            </NButton>
          </div>
        </NForm>
      </NTabPane>

      <NTabPane name="materials" tab="Материалы">
        <NAlert v-if="!projectId" type="info" class="mb-4">
          Сначала сохраните основную карточку проекта.
        </NAlert>
        <NAlert v-else-if="materialsError" type="warning" class="mb-4">
          {{ materialsError }}
        </NAlert>
        <div class="section-toolbar">
          <NButton v-if="projectId && canAddModules" secondary @click="schedulerOpen = true">
            Запланировать программу
          </NButton>
          <NButton type="primary" :disabled="!projectId || Boolean(materialsError)" @click="openMaterial()">
            Добавить материал
          </NButton>
        </div>
        <NDataTable
          :columns="materialColumns"
          :data="materials"
          :bordered="false"
          size="small"
        />
      </NTabPane>

      <NTabPane name="structure" tab="Структура программы">
        <NAlert v-if="!projectId" type="info" class="mb-4">
          Сначала сохраните программу, после этого здесь можно будет добавлять модули.
        </NAlert>
        <NAlert v-else-if="!canAddModules" type="warning" class="mb-4">
          Чтобы добавлять модули, выберите тип проекта «Модульная программа» и сохраните карточку.
        </NAlert>
        <div class="section-toolbar">
          <NButton
            type="primary"
            :disabled="!canAddModules"
            @click="createModule"
          >
            Добавить модуль
          </NButton>
        </div>
        <NList bordered class="mt-4">
          <NListItem
            v-for="module in projects
              .filter(item => item.parent_project_id === projectId)
              .sort((a, b) => (a.module_position || 999) - (b.module_position || 999))"
            :key="module.id"
          >
            <div class="module-list-item">
              <span>{{ module.module_position ? `${module.module_position}. ` : '' }}{{ module.name }}</span>
              <NButton size="small" @click="editModule(module.id)">Изменить</NButton>
            </div>
          </NListItem>
        </NList>
      </NTabPane>
    </NTabs>

    <NModal
      v-model:show="materialModalOpen"
      preset="card"
      :title="editingMaterialId ? 'Изменить материал' : 'Добавить материал'"
      class="editor-modal"
    >
      <NForm label-placement="top">
        <NGrid :cols="2" :x-gap="16">
          <NGridItem>
            <NFormItem label="Тип материала" required>
              <NSelect v-model:value="materialForm.type_code" :options="materialTypeOptions" />
            </NFormItem>
          </NGridItem>
          <NGridItem>
            <NFormItem label="Статус" required>
              <NSelect v-model:value="materialForm.status_code" :options="materialStatusOptions" />
            </NFormItem>
          </NGridItem>
        </NGrid>
        <NFormItem label="Название">
          <NInput v-model:value="materialForm.title" />
        </NFormItem>
        <NFormItem label="Ссылка или расположение во внутренней системе">
          <NInput
            v-model:value="materialForm.location"
            type="textarea"
            :rows="2"
            placeholder="URL или текстовое описание расположения"
          />
        </NFormItem>
        <NFormItem label="Описание">
          <NInput v-model:value="materialForm.description" type="textarea" :rows="3" />
        </NFormItem>
        <div class="form-footer">
          <NButton @click="materialModalOpen = false">Отмена</NButton>
          <NButton type="primary" :loading="loading" @click="submitMaterial">
            Сохранить
          </NButton>
        </div>
      </NForm>
    </NModal>
    <ProgramSchedulerModal
      v-if="currentProject && canAddModules"
      v-model:show="schedulerOpen"
      :program="currentProject"
      :modules="projects.filter(item => item.parent_project_id === projectId)"
      :overrides="productionCalendarDays"
    />
  </NSpin>
</template>

<style scoped>
.section-toolbar,
.form-footer,
.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.section-toolbar {
  margin-bottom: 16px;
}

.module-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.editor-modal {
  width: min(720px, 92vw);
}
</style>
