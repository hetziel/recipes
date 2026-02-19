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
                    <div class="tag-info">
                      <strong>{{ item.quantity }}x</strong> {{ item.recipe_name }} ({{ item.scenario_name }})
                    </div>
                    <div class="tag-prices">
                      <span class="unit-price">U: ${{ (item.unit_price || 0).toFixed(2) }} / Bs {{ ((item.unit_price ||
                        0) *
                        dolarRate).toFixed(2) }}</span>
                      <span class="total-price-sm">T: ${{ item.total_price.toFixed(2) }}</span>
                    </div>
                  </div>
                </div>

                <div class="sale-footer">
                  <div class="total-amount">
                    Total: <strong>${{ sale.total_amount.toFixed(2) }}</strong>
                    <span class="bs-val">/ Bs {{ (sale.total_amount * dolarRate).toFixed(2)
                      }}</span>
                  </div>
                  <div class="sale-actions">
                    <button @click="editSale(sale)" class="btn-icon" title="Editar Venta">
                      <Icon name="pencil" />
                    </button>
                    <button @click="openStatusModal(sale)" class="btn-icon text-success" title="Cambiar Estado">
                      <Icon name="list-status" />
                    </button>
                    <button @click="openInvoiceModal(sale)" class="btn-icon text-primary" title="Ver Factura">
                      <Icon name="printer" />
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
            <Icon name="tag-plus" /> {{ isEditingSale ? 'Editar Venta' : 'Nueva Venta' }}
          </h3>
          <button @click="showSaleModal = false; resetSaleForm()" class="btn-icon">
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
                      {{ sc.name }} (${{ calculateScenarioPrice(sc).toFixed(2) }} / Bs {{ (calculateScenarioPrice(sc) *
                        dolarRate).toFixed(2) }})
                    </option>
                  </optgroup>
                </select>
              </div>
              <div class="form-group">
                <label>Cant.</label>
                <input v-model.number="itemQuantity" type="number" class="form-input" min="1" />
              </div>
              <div class="form-group">
                <label>Precio Unitario</label>
                <div class="input-with-toggle">
                  <input v-model.number="manualUnitPrice" type="number" step="0.01" class="form-input" />
                  <div class="currency-toggle">
                    <button @click="manualUnitPriceCurrency = 'USD'"
                      :class="{ active: manualUnitPriceCurrency === 'USD' }">USD</button>
                    <button @click="manualUnitPriceCurrency = 'Bs'"
                      :class="{ active: manualUnitPriceCurrency === 'Bs' }">Bs</button>
                  </div>
                </div>
              </div>
              <div v-if="itemPreviewSubtotal > 0" class="subtotal-preview">
                <span class="label">Monto Preview</span>
                <span class="value">${{ itemPreviewSubtotal.toFixed(2) }}</span>
                <span class="value-bs">Bs. {{ (itemPreviewSubtotal * dolarRate).toFixed(2) }}</span>
              </div>
              <div class="add-product-actions mt-auto">
                <button @click="addSaleItem" class="btn btn-secondary" :disabled="!selectedScenarioId">
                  {{ editingItemIndex !== null ? 'Actualizar' : 'Agregar' }}
                </button>
                <button v-if="editingItemIndex !== null" @click="cancelEdit" class="btn btn-outline ml-2">
                  Cancelar
                </button>
              </div>
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
                  <td>
                    <div class="price-stack">
                      <span>${{ item.unit_price.toFixed(2) }}</span>
                      <span class="price-bs">Bs. {{ (item.unit_price * dolarRate).toFixed(2) }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="price-stack">
                      <span>${{ item.total_price.toFixed(2) }}</span>
                      <span class="price-bs">Bs. {{ (item.total_price * dolarRate).toFixed(2) }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="sc-actions">
                      <button @click="editSaleItem(idx)" class="btn-icon" title="Editar">
                        <Icon name="pencil" />
                      </button>
                      <button @click="newSaleItems.splice(idx, 1)" class="btn-icon text-danger" title="Eliminar">
                        <Icon name="delete" />
                      </button>
                    </div>
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

    <!-- MODAL FACTURA -->
    <div v-if="showInvoiceModal" class="modal-overlay">
      <div class="modal-content invoice-modal">
        <header class="modal-header">
          <h3>Previsualización de Factura</h3>
          <div class="header-actions">
            <button @click="exportarFacturaJPG" class="btn btn-primary" :disabled="isExporting">
              <Icon :name="isExporting ? 'loading' : 'download'" />
              {{ isExporting ? 'Generando...' : 'Descargar JPG' }}
            </button>
            <button @click="showInvoiceModal = false" class="btn-icon">
              <Icon name="close" />
            </button>
          </div>
        </header>

        <div class="modal-body scrollable">
          <div id="seccion-factura" class="invoice-container">
            <div class="invoice-header">
              <div class="biz-info">
                <h1 class="biz-name">BOXY RECIPES</h1>
                <p>Inversiones Boxy, C.A.</p>
                <p>RIF: J-50000000-0</p>
                <p>Ventas al mayor y detal</p>
              </div>
              <div class="invoice-meta">
                <div class="meta-item">
                  <span class="label">Nro. Factura:</span>
                  <div class="invoice-num-box">
                    <span class="value">#{{ selectedSaleForInvoice?.invoice_number || 'S/N' }}</span>
                    <button v-if="!selectedSaleForInvoice?.invoice_number"
                      @click="assignInvoiceNumber(selectedSaleForInvoice!)" class="btn-generate-invoice"
                      title="Generar Correlativo">
                      <Icon name="numeric-positive-1" />
                    </button>
                  </div>
                </div>
                <div class="meta-item">
                  <span class="label">Fecha:</span>
                  <span class="value">{{ selectedSaleForInvoice ? formatDate(selectedSaleForInvoice.created_at) : ''
                    }}</span>
                </div>
              </div>
            </div>

            <div class="customer-info-section">
              <h4 class="section-title">Datos del Cliente</h4>
              <div class="customer-grid">
                <div class="c-item">
                  <span class="label">Cliente:</span>
                  <span class="value">{{ selectedSaleForInvoice?.customer_name }}</span>
                </div>
                <div class="c-item">
                  <span class="label">Teléfono:</span>
                  <span class="value">{{ selectedSaleForInvoice?.customer_phone || 'N/A' }}</span>
                </div>
                <div class="c-item">
                  <span class="label">Estatus:</span>
                  <span class="value status-text" :class="selectedSaleForInvoice?.status">
                    {{ selectedSaleForInvoice ? formatStatus(selectedSaleForInvoice.status) : '' }}
                  </span>
                </div>
              </div>
            </div>

            <div class="invoice-table-wrapper">
              <table class="invoice-table">
                <thead>
                  <tr>
                    <th>Cant.</th>
                    <th>Descripción</th>
                    <th class="text-right">P. Unit ($)</th>
                    <th class="text-right">Subtotal ($)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, idx) in selectedSaleForInvoice?.items" :key="idx">
                    <td>{{ item.quantity }}</td>
                    <td>{{ item.recipe_name }} ({{ item.scenario_name }})</td>
                    <td class="text-right">{{ item.unit_price.toFixed(2) }}</td>
                    <td class="text-right">{{ item.total_price.toFixed(2) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="invoice-footer">
              <div class="totals-section">
                <div class="total-row">
                  <span>TOTAL DIVISAS:</span>
                  <strong>${{ selectedSaleForInvoice?.total_amount.toFixed(2) }}</strong>
                </div>
                <div class="total-row bs">
                  <span>TOTAL BS (Tasa BCV):</span>
                  <strong>Bs {{ ((selectedSaleForInvoice?.total_amount || 0) * dolarRate).toFixed(2) }}</strong>
                </div>
              </div>
            </div>

            <div class="invoice-notes">
              <p>Gracias por su compra. Esta factura ha sido generada digitalmente.</p>
              <p class="tasa-ref">Tasa de cambio referencial BCV: {{ dolarRate }} Bs/$</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject, watch, type Ref } from 'vue'
import { collection, query, getDocs, addDoc, updateDoc, doc, orderBy, deleteDoc, runTransaction } from 'firebase/firestore'
import { db } from '../firebase.config'
import Icon from '@/components/ui/Icon.vue'
import type { Customer, Sale, SaleItem, SaleStatus } from '../types/sales'
import type { Recipe, RecipeScenario } from '../types/recipe'
import { toJpeg } from 'html-to-image'
import type { DolarBCV, Product } from '../types/producto'
import { useProduction } from '../composables/useProduction'

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
const manualUnitPrice = ref(0)
const manualUnitPriceCurrency = ref<'USD' | 'Bs'>('USD')
const editingItemIndex = ref<number | null>(null)
const editingSaleId = ref<string | null>(null)
const isEditingSale = ref(false)
const showInvoiceModal = ref(false)
const isExporting = ref(false)
const selectedSaleForInvoice = ref<Sale | null>(null)

// COMPUTED
const filteredCustomers = computed(() => {
  const withSales = customers.value.filter(c => getCustomerSales(c.id!).length > 0)
  if (!searchQuery.value) return withSales
  const q = searchQuery.value.toLowerCase()
  return withSales.filter(c => c.name.toLowerCase().includes(q))
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

// Only show recipes that have at least one scenario
const availableRecipes = computed(() =>
  recipes.value.filter(r => allScenarios.value.some(sc => sc.recipe_id === r.id))
)

const {
  calculateScenarioSalePrice,
} = useProduction(availableProducts, dolarRate)

const itemPreviewPriceUSD = computed(() => {
  if (manualUnitPriceCurrency.value === 'Bs') {
    return manualUnitPrice.value / (dolarRate.value || 1)
  }
  return manualUnitPrice.value
})

const itemPreviewSubtotal = computed(() => {
  if (!selectedScenarioId.value) return 0
  return itemPreviewPriceUSD.value * (itemQuantity.value || 0)
})

watch(selectedScenarioId, (newId) => {
  if (newId && editingItemIndex.value === null) {
    const sc = allScenarios.value.find(s => s.id === newId)
    if (sc) {
      manualUnitPrice.value = calculateScenarioPrice(sc)
      manualUnitPriceCurrency.value = 'USD'
    }
  }
})

// METHODS
async function loadData() {
  // Load both regular products AND recipe products (my_products) for correct cost calculation
  const [prodSnap, myProdSnap] = await Promise.all([
    getDocs(collection(db, 'productos')),
    getDocs(collection(db, 'my_products')),
  ])
  const regularProducts = prodSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product))
  const myProducts = myProdSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product))
  availableProducts.value = [...regularProducts, ...myProducts]

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
  allScenarios.value = scSnap.docs.map(d => ({ ...d.data(), id: d.id } as RecipeScenario))
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

function calculateScenarioPrice(scenario: RecipeScenario): number {
  const recipe = recipes.value.find(r => r.id === scenario.recipe_id)
  if (!recipe) return 0
  return calculateScenarioSalePrice(recipe, scenario)
}

function addSaleItem() {
  const sc = allScenarios.value.find(s => s.id === selectedScenarioId.value)
  if (!sc) return

  const recipe = recipes.value.find(r => r.id === sc.recipe_id)
  const unitPrice = itemPreviewPriceUSD.value

  const itemData: SaleItem = {
    scenario_id: sc.id!,
    scenario_name: sc.name,
    recipe_name: recipe?.name || 'Receta',
    quantity: itemQuantity.value,
    unit_price: unitPrice,
    total_price: unitPrice * itemQuantity.value
  }

  if (editingItemIndex.value !== null) {
    newSaleItems.value[editingItemIndex.value] = itemData
    editingItemIndex.value = null
  } else {
    newSaleItems.value.push(itemData)
  }

  selectedScenarioId.value = ''
  itemQuantity.value = 1
  manualUnitPrice.value = 0
}

function editSaleItem(idx: number) {
  const item = newSaleItems.value[idx]
  selectedScenarioId.value = item.scenario_id
  itemQuantity.value = item.quantity
  manualUnitPrice.value = item.unit_price
  editingItemIndex.value = idx
}

function cancelEdit() {
  editingItemIndex.value = null
  selectedScenarioId.value = ''
  itemQuantity.value = 1
  manualUnitPrice.value = 0
  manualUnitPriceCurrency.value = 'USD'
}

function resetSaleForm() {
  newSale.value = {
    customer_name: '',
    customer_phone: '',
    status: 'pendiente',
    payment_due_date: new Date().toISOString().split('T')[0],
  }
  newSaleItems.value = []
  selectedScenarioId.value = ''
  itemQuantity.value = 1
  manualUnitPrice.value = 0
  manualUnitPriceCurrency.value = 'USD'
  editingItemIndex.value = null
  editingSaleId.value = null
  isEditingSale.value = false
}

function editSale(sale: Sale) {
  isEditingSale.value = true
  editingSaleId.value = sale.id!
  newSale.value = {
    customer_name: sale.customer_name,
    customer_phone: sale.customer_phone || customers.value.find(c => c.id === sale.customer_id)?.phone || '',
    status: sale.status,
    payment_due_date: sale.payment_due_date,
  }
  newSaleItems.value = JSON.parse(JSON.stringify(sale.items))
  showSaleModal.value = true
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

    // 2. Create/Update Sale
    const saleData: Partial<Sale> = {
      customer_id: customerId,
      customer_name: newSale.value.customer_name,
      customer_phone: newSale.value.customer_phone,
      items: newSaleItems.value,
      total_amount: totalNewSaleAmount.value,
      status: newSale.value.status,
      payment_due_date: newSale.value.payment_due_date,
    }

    if (isEditingSale.value && editingSaleId.value) {
      saleData.updated_at = new Date().toISOString()
      await updateDoc(doc(db, 'sales', editingSaleId.value), saleData)
    } else {
      saleData.created_at = new Date().toISOString()
      // Generate Invoice Number for NEW sales
      saleData.invoice_number = await getNextInvoiceNumber()
      await addDoc(collection(db, 'sales'), saleData)
    }

    showSaleModal.value = false
    resetSaleForm()
    await loadData()
  } catch (e) {
    console.error('Error al guardar venta:', e)
    alert('Error al guardar venta')
  }
}

function openInvoiceModal(sale: Sale) {
  selectedSaleForInvoice.value = sale
  showInvoiceModal.value = true
}

async function exportarFacturaJPG() {
  const node = document.getElementById('seccion-factura')
  if (!node || isExporting.value) return

  isExporting.value = true
  try {
    const dataUrl = await toJpeg(node, {
      quality: 0.95,
      backgroundColor: '#ffffff',
      style: {
        transform: 'scale(1)',
        transformOrigin: 'top left'
      }
    })

    const link = document.createElement('a')
    const fileName = `factura_${selectedSaleForInvoice.value?.customer_name.replace(/\s+/g, '_')}_${new Date().getTime()}.jpg`
    link.download = fileName
    link.href = dataUrl
    link.click()
  } catch (error) {
    console.error('Error al exportar factura:', error)
    alert('No se pudo generar la imagen. Verifica si hay imágenes con errores de CORS.')
  } finally {
    isExporting.value = false
  }
}

function openStatusModal(sale: Sale) {
  currentSale.value = sale
  showStatusModal.value = true
}

// INVOICE NUMBERING LOGIC
function incrementLetters(letters: string): string | null {
  const chars = letters.split('')
  for (let i = chars.length - 1; i >= 0; i--) {
    if (chars[i] === 'Z') {
      chars[i] = 'A'
    } else {
      chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1)
      return chars.join('')
    }
  }
  return null
}

async function getNextInvoiceNumber(): Promise<string> {
  const docRef = doc(db, 'settings', 'invoices')
  let nextNumber = "AAA001"

  try {
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef)
      let current = "AAA000"
      if (docSnap.exists()) {
        current = docSnap.data().last_number
      }

      const letters = current.substring(0, 3)
      const numbersStr = current.substring(3)
      const numLength = numbersStr.length || 3
      let numVal = parseInt(numbersStr, 10) || 0

      numVal++
      const maxVal = Math.pow(10, numLength) - 1

      if (numVal > maxVal) {
        const nextLetters = incrementLetters(letters)
        if (nextLetters === null) {
          // Reset letters but increase digits (AAA + 5 digits as per AAA00001)
          nextNumber = "AAA" + "1".padStart(5, '0')
        } else {
          nextNumber = nextLetters + "1".padStart(numLength, '0')
        }
      } else {
        nextNumber = letters + numVal.toString().padStart(numLength, '0')
      }

      transaction.set(docRef, { last_number: nextNumber })
    })
  } catch (e) {
    console.error('Error in invoice numbering transaction:', e)
    // Fallback or rethrow
    throw e
  }

  return nextNumber
}

async function assignInvoiceNumber(sale: Sale) {
  if (sale.invoice_number) return

  try {
    const next = await getNextInvoiceNumber()
    await updateDoc(doc(db, 'sales', sale.id!), { invoice_number: next })
    sale.invoice_number = next
    await loadData()
  } catch (error) {
    console.error('Error al asignar nro. factura:', error)
    alert('Error al generar correlativo')
  }
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
  font-size: 0.8rem;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--surface);
  min-width: 180px;
}

.product-mini-tag .tag-info {
  line-height: 1.2;
}

.product-mini-tag .tag-prices {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  border-top: 1px dashed var(--border);
  padding-top: 4px;
}

.product-mini-tag .unit-price {
  font-size: 0.7rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.product-mini-tag .total-price-sm {
  font-weight: 800;
  color: var(--primary);
  font-size: 0.85rem;
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

.ml-2 {
  margin-left: 8px;
}

.add-product-actions {
  display: flex;
  align-items: center;
}

.sc-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
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

.subtotal-preview {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding-bottom: 4px;
  min-width: 140px;
}

.subtotal-preview .label {
  font-size: 0.65rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  font-weight: 800;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
}

.subtotal-preview .value {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--primary);
  line-height: 1.1;
}

.subtotal-preview .value-bs {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-weight: 600;
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

/* INVOICE STYLES */
.invoice-modal {
  max-width: 800px;
  width: 95%;
}

.invoice-container {
  background: white;
  padding: 40px;
  color: #1a1a1a;
  font-family: 'Inter', system-ui, sans-serif;
  width: 750px;
  min-width: 750px;
  max-width: 750px;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .invoice-modal .modal-body {
    padding: 0;
  }

  .invoice-container {
    transform: scale(0.5);
    transform-origin: top center;
    margin-bottom: -375px;
  }
}

.invoice-header {
  display: flex;
  justify-content: space-between;
  border-bottom: 2px solid #f3f4f6;
  padding-bottom: 20px;
  margin-bottom: 30px;
}

.biz-name {
  font-size: 1.8rem;
  font-weight: 900;
  color: #2563eb;
  margin-bottom: 5px;
}

.biz-info p {
  margin: 2px 0;
  font-size: 0.9rem;
  color: #4b5563;
}

.invoice-meta {
  text-align: right;
}

.meta-item {
  margin-bottom: 8px;
}

.meta-item .label {
  font-size: 0.8rem;
  color: #6b7280;
  text-transform: uppercase;
  font-weight: 700;
  display: block;
}

.meta-item .value {
  font-size: 1.1rem;
  font-weight: 800;
}

.invoice-num-box {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-generate-invoice {
  background: #dbeafe;
  color: #1e40af;
  border: none;
  border-radius: 4px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-generate-invoice:hover {
  background: #bfdbfe;
  transform: scale(1.1);
}

.customer-info-section {
  background: #f9fafb;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 30px;
}

.section-title {
  font-size: 0.8rem;
  color: #6b7280;
  text-transform: uppercase;
  font-weight: 700;
  margin-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 5px;
}

.customer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.c-item .label {
  font-size: 0.75rem;
  color: #6b7280;
  display: block;
}

.c-item .value {
  font-weight: 700;
}

.status-text {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  text-transform: uppercase;
}

.status-text.pagado {
  background: #d1fae5;
  color: #065f46;
}

.status-text.pendiente {
  background: #fef3c7;
  color: #92400e;
}

.invoice-table-wrapper {
  margin-bottom: 40px;
}

.invoice-table {
  width: 100%;
  border-collapse: collapse;
}

.invoice-table th {
  text-align: left;
  font-size: 0.8rem;
  text-transform: uppercase;
  color: #6b7280;
  padding: 12px 8px;
  border-bottom: 2px solid #e5e7eb;
}

.invoice-table td {
  padding: 12px 8px;
  border-bottom: 1px solid #f3f4f6;
  font-size: 0.95rem;
}

.text-right {
  text-align: right;
}

.invoice-footer {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 40px;
}

.totals-section {
  width: 300px;
}

.total-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 1.1rem;
}

.total-row.bs {
  color: #6b7280;
  font-size: 0.9rem;
  border-bottom: 1px solid #e5e7eb;
}

.total-row strong {
  font-size: 1.4rem;
  color: #1a1a1a;
}

.invoice-notes {
  text-align: center;
  border-top: 2px solid #f3f4f6;
  padding-top: 20px;
  color: #9ca3af;
  font-size: 0.8rem;
}

.tasa-ref {
  font-size: 0.7rem;
  margin-top: 5px;
}

.scrollable {
  max-height: 70vh;
  overflow-y: auto;
}
</style>
