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
              <th width="40"></th>
              <th>Nombre de la Receta</th>
              <th>Inversión Base</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="recipe in recipes" :key="recipe.id">
              <tr class="recipe-row" :class="{ 'is-expanded': expandedRecipes[recipe.id!] }"
                @click="toggleExpanded(recipe.id)">
                <td>
                  <button class="btn-expand">
                    <Icon :name="expandedRecipes[recipe.id!] ? 'chevron-down' : 'chevron-right'" />
                  </button>
                </td>
                <td>
                  <div class="recipe-name-cell">
                    <strong>{{ recipe.name }}</strong>
                    <div class="text-xs text-muted">{{ formatDate(recipe.updated_at) }}</div>
                  </div>
                </td>
                <td>
                  <div class="cost-stack">
                    <span class="price-usd">${{ calculateBaseCost(recipe).toFixed(2) }}</span>
                    <span class="price-bs">Bs {{ (calculateBaseCost(recipe) * dolarRate).toFixed(2) }}</span>
                  </div>
                </td>
                <td>
                  <div class="actions" @click.stop>
                    <button @click="$router.push(`/recipes/${recipe.id}/edit`)" class="btn-icon" title="Editar">
                      <Icon name="pencil" />
                    </button>
                    <button @click="confirmDelete(recipe)" class="btn-icon text-danger" title="Eliminar">
                      <Icon name="delete" />
                    </button>
                  </div>
                </td>
              </tr>
              <!-- LINEA DE HIJOS (ESCENARIOS) -->
              <tr v-if="expandedRecipes[recipe.id!]" class="nested-row">
                <td colspan="5">
                  <div class="tree-children">
                    <div v-for="(sc, idx) in recipe.scenarios" :key="idx" class="tree-item">
                      <div class="scenario-card-mini">
                        <div class="sc-info">
                          <Icon name="package-variant" size="sm" />
                          <span class="sc-name">{{ sc.name }}</span>
                          <span class="sc-meta">{{ sc.value }}{{ sc.mode === 'weight' ? 'g' : 'und' }}</span>
                        </div>
                        <div class="sc-finances">
                          <div class="fin-item">
                            <label>Inversión</label>
                            <div class="price-stack-mini">
                              <span class="usd">${{ getScenarioUnitCost(recipe, sc).toFixed(2) }}</span>
                              <span class="bs">Bs {{ (getScenarioUnitCost(recipe, sc) * dolarRate).toFixed(2) }}</span>
                            </div>
                          </div>
                          <div class="fin-item highlight-success">
                            <label>Venta</label>
                            <div class="price-stack-mini">
                              <span class="usd">${{ getScenarioPrice(recipe, sc).toFixed(2) }}</span>
                              <span class="bs">Bs {{ (getScenarioPrice(recipe, sc) * dolarRate).toFixed(2) }}</span>
                            </div>
                          </div>
                          <div class="fin-item highlight-profit">
                            <label>Ganancia</label>
                            <div class="price-stack-mini">
                              <span class="usd">${{ getScenarioProfit(recipe, sc).toFixed(2) }}</span>
                              <span class="bs">Bs {{ (getScenarioProfit(recipe, sc) * dolarRate).toFixed(2) }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
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
const expandedRecipes = ref<Record<string, boolean>>({})
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

function toggleExpanded(recipeId?: string) {
  if (!recipeId) return
  expandedRecipes.value[recipeId] = !expandedRecipes.value[recipeId]
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
function calculateEstimatedUnits(recipe: Recipe, scenario: RecipeScenario): number {
  const totalFinalWeight = Math.max(0, (recipe.total_weight || 0) - (recipe.weight_loss || 0))
  if (scenario.mode === 'unit') {
    if (recipe.has_production_units && recipe.total_production_units) {
      return recipe.total_production_units / (scenario.value || 1)
    }
    return scenario.value || 1
  } else {
    if (totalFinalWeight === 0) return 0
    return totalFinalWeight / (scenario.value || 1)
  }
}

// CALCULATION HELPERS
function getScenarioUtilitiesCost(scenario: RecipeScenario): number {
  return (scenario.utilities || []).reduce((sum: number, u: RecipeUtility) => {
    if (u.product_id) {
      const prod = getProductById(u.product_id)
      if (prod && prod.measurement_value) {
        return sum + (prod.price / prod.measurement_value) * (u.usage_quantity || 0)
      }
    }
    if (!u.quantity) return sum
    return sum + (u.cost / u.quantity) * (u.usage_quantity || 0)
  }, 0)
}

function getScenarioUnitCost(recipe: Recipe, scenario: RecipeScenario): number {
  const units = calculateEstimatedUnits(recipe, scenario)
  if (units <= 0) return 0
  const baseCost = calculateBaseCost(recipe)
  return (baseCost / units) + getScenarioUtilitiesCost(scenario)
}

function getScenarioPrice(recipe: Recipe, scenario: RecipeScenario) {
  if (scenario.fixed_sale_price && scenario.fixed_sale_price > 0) {
    if (scenario.fixed_sale_price_currency === 'Bs') {
      return scenario.fixed_sale_price / (dolarRate.value || 1)
    }
    return scenario.fixed_sale_price
  }
  const unitCost = getScenarioUnitCost(recipe, scenario)
  return unitCost * (1 + (recipe.profit_margin_percent || 0) / 100)
}

function getScenarioProfit(recipe: Recipe, scenario: RecipeScenario): number {
  return getScenarioPrice(recipe, scenario) - getScenarioUnitCost(recipe, scenario)
}

onMounted(() => {
  loadRecipes()
})
</script>

<style scoped>
.recipes-container {
  max-width: 1200px;
  margin: 0 auto;
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
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.recipe-row {
  cursor: pointer;
  transition: background 0.2s;
}

.recipe-row:hover {
  background: var(--background);
}

.recipe-row.is-expanded {
  background: rgba(79, 70, 229, 0.03);
}

.btn-expand {
  background: none;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  cursor: pointer;
  color: var(--text-secondary);
  border-radius: 4px;
}

.btn-expand:hover {
  background: var(--border);
  color: var(--primary);
}

.nested-row td {
  padding: 0 0 16px 0 !important;
  background: rgba(79, 70, 229, 0.01);
}

.tree-children {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tree-item {
  position: relative;
  display: flex;
  align-items: center;
}

.scenario-card-mini {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex: 1;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.sc-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sc-name {
  font-weight: 600;
}

.sc-meta {
  font-size: 0.8rem;
  color: var(--text-secondary);
  background: var(--background);
  padding: 2px 8px;
  border-radius: 12px;
}

.sc-finances {
  display: flex;
  gap: 24px;
}

.fin-item {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.fin-item label {
  font-size: 0.65rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.fin-item span {
  font-weight: 700;
  font-size: 0.95rem;
}

.highlight-success .usd {
  color: #10b981;
  font-weight: 800;
}

.highlight-profit .usd {
  color: var(--primary);
  font-weight: 800;
}

.price-stack-mini {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.price-stack-mini .bs {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: -2px;
}

.cost-stack {
  display: flex;
  flex-direction: column;
}

.cost-stack .price-bs {
  font-size: 0.8rem;
  color: var(--text-secondary);
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

.table-responsive {
  overflow: auto;
}

@media (max-width: 768px) {
  .tree-children {
    padding-left: 15px;
  }

  .scenario-card-mini {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding: 12px;
  }

  .sc-info {
    width: 100%;
    justify-content: space-between;
    border-bottom: 1px solid var(--border);
    padding-bottom: 8px;
  }

  .sc-finances {
    width: 100%;
    justify-content: space-between;
    gap: 0;
  }

  .fin-item {
    align-items: flex-start;
  }

  .price-stack-mini {
    align-items: flex-start;
  }

  .fin-item label {
    font-size: 0.6rem;
  }

  .fin-item .usd {
    font-size: 0.85rem;
  }

  .fin-item .bs {
    font-size: 0.7rem;
  }
}
</style>
