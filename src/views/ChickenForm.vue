<template>
  <div class="recipe-form-container chicken-batch-form">
    <header class="page-header">
      <div class="header-left">
        <button @click="$router.push('/production')" class="btn-back">
          <Icon name="arrow-left" />
        </button>
        <h1>{{ isEditing ? 'Editar Lote de Pollos' : 'Nuevo Lote de Pollos' }}</h1>
      </div>
      <div class="header-actions">
        <button @click="saveRecipe" class="btn btn-primary" :disabled="isSaving">
          <Icon name="content-save" />
          {{ isSaving ? 'Guardando...' : 'Guardar Lote' }}
        </button>
      </div>
    </header>

    <div class="form-content">
      <!-- SELECCIÓN DE PRODUCTO Y CANTIDAD -->
      <section class="card selection-info">
        <div class="section-header">
          <h2>
            <Icon name="bird" /> Configuración del Lote
          </h2>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>Nombre del Lote</label>
            <input v-model="recipe.name" type="text" class="form-input" placeholder="Ej: Lote #001 - Enero" />
          </div>
          <div class="form-group">
            <label>Producto de Lote (Pollo)</label>
            <div class="select-batch-wrapper">
              <button @click="openBatchProductModal" class="btn btn-outline btn-block">
                <Icon name="basket" />
                {{ recipe.chicken_data?.batch_product_id ?
                  getProductById(recipe.chicken_data.batch_product_id)?.name :
                  'Seleccionar Pollo' }}
              </button>
            </div>
          </div>
          <div class="form-group">
            <label>Cantidad de Pollos</label>
            <input v-model.number="recipe.chicken_data!.initial_quantity" type="number" class="form-input" min="1" />
          </div>
          <div class="form-group">
            <label>Precio Unitario ($)</label>
            <input v-model.number="recipe.chicken_data!.batch_product_price" type="number" class="form-input"
              step="0.01" min="0" placeholder="0.00" />
          </div>
          <div class="form-group">
            <label>Fecha de Ingreso</label>
            <input v-model="recipe.chicken_data!.entry_date" type="date" class="form-input" />
          </div>
          <div class="form-group">
            <label>Edad del Lote</label>
            <input :value="chickenAge + ' días'" type="text" class="form-input" readonly />
          </div>
        </div>
      </section>

      <!-- SEGUIMIENTO DE PESOS Y PRECIOS -->
      <section class="card weights-info">
        <div class="form-grid">
          <div class="form-group">
            <label>Precio por Kg en Pie ($)</label>
            <input v-model.number="recipe.chicken_data!.live_weight_price_kg" type="number" class="form-input"
              step="0.01" min="0" />
          </div>
          <div class="form-group">
            <label>Peso Promedio Actual (g)</label>
            <input v-model.number="recipe.chicken_data!.current_avg_weight_g" type="number" class="form-input"
              min="0" />
          </div>
          <div class="form-group">
            <label>Peso Objetivo (g)</label>
            <input v-model.number="recipe.chicken_data!.target_weight_g" type="number" class="form-input" min="0" />
          </div>
        </div>
      </section>

      <!-- INSUMOS DEL LOTE -->
      <section class="card ingredients-section">
        <div class="section-header">
          <h2>
            <Icon name="basket" /> Insumos del Lote
          </h2>
          <div class="section-actions-group">
            <button @click="openInputModal" class="btn btn-sm btn-outline">
              <Icon name="plus" /> Agregar Alimento/Insumo
            </button>
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Alimento/Insumo</th>
                <th>Establecimiento</th>
                <th>Utilizado (kg)</th>
                <th>Ideal (kg)</th>
                <th>Ratio (%)</th>
                <th>Consumo (kg/p)</th>
                <th>Costo Total</th>
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
                <td>
                  <select v-model="ing.establishment_id" class="input-xs">
                    <option :value="undefined">Promedio</option>
                    <option v-for="price in getProductById(ing.product_id)?.prices" :key="price.establishment_id"
                      :value="price.establishment_id">
                      {{ getEstablishmentName(price.establishment_id) }} - ${{
                        price.price.toFixed(2) }}
                    </option>
                  </select>
                </td>
                <td>
                  <input v-model.number="ing.usage_weight" type="number" class="form-input input-sm" min="0"
                    step="0.1" />
                </td>
                <td>
                  <input v-model.number="ing.ideal_weight" type="number" class="form-input input-sm" min="0"
                    step="0.1" />
                </td>
                <td :class="getUsageRatioClass(ing)">
                  {{ calculateUsageRatio(ing).toFixed(1) }}%
                </td>
                <td class="text-sm">
                  {{ calculateConsumptionPerChicken(ing).toFixed(3) }}
                </td>
                <td class="text-right">${{ calculateIngredientCostKg(ing).toFixed(2) }}</td>
                <td>
                  <button @click="removeIngredient(index)" class="btn-icon text-danger">
                    <Icon name="delete" />
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="table-summary">
                <td colspan="6" class="text-right"><strong>Inversión Acumulada del Lote:</strong></td>
                <td class="text-right">
                  <strong class="text-primary text-lg">${{ totalIngredientsCost.toFixed(2) }}</strong>
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <!-- RESUMEN Y PROYECCIONES -->
      <section v-if="chickenCalculations" class="card summary-section">
        <div class="section-header">
          <h2>
            <Icon name="chart-line" /> Resumen y Proyecciones
          </h2>
        </div>

        <div class="chicken-summary-grid">
          <div class="summary-card investment">
            <Icon name="bird" />
            <div class="summary-details">
              <label>Inversión en Pollos</label>
              <div class="value">${{ (chickenCalculations?.chickenInvestment || 0).toFixed(2) }}</div>
              <div class="sub-value">Bs {{ ((chickenCalculations?.chickenInvestment || 0) * dolarRate).toFixed(2) }}
              </div>
            </div>
          </div>
          <div class="summary-card investment">
            <Icon name="cash-multiple" />
            <div class="summary-details">
              <label>Inversión en Alimento</label>
              <div class="value">${{ chickenCalculations.feedInvestment.toFixed(2) }}</div>
              <div class="sub-value">Bs {{ (chickenCalculations.feedInvestment * dolarRate).toFixed(2) }}
              </div>
            </div>
          </div>
          <div class="summary-card cost">
            <Icon name="bird" />
            <div class="summary-details">
              <label>Costo por Pollo</label>
              <div class="value">${{ chickenCalculations.costPerChicken.toFixed(2) }}</div>
              <div class="sub-value">Bs {{ (chickenCalculations.costPerChicken * dolarRate).toFixed(2) }}
              </div>
            </div>
          </div>
          <div class="summary-card total-investment">
            <Icon name="currency-usd" />
            <div class="summary-details">
              <label>Inversión Total</label>
              <div class="value">${{ totalIngredientsCost.toFixed(2) }}</div>
              <div class="sub-value">Bs {{ (totalIngredientsCost * dolarRate).toFixed(2) }}</div>
            </div>
          </div>
          <div class="summary-card projection success">
            <Icon name="trending-up" />
            <div class="summary-details">
              <label>Ganancia Proyectada</label>
              <div class="value">${{ chickenCalculations.projectedProfit.toFixed(2) }}</div>
              <div class="sub-value">Venta Est: ${{ chickenCalculations.projectedIncome.toFixed(2) }}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- PRODUCT SELECTOR MODAL (GENERIC) -->
    <div v-if="showProductModal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ modalTitle }}</h3>
          <button @click="showProductModal = false" class="close-btn">&times;</button>
        </div>
        <div class="modal-search-group">
          <input v-model="productSearch" placeholder="Buscar producto..." class="form-input" />
          <button @click="openCategoryModal" class="btn btn-outline btn-filter"
            :class="{ 'filter-active': selectedCategoryIds.length > 0 }">
            <Icon name="filter-variant" />
            {{ selectedCategoryIds.length > 0 ? `Filtrado (${selectedCategoryIds.length})` : 'Filtrar por categoría' }}
          </button>
        </div>
        <div class="product-list">
          <div v-for="prod in filteredProducts" :key="prod.id" class="product-item"
            @click="handleProductSelection(prod)">
            <div class="product-info-mini">
              <span class="product-name-mini font-bold">{{ prod.name }}</span>
              <span v-if="prod.brand_id" class="product-brand-mini text-xs text-muted">{{ getBrandName(prod.brand_id)
              }}</span>
            </div>
            <div class="product-price-mini text-right">
              <div class="font-bold">${{ prod.price }}</div>
              <div class="text-xs text-muted">{{ prod.measurement_value }}{{ getShortUnit(prod.measurement_id) }}</div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showProductModal = false" class="btn btn-secondary btn-block mt-4">Cancelar</button>
        </div>
      </div>
    </div>

    <!-- CATEGORY SELECTOR MODAL -->
    <div v-if="showCategoryModal" class="modal-overlay z-high">
      <div class="modal-content">
        <h3>Filtrar por Categoría</h3>
        <div class="category-list mt-4">
          <div v-for="cat in availableCategories" :key="cat.id" class="category-item" @click="toggleCategory(cat.id)">
            <div class="checkbox-wrapper">
              <input type="checkbox" :checked="selectedCategoryIds.includes(cat.id)" readonly />
              <span>{{ cat.name }}</span>
            </div>
          </div>
        </div>
        <div class="modal-actions mt-6">
          <button @click="clearCategoryFilter" class="btn btn-outline">Limpiar Filtro</button>
          <button @click="showCategoryModal = false" class="btn btn-primary">Aplicar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase.config'
import Icon from '@/components/ui/Icon.vue'
import type { Recipe, RecipeIngredient } from '../types/recipe'
import type { Product, DolarBCV, Category } from '../types/producto'
import { useBrands } from '../composables/useBrands'
import { useEstablishments } from '../composables/useEstablishments'
import { useProduction } from '../composables/useProduction'

const route = useRoute()
const router = useRouter()
const { getBrandName } = useBrands()
const { loadEstablishments, getEstablishmentName } = useEstablishments()
const { dolarBCV } = inject<{ dolarBCV: Ref<DolarBCV | null> }>('dolarBCV')!
const dolarRate = computed(() => dolarBCV.value?.promedio || 0)

const availableProducts = ref<Product[]>([])
const {
  calculateChickenCalculations,
  getProductById,
  getProductPrice
} = useProduction(availableProducts, dolarRate)

const isEditing = ref(false)
const isSaving = ref(false)
const showProductModal = ref(false)
const showCategoryModal = ref(false)
const productSearch = ref('')
const availableCategories = ref<Category[]>([])
const selectedCategoryIds = ref<string[]>([])
const modalType = ref<'batch_product' | 'input'>('input')
const modalTitle = computed(() => modalType.value === 'batch_product' ? 'Seleccionar Pollo' : 'Seleccionar Alimento/Insumo')

const recipe = ref<Recipe>({
  name: '',
  ingredients: [],
  total_weight: 0,
  weight_loss: 0,
  total_cost_ingredients: 0,
  has_production_units: false,
  profit_margin_percent: 30,
  is_chicken_batch: true,
  chicken_data: {
    initial_quantity: 1,
    batch_product_price: 0,
    live_weight_price_kg: 0,
    current_avg_weight_g: 0,
    target_weight_g: 0,
    starter_feed_per_chicken_g: 0,
    fattening_feed_per_chicken_g: 0,
    entry_date: new Date().toISOString().split('T')[0],
  },
  created_at: new Date().toISOString().split('T')[0],
})

onMounted(async () => {
  loadEstablishments()
  const prodSnap = await getDocs(collection(db, 'productos'))
  availableProducts.value = prodSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product))

  const catSnap = await getDocs(collection(db, 'categorias'))
  availableCategories.value = catSnap.docs.map(d => ({ id: d.id, ...d.data() } as Category))

  if (route.params.id) {
    isEditing.value = true
    const docRef = doc(db, 'recipes', route.params.id as string)
    const snap = await getDoc(docRef)
    if (snap.exists()) {
      recipe.value = { ...snap.data(), id: snap.id, is_chicken_batch: true } as Recipe
      // Ensure chicken_data exists for backward compatibility
      if (!recipe.value.chicken_data) {
        recipe.value.chicken_data = {
          initial_quantity: 1,
          batch_product_price: 0,
          live_weight_price_kg: 0,
          current_avg_weight_g: 0,
          target_weight_g: 0,
          starter_feed_per_chicken_g: 0,
          fattening_feed_per_chicken_g: 0,
          entry_date: new Date().toISOString().split('T')[0],
        }
      }
    }
  }
})

// function getProductById removed, using composable version

function getShortUnit(id: string): string {
  if (id === 'mea1') return 'kg'
  if (id === 'mea2') return 'g'
  if (id === 'mea5') return 'u'
  return ''
}

// Age calculation
const chickenAge = computed(() => {
  if (!recipe.value.chicken_data?.entry_date) return 0
  const entry = new Date(recipe.value.chicken_data.entry_date)
  const now = new Date()
  // Reset hours to compare only days
  entry.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)

  const diffTime = now.getTime() - entry.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return diffDays < 0 ? 0 : diffDays
})

// Ingredient calculations specialized for kg
function calculateIngredientCostKg(ing: RecipeIngredient): number {
  const prod = getProductById(ing.product_id)
  if (!prod) return 0

  const pkgPrice = ing.establishment_id ?
    (prod.prices?.find(p => p.establishment_id === ing.establishment_id)?.price || prod.price) :
    (prod.average_price || prod.price)

  let unitPriceValue: number

  if (prod.measurement_id === 'mea1') { // Kg
    unitPriceValue = pkgPrice / (prod.measurement_value || 1)
  } else if (prod.measurement_id === 'mea2') { // g
    unitPriceValue = (pkgPrice / (prod.measurement_value || 1000)) * 1000
  } else {
    // Default fallback (units or other)
    unitPriceValue = pkgPrice / (prod.measurement_value || 1)
  }

  return unitPriceValue * (ing.usage_weight || 0)
}

const totalIngredientsCost = computed(() => {
  const inputsCost = recipe.value.ingredients.reduce((sum, ing) => sum + calculateIngredientCostKg(ing), 0)

  let chickenCost = 0
  if (recipe.value.chicken_data?.batch_product_id) {
    const prod = getProductById(recipe.value.chicken_data.batch_product_id)
    const basePrice = recipe.value.chicken_data.batch_product_price !== undefined ?
      recipe.value.chicken_data.batch_product_price :
      (prod ? getProductPrice(prod) : 0)
    chickenCost = basePrice * (Number(recipe.value.chicken_data.initial_quantity) || 0)
  }

  return inputsCost + chickenCost
})

const chickenCalculations = computed(() => {
  const calcs = calculateChickenCalculations(recipe.value)
  if (calcs) {
    // Override total ingredients cost with our specialized local calculation
    calcs.totalIngredientsCost = totalIngredientsCost.value
    // Re-calculate projection profit with updated total cost
    const totalTargetWeightKg = (recipe.value.chicken_data?.target_weight_g || 0) * (recipe.value.chicken_data?.initial_quantity || 0) / 1000
    calcs.projectedIncome = totalTargetWeightKg * (recipe.value.chicken_data?.live_weight_price_kg || 0)
    calcs.projectedProfit = calcs.projectedIncome - totalIngredientsCost.value
    calcs.costPerChicken = (recipe.value.chicken_data?.initial_quantity || 0) > 0 ? totalIngredientsCost.value / recipe.value.chicken_data!.initial_quantity : 0
  }
  return calcs
})

function calculateUsageRatio(ing: RecipeIngredient): number {
  if (!ing.ideal_weight || ing.ideal_weight === 0) return 0
  return ((ing.usage_weight || 0) / ing.ideal_weight) * 100
}

function calculateConsumptionPerChicken(ing: RecipeIngredient): number {
  const qty = recipe.value.chicken_data?.initial_quantity || 1
  return (ing.usage_weight || 0) / qty
}

function getUsageRatioClass(ing: RecipeIngredient) {
  const ratio = calculateUsageRatio(ing)
  if (ratio > 105) return 'text-danger fw-bold'
  if (ratio < 95) return 'text-warning'
  return 'text-success'
}

const filteredProducts = computed(() => {
  let prods = availableProducts.value

  // Filter by modal type
  if (modalType.value === 'batch_product') {
    // If no category is selected, strictly show 'pollo' type.
    // If a category is selected, we show items in that category to allow finding untyped products.
    if (selectedCategoryIds.value.length === 0) {
      prods = prods.filter(p => p.type === 'pollo')
    }
  } else {
    // Show alimentos, standards, utilities, or products without type
    prods = prods.filter(p => p.type === 'alimento' || p.type === 'standard' || p.is_utility || !p.type)
  }

  if (selectedCategoryIds.value.length > 0) {
    prods = prods.filter(p => selectedCategoryIds.value.includes(p.category_id))
  }
  if (!productSearch.value) return prods
  const q = productSearch.value.toLowerCase()
  return prods.filter(p => p.name.toLowerCase().includes(q))
})

function openBatchProductModal() {
  modalType.value = 'batch_product'
  productSearch.value = ''
  showProductModal.value = true
}

function openInputModal() {
  modalType.value = 'input'
  productSearch.value = ''
  showProductModal.value = true
}

function openCategoryModal() { showCategoryModal.value = true }

function toggleCategory(catId: string) {
  const index = selectedCategoryIds.value.indexOf(catId)
  if (index === -1) {
    selectedCategoryIds.value.push(catId)
  } else {
    selectedCategoryIds.value.splice(index, 1)
  }
}

function clearCategoryFilter() {
  selectedCategoryIds.value = []
}

function handleProductSelection(prod: Product) {
  if (modalType.value === 'batch_product') {
    if (!recipe.value.chicken_data) return
    recipe.value.chicken_data.batch_product_id = prod.id
    recipe.value.chicken_data.batch_product_price = getProductPrice(prod)
    if (!recipe.value.name) {
      recipe.value.name = `Lote de ${prod.name} - ${new Date().toLocaleDateString()}`
    }
  } else {
    recipe.value.ingredients.push({
      product_id: prod.id!,
      usage_weight: 0,
      ideal_weight: 0
    })
  }
  showProductModal.value = false
}

function removeIngredient(index: number) {
  recipe.value.ingredients.splice(index, 1)
}

async function saveRecipe() {
  if (!recipe.value.name) {
    alert('Por favor ingrese un nombre para el lote')
    return
  }
  isSaving.value = true
  try {
    const data = {
      ...recipe.value,
      total_cost_ingredients: totalIngredientsCost.value,
      updated_at: new Date().toISOString()
    }
    if (isEditing.value) {
      await updateDoc(doc(db, 'recipes', recipe.value.id!), data)
    } else {
      await setDoc(doc(collection(db, 'recipes')), data)
    }
    router.push('/production')
  } catch (e) {
    console.error(e)
    alert('Error al guardar: ' + (e as Error).message)
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.recipe-form-container {
  max-width: 1100px;
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
  cursor: pointer;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border-radius: 50%;
  transition: background 0.2s;
}

.btn-back:hover {
  background: var(--background);
}

.card {
  background: var(--surface);
  padding: 24px;
  border-radius: 12px;
  border: 1px solid var(--border);
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 12px;
}

.section-header h2 {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 1.2rem;
  margin: 0;
  color: var(--text-primary);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 20px;
}

.form-group label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--background);
  color: var(--text-primary);
  font-size: 0.9rem;
}

.form-input:focus {
  outline: none;
  border-color: #ff9800;
}

.input-sm {
  width: 90px;
  padding: 6px 10px;
}

.input-xs {
  font-size: 0.8rem;
  padding: 4px 6px;
  border-radius: 4px;
  border: 1px solid var(--border);
  max-width: 130px;
  background: var(--background);
  color: var(--text-primary);
}

.selection-info {
  border-left: 6px solid #ff9800;
  background: linear-gradient(to right, rgba(255, 152, 0, 0.05), transparent);
}

.chicken-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
}

.summary-card {
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 20px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.summary-card.success {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.03);
}

.summary-details label {
  font-size: 0.7rem;
  color: var(--text-secondary);
  display: block;
  text-transform: uppercase;
  font-weight: 800;
  letter-spacing: 0.5px;
}

.summary-details .value {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 4px 0;
}

.summary-details .sub-value {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

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
  z-index: 1000;
}

.modal-content {
  background: var(--surface);
  padding: 28px;
  border-radius: 16px;
  width: 95%;
  max-width: 550px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-secondary);
}

.product-item {
  padding: 14px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background 0.2s;
}

.product-item:hover {
  background: rgba(255, 152, 0, 0.05);
}

.modal-search-group {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.btn-filter.filter-active {
  background: rgba(255, 152, 0, 0.1);
  color: #ff9800;
  border-color: #ff9800;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.category-item {
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.category-item:hover {
  border-color: #ff9800;
  background: rgba(255, 152, 0, 0.05);
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.z-high {
  z-index: 1100;
}

.text-danger {
  color: #ef4444;
}

.text-warning {
  color: #f59e0b;
}

.text-success {
  color: #10b981;
}

.text-primary {
  color: #ff9800;
}

.text-lg {
  font-size: 1.25rem;
}

.font-bold {
  font-weight: 700;
}

.text-right {
  text-align: right;
}

.table-responsive {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 14px;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.data-table th {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.table-summary td {
  padding-top: 24px;
  border-bottom: none;
}

.btn-block {
  width: 100%;
}
</style>
