<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { TrainerEditorForm } from '../features/trainer-editor'
import { DashboardLayout } from '../widgets/dashboard-layout'

const route = useRoute()
const router = useRouter()
const trainerId = computed(() => {
  const value = Number(route.params.id)
  return Number.isInteger(value) && value > 0 ? value : null
})

function handleSaved(id: number) {
  if (trainerId.value !== id) {
    router.replace(`/admin/trainers/${id}/edit`)
  }
}
</script>

<template>
  <DashboardLayout>
    <div class="editor-page-header">
      <div>
        <NH2 class="!m-0">{{ trainerId ? 'Карточка тренера' : 'Новый тренер' }}</NH2>
        <NText depth="3">Профиль, подразделение, город и проектные допуски</NText>
      </div>
      <NButton @click="router.push('/admin/trainers')">К списку</NButton>
    </div>
    <NCard>
      <TrainerEditorForm :trainer-id="trainerId" @saved="handleSaved" />
    </NCard>
  </DashboardLayout>
</template>

<style scoped>
.editor-page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}
</style>
