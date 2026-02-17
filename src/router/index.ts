import { createRouter, createWebHistory } from 'vue-router'
import Products from '../views/Products.vue'
import { useAuth } from '../composables/useAuth'

const router = createRouter({
  history: createWebHistory('/'),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { public: true }
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
      meta: { public: true }
    },
    {
      path: '/',
      name: 'home',
      component: Products,
      meta: { requiresAdmin: true }
    },
    {
      path: '/buys',
      name: 'buys',
      component: () => import('../views/BuysView.vue'),
      meta: { requiresAdmin: true }
    },
    {
      path: '/calculator',
      name: 'calculator',
      component: () => import('../views/CalculatorView.vue'),
      meta: { title: 'Calculadora Bs/USD' }
    },
    {
      path: '/recipes',
      name: 'recipes',
      component: () => import('../views/Recipes.vue'),
    },
    {
      path: '/recipes/create',
      name: 'recipes-create',
      component: () => import('../views/RecipeForm.vue'),
      meta: { requiresAdmin: true }
    },
    {
      path: '/recipes/:id/edit',
      name: 'recipes-edit',
      component: () => import('../views/RecipeForm.vue'),
      meta: { requiresAdmin: true }
    },
    {
      path: '/sales',
      name: 'sales',
      component: () => import('../views/SalesView.vue'),
      meta: { requiresAdmin: true }
    },
    {
      path: '/customers',
      name: 'customers',
      component: () => import('../views/CustomersView.vue'),
      meta: { requiresAdmin: true }
    },
    {
      path: '/establishments',
      name: 'establishments',
      component: () => import('../views/EstablishmentsView.vue'),
      meta: { requiresAdmin: true }
    },
  ],
})

router.beforeEach(async (to, from, next) => {
  const { userProfile, currentUser, untilReady } = useAuth()

  // Wait for auth to initialize before making routing decisions
  await untilReady()

  const isAuthenticated = !!currentUser.value

  // If route is public, allow access
  if (to.meta.public) {
    if (isAuthenticated && (to.name === 'login' || to.name === 'register')) {
      return next({ name: userProfile.value?.role === 'admin' ? 'home' : 'recipes' })
    }
    return next()
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return next({ name: 'login' })
  }

  // Role based access
  const role = userProfile.value?.role

  if (to.meta.requiresAdmin && role !== 'admin') {
    return next({ name: 'recipes' })
  }

  next()
})

export default router
