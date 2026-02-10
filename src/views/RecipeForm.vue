<template>
  <div class="recipe-form-container">
    <header class="page-header">
      <div class="header-left">
        <button @click="$router.push('/recipes')" class="btn-back">
          <Icon name="arrow-left" />
        </button>
        <h1>{{ isEditing ? 'Editar Receta' : 'Nueva Receta' }}</h1>
      </div>
      <div class="header-actions">
        <button @click="saveRecipe" class="btn btn-primary" :disabled="isSaving">
          <Icon name="content-save" />
          {{ isSaving ? 'Guardando...' : 'Guardar Receta' }}
        </button>
      </div>
    </header>

    <div class="form-content">
      <!-- DETALLES BÁSICOS -->
      <section class="card basic-info">
        <div class="form-group">
          <label>Nombre de la Receta</label>
          <input v-model="recipe.name" type="text" class="form-input" placeholder="Ej: Torta de Chocolate" />
        </div>
      </section>

      <!-- SECCIÓN 1: PRODUCTOS / INGREDIENTES -->
      <section class="card ingredients-section">
        <div class="section-header">
          <h2>
            <Icon name="basket" /> Productos
          </h2>
          <button @click="openProductModal" class="btn btn-sm btn-outline">
            <Icon name="plus" /> Agregar Producto
          </button>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Costo (Pkg)</th>
                <th>Peso (Pkg)</th>
                <th>Utilizado</th>
                <th>Costo/Uso</th>
                <th>V+% (Margen)</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(ing, index) in recipe.ingredients" :key="index">
                <td>{{ ing.name }}</td>
                <td>${{ ing.cost.toFixed(2) }}</td>
                <td>{{ ing.package_weight }}</td>
                <td>
                  <input v-model.number="ing.usage_weight" type="number" class="input-sm" min="0" />
                </td>
                <td>${{ calculateIngredientCost(ing).toFixed(2) }}</td>
                <td>
                  <!-- Placeholder if needed for per-ingredient margin, or just visual -->
                  -
                </td>
                <td>
                  <button @click="removeIngredient(index)" class="btn-icon text-danger">
                    <Icon name="delete" />
                  </button>
                </td>
              </tr>
              <tr v-if="recipe.ingredients.length === 0">
                <td colspan="7" class="text-center text-muted">No hay ingredientes agregados</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="table-summary">
                <td colspan="3" class="text-right"><strong>Totales:</strong></td>
                <td>
                  <strong>{{ totalWeight }}</strong>
                </td>
                <td>
                  <strong>${{ totalIngredientsCost.toFixed(2) }}</strong>
                </td>
                <td colspan="2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <!-- SECCIÓN 3: PRODUCCIÓN Y GANANCIA -->
      <section class="card production-section">
        <div class="section-header">
          <h2>
            <Icon name="cash-multiple" /> Producción y Ganancias
          </h2>
        </div>

        <div class="production-summary-header">
          <div class="form-group checkbox-group">
            <label class="checkbox-container">
              <input type="checkbox" v-model="recipe.has_production_units" />
              ¿Esta receta produce unidades fijas? (ej. Galletas)
            </label>
          </div>
        </div>

        <div class="summary-grid">
          <div class="summary-item">
            <label>Peso Crudo (Mezcla)</label>
            <div class="value">{{ totalWeight.toFixed(2) }}g</div>
          </div>
          <div class="summary-item">
            <label>Merma (Pérdida)</label>
            <input v-model.number="recipe.weight_loss" type="number" class="input-sm large-input" min="0" />
            <span class="unit">g</span>
          </div>
          <div class="summary-item highlight">
            <label>Peso Final Cocido</label>
            <div class="value">{{ totalFinalWeight.toFixed(2) }}g</div>
          </div>
          <div v-if="recipe.has_production_units" class="summary-item success-border">
            <label>Unidades por Lote</label>
            <input v-model.number="recipe.total_production_units" type="number" class="input-sm large-input" min="1" />
            <span class="unit">und</span>
          </div>
          <div class="summary-item">
            <label>Inversión Base (Ingredientes)</label>
            <div class="value brand-color">${{ totalIngredientsCost.toFixed(2) }}</div>
            <div class="sub-value">Bs {{ (totalIngredientsCost * dolarRate).toFixed(2) }}</div>
          </div>
        </div>

        <div class="scenario-calculator">
          <h3>Escenarios de Venta / Paquetes</h3>

          <div class="scenarios-list">
            <div v-for="(scenario, sIndex) in recipe.scenarios" :key="sIndex" class="scenario-card card">
              <div class="scenario-header">
                <div class="form-group">
                  <label>Nombre del Paquete</label>
                  <input v-model="scenario.name" type="text" class="form-input" placeholder="Ej: Pack Familiar" />
                </div>
                <div class="header-right">
                  <button @click="removeScenario(sIndex)" class="btn-icon text-danger">
                    <Icon name="delete" />
                  </button>
                </div>
              </div>

              <div class="scenario-config">
                <div class="form-group">
                  <label>Modo</label>
                  <select v-model="scenario.mode" class="form-select">
                    <option value="weight">Por Peso Unitario</option>
                    <option value="unit">Por Cantidad Fija</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>{{ scenario.mode === 'weight' ? 'Peso por Unidad (g)' : (recipe.has_production_units ?
                    'Unidades por Paquete' : 'Cantidad de Unidades') }}</label>
                  <input v-model.number="scenario.value" type="number" class="form-input" min="1" />
                </div>
                <div class="form-group">
                  <label>% Ganancia</label>
                  <input v-model.number="recipe.profit_margin_percent" type="number" class="form-input" />
                </div>
              </div>

              <!-- UTILIDADES DEL ESCENARIO (PAQUETES) -->
              <div class="packaging-section">
                <header class="sub-header">
                  <h4>
                    <Icon name="package-variant" /> Empaque / Utilidades del Paquete
                  </h4>
                  <button @click="addUtilityToScenario(sIndex)" class="btn btn-xs btn-outline">
                    <Icon name="plus" /> Agregar Insumo
                  </button>
                </header>
                <div class="table-responsive" v-if="scenario.utilities && scenario.utilities.length > 0">
                  <table class="mini-table">
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Precio Pkg</th>
                        <th>Cant. Pkg</th>
                        <th>Uso</th>
                        <th>Costo</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(util, uIndex) in scenario.utilities" :key="uIndex">
                        <td><input v-model="util.name" class="input-xs-wide" /></td>
                        <td><input v-model.number="util.cost" type="number" class="input-xs" /></td>
                        <td>
                          <input v-model.number="util.quantity" type="number" class="input-xs" />
                        </td>
                        <td>
                          <input v-model.number="util.usage_quantity" type="number" class="input-xs" />
                        </td>
                        <td>${{ calculateScenarioUtilityCost(util).toFixed(2) }}</td>
                        <td>
                          <button @click="removeUtilityFromScenario(sIndex, uIndex)"
                            class="btn-icon text-danger btn-xs">
                            <Icon name="close" />
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="scenario-results">
                <div class="result-badge">
                  <span class="label">Unidades:</span>
                  <span class="value">{{ calculateEstimatedUnits(scenario).toFixed(1) }}</span>
                </div>
                <div class="result-badge">
                  <span class="label">Inversión (Unit):</span>
                  <span class="value">${{ calculateScenarioUnitCost(scenario).toFixed(2) }}</span>
                </div>
                <div class="result-badge primary">
                  <span class="label">Venta (Unit):</span>
                  <span class="value">${{ calculateScenarioSalePrice(scenario).toFixed(2) }}</span>
                </div>
                <div class="result-badge success">
                  <span class="label">Ganancia (Unit):</span>
                  <span class="value">${{
                    (
                      calculateScenarioSalePrice(scenario) - calculateScenarioUnitCost(scenario)
                    ).toFixed(2)
                  }}</span>
                </div>
              </div>
            </div>
            <button @click="addScenario" class="btn btn-secondary mt-2">
              <Icon name="plus-circle" /> Crear Nuevo Paquete / Escenario
            </button>
          </div>
        </div>
      </section>
    </div>

    <!-- PRODUCT SELECTOR MODAL -->
    <div v-if="showProductModal" class="modal-overlay">
      <div class="modal-content">
        <h3>Seleccionar Producto</h3>
        <input v-model="productSearch" placeholder="Buscar producto..." class="form-input mb-4" />
        <div class="product-list">
          <div v-for="prod in filteredProducts" :key="prod.id" class="product-item" @click="selectProduct(prod)">
            <span>{{ prod.name }}</span>
            <span>${{ prod.price }} ({{ prod.measurement_value }}
              {{ getMeasurementLabel(prod.measurement_id) }})</span>
          </div>
        </div>
        <button @click="showProductModal = false" class="btn btn-secondary mt-4">Cancelar</button>
      </div>
    </div>

    <!-- UTILITY SELECTOR MODAL -->
    <div v-if="showUtilityModal" class="modal-overlay">
      <div class="modal-content">
        <h3>Seleccionar Insumo / Utilería</h3>
        <input v-model="utilitySearch" placeholder="Buscar insumo..." class="form-input mb-4" />
        <div class="product-list">
          <div v-for="prod in filteredUtilities" :key="prod.id" class="product-item" @click="selectUtility(prod)">
            <span>{{ prod.name }}</span>
            <span class="price-tag">${{ prod.price }} ({{ prod.measurement_value }}
              {{ getMeasurementLabel(prod.measurement_id) }})</span>
          </div>
          <div v-if="filteredUtilities.length === 0" class="text-center p-4 text-muted">
            No hay insumos marcados como utilería.
          </div>
        </div>
        <button @click="showUtilityModal = false" class="btn btn-secondary mt-4">Cancelar</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase.config'
import Icon from '@/components/ui/Icon.vue' // Assuming global Icon component
import type { Recipe, RecipeIngredient, RecipeUtility, RecipeScenario } from '../types/recipe'
import type { Product, DolarBCV } from '../types/producto'

const route = useRoute()
const router = useRouter()

// STATE
const isEditing = ref(false)
const isSaving = ref(false)
const showProductModal = ref(false)
const showUtilityModal = ref(false)
const productSearch = ref('')
const utilitySearch = ref('')
const activeScenarioIndex = ref<number | null>(null)
const availableProducts = ref<Product[]>([])

const recipe = ref<Recipe>({
  name: '',
  ingredients: [],
  total_weight: 0,
  weight_loss: 0,
  total_cost_ingredients: 0,
  has_production_units: false,
  total_production_units: 1,
  profit_margin_percent: 30, // Default 30%
  scenarios: [{ name: 'Estándar', mode: 'weight', value: 100, utilities: [] }],
  created_at: new Date().toISOString().split('T')[0],
})

// INJECTS
const { dolarBCV } = inject<{ dolarBCV: Ref<DolarBCV | null> }>('dolarBCV')!
const dolarRate = computed(() => dolarBCV.value?.promedio || 0)

// COMPUTED
const totalWeight = computed(() => {
  return recipe.value.ingredients.reduce((sum, ing) => sum + (ing.usage_weight || 0), 0)
})

const totalFinalWeight = computed(() => {
  return Math.max(0, totalWeight.value - (recipe.value.weight_loss || 0))
})

const totalIngredientsCost = computed(() => {
  return recipe.value.ingredients.reduce((sum, ing) => sum + calculateIngredientCost(ing), 0)
})

const filteredProducts = computed(() => {
  if (!productSearch.value) return availableProducts.value
  const q = productSearch.value.toLowerCase()
  return availableProducts.value.filter((p) => p.name.toLowerCase().includes(q))
})

const filteredUtilities = computed(() => {
  const utilities = availableProducts.value.filter(p => p.is_utility)
  if (!utilitySearch.value) return utilities
  const q = utilitySearch.value.toLowerCase()
  return utilities.filter((p) => p.name.toLowerCase().includes(q))
})

// METHODS
function calculateIngredientCost(ing: RecipeIngredient): number {
  if (!ing.package_weight || ing.package_weight === 0) return 0
  return (ing.cost / ing.package_weight) * (ing.usage_weight || 0)
}

function calculateEstimatedUnits(scenario: RecipeScenario): number {
  if (scenario.mode === 'unit') {
    if (recipe.value.has_production_units && recipe.value.total_production_units) {
      // If fixed yield is set, scenario.value represents "units per pack"
      return recipe.value.total_production_units / (scenario.value || 1)
    }
    return scenario.value || 1
  } else {
    if (totalFinalWeight.value === 0) return 0
    return totalFinalWeight.value / (scenario.value || 1)
  }
}

function calculateScenarioUtilityCost(util: RecipeUtility): number {
  if (!util.quantity || util.quantity === 0) return 0
  return (util.cost / util.quantity) * (util.usage_quantity || 0)
}

function calculateScenarioTotalCost(scenario: RecipeScenario): number {
  const totalUtilities = scenario.utilities.reduce(
    (sum, u) => sum + calculateScenarioUtilityCost(u),
    0,
  )
  return totalIngredientsCost.value + totalUtilities
}

function calculateScenarioUnitCost(scenario: RecipeScenario): number {
  const units = calculateEstimatedUnits(scenario)
  if (units === 0) return 0
  return calculateScenarioTotalCost(scenario) / units
}

function calculateScenarioSalePrice(scenario: RecipeScenario): number {
  const unitCost = calculateScenarioUnitCost(scenario)
  return unitCost * (1 + recipe.value.profit_margin_percent / 100)
}

// FORMAT HELPERS
function getMeasurementLabel(id: string) {
  // Simplified. Ideally fetch from types or store
  return id === 'g' ? 'g' : id === 'kg' ? 'kg' : 'units'
}

// ACTIONS
function removeIngredient(index: number) {
  recipe.value.ingredients.splice(index, 1)
}

function addScenario() {
  recipe.value.scenarios.push({
    name: 'Nuevo Paquete',
    mode: 'weight',
    value: 100,
    utilities: [],
  })
}

function removeScenario(index: number) {
  recipe.value.scenarios.splice(index, 1)
}

function addUtilityToScenario(sIndex: number) {
  activeScenarioIndex.value = sIndex
  showUtilityModal.value = true
}

function selectUtility(prod: Product) {
  if (activeScenarioIndex.value !== null) {
    recipe.value.scenarios[activeScenarioIndex.value].utilities.push({
      name: prod.name,
      cost: prod.price,
      quantity: prod.measurement_value,
      usage_quantity: 1,
    })
  }
  showUtilityModal.value = false
  activeScenarioIndex.value = null
}

function removeUtilityFromScenario(sIndex: number, uIndex: number) {
  recipe.value.scenarios[sIndex].utilities.splice(uIndex, 1)
}

// DATA LOADING
async function loadProducts() {
  const local = localStorage.getItem('productos-app-data')
  if (local) {
    availableProducts.value = JSON.parse(local)
  } else {
    const snap = await getDocs(collection(db, 'productos'))
    availableProducts.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product)
  }
}

async function loadRecipe(id: string) {
  const docRef = doc(db, 'recipes', id)
  const snap = await getDoc(docRef)
  if (snap.exists()) {
    recipe.value = { id: snap.id, ...snap.data() } as Recipe
    if (!recipe.value.scenarios) recipe.value.scenarios = []
  }
}

function openProductModal() {
  showProductModal.value = true
}

function selectProduct(prod: Product) {
  recipe.value.ingredients.push({
    product_id: prod.id || '',
    name: prod.name,
    cost: prod.price,
    package_weight: prod.measurement_value,
    usage_weight: 0,
  })
  showProductModal.value = false
}

async function saveRecipe() {
  if (!recipe.value.name) return
  isSaving.value = true

  try {
    const dataToSave = {
      ...recipe.value,
      total_weight: totalWeight.value,
      total_cost_ingredients: totalIngredientsCost.value,
      updated_at: new Date().toISOString().split('T')[0],
    }

    if (isEditing.value && recipe.value.id) {
      await updateDoc(doc(db, 'recipes', recipe.value.id), dataToSave)
    } else {
      const newRef = doc(collection(db, 'recipes'))
      dataToSave.id = newRef.id
      await setDoc(newRef, dataToSave)
    }
    router.push('/recipes')
  } catch (e) {
    console.error(e)
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  loadProducts()
  if (route.params.id) {
    isEditing.value = true
    loadRecipe(route.params.id as string)
  }
})
</script>

<style scoped>
.recipe-form-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.btn-back {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-primary);
}

.card {
  background: var(--surface);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.section-header h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.2rem;
  margin: 0;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.data-table th {
  font-weight: 600;
  color: var(--text-secondary);
}

.input-sm {
  width: 80px;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.summary-item label {
  display: block;
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 4px;
}

.summary-item .value {
  font-size: 1.5rem;
  font-weight: 700;
}

.brand-color {
  color: var(--primary);
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

.text-success {
  color: #10b981;
}

.large-input {
  width: 100px;
}

.select-sm {
  padding: 6px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
}

.summary-item.highlight {
  border: 2px solid var(--primary);
  background: rgba(79, 70, 229, 0.05);
  padding: 8px;
  border-radius: 8px;
}

.unit {
  margin-left: 4px;
  color: var(--text-secondary);
}

.scenarios-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.scenario-card {
  border-left: 4px solid var(--primary);
}

.scenario-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.scenario-config {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.packaging-section {
  background: var(--background);
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 20px;
}

.sub-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.sub-header h4 {
  margin: 0;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 6px;
}

.mini-table {
  width: 100%;
  font-size: 0.85rem;
}

.mini-table th {
  text-align: left;
  padding: 4px;
  color: var(--text-secondary);
}

.mini-table td {
  padding: 4px;
}

.input-xs {
  width: 60px;
  padding: 2px 4px;
  border: 1px solid var(--border);
  border-radius: 3px;
}

.input-xs-wide {
  width: 120px;
  padding: 2px 4px;
  border: 1px solid var(--border);
  border-radius: 3px;
}

.btn-xs {
  padding: 2px 6px;
  font-size: 0.75rem;
}

.scenario-results {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.result-badge {
  background: var(--background);
  padding: 6px 12px;
  border-radius: 20px;
  display: flex;
  gap: 8px;
  font-size: 0.9rem;
}

.result-badge.primary {
  background: var(--primary-light);
  color: var(--primary);
}

.result-badge.success {
  background: #e8f5e9;
  color: #1b5e20;
}

.result-badge .label {
  font-weight: 500;
}

.result-badge .value {
  font-weight: 700;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.modal-content {
  background: var(--surface);
  padding: 24px;
  border-radius: 8px;
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
}

.product-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.product-item {
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
}

.product-item:hover {
  background: var(--background);
}

.price-tag {
  background: var(--primary-light, #e0e7ff);
  color: var(--primary, #4f46e5);
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.production-summary-header {
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px dashed var(--border);
}

.checkbox-group {
  margin-bottom: 0;
}

.checkbox-container {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-weight: 600;
  color: var(--text-primary);
}

.checkbox-container input {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.summary-item.success-border {
  border: 2px solid #10b981;
  background: rgba(16, 185, 129, 0.05);
  padding: 8px;
  border-radius: 8px;
}
</style>
