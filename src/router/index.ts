import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import GoogleDriveView from '../views/GoogleDriveView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/buys',
      name: 'buys',
      component: () => import('../views/BuysView.vue'),
    },
    {
      path: '/drive',
      name: 'drive',
      component: GoogleDriveView,
      meta: {
        requiresAuth: true // Opcional: para proteger esta ruta
      }
    },
  ],
})

export default router
