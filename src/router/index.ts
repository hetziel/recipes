import { createRouter, createWebHistory } from 'vue-router'
import Products from '../views/Products.vue'
import { useAuth } from '../composables/useAuth'

const router = createRouter({
  history: createWebHistory('/'),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/StoreView.vue'),
      meta: { public: true }
    },
    {
      path: '/store',
      name: 'store',
      redirect: { name: 'home' }
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { public: true }
    },
    {
      path: '/client-login',
      name: 'client-login',
      component: () => import('../views/ClientLoginView.vue'),
      meta: { public: true }
    },
    {
      path: '/mis-compras',
      name: 'mis-compras',
      component: () => import('../views/MisComprasView.vue'),
    },
    {
      path: '/calculator',
      name: 'calculator',
      component: () => import('../views/CalculatorView.vue'),
      meta: { title: 'Calculadora Bs/USD', public: true }
    },
    {
      path: '/products',
      name: 'inventory',
      component: Products,
      meta: { requiresStaff: true }
    },
    {
      path: '/production',
      name: 'production',
      component: () => import('../views/Recipes.vue'),
      meta: { requiresStaff: true }
    },
    {
      path: '/production/create',
      name: 'production-create',
      component: () => import('../views/RecipeForm.vue'),
      meta: { requiresAdmin: true }
    },
    {
      path: '/production/:id/edit',
      name: 'production-edit',
      component: () => import('../views/RecipeForm.vue'),
      meta: { requiresAdmin: true }
    },
    {
      path: '/production/chicken/create',
      name: 'production-chicken-create',
      component: () => import('../views/ChickenForm.vue'),
      meta: { requiresAdmin: true }
    },
    {
      path: '/production/chicken/:id/edit',
      name: 'production-chicken-edit',
      component: () => import('../views/ChickenForm.vue'),
      meta: { requiresAdmin: true }
    },
    {
      path: '/sales',
      name: 'sales',
      component: () => import('../views/SalesView.vue'),
      meta: { requiresAdmin: true }
    },
    {
      path: '/orders',
      name: 'orders',
      component: () => import('../views/OrdersView.vue'),
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
    {
      path: '/settings/categories-brands',
      name: 'categories-brands',
      component: () => import('../views/CategoriesBrandsView.vue'),
      meta: { requiresAdmin: true }
    },
    {
      path: '/drive',
      name: 'drive',
      component: () => import('../views/GoogleDriveView.vue'),
      meta: { requiresAdmin: true }
    }
  ],
})

router.beforeEach(async (to, from, next) => {
  const { userProfile, currentUser, untilReady } = useAuth()

  // Wait for auth to initialize before making routing decisions
  await untilReady()

  const isAuthenticated = !!currentUser.value
  const role = userProfile.value?.role

  // If route is public, allow access (unless already logged in and going to auth pages)
  if (to.meta.public) {
    if (isAuthenticated && (to.name === 'login' || to.name === 'client-login')) {
      if (role === 'admin') return next({ name: 'home' })
      if (role === 'client') return next({ name: 'home' })
      return next({ name: 'production' })
    }
    return next()
  }

  // If not authenticated, redirect to client login (for private routes)
  if (!isAuthenticated) {
    return next({ name: 'client-login' })
  }

  // Role based access
  if (to.meta.requiresAdmin && role !== 'admin') {
    return next({ name: 'production' })
  }

  // Staff routes (admin or user, but NOT client)
  if (to.meta.requiresStaff && role === 'client') {
    return next({ name: 'home' })
  }

  // If no specific role required and logged in, allow
  next()
})

export default router
