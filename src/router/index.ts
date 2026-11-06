import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import LoginView from '@/views/LoginView.vue'
import AppLayout from '@/components/AppLayout.vue'
import DashboardView from '@/views/DashboardView.vue'
import ProfilesView from '@/views/ProfilesView.vue'
import HolidaysView from '@/views/HolidaysView.vue'
import SchedulesView from '@/views/SchedulesView.vue'
import TherapistsView from '@/views/TherapistsView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { title: 'เข้าสู่ระบบ' },
    },
    {
      path: '/',
      component: AppLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: DashboardView,
          meta: { title: 'dashboard' },
        },
        {
          path: 'profiles',
          name: 'profiles',
          component: ProfilesView,
          meta: { title: 'profiles' },
        },
        {
          path: 'holidays',
          name: 'holidays',
          component: HolidaysView,
          meta: { title: 'holidays' },
        },
        {
          path: 'schedule_versions',
          name: 'schedule_versions',
          component: SchedulesView,
          meta: { title: 'schedule_versions' },
        },
        {
          path: 'schedules',
          redirect: { name: 'schedule_versions' },
        },
        {
          path: 'therapists',
          name: 'therapists',
          component: TherapistsView,
          meta: { title: 'therapists' },
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (!auth.initialized) {
    await auth.restore()
  }

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return {
      name: 'login',
      query: { redirect: to.fullPath },
    }
  }

  if (to.name === 'login' && auth.isLoggedIn) {
    return { name: 'dashboard' }
  }

  return true
})

router.afterEach((to) => {
  const title = typeof to.meta.title === 'string' ? to.meta.title : 'Admin Hub'
  document.title = `${title} | TTM-AdminHub`
})

export default router
