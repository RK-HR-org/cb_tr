<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import {
  NButton,
  NPopconfirm,
  NTag,
  useMessage,
  type DataTableColumns,
} from 'naive-ui'
import {
  deleteTrainerCertification,
  listCertificationStatuses,
  listTrainerCertifications,
  saveTrainerCertification,
  type CertificationStatus,
  type TrainerCertification,
  type TrainerCertificationPayload,
} from '../../../entities/certification'
import { listProjects, type Project } from '../../../entities/project'
import {
  createTrainerAuth,
  isValidLogin,
  isValidPassword,
  resetTrainerPassword,
} from '../../../entities/auth'
import {
  getTrainer,
  listCities,
  listDivisions,
  saveTrainer,
  type TrainerReference,
} from '../../../entities/trainer'

const props = defineProps<{
  trainerId: number | null
}>()

const emit = defineEmits<{
  saved: [trainerId: number]
}>()

const message = useMessage()
const loading = ref(false)
const certificationModalOpen = ref(false)
const editingCertificationId = ref<number | null>(null)
const cities = ref<TrainerReference[]>([])
const divisions = ref<TrainerReference[]>([])
const projects = ref<Project[]>([])
const certificationStatuses = ref<CertificationStatus[]>([])
const certifications = ref<TrainerCertification[]>([])

const form = ref({
  full_name: '',
  city_id: null as number | null,
  division_id: null as number | null,
  login: '',
})

const initialPassword = ref('')
const hasAuthAccount = ref(false)
const resetPasswordModalOpen = ref(false)
const resetPasswordValue = ref('')

const certificationForm = ref<TrainerCertificationPayload>({
  trainer_id: props.trainerId ?? 0,
  project_id: 0,
  status_code: 'certified',
  valid_from: null,
  valid_until: null,
  notes: null,
})

const cityOptions = computed(() => cities.value.map(item => ({
  label: item.name,
  value: item.id,
})))
const divisionOptions = computed(() => divisions.value.map(item => ({
  label: item.name,
  value: item.id,
})))
const projectOptions = computed(() => projects.value.map(project => ({
  label: project.parent_project?.name
    ? `${project.parent_project.name} / ${project.name}`
    : project.name,
  value: project.id,
})))
const certificationStatusOptions = computed(() => certificationStatuses.value.map(status => ({
  label: status.name,
  value: status.code,
})))

function errorMessage(error: unknown, fallback: string) {
  const value = error as { message?: string }
  return value?.message || fallback
}

const certificationColumns: DataTableColumns<TrainerCertification> = [
  {
    title: 'Проект / программа',
    key: 'project',
    render: row => row.project_names?.name || `#${row.project_id}`,
  },
  {
    title: 'Статус',
    key: 'status',
    render: row => h(
      NTag,
      {
        type: row.certification_statuses?.grants_access ? 'success' : 'warning',
        bordered: false,
        size: 'small',
      },
      { default: () => row.certification_statuses?.name || row.status_code },
    ),
  },
  {
    title: 'Действует',
    key: 'validity',
    render: row => [row.valid_from, row.valid_until].filter(Boolean).join(' — ') || 'Без ограничения',
  },
  {
    title: 'Действия',
    key: 'actions',
    width: 150,
    render: row => h('div', { class: 'editor-actions' }, [
      h(NButton, { size: 'small', onClick: () => openCertification(row) }, {
        default: () => 'Изменить',
      }),
      h(NPopconfirm, { onPositiveClick: () => removeCertification(row.id) }, {
        trigger: () => h(NButton, { size: 'small', type: 'error' }, {
          default: () => 'Удалить',
        }),
        default: () => 'Удалить допуск?',
      }),
    ]),
  },
]

async function load() {
  loading.value = true
  try {
    const [cityRows, divisionRows, projectRows, statusRows, trainer] = await Promise.all([
      listCities(),
      listDivisions(),
      listProjects(),
      listCertificationStatuses(),
      props.trainerId ? getTrainer(props.trainerId) : Promise.resolve(null),
    ])
    cities.value = cityRows
    divisions.value = divisionRows
    projects.value = projectRows
    certificationStatuses.value = statusRows
    if (trainer) {
      form.value = {
        full_name: trainer.full_name,
        city_id: trainer.city_id,
        division_id: trainer.division_id,
        login: trainer.login || '',
      }
      hasAuthAccount.value = Boolean(trainer.auth_user_id)
      certifications.value = await listTrainerCertifications(trainer.id)
    } else if (props.trainerId) {
      throw new Error('Тренер не найден')
    }
  } catch (error) {
    message.error(errorMessage(error, 'Не удалось загрузить карточку тренера'))
  } finally {
    loading.value = false
  }
}

async function submitTrainer() {
  if (!form.value.full_name.trim()) {
    message.warning('Укажите ФИО тренера')
    return
  }

  const normalizedLogin = form.value.login.trim().toLowerCase()
  const isNewTrainer = !props.trainerId
  const needsAuthAccount = isNewTrainer || !hasAuthAccount.value

  if (needsAuthAccount) {
    if (!isValidLogin(normalizedLogin)) {
      message.warning('Логин: 3–32 символа, латиница, цифры и _')
      return
    }
    if (!isValidPassword(initialPassword.value)) {
      message.warning('Укажите начальный пароль не короче 8 символов')
      return
    }
  }

  loading.value = true
  try {
    const trainer = await saveTrainer({
      full_name: form.value.full_name.trim(),
      city_id: form.value.city_id,
      division_id: form.value.division_id,
      login: normalizedLogin || null,
    }, props.trainerId)

    if (needsAuthAccount) {
      await createTrainerAuth(trainer.id, normalizedLogin, initialPassword.value)
      hasAuthAccount.value = true
      initialPassword.value = ''
      message.success(isNewTrainer
        ? 'Тренер создан, учётная запись активирована'
        : 'Учётная запись тренера создана')
    } else {
      message.success('Карточка тренера сохранена')
    }

    emit('saved', trainer.id)
  } catch (error) {
    message.error(errorMessage(error, 'Не удалось сохранить тренера'))
  } finally {
    loading.value = false
  }
}

async function submitPasswordReset() {
  if (!props.trainerId) return
  if (!isValidPassword(resetPasswordValue.value)) {
    message.warning('Пароль должен содержать не менее 8 символов')
    return
  }

  loading.value = true
  try {
    await resetTrainerPassword(props.trainerId, resetPasswordValue.value)
    resetPasswordValue.value = ''
    resetPasswordModalOpen.value = false
    message.success('Пароль тренера обновлён')
  } catch (error) {
    message.error(errorMessage(error, 'Не удалось сбросить пароль'))
  } finally {
    loading.value = false
  }
}

function openCertification(certification?: TrainerCertification) {
  if (!props.trainerId) {
    message.info('Сначала сохраните карточку тренера')
    return
  }
  editingCertificationId.value = certification?.id ?? null
  certificationForm.value = {
    trainer_id: props.trainerId,
    project_id: certification?.project_id ?? 0,
    status_code: certification?.status_code ?? 'certified',
    valid_from: certification?.valid_from ?? null,
    valid_until: certification?.valid_until ?? null,
    notes: certification?.notes ?? null,
  }
  certificationModalOpen.value = true
}

async function submitCertification() {
  if (!certificationForm.value.project_id) {
    message.warning('Выберите проект или программу')
    return
  }
  if (
    certificationForm.value.valid_from
    && certificationForm.value.valid_until
    && certificationForm.value.valid_until < certificationForm.value.valid_from
  ) {
    message.warning('Дата окончания допуска не может быть раньше даты начала')
    return
  }
  loading.value = true
  try {
    await saveTrainerCertification(
      certificationForm.value,
      editingCertificationId.value,
    )
    certifications.value = await listTrainerCertifications(certificationForm.value.trainer_id)
    certificationModalOpen.value = false
    message.success('Допуск сохранён')
  } catch (error) {
    message.error(errorMessage(error, 'Не удалось сохранить допуск'))
  } finally {
    loading.value = false
  }
}

async function removeCertification(id: number) {
  if (!props.trainerId) return
  try {
    await deleteTrainerCertification(id)
    certifications.value = await listTrainerCertifications(props.trainerId)
    message.success('Допуск удалён')
  } catch (error) {
    message.error(errorMessage(error, 'Не удалось удалить допуск'))
  }
}

onMounted(load)
</script>

<template>
  <NSpin :show="loading">
    <NTabs type="line" animated>
      <NTabPane name="profile" tab="Основное">
        <NForm label-placement="top">
          <NFormItem label="ФИО" required>
            <NInput v-model:value="form.full_name" placeholder="Фамилия Имя Отчество" />
          </NFormItem>
          <NFormItem label="Логин" :required="!trainerId || !hasAuthAccount">
            <NInput
              v-model:value="form.login"
              :readonly="Boolean(trainerId && hasAuthAccount)"
              placeholder="ivanov"
            />
          </NFormItem>
          <NFormItem v-if="!trainerId || !hasAuthAccount" label="Начальный пароль" required>
            <NInput
              v-model:value="initialPassword"
              type="password"
              show-password-on="click"
              placeholder="Не менее 8 символов"
            />
          </NFormItem>
          <div v-if="trainerId && hasAuthAccount" class="password-actions">
            <NButton @click="resetPasswordModalOpen = true">
              Сбросить пароль
            </NButton>
          </div>
          <NGrid :cols="2" :x-gap="16">
            <NGridItem>
              <NFormItem label="Подразделение">
                <NSelect
                  v-model:value="form.division_id"
                  :options="divisionOptions"
                  filterable
                  clearable
                  placeholder="Выберите подразделение"
                />
              </NFormItem>
            </NGridItem>
            <NGridItem>
              <NFormItem label="Город">
                <NSelect
                  v-model:value="form.city_id"
                  :options="cityOptions"
                  filterable
                  clearable
                  placeholder="Выберите город"
                />
              </NFormItem>
            </NGridItem>
          </NGrid>
          <div class="form-footer">
            <NButton type="primary" :loading="loading" @click="submitTrainer">
              Сохранить
            </NButton>
          </div>
        </NForm>
      </NTabPane>

      <NTabPane name="certifications" tab="Допуски и сертификации">
        <NAlert v-if="!trainerId" type="info" class="mb-4">
          Сначала сохраните основную карточку тренера.
        </NAlert>
        <div class="section-toolbar">
          <NButton type="primary" :disabled="!trainerId" @click="openCertification()">
            Добавить допуск
          </NButton>
        </div>
        <NDataTable
          :columns="certificationColumns"
          :data="certifications"
          :bordered="false"
          size="small"
        />
        <NText depth="3" class="inheritance-note">
          Допуск к программе автоматически действует для всех её модулей.
        </NText>
      </NTabPane>
    </NTabs>

    <NModal
      v-model:show="certificationModalOpen"
      preset="card"
      :title="editingCertificationId ? 'Изменить допуск' : 'Добавить допуск'"
      class="editor-modal"
    >
      <NForm label-placement="top">
        <NFormItem label="Проект или программа" required>
          <NSelect
            v-model:value="certificationForm.project_id"
            :options="projectOptions"
            filterable
          />
        </NFormItem>
        <NFormItem label="Статус" required>
          <NSelect
            v-model:value="certificationForm.status_code"
            :options="certificationStatusOptions"
          />
        </NFormItem>
        <NGrid :cols="2" :x-gap="16">
          <NGridItem>
            <NFormItem label="Действует с">
              <NDatePicker
                v-model:formatted-value="certificationForm.valid_from"
                value-format="yyyy-MM-dd"
                type="date"
                clearable
                class="w-full"
              />
            </NFormItem>
          </NGridItem>
          <NGridItem>
            <NFormItem label="Действует до">
              <NDatePicker
                v-model:formatted-value="certificationForm.valid_until"
                value-format="yyyy-MM-dd"
                type="date"
                clearable
                class="w-full"
              />
            </NFormItem>
          </NGridItem>
        </NGrid>
        <NFormItem label="Комментарий">
          <NInput v-model:value="certificationForm.notes" type="textarea" :rows="3" />
        </NFormItem>
        <div class="form-footer">
          <NButton @click="certificationModalOpen = false">Отмена</NButton>
          <NButton type="primary" :loading="loading" @click="submitCertification">
            Сохранить
          </NButton>
        </div>
      </NForm>
    </NModal>

    <NModal
      v-model:show="resetPasswordModalOpen"
      preset="card"
      title="Сброс пароля тренера"
      class="editor-modal"
    >
      <NForm label-placement="top">
        <NFormItem label="Новый пароль" required>
          <NInput
            v-model:value="resetPasswordValue"
            type="password"
            show-password-on="click"
            placeholder="Не менее 8 символов"
          />
        </NFormItem>
        <div class="form-footer">
          <NButton @click="resetPasswordModalOpen = false">Отмена</NButton>
          <NButton type="primary" :loading="loading" @click="submitPasswordReset">
            Сохранить
          </NButton>
        </div>
      </NForm>
    </NModal>
  </NSpin>
</template>

<style scoped>
.section-toolbar,
.form-footer,
.editor-actions,
.password-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.password-actions {
  margin-bottom: 16px;
}

.section-toolbar {
  margin-bottom: 16px;
}

.inheritance-note {
  display: block;
  margin-top: 12px;
}

.editor-modal {
  width: min(680px, 92vw);
}
</style>
