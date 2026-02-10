<template>
  <div class="recipes-container">
    <header class="page-header">
      <h1>Recetas</h1>
      <button @click="$router.push('/recipes/create')" class="btn btn-primary">
        <Icon name="plus" /> Nueva Receta
      </button>
    </header>

    <div class="card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Peso Total</th>
              <th>Inversión Base</th>
              <th>Paquetes / Escenarios</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="recipe in recipes" :key="recipe.id">
              <td>
                <router-link :to="`/recipes/${recipe.id}/edit`" class="recipe-link">
                  {{ recipe.name }}
                </router-link>
                <div class="text-xs text-muted">{{ formatDate(recipe.updated_at) }}</div>
              </td>
              <td>{{ recipe.total_weight.toFixed(2) }}</td>
              <td>
                <div>${{ calculateBaseCost(recipe).toFixed(2) }}</div>
                <div class="text-xs text-muted">Bs {{ (calculateBaseCost(recipe) *
                  dolarRate).toFixed(2) }}
                </div>
              </td>
              <td>
                <div class="scenario-list-mini">
                  <div v-for="(sc, idx) in recipe.scenarios" :key="idx" class="scenario-mini-item">
                    <div class="sc-main">
                      <span class="sc-name">{{ sc.name }}</span>
                      <span class="sc-info">({{ sc.value }}{{ sc.mode === 'weight' ? 'g' : 'und'
                      }})</span>
                    </div>
                    <div class="sc-price-group">
                      <div class="sc-price">${{ getScenarioPrice(recipe, sc).toFixed(2) }}</div>
                      <div class="sc-price-bs">Bs {{ (getScenarioPrice(recipe, sc) * dolarRate).toFixed(2) }}</div>
                    </div>
                  </div>
                </div>
              </td>
              <td>
                <div class="actions">
                  <button @click="$router.push(`/recipes/${recipe.id}/edit`)" class="btn-icon">
                    <Icon name="pencil" />
                  </button>
                  <button @click="confirmDelete(recipe)" class="btn-icon text-danger">
                    <Icon name="delete" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="recipes.length === 0">
              <td colspan="5" class="text-center py-8">
                <Icon name="chef-hat" size="xl" class="mb-2" />
                <p>No hay recetas creadas aún.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'RecipesView' })
import { ref, onMounted, inject, computed, type Ref } from 'vue'
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../firebase.config'
import Icon from '@/components/ui/Icon.vue'
import type { Recipe, RecipeScenario, RecipeUtility } from '../types/recipe'
import type { DolarBCV, Product } from '../types/producto'

const recipes = ref<Recipe[]>([])
const availableProducts = ref<Product[]>([])
const loading = ref(false)

const { dolarBCV } = inject<{ dolarBCV: Ref<DolarBCV | null> }>('dolarBCV')!
const dolarRate = computed(() => dolarBCV.value?.promedio || 0)

async function loadRecipes() {
  loading.value = true
  try {
    // Load products first for calculations
    const prodSnap = await getDocs(collection(db, 'productos'))
    availableProducts.value = prodSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product))

    const snap = await getDocs(collection(db, 'recipes'))
    recipes.value = snap.docs.map(d => ({ id: d.id, ...d.data() } as Recipe))
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function confirmDelete(recipe: Recipe) {
  if (confirm(`¿Eliminar la receta "${recipe.name}"?`)) {
    if (!recipe.id) return
    await deleteDoc(doc(db, 'recipes', recipe.id))
    await loadRecipes()
  }
}

function formatDate(dateStr?: string) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString()
}

function getProductById(id: string): Product | undefined {
  return availableProducts.value.find(p => p.id === id)
}

function calculateBaseCost(recipe: Recipe): number {
  const dynamicCost = recipe.ingredients.reduce((sum, ing) => {
    const prod = getProductById(ing.product_id)
    if (!prod || !prod.measurement_value) return sum
    return sum + (prod.price / prod.measurement_value) * (ing.usage_weight || 0)
  }, 0)
  return dynamicCost || recipe.total_cost_ingredients || 0
}

// CALCULATION HELPERS
function getScenarioPrice(recipe: Recipe, scenario: RecipeScenario) {
  // Recalculate dynamic costs if products are loaded
  const baseCost = calculateBaseCost(recipe)

  const totalFinalWeight = Math.max(0, (recipe.total_weight || 0) - (recipe.weight_loss || 0))

  let units = 1
  if (scenario.mode === 'unit') {
    if (recipe.has_production_units && recipe.total_production_units) {
      units = recipe.total_production_units / (scenario.value || 1)
    } else {
      units = scenario.value || 1
    }
  } else {
    if (totalFinalWeight > 0) {
      units = totalFinalWeight / (scenario.value || 1)
    }
  }

  if (units === 0) return 0

  const utilityCost = (scenario.utilities || []).reduce((sum: number, u: RecipeUtility) => {
    if (u.product_id) {
      const prod = getProductById(u.product_id)
      if (prod && prod.measurement_value) {
        return sum + (prod.price / prod.measurement_value) * (u.usage_quantity || 0)
      }
    }
    if (!u.quantity) return sum
    return sum + (u.cost / u.quantity) * (u.usage_quantity || 0)
  }, 0)

  const totalCost = baseCost + utilityCost
  const unitCost = totalCost / units

  if (scenario.fixed_sale_price && scenario.fixed_sale_price > 0) {
    if (scenario.fixed_sale_price_currency === 'Bs') {
      return scenario.fixed_sale_price / (dolarRate.value || 1)
    }
    return scenario.fixed_sale_price
  }

  return unitCost * (1 + (recipe.profit_margin_percent || 0) / 100)
}

onMounted(() => {
  loadRecipes()
})
</script>

<style scoped>
.recipes-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.card {
  background: var(--surface);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 16px;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.recipe-link {
  font-weight: 600;
  color: var(--primary);
  text-decoration: none;
}

.recipe-link:hover {
  text-decoration: underline;
}

.text-muted {
  color: var(--text-secondary);
}

.text-xs {
  font-size: 0.75rem;
}

.py-8 {
  padding-top: 32px;
  padding-bottom: 32px;
}

.mb-2 {
  margin-bottom: 8px;
}

.tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.tag {
  background: var(--background);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.8rem;
  border: 1px solid var(--border);
}

.actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.btn-icon:hover {
  background: rgba(0, 0, 0, 0.05);
}

.text-danger {
  color: #ef4444;
}

.scenario-list-mini {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.scenario-mini-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  background: var(--background);
  border-radius: 4px;
  font-size: 0.85rem;
  border: 1px solid var(--border);
  min-width: 200px;
}

.sc-main {
  display: flex;
  flex-direction: column;
}

.sc-name {
  font-weight: 600;
  color: var(--text-primary);
}

.sc-info {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.sc-price {
  font-weight: 700;
  color: var(--primary);
}

.sc-price-bs {
  font-size: 0.7rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.sc-price-group {
  text-align: right;
  background: var(--primary-light);
  padding: 2px 8px;
  border-radius: 4px;
}
</style>
