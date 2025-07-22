import { createRouter, createWebHistory } from 'vue-router'
import Products from '../views/Products.vue'
import GoogleDriveView from '../views/GoogleDriveView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Products,
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
