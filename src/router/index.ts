import { createRouter, createWebHistory } from 'vue-router'
import Products from '../views/Products.vue'
const router = createRouter({
  history: createWebHistory('/'),
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
      path: '/calculator',
      name: 'calculator',
      component: () => import('../views/CalculatorView.vue'),
      meta: {
        title: 'Calculadora Bs/USD'
      }
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
    },
    {
      path: '/recipes/:id/edit',
      name: 'recipes-edit',
      component: () => import('../views/RecipeForm.vue'),
    },
  ],
})

export default router
