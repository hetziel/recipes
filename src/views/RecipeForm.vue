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
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(ing, index) in recipe.ingredients" :key="index">
                <td>
                  {{ getProductById(ing.product_id)?.name || 'Cargando...' }}
                  <span v-if="getProductById(ing.product_id)?.brand_id" class="text-xs text-muted">
                    ({{ getBrandName(getProductById(ing.product_id)?.brand_id) }})
                  </span>
                </td>
                <td>${{ getProductById(ing.product_id)?.price.toFixed(2) || '0.00' }}</td>
                <td>{{ getProductById(ing.product_id)?.measurement_value }}</td>
                <td>
                  <input v-model.number="ing.usage_weight" type="number" class="input-sm" min="0" />
                </td>
                <td>${{ calculateIngredientCost(ing).toFixed(2) }}</td>
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
          <div class="scenario-header-main">
            <h3>Escenarios de Venta / Paquetes</h3>
            <button v-if="recipe.scenarios.length > 0" @click="showBatchSummaryModal = true"
              class="btn btn-sm btn-outline">
              <Icon name="chart-bar" /> Ver Totales de Producción
            </button>
          </div>

          <div class="scenarios-list">
            <div v-for="(scenario, sIndex) in recipe.scenarios" :key="sIndex" class="scenario-card card"
              :class="{ 'is-editing': editingScenarioIndex === sIndex }">

              <!-- MODO RESUMEN -->
              <div v-if="editingScenarioIndex !== sIndex" class="scenario-summary-item">
                <div class="sc-main-info">
                  <div class="sc-title">
                    <Icon name="package-variant" />
                    <strong>{{ scenario.name }}</strong>
                  </div>
                  <div class="sc-meta">
                    {{ scenario.mode === 'weight' ? scenario.value + 'g por unidad' : scenario.value + ' unidades' }}
                  </div>
                </div>

                <div class="sc-values">
                  <div class="sc-value-item">
                    <label>Inversión</label>
                    <div class="price-stack">
                      <span class="price-usd">${{ calculateScenarioUnitCost(scenario).toFixed(2) }}</span>
                      <span class="price-bs">Bs {{ (calculateScenarioUnitCost(scenario) * dolarRate).toFixed(2)
                      }}</span>
                    </div>
                  </div>
                  <div class="sc-value-item highlight-success">
                    <label>Precio Venta</label>
                    <div class="price-stack">
                      <span class="price-usd">${{ calculateScenarioSalePrice(scenario).toFixed(2) }}</span>
                      <span class="price-bs">Bs {{ (calculateScenarioSalePrice(scenario) * dolarRate).toFixed(2)
                      }}</span>
                    </div>
                  </div>
                  <div class="sc-value-item highlight-profit">
                    <label>Ganancia</label>
                    <div class="price-stack">
                      <span class="price-usd">${{ (calculateScenarioSalePrice(scenario) -
                        calculateScenarioUnitCost(scenario)).toFixed(2) }}</span>
                      <span class="price-bs">Bs {{ ((calculateScenarioSalePrice(scenario) -
                        calculateScenarioUnitCost(scenario)) * dolarRate).toFixed(2) }}</span>
                    </div>
                  </div>
                </div>

                <div class="sc-actions">
                  <button @click="editingScenarioIndex = sIndex" class="btn-icon" title="Editar Escenario">
                    <Icon name="pencil" />
                  </button>
                  <button @click="removeScenario(sIndex)" class="btn-icon text-danger" title="Eliminar">
                    <Icon name="delete" />
                  </button>
                </div>
              </div>

              <!-- MODO EDICIÓN (FORMULARIO) -->
              <div v-else class="scenario-form-container">
                <div class="scenario-header">
                  <div class="form-group">
                    <label>Nombre del Paquete</label>
                    <input v-model="scenario.name" type="text" class="form-input" placeholder="Ej: Pack Familiar" />
                  </div>
                  <div class="header-right">
                    <button @click="editingScenarioIndex = null" class="btn btn-sm btn-success">
                      <Icon name="check" /> Listo
                    </button>
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
                    <label>% Ganancia Sugerida</label>
                    <input v-model.number="recipe.profit_margin_percent" type="number" class="form-input" />
                  </div>
                  <div class="form-group">
                    <label>Precio de Venta Fijo</label>
                    <div class="input-with-toggle">
                      <input v-model.number="scenario.fixed_sale_price" type="number" class="form-input"
                        placeholder="Ej: 5.00 (Opcional)" />
                      <div class="currency-toggle">
                        <button :class="{ active: scenario.fixed_sale_price_currency === 'USD' }"
                          @click.prevent="scenario.fixed_sale_price_currency = 'USD'">$</button>
                        <button :class="{ active: scenario.fixed_sale_price_currency === 'Bs' }"
                          @click.prevent="scenario.fixed_sale_price_currency = 'Bs'">Bs</button>
                      </div>
                    </div>
                    <div v-if="scenario.fixed_sale_price && scenario.fixed_sale_price > 0" class="real-margin-info"
                      :class="{ 'text-success': calculateScenarioRealMargin(scenario) >= 30, 'text-warning': calculateScenarioRealMargin(scenario) < 30 }">
                      <Icon name="trending-up" />
                      Margen Real: <strong>{{ calculateScenarioRealMargin(scenario).toFixed(1) }}%</strong>
                    </div>
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
                          <th>Ganancia %</th>
                          <th>Costo</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(util, uIndex) in scenario.utilities" :key="uIndex">
                          <td>
                            <input v-if="!util.product_id" v-model="util.name" class="input-xs-wide" />
                            <div v-else>
                              <span>{{ util.name }}</span>
                              <div class="text-xs text-muted" v-if="getProductById(util.product_id)?.brand_id">
                                ({{ getBrandName(getProductById(util.product_id)?.brand_id) }})
                              </div>
                            </div>
                          </td>
                          <td>
                            <input v-if="!util.product_id" v-model.number="util.cost" type="number" class="input-xs" />
                            <span v-else>${{ getProductById(util.product_id)?.price.toFixed(2) }}</span>
                          </td>
                          <td>
                            <input v-if="!util.product_id" v-model.number="util.quantity" type="number"
                              class="input-xs" />
                            <span v-else>{{ getProductById(util.product_id)?.measurement_value }}</span>
                          </td>
                          <td>
                            <input v-model.number="util.usage_quantity" type="number" class="input-xs" />
                          </td>
                          <td>
                            <input v-model.number="util.profit_margin" type="number" class="input-xs" min="0" />
                          </td>
                          <td>${{ (calculateScenarioUtilityCost(util) * (1 + (util.profit_margin || 0) /
                            100)).toFixed(2) }}</td>
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
                    <div class="badge-content">
                      <span class="label">Inversión:</span>
                      <span class="value">${{ calculateScenarioUnitCost(scenario).toFixed(2) }} / Bs {{
                        (calculateScenarioUnitCost(scenario) * dolarRate).toFixed(2) }}</span>
                    </div>
                  </div>
                  <div class="result-badge primary">
                    <div class="badge-content">
                      <span class="label">Venta:</span>
                      <span class="value">${{ calculateScenarioSalePrice(scenario).toFixed(2) }} / Bs {{
                        (calculateScenarioSalePrice(scenario) * dolarRate).toFixed(2) }}</span>
                    </div>
                  </div>
                  <div class="result-badge success">
                    <div class="badge-content">
                      <span class="label">Ganancia:</span>
                      <span class="value">
                        ${{ (calculateScenarioSalePrice(scenario) - calculateScenarioUnitCost(scenario)).toFixed(2) }}
                        / Bs {{ ((calculateScenarioSalePrice(scenario) - calculateScenarioUnitCost(scenario)) *
                          dolarRate).toFixed(2) }}
                      </span>
                    </div>
                  </div>
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
            <div class="product-info-mini">
              <span class="product-name-mini">{{ prod.name }}</span>
              <span v-if="prod.brand_id" class="product-brand-mini">{{ getBrandName(prod.brand_id) }}</span>
            </div>
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
            <div class="product-info-mini">
              <span class="product-name-mini">{{ prod.name }}</span>
              <span v-if="prod.brand_id" class="product-brand-mini">{{ getBrandName(prod.brand_id) }}</span>
            </div>
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

    <!-- BATCH SUMMARY MODAL -->
    <div v-if="showBatchSummaryModal" class="modal-overlay">
      <div class="modal-content large-modal">
        <header class="modal-header">
          <h3>
            <Icon name="chart-pie" /> Resumen de Producción Total (Batch)
          </h3>
          <button @click="showBatchSummaryModal = false" class="btn-icon">
            <Icon name="close" />
          </button>
        </header>

        <p class="modal-desc">
          Este resumen muestra cuánto ganarías si vendieras <strong>toda la producción</strong> del lote bajo cada
          escenario.
        </p>

        <div class="table-responsive">
          <table class="data-table summary-table">
            <thead>
              <tr>
                <th>Escenario</th>
                <th>Inversión Total</th>
                <th>Venta Total</th>
                <th>Ganancia Bruta</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(sc, idx) in recipe.scenarios" :key="idx">
                <td>
                  <strong>{{ sc.name }}</strong>
                  <div class="text-xs text-muted">{{ calculateEstimatedUnits(sc).toFixed(1) }} unidades</div>
                </td>
                <td>
                  <div class="val-usd">${{ calculateBatchTotalInvestment(sc).toFixed(2) }}</div>
                  <div class="val-bs text-xs">Bs {{ (calculateBatchTotalInvestment(sc) * dolarRate).toFixed(2) }}</div>
                </td>
                <td>
                  <div class="val-usd text-success">${{ calculateBatchTotalIncome(sc).toFixed(2) }}</div>
                  <div class="val-bs text-xs">Bs {{ (calculateBatchTotalIncome(sc) * dolarRate).toFixed(2) }}</div>
                </td>
                <td>
                  <div class="val-usd brand-color">${{ calculateBatchTotalProfit(sc).toFixed(2) }}</div>
                  <div class="val-bs text-xs">Bs {{ (calculateBatchTotalProfit(sc) * dolarRate).toFixed(2) }}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="modal-footer mt-6">
          <button @click="showBatchSummaryModal = false" class="btn btn-primary btn-block">Entendido</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject, type Ref } from 'vue'
import { useRoute } from 'vue-router'
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase.config'
import Icon from '@/components/ui/Icon.vue' // Assuming global Icon component
import type { Recipe, RecipeIngredient, RecipeUtility, RecipeScenario } from '../types/recipe'
import type { Product, DolarBCV } from '../types/producto'
import { useBrands } from '../composables/useBrands'

const route = useRoute()
const { getBrandName } = useBrands()

// STATE
const isEditing = ref(false)
const isSaving = ref(false)
const showProductModal = ref(false)
const showUtilityModal = ref(false)
const productSearch = ref('')
const utilitySearch = ref('')
const activeScenarioIndex = ref<number | null>(null)
const editingScenarioIndex = ref<number | null>(null)
const showBatchSummaryModal = ref(false)
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

// HELPERS
function getProductById(id: string): Product | undefined {
  return availableProducts.value.find(p => p.id === id)
}

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
  const prod = getProductById(ing.product_id)
  if (!prod || !prod.measurement_value || prod.measurement_value === 0) return 0
  return (prod.price / prod.measurement_value) * (ing.usage_weight || 0)
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
  if (util.product_id) {
    const prod = getProductById(util.product_id)
    if (!prod || !prod.measurement_value || prod.measurement_value === 0) return 0
    return (prod.price / prod.measurement_value) * (util.usage_quantity || 0)
  }
  if (!util.quantity || util.quantity === 0) return 0
  return (util.cost / util.quantity) * (util.usage_quantity || 0)
}

function calculateScenarioUtilitiesCost(scenario: RecipeScenario): number {
  return scenario.utilities.reduce(
    (sum, u) => sum + calculateScenarioUtilityCost(u),
    0,
  )
}

function calculateScenarioUnitCost(scenario: RecipeScenario): number {
  const units = calculateEstimatedUnits(scenario)
  if (units <= 0) return 0
  // (Total Ingredients / Total Units) + Utilities per Unit
  return (totalIngredientsCost.value / units) + calculateScenarioUtilitiesCost(scenario)
}

function getScenarioFixedPriceInUSD(scenario: RecipeScenario): number {
  if (!scenario.fixed_sale_price) return 0
  if (scenario.fixed_sale_price_currency === 'Bs') {
    return scenario.fixed_sale_price / (dolarRate.value || 1)
  }
  return scenario.fixed_sale_price
}

function calculateScenarioSalePrice(scenario: RecipeScenario): number {
  const fixedPrice = getScenarioFixedPriceInUSD(scenario)
  if (fixedPrice > 0) return fixedPrice

  const units = calculateEstimatedUnits(scenario)
  if (units <= 0) return 0

  const ingredientCostPerUnit = totalIngredientsCost.value / units
  const marginGen = 1 + (recipe.value.profit_margin_percent / 100)

  // Calulate utility cost WITH margin for each utility
  const utilitySaleTotalPerPack = scenario.utilities.reduce((sum, util) => {
    const cost = calculateScenarioUtilityCost(util)
    const margin = 1 + ((util.profit_margin ?? 50) / 100)
    return sum + (cost * margin)
  }, 0)

  return (ingredientCostPerUnit * marginGen) + utilitySaleTotalPerPack
}

function calculateScenarioRealMargin(scenario: RecipeScenario): number {
  const salePrice = calculateScenarioSalePrice(scenario)
  const unitCost = calculateScenarioUnitCost(scenario)
  if (unitCost <= 0) return 0
  return ((salePrice / unitCost) - 1) * 100
}

function calculateBatchTotalInvestment(scenario: RecipeScenario): number {
  const units = calculateEstimatedUnits(scenario)
  return totalIngredientsCost.value + (calculateScenarioUtilitiesCost(scenario) * units)
}

function calculateBatchTotalIncome(scenario: RecipeScenario): number {
  const units = calculateEstimatedUnits(scenario)
  return calculateScenarioSalePrice(scenario) * units
}

function calculateBatchTotalProfit(scenario: RecipeScenario): number {
  return calculateBatchTotalIncome(scenario) - calculateBatchTotalInvestment(scenario)
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
    fixed_sale_price_currency: 'USD',
    utilities: [],
  })
  editingScenarioIndex.value = recipe.value.scenarios.length - 1
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
      product_id: prod.id,
      name: prod.name,
      cost: prod.price,
      quantity: prod.measurement_value,
      usage_quantity: 1,
      profit_margin: 50,
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

.table-responsive {
  overflow: auto;
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
  transition: all 0.2s ease;
}

.scenario-card.is-editing {
  border: 2px solid var(--primary);
  border-left-width: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.scenario-summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.sc-main-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sc-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
}

.sc-meta {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-left: 28px;
}

.sc-values {
  display: flex;
  gap: 32px;
  margin-left: auto;
  margin-right: 32px;
}

.sc-value-item {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.sc-value-item label {
  font-size: 0.65rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.sc-value-item span {
  font-weight: 700;
  font-size: 0.95rem;
}

.highlight-success span.price-usd {
  color: #10b981;
}

.highlight-profit span.price-usd {
  color: var(--primary);
}

.price-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.price-bs {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-weight: 600;
  margin-top: -2px;
}

.sc-actions {
  display: flex;
  gap: 8px;
}

.scenario-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.scenario-config {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
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
  padding: 8px 16px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.9rem;
}

.badge-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
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

.modal-content.large-modal {
  max-width: 800px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.modal-header h3 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
}

.modal-desc {
  color: var(--text-secondary);
  margin-bottom: 24px;
}

.summary-table th {
  background: var(--background);
  font-size: 0.8rem;
  text-transform: uppercase;
}

.val-usd {
  font-weight: 700;
}

.val-bs {
  color: var(--text-secondary);
}

.scenario-header-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.btn-block {
  width: 100%;
}

.price-tag {
  background: var(--primary-light, #e0e7ff);
  color: var(--primary, #4f46e5);
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.product-info-mini {
  display: flex;
  flex-direction: column;
}

.product-name-mini {
  font-weight: 600;
}

.product-brand-mini {
  font-size: 0.75rem;
  color: var(--text-secondary);
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

.input-with-toggle {
  display: flex;
  gap: 0;
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
}

.input-with-toggle .form-input {
  border: none !important;
  flex: 1;
}

.currency-toggle {
  display: flex;
  background: var(--background);
  border-left: 1px solid var(--border);
}

.currency-toggle button {
  padding: 0 12px;
  border: none;
  background: none;
  cursor: pointer;
  font-weight: 700;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.currency-toggle button.active {
  background: var(--primary);
  color: white;
}

.real-margin-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  margin-top: 6px;
  font-weight: 500;
}

@media (max-width: 768px) {
  .recipe-form-container {
    padding: 12px;
  }

  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .header-left {
    justify-content: flex-start;
  }

  .header-actions {
    display: flex;
    justify-content: stretch;
  }

  .header-actions .btn {
    flex: 1;
    justify-content: center;
  }

  .summary-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .scenario-config {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .scenario-summary-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .sc-values {
    width: 100%;
    margin: 0;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 0;
    border-top: 1px dashed var(--border);
    border-bottom: 1px dashed var(--border);
  }

  .sc-meta {
    margin-left: 0;
    font-size: 0.8rem;
  }

  .sc-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .scenario-results {
    flex-direction: column;
    gap: 8px;
  }

  .result-badge {
    width: 100%;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 10px 16px;
  }

  .badge-content {
    flex-direction: row;
    gap: 8px;
  }

  .scenario-header-main {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .scenario-header-main .btn {
    width: 100%;
  }

  .sub-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .sub-header .btn {
    width: 100%;
  }

  .modal-content {
    width: 95%;
    max-height: 90vh;
    padding: 16px;
  }

  .summary-item.highlight,
  .summary-item.success-border {
    padding: 12px;
  }

  .value {
    font-size: 1.25rem;
  }

  .large-input {
    width: 100%;
  }
}

.utility-margin-group {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface);
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--border);
}

.utility-margin-group label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
</style>
