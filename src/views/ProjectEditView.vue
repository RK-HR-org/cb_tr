<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ProjectEditorForm } from '../features/project-editor'
import { DashboardLayout } from '../widgets/dashboard-layout'

const route = useRoute()
const router = useRouter()
const projectId = computed(() => {
  const value = Number(route.params.id)
  return Number.isInteger(value) && value > 0 ? value : null
})
const initialParentProjectId = computed(() => {
  const value = Number(route.query.parentProjectId)
  return Number.isInteger(value) && value > 0 ? value : null
})
const editorKey = computed(() => [
  projectId.value ?? 'new',
  initialParentProjectId.value ?? 'root',
].join(':'))

function handleSaved(id: number) {
  if (projectId.value !== id) {
    router.replace(`/admin/projects/${id}/edit`)
  }
}
</script>

<template>
  <DashboardLayout>
    <div class="editor-page-header">
      <div>
        <NH2 class="!m-0">{{ projectId ? 'Карточка проекта' : 'Новый проект' }}</NH2>
        <NText depth="3">Описание, методолог, направления, структура и материалы</NText>
      </div>
      <NButton @click="router.push('/admin/projects')">К списку</NButton>
    </div>
    <NCard>
      <ProjectEditorForm
        :key="editorKey"
        :project-id="projectId"
        :initial-parent-project-id="initialParentProjectId"
        @saved="handleSaved"
      />
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
