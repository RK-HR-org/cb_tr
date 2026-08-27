<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NCard, NForm, NFormItem, NInput, NText, useMessage } from 'naive-ui'
import {
  changeOwnLogin,
  changeOwnPassword,
  getAccountLogin,
  isValidLogin,
  isValidPassword,
} from '../../../entities/auth'
import { useAuthStore } from '../../../stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const message = useMessage()

const currentLogin = ref('')
const loadingLogin = ref(true)

const loginForm = ref({
  newLogin: '',
  currentPassword: '',
})
const savingLogin = ref(false)

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})
const savingPassword = ref(false)

function errorMessage(error: unknown, fallback: string) {
  const value = error as { message?: string }
  return value?.message || fallback
}

async function loadLogin() {
  loadingLogin.value = true
  try {
    currentLogin.value = (await getAccountLogin()) || '—'
  } catch {
    currentLogin.value = '—'
  } finally {
    loadingLogin.value = false
  }
}

async function handleChangeLogin() {
  const normalizedLogin = loginForm.value.newLogin.trim().toLowerCase()
  if (!normalizedLogin || !loginForm.value.currentPassword) {
    message.warning('Заполните новый логин и текущий пароль')
    return
  }
  if (!isValidLogin(normalizedLogin)) {
    message.warning('Логин: 3–32 символа, латиница, цифры и _')
    return
  }
  if (normalizedLogin === currentLogin.value) {
    message.warning('Новый логин совпадает с текущим')
    return
  }

  savingLogin.value = true
  try {
    await changeOwnLogin(normalizedLogin, loginForm.value.currentPassword)
    message.success('Логин изменён. Войдите с новым логином.')
    await authStore.signOut()
    router.push('/login')
  } catch (error) {
    message.error(errorMessage(error, 'Не удалось сменить логин'))
  } finally {
    savingLogin.value = false
  }
}

async function handleChangePassword() {
  const { currentPassword, newPassword, confirmPassword } = passwordForm.value
  if (!currentPassword || !newPassword || !confirmPassword) {
    message.warning('Заполните все поля пароля')
    return
  }
  if (!isValidPassword(newPassword)) {
    message.warning('Новый пароль должен содержать не менее 8 символов')
    return
  }
  if (newPassword !== confirmPassword) {
    message.warning('Новый пароль и подтверждение не совпадают')
    return
  }

  savingPassword.value = true
  try {
    await changeOwnPassword(currentPassword, newPassword)
    message.success('Пароль успешно изменён')
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    }
  } catch (error) {
    message.error(errorMessage(error, 'Не удалось сменить пароль'))
  } finally {
    savingPassword.value = false
  }
}

onMounted(loadLogin)
</script>

<template>
  <div class="account-settings">
    <NCard title="Профиль" size="small">
      <div class="profile-row">
        <span class="profile-label">Имя</span>
        <span>{{ authStore.profile?.full_name || '—' }}</span>
      </div>
      <div class="profile-row">
        <span class="profile-label">Текущий логин</span>
        <span>{{ loadingLogin ? 'Загрузка…' : currentLogin }}</span>
      </div>
      <div class="profile-row">
        <span class="profile-label">Роль</span>
        <span>{{ authStore.profile?.role === 'admin' ? 'Администратор' : 'Тренер' }}</span>
      </div>
    </NCard>

    <NCard title="Смена логина" size="small">
      <NText depth="3" class="section-hint">
        После смены логина потребуется войти заново.
      </NText>
      <NForm label-placement="top" class="settings-form">
        <NFormItem label="Новый логин">
          <NInput
            v-model:value="loginForm.newLogin"
            placeholder="Например: ivanov"
            autocomplete="username"
          />
        </NFormItem>
        <NFormItem label="Текущий пароль">
          <NInput
            v-model:value="loginForm.currentPassword"
            type="password"
            show-password-on="click"
            placeholder="Подтвердите текущий пароль"
            autocomplete="current-password"
          />
        </NFormItem>
        <NButton
          type="primary"
          :loading="savingLogin"
          @click="handleChangeLogin"
        >
          Сохранить логин
        </NButton>
      </NForm>
    </NCard>

    <NCard title="Смена пароля" size="small">
      <NForm label-placement="top" class="settings-form">
        <NFormItem label="Текущий пароль">
          <NInput
            v-model:value="passwordForm.currentPassword"
            type="password"
            show-password-on="click"
            placeholder="Введите текущий пароль"
            autocomplete="current-password"
          />
        </NFormItem>
        <NFormItem label="Новый пароль">
          <NInput
            v-model:value="passwordForm.newPassword"
            type="password"
            show-password-on="click"
            placeholder="Не менее 8 символов"
            autocomplete="new-password"
          />
        </NFormItem>
        <NFormItem label="Подтверждение нового пароля">
          <NInput
            v-model:value="passwordForm.confirmPassword"
            type="password"
            show-password-on="click"
            placeholder="Повторите новый пароль"
            autocomplete="new-password"
          />
        </NFormItem>
        <NButton
          type="primary"
          :loading="savingPassword"
          @click="handleChangePassword"
        >
          Сохранить пароль
        </NButton>
      </NForm>
    </NCard>
  </div>
</template>

<style scoped>
.account-settings {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 520px;
}

.profile-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 6px 0;
}

.profile-label {
  color: var(--n-text-color-3);
}

.section-hint {
  display: block;
  margin-bottom: 12px;
}

.settings-form {
  margin-top: 4px;
}
</style>
