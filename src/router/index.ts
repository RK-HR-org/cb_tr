import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/login",
      name: "login",
      component: () => import("../pages/login"),
    },
    {
      path: "/",
      name: "home",
      component: () => import("../pages/home"),
      meta: { requiresAuth: true },
    },
    {
      path: "/trainer/dashboard",
      name: "trainer-dashboard",
      component: () => import("../pages/trainer-dashboard"),
      meta: { requiresAuth: true, role: "trainer" },
    },
    {
      path: "/calendar",
      name: "calendar",
      component: () => import("../pages/calendar"),
      meta: { requiresAuth: true },
    },
    {
      path: "/account",
      name: "account",
      component: () => import("../pages/account"),
      meta: { requiresAuth: true },
    },
    {
      path: "/admin/dashboard",
      name: "admin-dashboard",
      component: () => import("../pages/admin-dashboard"),
      meta: { requiresAuth: true, role: "admin" },
    },
    {
      path: "/admin/table",
      name: "admin-table",
      component: () => import("../pages/admin-table"),
      meta: { requiresAuth: true, role: "admin" },
    },
    {
      path: "/admin/trainers",
      name: "admin-trainers",
      component: () => import("../pages/dictionaries"),
      props: { trainersOnly: true },
      meta: { requiresAuth: true, role: "admin" },
    },
    {
      path: "/admin/trainers/:id",
      name: "admin-trainer-view",
      component: () => import("../pages/trainer-dashboard"),
      props: true,
      meta: { requiresAuth: true, role: "admin" },
    },
    {
      path: "/admin/trainers/new",
      name: "admin-trainer-create",
      component: () => import("../pages/trainer-edit"),
      meta: { requiresAuth: true, role: "admin" },
    },
    {
      path: "/admin/trainers/:id/edit",
      name: "admin-trainer-edit",
      component: () => import("../pages/trainer-edit"),
      meta: { requiresAuth: true, role: "admin" },
    },
    {
      path: "/admin/projects",
      name: "admin-projects",
      component: () => import("../pages/dictionaries"),
      props: { projectsOnly: true },
      meta: { requiresAuth: true, role: "admin" },
    },
    {
      path: "/admin/projects/new",
      name: "admin-project-create",
      component: () => import("../pages/project-edit"),
      meta: { requiresAuth: true, role: "admin" },
    },
    {
      path: "/admin/projects/:id/edit",
      name: "admin-project-edit",
      component: () => import("../pages/project-edit"),
      meta: { requiresAuth: true, role: "admin" },
    },
    {
      path: "/admin/dictionaries",
      name: "admin-dictionaries",
      component: () => import("../pages/dictionaries"),
      meta: { requiresAuth: true, role: "admin" },
    },
    {
      path: "/gantt",
      name: "gantt",
      component: () => import("../pages/admin-gantt"),
      meta: { requiresAuth: true },
    },
    {
      path: "/admin/gantt",
      name: "admin-gantt",
      component: () => import("../pages/admin-gantt"),
      meta: { requiresAuth: true },
    },
    {
      path: "/admin/work-norms",
      name: "admin-work-norms",
      component: () => import("../pages/work-norms"),
      meta: { requiresAuth: true, role: "admin" },
    },
  ],
});

import { useAuthStore } from "../stores/auth";

// Navigation guard
router.beforeEach(async (to, _from) => {
  const authStore = useAuthStore();
  await authStore.initializeAuth();

  if (to.meta.requiresAuth && !authStore.profile) {
    return { name: "login" };
  }

  if (
    authStore.profile
    && typeof to.meta.role === "string"
    && to.meta.role !== authStore.profile.role
  ) {
    return authStore.profile.role === "admin"
      ? { name: "admin-dashboard" }
      : { name: "trainer-dashboard" };
  }

  if (to.name === "login" && authStore.profile) {
    return { name: "home" };
  }
});

export default router;
