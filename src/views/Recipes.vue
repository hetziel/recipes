<template>
  <div class="recipes-container">
    <header class="page-header">
      <h1>Producción</h1>
      <div v-if="userProfile?.role === 'admin'" class="header-buttons">
        <button @click="$router.push('/production/chicken/create')" class="btn btn-warning">
          <Icon name="bird" /> Nuevo Lote de Pollos
        </button>
        <button @click="$router.push('/production/create')" class="btn btn-primary">
          <Icon name="plus" /> Nueva Producción
        </button>
      </div>
    </header>

    <!-- Sección de Lotes de Pollos -->
    <div v-if="chickenBatches.length > 0" class="section-container">
      <div class="section-header">
        <Icon name="bird" class="section-icon chicken" />
        <h2 class="section-title">Lotes de Pollos</h2>
        <span class="badge">{{ chickenBatches.length }}</span>
      </div>
      <div class="card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th width="40"></th>
                <th>Nombre del Lote</th>
                <th v-if="userProfile?.role === 'admin'">Inversión / Costo Unitario</th>
                <th v-if="userProfile?.role === 'admin'">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="recipe in chickenBatches" :key="recipe.id">
                <tr class="recipe-row" :class="{ 'is-expanded': expandedRecipes[recipe.id!] }"
                  @click="toggleExpanded(recipe.id)">
                  <td>
                    <button class="btn-expand">
                      <Icon :name="expandedRecipes[recipe.id!] ? 'chevron-down' : 'chevron-right'" />
                    </button>
                  </td>
                  <td>
                    <div class="recipe-name-cell">
                      <div class="title-with-icon">
                        <Icon name="bird" class="recipe-type-icon chicken" />
                        <strong>{{ recipe.name }}</strong>
                      </div>
                      <div class="text-xs text-muted">{{ formatDate(recipe.updated_at) }}</div>
                    </div>
                  </td>
                  <td v-if="userProfile?.role === 'admin'">
                    <div class="cost-stack">
                      <span class="price-usd">${{ (recipe.total_cost_ingredients /
                        (recipe.chicken_data?.initial_quantity
                          || 1)).toFixed(2) }}<small>/u</small></span>
                      <span class="price-bs">Total: ${{ recipe.total_cost_ingredients.toFixed(2) }}</span>
                    </div>
                  </td>
                  <td v-if="userProfile?.role === 'admin'">
                    <div class="actions" @click.stop>
                      <button @click="openCalculationModal(recipe)" class="btn-icon text-warning"
                        title="Cálculos de Venta">
                        <Icon name="calculator" />
                      </button>
                      <button @click="openSalesModal(recipe)" class="btn-icon text-primary" title="Ventas Registradas">
                        <Icon name="cash-check" />
                      </button>
                      <button @click="$router.push(`/production/chicken/${recipe.id}/edit`)" class="btn-icon"
                        title="Editar Lote">
                        <Icon name="pencil" />
                      </button>
                      <button @click="confirmDelete(recipe)" class="btn-icon text-danger" title="Eliminar">
                        <Icon name="delete" />
                      </button>
                    </div>
                  </td>
                </tr>
                <!-- LINEA DE HIJOS (CHICKEN SUMMARY) -->
                <tr v-if="expandedRecipes[recipe.id!]" class="nested-row">
                  <td colspan="5">
                    <div class="tree-children">
                      <div v-if="getChickenCalculations(recipe)" class="chicken-expanded-summary">
                        <div class="summary-grid-mini">
                          <div class="summary-item-mini">
                            <label>Costo por Pollo</label>
                            <span>${{ getChickenCalculations(recipe)!.costPerChicken.toFixed(2) }}</span>
                          </div>
                          <div class="summary-item-mini">
                            <label>Alimento (kg)</label>
                            <span>Est. Inicio: {{ getChickenCalculations(recipe)!.totalStarterNeeded.toFixed(1)
                              }}kg</span>
                          </div>
                          <div class="summary-item-mini highlight-profit">
                            <label>Ganancia Proyectada</label>
                            <span>
                              ${{ getChickenCalculations(recipe)!.projectedProfit.toFixed(2) }}
                              <small v-if="recipe.total_cost_ingredients" style="font-weight: normal;">
                                ({{ ((getChickenCalculations(recipe)!.projectedProfit / recipe.total_cost_ingredients) *
                                  100).toFixed(1) }}%)
                              </small>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Sección de Recetas Estándar -->
    <div class="section-container mt-8">
      <div class="section-header">
        <Icon name="silverware-variant" class="section-icon" />
        <h2 class="section-title">Recetas Estándar</h2>
        <span class="badge">{{ standardRecipes.length }}</span>
      </div>
      <div class="card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th width="40"></th>
                <th>Nombre de la Receta</th>
                <th v-if="userProfile?.role === 'admin'">Inversión Base</th>
                <th v-if="userProfile?.role === 'admin'">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="recipe in standardRecipes" :key="recipe.id">
                <tr class="recipe-row" :class="{ 'is-expanded': expandedRecipes[recipe.id!] }"
                  @click="toggleExpanded(recipe.id)">
                  <td>
                    <button class="btn-expand">
                      <Icon :name="expandedRecipes[recipe.id!] ? 'chevron-down' : 'chevron-right'" />
                    </button>
                  </td>
                  <td>
                    <div class="recipe-name-cell">
                      <div class="title-with-icon">
                        <Icon name="silverware-variant" class="recipe-type-icon" />
                        <strong>{{ recipe.name }}</strong>
                      </div>
                      <div class="text-xs text-muted">{{ formatDate(recipe.updated_at) }}</div>
                    </div>
                  </td>
                  <td v-if="userProfile?.role === 'admin'">
                    <div class="cost-stack">
                      <span class="price-usd">${{ calculateBaseCost(recipe).toFixed(2) }}</span>
                      <span class="price-bs">Bs {{ (calculateBaseCost(recipe) * dolarRate).toFixed(2) }}</span>
                    </div>
                  </td>
                  <td v-if="userProfile?.role === 'admin'">
                    <div class="actions" @click.stop>
                      <button @click="$router.push(`/production/${recipe.id}/edit`)" class="btn-icon"
                        title="Editar Receta">
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
                      <div v-for="(sc, idx) in getRecipesScenarios(recipe.id!)" :key="idx" class="tree-item">
                        <div class="scenario-card-mini">
                          <div class="sc-info">
                            <Icon name="package-variant" size="sm" />
                            <span class="sc-name">{{ sc.name }}</span>
                            <span class="sc-meta">{{ sc.value }}{{ sc.mode === 'weight' ? 'g' : 'und' }}</span>
                          </div>
                          <div class="sc-finances">
                            <div v-if="userProfile?.role === 'admin'" class="fin-item">
                              <label>Inversión</label>
                              <div class="price-stack-mini">
                                <span class="usd">${{ getScenarioUnitCost(recipe, sc).toFixed(2) }}</span>
                                <span class="bs">Bs {{ (getScenarioUnitCost(recipe, sc) * dolarRate).toFixed(2)
                                }}</span>
                              </div>
                            </div>
                            <div class="fin-item highlight-success">
                              <label>Venta</label>
                              <div class="price-stack-mini">
                                <span class="usd">${{ getScenarioPrice(recipe, sc).toFixed(2) }}</span>
                                <span class="bs">Bs {{ (getScenarioPrice(recipe, sc) * dolarRate).toFixed(2) }}</span>
                              </div>
                            </div>
                            <div v-if="userProfile?.role === 'admin'" class="fin-item highlight-profit">
                              <label>Ganancia</label>
                              <div class="price-stack-mini">
                                <span class="usd">
                                  ${{ getScenarioProfit(recipe, sc).toFixed(2) }}
                                  <small v-if="getScenarioUnitCost(recipe, sc)" style="font-weight: normal;">
                                    ({{ ((getScenarioProfit(recipe, sc) / (getScenarioUnitCost(recipe, sc) *
                                      calculateEstimatedUnits(recipe, sc))) * 100).toFixed(1) }}%)
                                  </small>
                                </span>
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
              <tr v-if="standardRecipes.length === 0">
                <td :colspan="userProfile?.role === 'admin' ? 4 : 2" class="text-center py-8">
                  <Icon name="chef-hat" size="xl" class="mb-2" />
                  <p>No hay recetas creadas aún.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal de Ventas Registradas -->
    <div v-if="showSalesModal && selectedBatch" class="modal-overlay">
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h3>
            <Icon name="bird" class="mr-2 chicken" />
            Ventas de: {{ selectedBatch.name }}
          </h3>
          <button @click="showSalesModal = false" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <ChickenBatchSales v-if="selectedBatch.chicken_data" v-model="selectedBatch.chicken_data" :readonly="false"
            :totalIngredientsCost="selectedBatch.total_cost_ingredients" :dolarRate="dolarRate" />
        </div>
        <div class="modal-footer footer-actions">
          <button @click="showSalesModal = false" class="btn btn-secondary">Cerrar</button>
          <button @click="saveSales" class="btn btn-primary" :disabled="isSavingSales">
            <Icon name="content-save" />
            {{ isSavingSales ? 'Guardando...' : 'Guardar Cambios' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de Cálculos de Venta -->
    <div v-if="showCalculationModal && selectedBatch" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3>
            <Icon name="calculator" class="mr-2" />
            Cálculos: {{ selectedBatch.name }}
          </h3>
          <button @click="showCalculationModal = false" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="calculation-form">
            <div class="form-group mb-4">
              <label class="text-xs font-bold text-muted">Precio de Venta ($/kg)</label>
              <input v-model.number="calculationData.salePrice" type="number" class="form-input" step="0.01"
                @input="updateCalculationAmount" />
            </div>
            <div class="form-group mb-4">
              <label class="text-xs font-bold text-muted">Monto en Dólares ($)</label>
              <input v-model.number="calculationData.amount" type="number" class="form-input" step="0.01"
                @input="updateCalculationAmount" />
            </div>
            <div class="form-group mb-4">
              <label class="text-xs font-bold text-muted">Cantidad en Kilos (kg)</label>
              <input v-model.number="calculationData.kilograms" type="number" class="form-input" step="0.1"
                @input="updateCalculationKilos" />
            </div>
          </div>

          <div class="calculation-summary mt-6 p-4 bg-primary-light rounded-lg border-primary">
            <div class="summary-item text-center">
              <label class="text-xs text-secondary uppercase font-bold">Resumen de Cálculo</label>
              <div class="value text-primary text-xl font-bold mt-1">
                {{ calculationData.kilograms.toFixed(2) }} kg de pollo
              </div>
              <div class="text-xs text-muted">equivalen a ${{ calculationData.amount.toFixed(2) }}</div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showCalculationModal = false" class="btn btn-secondary btn-block">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'RecipesView' })
import { ref, onMounted, inject, computed, type Ref } from 'vue'
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase.config'
import Icon from '@/components/ui/Icon.vue'
import ChickenBatchSales from '@/components/productions/chicken_batches/ChickenBatchSales.vue'
import type { Recipe, RecipeScenario, RecipeUtility } from '../types/recipe'
import type { DolarBCV, Product } from '../types/producto'
import { useAuth } from '../composables/useAuth'
import { useProduction } from '../composables/useProduction'

const { userProfile } = useAuth()
const recipes = ref<Recipe[]>([])
const availableProducts = ref<Product[]>([])
const expandedRecipes = ref<Record<string, boolean>>({})
const allScenarios = ref<RecipeScenario[]>([])
const loading = ref(false)
const showSalesModal = ref(false)
const showCalculationModal = ref(false)
const isSavingSales = ref(false)
const selectedBatch = ref<Recipe | null>(null)
const calculationData = ref({
  salePrice: 0,
  amount: 0,
  kilograms: 0
})

const { dolarBCV } = inject<{ dolarBCV: Ref<DolarBCV | null> }>('dolarBCV')!
const dolarRate = computed(() => dolarBCV.value?.promedio || 0)

const {
  calculateBaseCost,
  calculateChickenCalculations,
  getProductById
} = useProduction(availableProducts, dolarRate)

const standardRecipes = computed(() => recipes.value.filter(r => !r.is_chicken_batch))
const chickenBatches = computed(() => recipes.value.filter(r => r.is_chicken_batch))

async function loadRecipes() {
  loading.value = true
  try {
    // Load products first for calculations
    const prodSnap = await getDocs(collection(db, 'productos'))
    availableProducts.value = prodSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product))

    const snap = await getDocs(collection(db, 'recipes'))
    recipes.value = snap.docs.map(d => ({ id: d.id, ...d.data() } as Recipe))

    // Load all scenarios to distribute among recipes
    const scSnap = await getDocs(collection(db, 'scenarios'))
    allScenarios.value = scSnap.docs.map(d => ({ id: d.id, ...d.data() } as RecipeScenario))
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

function openSalesModal(batch: Recipe) {
  selectedBatch.value = JSON.parse(JSON.stringify(batch)) // Clone to avoid direct mutation
  showSalesModal.value = true
}

async function saveSales() {
  if (!selectedBatch.value || !selectedBatch.value.id) return
  isSavingSales.value = true
  try {
    const docRef = doc(db, 'recipes', selectedBatch.value.id)
    await updateDoc(docRef, {
      chicken_data: selectedBatch.value.chicken_data,
      updated_at: new Date().toISOString()
    })
    // Update local recipes list
    const index = recipes.value.findIndex(r => r.id === selectedBatch.value?.id)
    if (index !== -1) {
      recipes.value[index] = { ...selectedBatch.value }
    }
    showSalesModal.value = false
    alert('Ventas actualizadas correctamente')
  } catch (e) {
    console.error(e)
    alert('Error al guardar ventas: ' + (e as Error).message)
  } finally {
    isSavingSales.value = false
  }
}

function openCalculationModal(batch: Recipe) {
  selectedBatch.value = batch
  calculationData.value = {
    salePrice: batch.chicken_data?.live_weight_price_kg || 0,
    amount: 0,
    kilograms: 0
  }
  showCalculationModal.value = true
}

function updateCalculationAmount() {
  if (calculationData.value.salePrice > 0) {
    calculationData.value.kilograms = Number((calculationData.value.amount / calculationData.value.salePrice).toFixed(2))
  }
}

function updateCalculationKilos() {
  calculationData.value.amount = Number((calculationData.value.kilograms * calculationData.value.salePrice).toFixed(2))
}

function formatDate(dateStr?: string) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString()
}

function getRecipesScenarios(recipeId: string): RecipeScenario[] {
  return allScenarios.value.filter(sc => sc.recipe_id === recipeId)
}

// CALCULATION HELPERS
function getChickenCalculations(recipe: Recipe) {
  return calculateChickenCalculations(recipe)
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
    const cost = u.cost || 0
    const qty = u.quantity || 0
    if (qty === 0) return sum
    return sum + (cost / qty) * (u.usage_quantity || 0)
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

.header-buttons {
  display: flex;
  gap: 12px;
}

.section-container {
  margin-bottom: 2rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding: 0 4px;
}

.section-icon {
  font-size: 1.4rem;
  color: var(--text-secondary);
}

.section-icon.chicken {
  color: #ff9800;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.badge {
  background: var(--primary);
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 12px;
}

.mt-8 {
  margin-top: 2rem;
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

.recipe-name-cell {
  display: flex;
  flex-direction: column;
}

.title-with-icon {
  display: flex;
  align-items: center;
  gap: 8px;
}

.recipe-type-icon {
  opacity: 0.6;
}

.recipe-type-icon.chicken {
  color: #ff9800;
  opacity: 1;
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

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 20px;
}

.modal-content {
  background: var(--surface);
  padding: 24px;
  border-radius: 12px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.modal-large {
  max-width: 900px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-header h3 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.modal-header .chicken {
  color: #ff9800;
}

.modal-footer {
  margin-top: 24px;
}

.footer-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.footer-actions .btn {
  flex: 1;
  max-width: 200px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-secondary);
}

.mr-2 {
  margin-right: 8px;
}

.btn-block {
  width: 100%;
}

.chicken-expanded-summary {
  background: rgba(255, 152, 0, 0.05);
  border: 1px dashed #ff9800;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 8px;
  margin-left: 44px;
  /* Align with expansion */
}

.summary-grid-mini {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.summary-item-mini {
  display: flex;
  flex-direction: column;
}

.summary-item-mini label {
  font-size: 0.65rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.summary-item-mini span {
  font-weight: 700;
  font-size: 0.9rem;
}

.summary-item-mini.highlight-profit span {
  color: var(--primary);
}
</style>
