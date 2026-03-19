import { createRouter, createWebHistory } from 'vue-router'


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue')
    },
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/trainer/dashboard',
      name: 'trainer-dashboard',
      component: () => import('../views/TrainerDashboard.vue'),
      meta: { requiresAuth: true, role: 'trainer' }
    },
    {
      path: '/admin/dashboard',
      name: 'admin-dashboard',
      component: () => import('../views/AdminDashboard.vue'),
      meta: { requiresAuth: true, role: 'admin' }
    },
    {
      path: '/admin/table',
      name: 'admin-table',
      component: () => import('../views/AdminTableView.vue'),
      meta: { requiresAuth: true, role: 'admin' }
    },
    {
      path: '/admin/trainers/:id',
      name: 'admin-trainer-view',
      component: () => import('../views/TrainerDashboard.vue'),
      props: true,
      meta: { requiresAuth: true, role: 'admin' }
    },
    {
      path: '/admin/dictionaries',
      name: 'admin-dictionaries',
      component: () => import('../views/DictionariesView.vue'),
      meta: { requiresAuth: true, role: 'admin' }
    }
  ]
})

import { useAuthStore } from '../stores/auth'

// Navigation guard
router.beforeEach(async (to, _from) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.profile) {
    return { name: 'login' }
  } else if (to.name === 'login' && authStore.profile) {
    return { name: 'home' }
  }
})

export default router
