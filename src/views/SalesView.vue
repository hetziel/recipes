<template>
  <div class="sales-container">
    <header class="page-header">
      <div class="header-left">
        <h1>
          <Icon name="cash-register" /> Gestión de Ventas
        </h1>
      </div>
      <div class="header-actions">
        <button @click="openSaleModal" class="btn btn-primary">
          <Icon name="plus" /> Nueva Venta
        </button>
      </div>
    </header>

    <div class="sales-content">
      <!-- FILTROS Y ESTADÍSTICAS RÁPIDAS -->
      <section class="stats-cards">
        <div class="stat-card pending">
          <label>Pendientes</label>
          <div class="value">{{ stats.pending }}</div>
        </div>
        <div class="stat-card paid">
          <label>Pagados</label>
          <div class="value">{{ stats.paid }}</div>
        </div>
        <div class="stat-card to-pay">
          <label>Por Pagar</label>
          <div class="value">{{ stats.toPay }}</div>
        </div>
      </section>

      <!-- LISTA DE VENTAS (TIPO ÁRBOL/ACORDEÓN POR CLIENTE) -->
      <section class="sales-tree card">
        <div class="section-header">
          <h2>
            <Icon name="account-group" /> Clientes y Pedidos
          </h2>
          <div class="search-box">
            <input v-model="searchQuery" type="text" placeholder="Buscar cliente..." class="form-input" />
          </div>
        </div>

        <div class="tree-container">
          <div v-for="customer in filteredCustomers" :key="customer.id" class="customer-node">
            <div class="customer-header" @click="toggleCustomer(customer.id!)">
              <div class="customer-info">
                <Icon :name="expandedCustomers.includes(customer.id!) ? 'chevron-down' : 'chevron-right'" />
                <span class="customer-name">{{ customer.name }}</span>
                <span class="customer-phone">{{ customer.phone }}</span>
              </div>
              <div class="customer-totals">
                <span class="badge">{{ getCustomerSales(customer.id!).length }} ventas</span>
              </div>
            </div>

            <div v-if="expandedCustomers.includes(customer.id!)" class="sales-list">
              <div v-for="sale in getCustomerSales(customer.id!)" :key="sale.id" class="sale-item-card">
                <div class="sale-main-info">
                  <div class="sale-date">
                    <Icon name="calendar" />
                    <span>{{ formatDate(sale.created_at) }}</span>
                  </div>
                  <div class="sale-status">
                    <span :class="['status-badge', sale.status]">
                      {{ formatStatus(sale.status) }}
                    </span>
                  </div>
                  <div class="sale-due">
                    <span class="text-xs text-muted">Vence: {{ formatDate(sale.payment_due_date)
                    }}</span>
                  </div>
                </div>

                <div class="sale-products">
                  <div v-for="(item, idx) in sale.items" :key="idx" class="product-mini-tag">
                    <strong>{{ item.quantity }}x</strong> {{ item.recipe_name }} ({{
                      item.scenario_name }})
                    <span class="price">${{ item.total_price.toFixed(2) }}</span>
                  </div>
                </div>

                <div class="sale-footer">
                  <div class="total-amount">
                    Total: <strong>${{ sale.total_amount.toFixed(2) }}</strong>
                    <span class="bs-val">/ Bs {{ (sale.total_amount * dolarRate).toFixed(2)
                    }}</span>
                  </div>
                  <div class="sale-actions">
                    <button @click="openStatusModal(sale)" class="btn-icon" title="Cambiar Estado">
                      <Icon name="pencil" />
                    </button>
                    <button @click="deleteSale(sale.id!)" class="btn-icon text-danger" title="Eliminar Venta">
                      <Icon name="delete" />
                    </button>
                  </div>
                </div>
              </div>
              <div v-if="getCustomerSales(customer.id!).length === 0" class="empty-sales">
                No hay ventas registradas para este cliente.
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- MODAL NUEVA VENTA -->
    <div v-if="showSaleModal" class="modal-overlay">
      <div class="modal-content large-modal">
        <header class="modal-header">
          <h3>
            <Icon name="cart-plus" /> Crear Nueva Venta
          </h3>
          <button @click="showSaleModal = false" class="btn-icon">
            <Icon name="close" />
          </button>
        </header>

        <div class="modal-body">
          <!-- CLIENTE -->
          <div class="form-section">
            <h4>
              <Icon name="account" /> Datos del Cliente
            </h4>
            <div class="grid-2">
              <div class="form-group">
                <label>Nombre del Cliente</label>
                <div class="searchable-input">
                  <input v-model="newSale.customer_name" @input="searchExistingCustomers" type="text" class="form-input"
                    placeholder="Buscar o escribir nombre..." />
                  <div v-if="matchingCustomers.length > 0" class="suggestions">
                    <div v-for="c in matchingCustomers" :key="c.id" @click="selectCustomer(c)" class="suggestion-item">
                      {{ c.name }} ({{ c.phone }})
                    </div>
                  </div>
                </div>
              </div>
              <div class="form-group">
                <label>Teléfono</label>
                <input v-model="newSale.customer_phone" type="text" class="form-input" placeholder="Ej: 0412..." />
              </div>
            </div>
          </div>

          <!-- PRODUCTOS (SCENARIOS) -->
          <div class="form-section mt-4">
            <h4>
              <Icon name="package-variant" /> Productos / Paquetes
            </h4>
            <div class="add-product-row">
              <div class="form-group flex-2">
                <label>Seleccionar Paquete</label>
                <select v-model="selectedScenarioId" class="form-select">
                  <option value="">Seleccione un paquete...</option>
                  <optgroup v-for="recipe in availableRecipes" :key="recipe.id" :label="recipe.name">
                    <option v-for="sc in getScenariosForRecipe(recipe.id!)" :key="sc.id" :value="sc.id">
                      {{ sc.name }} (${{ calculateScenarioPrice(sc).toFixed(2) }})
                    </option>
                  </optgroup>
                </select>
              </div>
              <div class="form-group">
                <label>Cant.</label>
                <input v-model.number="itemQuantity" type="number" class="form-input" min="1" />
              </div>
              <button @click="addSaleItem" class="btn btn-secondary mt-auto" :disabled="!selectedScenarioId">
                Agregar
              </button>
            </div>

            <!-- TABLA DE ITEMS AGREGADOS -->
            <table v-if="newSaleItems.length > 0" class="mini-table mt-4">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cant.</th>
                  <th>Precio U.</th>
                  <th>Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, idx) in newSaleItems" :key="idx">
                  <td>{{ item.recipe_name }} - {{ item.scenario_name }}</td>
                  <td>{{ item.quantity }}</td>
                  <td>${{ item.unit_price.toFixed(2) }}</td>
                  <td>${{ item.total_price.toFixed(2) }}</td>
                  <td>
                    <button @click="newSaleItems.splice(idx, 1)" class="btn-icon text-danger">
                      <Icon name="delete" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- METADATOS DE VENTA -->
          <div class="form-section mt-4">
            <div class="grid-2">
              <div class="form-group">
                <label>Estado Inicial</label>
                <select v-model="newSale.status" class="form-select">
                  <option value="pendiente">Pendiente</option>
                  <option value="pagado">Pagado</option>
                  <option value="por pagar">Por Pagar</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
              <div class="form-group">
                <label>Fecha Estimada de Pago</label>
                <input v-model="newSale.payment_due_date" type="date" class="form-input" />
              </div>
            </div>
          </div>
        </div>

        <footer class="modal-footer">
          <div class="total-preview">
            Total a Pagar: <strong>${{ totalNewSaleAmount.toFixed(2) }} / Bs {{ (totalNewSaleAmount *
              dolarRate).toFixed(2) }}</strong>
          </div>
          <div class="actions">
            <button @click="showSaleModal = false" class="btn btn-outline">Cancelar</button>
            <button @click="createSale" class="btn btn-primary"
              :disabled="newSaleItems.length === 0 || !newSale.customer_name">
              Crear Venta
            </button>
          </div>
        </footer>
      </div>
    </div>

    <!-- MODAL CAMBIO DE ESTADO -->
    <div v-if="showStatusModal" class="modal-overlay">
      <div class="modal-content">
        <header class="modal-header">
          <h3>Cambiar Estado - #{{ currentSale?.id?.slice(-5) }}</h3>
          <button @click="showStatusModal = false" class="btn-icon">
            <Icon name="close" />
          </button>
        </header>
        <div class="modal-body">
          <div class="status-grid">
            <button v-for="status in (['pendiente', 'pagado', 'por pagar', 'cancelado'] as SaleStatus[])" :key="status"
              @click="updateSaleStatus(status)"
              :class="['status-option', status, { active: currentSale?.status === status }]">
              {{ formatStatus(status) }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject, type Ref } from 'vue'
import { collection, query, getDocs, addDoc, updateDoc, doc, orderBy, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase.config'
import Icon from '@/components/ui/Icon.vue'
import type { Customer, Sale, SaleItem, SaleStatus } from '../types/sales'
import type { Recipe, RecipeScenario, RecipeIngredient, RecipeUtility } from '../types/recipe'
import type { DolarBCV, Product } from '../types/producto'

// INJECTS
const { dolarBCV } = inject<{ dolarBCV: Ref<DolarBCV | null> }>('dolarBCV')!
const dolarRate = computed(() => dolarBCV.value?.promedio || 0)

// STATE
const customers = ref<Customer[]>([])
const sales = ref<Sale[]>([])
const recipes = ref<Recipe[]>([])
const allScenarios = ref<RecipeScenario[]>([])
const availableProducts = ref<Product[]>([])
const showSaleModal = ref(false)
const searchQuery = ref('')
const expandedCustomers = ref<string[]>([])
const showStatusModal = ref(false)
const currentSale = ref<Sale | null>(null)

// NEW SALE STATE
const newSale = ref({
  customer_name: '',
  customer_phone: '',
  status: 'pendiente' as SaleStatus,
  payment_due_date: new Date().toISOString().split('T')[0],
})
const newSaleItems = ref<SaleItem[]>([])
const matchingCustomers = ref<Customer[]>([])
const selectedScenarioId = ref('')
const itemQuantity = ref(1)

// COMPUTED
const filteredCustomers = computed(() => {
  if (!searchQuery.value) return customers.value
  const q = searchQuery.value.toLowerCase()
  return customers.value.filter(c => c.name.toLowerCase().includes(q))
})

const stats = computed(() => {
  return {
    pending: sales.value.filter(s => s.status === 'pendiente').length,
    paid: sales.value.filter(s => s.status === 'pagado').length,
    toPay: sales.value.filter(s => s.status === 'por pagar').length,
  }
})

const totalNewSaleAmount = computed(() => {
  return newSaleItems.value.reduce((sum, item) => sum + item.total_price, 0)
})

const availableRecipes = computed(() => recipes.value)

// METHODS
async function loadData() {
  // Load Products
  const prodSnap = await getDocs(collection(db, 'productos'))
  availableProducts.value = prodSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product))

  // Load Customers
  const custSnap = await getDocs(collection(db, 'customers'))
  customers.value = custSnap.docs.map(d => ({ id: d.id, ...d.data() } as Customer))

  // Load Sales
  const salesSnap = await getDocs(query(collection(db, 'sales'), orderBy('created_at', 'desc')))
  sales.value = salesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Sale))

  // Load Recipes (for creation)
  const recipesSnap = await getDocs(collection(db, 'recipes'))
  recipes.value = recipesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Recipe))

  // Load Scenarios (all)
  const scSnap = await getDocs(collection(db, 'scenarios'))
  allScenarios.value = scSnap.docs.map(d => ({ ...d.data() } as RecipeScenario))
}

function getCustomerSales(customerId: string) {
  return sales.value.filter(s => s.customer_id === customerId)
}

function toggleCustomer(id: string) {
  if (expandedCustomers.value.includes(id)) {
    expandedCustomers.value = expandedCustomers.value.filter(cid => cid !== id)
  } else {
    expandedCustomers.value.push(id)
  }
}

function formatStatus(status: string) {
  const map: Record<string, string> = {
    pendiente: 'Pendiente',
    pagado: 'Pagado',
    'por pagar': 'Por Pagar',
    cancelado: 'Cancelado'
  }
  return map[status] || status
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString()
}

// SALE CREATION LOGIC
function openSaleModal() {
  newSale.value = {
    customer_name: '',
    customer_phone: '',
    status: 'pendiente',
    payment_due_date: new Date().toISOString().split('T')[0],
  }
  newSaleItems.value = []
  showSaleModal.value = true
}

function searchExistingCustomers() {
  if (newSale.value.customer_name.length < 2) {
    matchingCustomers.value = []
    return
  }
  const q = newSale.value.customer_name.toLowerCase()
  matchingCustomers.value = customers.value.filter(c => c.name.toLowerCase().includes(q))
}

function selectCustomer(c: Customer) {
  newSale.value.customer_name = c.name
  newSale.value.customer_phone = c.phone
  matchingCustomers.value = []
}

function getScenariosForRecipe(recipeId: string) {
  return allScenarios.value.filter(sc => sc.recipe_id === recipeId)
}

function getProductById(id: string): Product | undefined {
  return availableProducts.value.find(p => p.id === id)
}

function calculateIngredientCost(ing: RecipeIngredient): number {
  const prod = getProductById(ing.product_id)
  if (!prod || !prod.measurement_value || prod.measurement_value === 0) return 0
  return (prod.price / prod.measurement_value) * (ing.usage_weight || 0)
}

function calculateEstimatedUnits(recipe: Recipe, scenario: RecipeScenario): number {
  const totalWeight = recipe.ingredients.reduce((sum, ing) => sum + (ing.usage_weight || 0), 0)
  const totalFinalWeight = Math.max(0, totalWeight - (recipe.weight_loss || 0))

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

function calculateScenarioUtilityCost(util: RecipeUtility): number {
  if (util.product_id) {
    const prod = getProductById(util.product_id)
    if (!prod || !prod.measurement_value || prod.measurement_value === 0) return 0
    return (prod.price / prod.measurement_value) * (util.usage_quantity || 0)
  }
  const cost = util.cost || 0
  const qty = util.quantity || 0
  if (qty === 0) return 0
  return (cost / qty) * (util.usage_quantity || 0)
}

function calculateScenarioPrice(scenario: RecipeScenario): number {
  if (scenario.fixed_sale_price) {
    if (scenario.fixed_sale_price_currency === 'Bs') {
      return scenario.fixed_sale_price / (dolarRate.value || 1)
    }
    return scenario.fixed_sale_price
  }

  const recipe = recipes.value.find(r => r.id === scenario.recipe_id)
  if (!recipe) return 0

  const units = calculateEstimatedUnits(recipe, scenario)
  if (units <= 0) return 0

  const totalIngredientsCost = recipe.ingredients.reduce((sum, ing) => sum + calculateIngredientCost(ing), 0)
  const ingredientCostPerUnit = totalIngredientsCost / units
  const marginGen = 1 + (recipe.profit_margin_percent / 100)

  const utilitySaleTotalPerPack = (scenario.utilities || []).reduce((sum, util) => {
    const cost = calculateScenarioUtilityCost(util)
    const margin = 1 + ((util.profit_margin ?? 50) / 100)
    return sum + (cost * margin)
  }, 0)

  return (ingredientCostPerUnit * marginGen) + utilitySaleTotalPerPack
}

function addSaleItem() {
  const sc = allScenarios.value.find(s => s.id === selectedScenarioId.value)
  if (!sc) return

  const recipe = recipes.value.find(r => r.id === sc.recipe_id)
  const unitPrice = calculateScenarioPrice(sc) // Note: This might be 0 if not fixed

  newSaleItems.value.push({
    scenario_id: sc.id!,
    scenario_name: sc.name,
    recipe_name: recipe?.name || 'Receta',
    quantity: itemQuantity.value,
    unit_price: unitPrice,
    total_price: unitPrice * itemQuantity.value
  })

  selectedScenarioId.value = ''
  itemQuantity.value = 1
}

async function createSale() {
  try {
    // 1. Check/Create Customer
    let customerId = ''
    const existing = customers.value.find(c => c.name.toLowerCase() === newSale.value.customer_name.toLowerCase())

    if (existing) {
      customerId = existing.id!
    } else {
      const newCustRef = await addDoc(collection(db, 'customers'), {
        name: newSale.value.customer_name,
        phone: newSale.value.customer_phone,
        created_at: new Date().toISOString()
      })
      customerId = newCustRef.id
    }

    // 2. Create Sale
    const saleData: Sale = {
      customer_id: customerId,
      customer_name: newSale.value.customer_name,
      items: newSaleItems.value,
      total_amount: totalNewSaleAmount.value,
      status: newSale.value.status,
      payment_due_date: newSale.value.payment_due_date,
      created_at: new Date().toISOString()
    }

    await addDoc(collection(db, 'sales'), saleData)

    showSaleModal.value = false
    await loadData()
  } catch (e) {
    console.error('Error al crear venta:', e)
    alert('Error al crear venta')
  }
}

function openStatusModal(sale: Sale) {
  currentSale.value = sale
  showStatusModal.value = true
}

async function updateSaleStatus(newStatus: SaleStatus) {
  if (!currentSale.value?.id) return

  try {
    await updateDoc(doc(db, 'sales', currentSale.value.id), {
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    showStatusModal.value = false
    await loadData()
  } catch (e) {
    console.error('Error al actualizar estado:', e)
  }
}

async function deleteSale(id: string) {
  if (confirm('¿Estás seguro de eliminar esta venta?')) {
    try {
      await deleteDoc(doc(db, 'sales', id))
      await loadData()
    } catch (e) {
      console.error('Error al eliminar venta:', e)
    }
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.sales-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.header-left h1 {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  font-size: 1.8rem;
  color: var(--text-primary);
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  padding: 20px;
  border-radius: 12px;
  background: var(--surface);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border-left: 5px solid #ddd;
}

.stat-card.pending {
  border-left-color: #f59e0b;
}

.stat-card.paid {
  border-left-color: #10b981;
}

.stat-card.to-pay {
  border-left-color: #3b82f6;
}

.stat-card label {
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 600;
  text-transform: uppercase;
}

.stat-card .value {
  font-size: 2rem;
  font-weight: 800;
  margin-top: 5px;
}

.sales-tree {
  overflow: hidden;
}

.tree-container {
  display: flex;
  flex-direction: column;
}

.customer-node {
  border-bottom: 1px solid var(--border);
}

.customer-header {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: background 0.2s;
}

.customer-header:hover {
  background: var(--background);
}

.customer-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.customer-name {
  font-weight: 700;
  font-size: 1.1rem;
}

.customer-phone {
  font-size: 0.85rem;
  color: var(--text-secondary);
  background: var(--background);
  padding: 2px 8px;
  border-radius: 4px;
}

.sales-list {
  background: var(--background);
  padding: 12px 16px 12px 48px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sale-item-card {
  background: var(--surface);
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.sale-main-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.sale-date {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  font-weight: 600;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

.status-badge.pendiente {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.pagado {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.por\ pagar {
  background: #dbeafe;
  color: #1e40af;
}

.status-badge.cancelado {
  background: #fee2e2;
  color: #991b1b;
}

.sale-products {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
  padding: 8px;
  background: var(--background);
  border-radius: 6px;
}

.product-mini-tag {
  font-size: 0.85rem;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  display: flex;
  gap: 8px;
}

.product-mini-tag .price {
  font-weight: 700;
  color: var(--primary);
}

.sale-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  border-top: 1px dashed var(--border);
}

.total-amount {
  font-size: 1rem;
}

.total-amount strong {
  font-size: 1.2rem;
  color: var(--primary);
}

.bs-val {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-left: 8px;
}

/* MODAL STYLES */
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-section h4 {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border);
  padding-bottom: 8px;
}

.add-product-row {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.flex-2 {
  flex: 2;
}

.searchable-input {
  position: relative;
}

.suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-height: 150px;
  overflow-y: auto;
}

.suggestion-item {
  padding: 10px;
  cursor: pointer;
}

.suggestion-item:hover {
  background: var(--background);
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20px;
  border-top: 1px solid var(--border);
  margin-top: 24px;
}

.total-preview {
  font-size: 1.1rem;
}

.total-preview strong {
  color: var(--primary);
  font-weight: 800;
}

@media (max-width: 768px) {

  .grid-2,
  .add-product-row {
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .sales-list {
    padding-left: 16px;
  }
}

.status-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-option {
  padding: 16px;
  border-radius: 8px;
  border: 2px solid transparent;
  cursor: pointer;
  font-weight: 700;
  transition: all 0.2s;
  text-align: center;
  color: #1a1a1a;
  background: #f3f4f6;
}

.status-option.active {
  border-color: #2563eb;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  transform: scale(1.02);
}

.status-option.pendiente {
  background: #fef3c7;
  color: #92400e;
}

.status-option.pagado {
  background: #d1fae5;
  color: #065f46;
}

.status-option.por\ pagar {
  background: #dbeafe;
  color: #1e40af;
}

.status-option.cancelado {
  background: #fee2e2;
  color: #991b1b;
}

.status-option.pendiente:hover {
  background: #fde68a;
}

.status-option.pagado:hover {
  background: #a7f3d0;
}

.status-option.por\ pagar:hover {
  background: #bfdbfe;
}

.status-option.cancelado:hover {
  background: #fecaca;
}
</style>
