<script setup lang="ts">
import { AccountSettingsForm } from '../features/account-settings'
import { DashboardLayout } from '../widgets/dashboard-layout'
</script>

<template>
  <DashboardLayout>
    <div class="page-header">
      <div>
        <NH2 class="!m-0">Личный кабинет</NH2>
        <NText depth="3">Смена логина и пароля</NText>
      </div>
    </div>
    <AccountSettingsForm />
  </DashboardLayout>
</template>

<style scoped>
.page-header {
  margin-bottom: 24px;
}
</style>
