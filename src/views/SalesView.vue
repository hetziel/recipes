<template>
  <div class="sales-container">
    <header class="page-header">
      <div class="header-left">
        <h1>
          <Icon name="cash-register" /> Gestión de Ventas
        </h1>
      </div>
      <div class="header-actions">
        <button @click="activeTab = 'list'" :class="['btn', activeTab === 'list' ? 'btn-primary' : 'btn-outline']">
          <Icon name="view-list" /> Listado
        </button>
        <button @click="activeTab = 'analytics'"
          :class="['btn', activeTab === 'analytics' ? 'btn-primary' : 'btn-outline']">
          <Icon name="chart-bar" /> Analíticas
        </button>
        <button @click="openSaleModal" class="btn btn-primary ml-2">
          <Icon name="plus" /> Nueva Venta
        </button>
      </div>
    </header>

    <div class="sales-content">
      <!-- ANALYTICS TAB -->
      <div v-if="activeTab === 'analytics'" class="analytics-view fade-in">
        <section class="stats-grid-premium">
          <div class="glass-card stat-item investment">
            <div class="stat-icon">
              <Icon name="hand-holding-usd" />
            </div>
            <div class="stat-info">
              <label>Inversión</label>
              <div class="stat-value">${{ totalFinancials.cost.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              }) }}</div>
              <div class="stat-sub">Bs. {{ (totalFinancials.cost * dolarRate).toLocaleString() }}</div>
            </div>
            <div class="stat-bg-icon">
              <Icon name="hand-holding-usd" />
            </div>
          </div>

          <div class="glass-card stat-item sales">
            <div class="stat-icon">
              <Icon name="shopping-cart" />
            </div>
            <div class="stat-info">
              <label>Ventas Totales</label>
              <div class="stat-value">${{ totalFinancials.revenue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              }) }}</div>
              <div class="stat-sub">Bs. {{ (totalFinancials.revenue * dolarRate).toLocaleString() }}</div>
            </div>
            <div class="stat-bg-icon">
              <Icon name="shopping-cart" />
            </div>
          </div>

          <div class="glass-card stat-item profit" :class="{ positive: totalFinancials.profit > 0 }">
            <div class="stat-icon">
              <Icon name="chart-line" />
            </div>
            <div class="stat-info">
              <label>Ganancia Neta</label>
              <div class="stat-value">${{ totalFinancials.profit.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              }) }}</div>
              <div class="stat-sub">Bs. {{ (totalFinancials.profit * dolarRate).toLocaleString() }}</div>
            </div>
            <div class="stat-bg-icon">
              <Icon name="chart-line" />
            </div>
          </div>

          <div class="glass-card stat-item margin">
            <div class="stat-icon">
              <Icon name="percentage" />
            </div>
            <div class="stat-info">
              <label>Margen</label>
              <div class="stat-value">{{ totalFinancials.margin.toFixed(1) }}%</div>
              <div class="stat-progress">
                <div class="progress-bar" :style="{ width: Math.min(totalFinancials.margin, 100) + '%' }"></div>
              </div>
            </div>
          </div>
        </section>

        <div class="charts-grid-premium">
          <div class="glass-card chart-container">
            <div class="chart-header">
              <h3>
                <Icon name="chart-line" /> Tendencia de Ventas
              </h3>
              <div class="pill-filters">
                <button @click="timeFilter = 'day'" :class="{ active: timeFilter === 'day' }">Día</button>
                <button @click="timeFilter = 'month'" :class="{ active: timeFilter === 'month' }">Mes</button>
                <button @click="timeFilter = 'year'" :class="{ active: timeFilter === 'year' }">Año</button>
              </div>
            </div>
            <div class="canvas-wrapper">
              <canvas ref="salesChartCanvas"></canvas>
            </div>
          </div>

          <div class="glass-card chart-container">
            <div class="chart-header">
              <h3>
                <Icon name="trophy" /> Top 10 Compradores
              </h3>
            </div>
            <div class="canvas-wrapper">
              <canvas ref="buyersChartCanvas"></canvas>
            </div>
          </div>
        </div>

        <section class="top-buyers-list glass-card mt-4 fade-in">
          <div class="chart-header">
            <h3>
              <Icon name="trophy" /> Detalle de Mejores Clientes
            </h3>
          </div>
          <div class="table-responsive">
            <table class="mini-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Ventas</th>
                  <th>Total Comprado</th>
                  <th>Última Compra</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="buyer in topBuyers" :key="buyer.id">
                  <td><strong>{{ buyer.name }}</strong></td>
                  <td>{{ buyer.count }}</td>
                  <td>
                    <div class="price-stack">
                      <span>${{ buyer.total.toFixed(2) }}</span>
                      <span class="price-bs">Bs. {{ (buyer.total * dolarRate).toFixed(2) }}</span>
                    </div>
                  </td>
                  <td>{{ formatDate(buyer.lastDate) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <!-- LIST TAB -->
      <div v-else class="list-view fade-in">
        <section class="stats-cards-mini-grid">
          <div class="glass-card mini-stat pending" @click="statusFilter = 'pendiente'"
            :class="{ active: statusFilter === 'pendiente' }">
            <div class="mini-icon">
              <Icon name="clock-outline" />
            </div>
            <div class="mini-content">
              <label>Pendientes</label>
              <div class="value">{{ stats.pending }}</div>
            </div>
          </div>
          <div class="glass-card mini-stat paid" @click="statusFilter = 'pagado'"
            :class="{ active: statusFilter === 'pagado' }">
            <div class="mini-icon">
              <Icon name="check-circle-outline" />
            </div>
            <div class="mini-content">
              <label>Pagados</label>
              <div class="value">{{ stats.paid }}</div>
            </div>
          </div>
          <div class="glass-card mini-stat to-pay" @click="statusFilter = 'por pagar'"
            :class="{ active: statusFilter === 'por pagar' }">
            <div class="mini-icon">
              <Icon name="wallet-outline" />
            </div>
            <div class="mini-content">
              <label>Por Pagar</label>
              <div class="value">{{ stats.toPay }}</div>
            </div>
          </div>
          <div class="glass-card mini-stat all" @click="statusFilter = 'all'"
            :class="{ active: statusFilter === 'all' }">
            <div class="mini-icon">
              <Icon name="all-inclusive" />
            </div>
            <div class="mini-content">
              <label>Total</label>
              <div class="value">{{ sales.length }}</div>
            </div>
          </div>
        </section>

        <section class="sales-list-section glass-card">
          <div class="section-header-premium">
            <div class="title-with-subtitle">
              <h2>
                <Icon name="history" /> Historial de Ventas
              </h2>
              <span class="subtitle">{{ filteredSales.length }} ventas encontradas</span>
            </div>
            <div class="header-tools">
              <div class="pill-filters status-pills">
                <button @click="statusFilter = 'all'" :class="{ active: statusFilter === 'all' }">Todos</button>
                <button @click="statusFilter = 'pendiente'"
                  :class="{ active: statusFilter === 'pendiente' }">Pendientes</button>
                <button @click="statusFilter = 'pagado'" :class="{ active: statusFilter === 'pagado' }">Pagados</button>
                <button @click="statusFilter = 'por pagar'" :class="{ active: statusFilter === 'por pagar' }">Por
                  Pagar</button>
              </div>
              <div class="search-premium">
                <Icon name="search" class="search-icon" />
                <input v-model="searchQuery" type="text" placeholder="Buscar por cliente o factura..." />
              </div>
            </div>
          </div>

          <div class="sales-modern-list">
            <div v-for="sale in filteredSales" :key="sale.id" class="sale-entry-card fade-in">
              <div class="sale-main-info">
                <div class="invoice-badge">#{{ sale.invoice_number || 'S/N' }}</div>
                <div class="customer-details">
                  <span class="c-name">{{ sale.customer_name }}</span>
                  <span class="c-date">
                    <Icon name="calendar" /> Venta: {{ formatDate(sale.purchase_date || sale.created_at) }}
                  </span>
                  <div v-if="sale.status === 'por pagar' || sale.status === 'pendiente'" class="due-alert"
                    :class="getDueClass(sale.payment_due_date)">
                    <Icon :name="getDueIcon(sale.payment_due_date)" />
                    {{ getDueMessage(sale.payment_due_date) }}
                  </div>
                </div>
              </div>

              <div class="sale-products-overview">
                <div class="items-stack">
                  <div v-for="(item, idx) in sale.items.slice(0, 2)" :key="idx" class="item-tag">
                    {{ item.quantity }}x {{ item.recipe_name }}
                  </div>
                  <div v-if="sale.items.length > 2" class="more-items">+{{ sale.items.length - 2 }} más</div>
                </div>
              </div>

              <div class="sale-financials-premium">
                <div class="price-usd">${{ sale.total_amount.toFixed(2) }}</div>
                <div class="price-bs">Bs. {{ (sale.total_amount * dolarRate).toFixed(2) }}</div>
              </div>

              <div class="sale-status-area">
                <span :class="['modern-badge', sale.status]" @click="openStatusModal(sale)">
                  {{ formatStatus(sale.status) }}
                  <span v-if="sale.status_updated_at" class="status-date">
                    {{ formatDate(sale.status_updated_at) }}
                  </span>
                </span>
              </div>

              <div class="sale-actions-premium">
                <button @click="editSale(sale)" class="action-btn edit" title="Editar">
                  <Icon name="pencil" />
                </button>
                <button @click="openInvoiceModal(sale)" class="action-btn invoice" title="Factura">
                  <Icon name="printer" />
                </button>
                <button @click="deleteSale(sale.id!)" class="action-btn delete" title="Eliminar">
                  <Icon name="delete" />
                </button>
              </div>
            </div>

            <div v-if="filteredSales.length === 0" class="empty-state-premium">
              <Icon name="search-off" class="empty-icon" />
              <p>No se encontraron resultados para "{{ searchQuery }}"</p>
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- MODAL NUEVA VENTA (EXISTING) -->
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
              <div class="form-group">
                <label>Fecha de Venta</label>
                <input v-model="newSale.purchase_date" type="date" class="form-input" />
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
              {{ isEditingSale ? 'Actualizar Venta' : 'Crear Venta' }}
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
import { ref, computed, onMounted, inject, watch, type Ref, shallowRef } from 'vue'
import { collection, query, getDocs, addDoc, updateDoc, doc, orderBy, deleteDoc, runTransaction } from 'firebase/firestore'
import { db } from '../firebase.config'
import Icon from '@/components/ui/Icon.vue'
import type { Customer, Sale, SaleItem, SaleStatus } from '../types/sales'
import type { Recipe, RecipeScenario } from '../types/recipe'
import { toJpeg } from 'html-to-image'
import type { DolarBCV, Product } from '../types/producto'
import { useProduction } from '../composables/useProduction'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

// INJECTS
const { dolarBCV } = inject<{ dolarBCV: Ref<DolarBCV | null> }>('dolarBCV')!
const dolarRate = computed(() => dolarBCV.value?.promedio || 0)

// STATE
const activeTab = ref<'list' | 'analytics'>('list')
const customers = ref<Customer[]>([])
const sales = ref<Sale[]>([])
const recipes = ref<Recipe[]>([])
const allScenarios = ref<RecipeScenario[]>([])
const availableProducts = ref<Product[]>([])
const showSaleModal = ref(false)
const searchQuery = ref('')
const showStatusModal = ref(false)
const currentSale = ref<Sale | null>(null)
const timeFilter = ref<'day' | 'month' | 'year'>('month')
const statusFilter = ref<SaleStatus | 'all'>('all')

// NEW SALE STATE
const newSale = ref({
  customer_name: '',
  customer_phone: '',
  status: 'pendiente' as SaleStatus,
  purchase_date: new Date().toISOString().split('T')[0],
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

// CHART REFS
const salesChartCanvas = ref<HTMLCanvasElement | null>(null)
const buyersChartCanvas = ref<HTMLCanvasElement | null>(null)
const salesChart = shallowRef<Chart | null>(null)
const buyersChart = shallowRef<Chart | null>(null)

const {
  calculateScenarioSalePrice,
  calculateScenarioUnitCost,
} = useProduction(availableProducts, dolarRate)

// COMPUTED
const filteredSales = computed(() => {
  let result = sales.value

  if (statusFilter.value !== 'all') {
    result = result.filter(s => s.status === statusFilter.value)
  }

  if (!searchQuery.value) return result

  const q = searchQuery.value.toLowerCase()
  return result.filter(s =>
    s.customer_name.toLowerCase().includes(q) ||
    s.invoice_number?.toLowerCase().includes(q)
  )
})

const stats = computed(() => {
  return {
    pending: sales.value.filter(s => s.status === 'pendiente').length,
    paid: sales.value.filter(s => s.status === 'pagado').length,
    toPay: sales.value.filter(s => s.status === 'por pagar').length,
  }
})

// ANALYTICS COMPUTED
const totalFinancials = computed(() => {
  let cost = 0
  let revenue = 0

  sales.value.forEach(sale => {
    if (sale.status === 'cancelado') return
    revenue += sale.total_amount
    sale.items.forEach(item => {
      const scenario = allScenarios.value.find(sc => sc.id === item.scenario_id)
      const recipe = recipes.value.find(r => r.id === scenario?.recipe_id)
      if (recipe && scenario) {
        cost += calculateScenarioUnitCost(recipe, scenario) * item.quantity
      }
    })
  })

  const profit = revenue - cost
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0

  return { cost, revenue, profit, margin }
})

const topBuyers = computed(() => {
  const buyerMap = new Map<string, { id: string, name: string, count: number, total: number, lastDate: string }>()

  sales.value.forEach(sale => {
    if (sale.status === 'cancelado') return
    const current = buyerMap.get(sale.customer_id) || {
      id: sale.customer_id,
      name: sale.customer_name,
      count: 0,
      total: 0,
      lastDate: sale.created_at
    }
    current.count++
    current.total += sale.total_amount
    if (new Date(sale.created_at) > new Date(current.lastDate)) {
      current.lastDate = sale.created_at
    }
    buyerMap.set(sale.customer_id, current)
  })

  return Array.from(buyerMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
})

const totalNewSaleAmount = computed(() => {
  return newSaleItems.value.reduce((sum, item) => sum + item.total_price, 0)
})

const availableRecipes = computed(() =>
  recipes.value.filter(r => allScenarios.value.some(sc => sc.recipe_id === r.id))
)

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

// WATCHERS
watch(selectedScenarioId, (newId) => {
  if (newId && editingItemIndex.value === null) {
    const sc = allScenarios.value.find(s => s.id === newId)
    if (sc) {
      manualUnitPrice.value = calculateScenarioPrice(sc)
      manualUnitPriceCurrency.value = 'USD'
    }
  }
})

watch([activeTab, timeFilter, sales], () => {
  if (activeTab.value === 'analytics') {
    setTimeout(initCharts, 100)
  }
})

// METHODS
async function loadData() {
  const [prodSnap, myProdSnap] = await Promise.all([
    getDocs(collection(db, 'productos')),
    getDocs(collection(db, 'my_products')),
  ])
  const regularProducts = prodSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product))
  const myProducts = myProdSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product))
  availableProducts.value = [...regularProducts, ...myProducts]

  const custSnap = await getDocs(collection(db, 'customers'))
  customers.value = custSnap.docs.map(d => ({ id: d.id, ...d.data() } as Customer))

  const salesSnap = await getDocs(query(collection(db, 'sales'), orderBy('created_at', 'desc')))
  sales.value = salesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Sale))

  const recipesSnap = await getDocs(collection(db, 'recipes'))
  recipes.value = recipesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Recipe))

  const scSnap = await getDocs(collection(db, 'scenarios'))
  allScenarios.value = scSnap.docs.map(d => ({ ...d.data(), id: d.id } as RecipeScenario))
}

function initCharts() {
  if (!salesChartCanvas.value || !buyersChartCanvas.value) return

  const ctxSales = salesChartCanvas.value.getContext('2d')
  const ctxBuyers = buyersChartCanvas.value.getContext('2d')

  if (!ctxSales || !ctxBuyers) return

  // DESTROY PREVIOUS
  if (salesChart.value) salesChart.value.destroy()
  if (buyersChart.value) buyersChart.value.destroy()

  // SALES DATA PROCESSING
  const periodData = new Map<string, number>()
  sales.value.forEach(s => {
    if (s.status === 'cancelado') return
    const date = new Date(s.created_at)
    let key = ''
    if (timeFilter.value === 'day') key = date.toLocaleDateString()
    else if (timeFilter.value === 'month') key = `${date.getMonth() + 1}/${date.getFullYear()}`
    else key = `${date.getFullYear()}`

    periodData.set(key, (periodData.get(key) || 0) + s.total_amount)
  })

  const sortedKeys = Array.from(periodData.keys()).reverse()

  // Gradient for Sales
  const salesGradient = ctxSales.createLinearGradient(0, 0, 0, 400)
  salesGradient.addColorStop(0, 'rgba(79, 70, 229, 0.4)')
  salesGradient.addColorStop(1, 'rgba(79, 70, 229, 0.0)')

  salesChart.value = new Chart(salesChartCanvas.value, {
    type: 'line',
    data: {
      labels: sortedKeys,
      datasets: [{
        label: 'Ventas ($)',
        data: sortedKeys.map(k => periodData.get(k)),
        borderColor: '#4f46e5',
        borderWidth: 3,
        backgroundColor: salesGradient,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#4f46e5',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          padding: 12,
          cornerRadius: 8,
          titleFont: { size: 14, weight: 'bold' },
          bodyFont: { size: 13 },
          callbacks: {
            label: (context) => ` Total: $${context.parsed.y.toFixed(2)}`
          }
        }
      },
      scales: {
        y: { grid: { display: false }, ticks: { callback: (val) => `$${val}` } },
        x: { grid: { display: false } }
      }
    }
  })

  // Gradient for Buyers
  const buyersGradient = ctxBuyers.createLinearGradient(0, 0, 400, 0)
  buyersGradient.addColorStop(0, '#10b981')
  buyersGradient.addColorStop(1, '#6ee7b7')

  buyersChart.value = new Chart(buyersChartCanvas.value, {
    type: 'bar',
    data: {
      labels: topBuyers.value.map(b => b.name),
      datasets: [{
        label: 'Total Comprado ($)',
        data: topBuyers.value.map(b => b.total),
        backgroundColor: buyersGradient,
        borderRadius: 8,
        barThickness: 20
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          padding: 10,
          cornerRadius: 8
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { callback: (val) => `$${val}` } },
        y: { grid: { display: false } }
      }
    }
  })
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

function getDueMessage(dueDate: string) {
  if (!dueDate) return ''
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const diffTime = due.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays > 0) return `Faltan ${diffDays} días para pagar`
  if (diffDays < 0) return `Tiene ${Math.abs(diffDays)} días de retraso`
  return 'Vence hoy'
}

function getDueClass(dueDate: string) {
  if (!dueDate) return ''
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const diffTime = due.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'overdue'
  if (diffDays <= 3) return 'urgent'
  return 'upcoming'
}

function getDueIcon(dueDate: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const diffTime = due.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'alert-circle'
  if (diffDays <= 3) return 'clock-alert'
  return 'clock-outline'
}

// SALE CREATION LOGIC
function openSaleModal() {
  resetSaleForm()
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
    purchase_date: new Date().toISOString().split('T')[0],
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
    purchase_date: sale.purchase_date || sale.created_at.split('T')[0],
    payment_due_date: sale.payment_due_date,
  }
  newSaleItems.value = JSON.parse(JSON.stringify(sale.items))
  showSaleModal.value = true
}

async function createSale() {
  try {
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

    const saleData: Partial<Sale> = {
      customer_id: customerId,
      customer_name: newSale.value.customer_name,
      customer_phone: newSale.value.customer_phone,
      items: newSaleItems.value,
      total_amount: totalNewSaleAmount.value,
      status: newSale.value.status,
      purchase_date: newSale.value.purchase_date,
      payment_due_date: newSale.value.payment_due_date,
    }

    if (isEditingSale.value && editingSaleId.value) {
      const oldSale = sales.value.find(s => s.id === editingSaleId.value)
      if (oldSale && oldSale.status !== newSale.value.status) {
        saleData.status_updated_at = new Date().toISOString()
      }
      saleData.updated_at = new Date().toISOString()
      await updateDoc(doc(db, 'sales', editingSaleId.value), saleData)
    } else {
      saleData.created_at = new Date().toISOString()
      saleData.status_updated_at = new Date().toISOString()
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
    })

    const link = document.createElement('a')
    const fileName = `factura_${selectedSaleForInvoice.value?.customer_name.replace(/\s+/g, '_')}.jpg`
    link.download = fileName
    link.href = dataUrl
    link.click()
  } catch (error) {
    console.error('Error al exportar factura:', error)
  } finally {
    isExporting.value = false
  }
}

function openStatusModal(sale: Sale) {
  currentSale.value = sale
  showStatusModal.value = true
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
        nextNumber = letters + "1".padStart(numLength + 1, '0')
      } else {
        nextNumber = letters + numVal.toString().padStart(numLength, '0')
      }

      transaction.set(docRef, { last_number: nextNumber })
    })
  } catch (e) {
    console.error('Error in invoice numbering:', e)
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
  }
}

async function updateSaleStatus(newStatus: SaleStatus) {
  if (!currentSale.value?.id) return
  try {
    await updateDoc(doc(db, 'sales', currentSale.value.id), {
      status: newStatus,
      status_updated_at: new Date().toISOString(),
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
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
  color: #1e293b;
  min-height: 100vh;
  background: radial-gradient(circle at top right, rgba(99, 102, 241, 0.05), transparent),
    radial-gradient(circle at bottom left, rgba(16, 185, 129, 0.05), transparent);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.header-left h1 {
  font-size: 2.25rem;
  font-weight: 800;
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
  background: rgba(255, 255, 255, 0.5);
  padding: 6px;
  border-radius: 12px;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

/* PREMIUM STATS GRID */
.stats-grid-premium {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.glass-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 20px;
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.glass-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px 0 rgba(31, 38, 135, 0.08);
  border-color: rgba(255, 255, 255, 0.6);
}

.stat-item {
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  position: relative;
  overflow: hidden;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  flex-shrink: 0;
  z-index: 1;
}

.investment .stat-icon {
  background: #eef2ff;
  color: #4f46e5;
}

.sales .stat-icon {
  background: #ecfdf5;
  color: #059669;
}

.profit .stat-icon {
  background: #fffcf0;
  color: #d97706;
}

.profit.positive .stat-icon {
  background: #f0fdf4;
  color: #16a34a;
}

.margin .stat-icon {
  background: #faf5ff;
  color: #7c3aed;
}

.stat-info {
  z-index: 1;
  flex: 1;
}

.stat-info label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 1.875rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.2;
}

.stat-sub {
  font-size: 0.875rem;
  color: #94a3b8;
  font-weight: 500;
}

.stat-bg-icon {
  position: absolute;
  right: -10px;
  bottom: -10px;
  font-size: 5rem;
  opacity: 0.03;
  transform: rotate(-15deg);
  pointer-events: none;
}

.stat-progress {
  height: 6px;
  background: #f1f5f9;
  border-radius: 3px;
  margin-top: 12px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: #4f46e5;
  border-radius: 3px;
  transition: width 1s ease-out;
}

/* CHARTS SECTION */
.charts-grid-premium {
  display: grid;
  grid-template-columns: 1.8fr 1.2fr;
  gap: 24px;
  margin-bottom: 32px;
}

@media (min-width: 1600px) {
  .charts-grid-premium {
    grid-template-columns: 1fr 1fr;
    max-width: 1600px;
  }
}

.chart-container {
  overflow: hidden;
}

.chart-header {
  padding: 20px 24px;
  background: rgba(255, 255, 255, 0.4);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-header h3 {
  font-size: 1.125rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #334155;
  margin: 0;
}

.pill-filters {
  display: flex;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 10px;
}

.pill-filters button {
  padding: 6px 16px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}

.pill-filters button.active {
  background: white;
  color: #4f46e5;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.status-pills {
  background: white;
  border: 1px solid #e2e8f0;
}

.status-pills button.active {
  background: #f1f5f9;
}

.canvas-wrapper {
  padding: 24px;
  height: 400px;
  position: relative;
}

/* MINI STATS GRID */
.stats-cards-mini-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.mini-stat {
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.4);
}

.mini-stat.active {
  background: white;
  border-color: #4f46e5;
  box-shadow: 0 4px 15px rgba(79, 70, 229, 0.1);
}

.mini-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.mini-stat.pending .mini-icon {
  background: #fffbeb;
  color: #b45309;
}

.mini-stat.paid .mini-icon {
  background: #ecfdf5;
  color: #059669;
}

.mini-stat.to-pay .mini-icon {
  background: #eff6ff;
  color: #1d4ed8;
}

.mini-stat.all .mini-icon {
  background: #f8fafc;
  color: #64748b;
}

.mini-content label {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  margin-bottom: 2px;
}

.mini-content .value {
  font-size: 1.25rem;
  font-weight: 800;
  color: #1e293b;
}

/* MISC STYLES */
.subtotal-preview {
  display: flex;
  flex-direction: column;
  background: #f8fafc;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px dashed #cbd5e1;
}

.subtotal-preview .label {
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.subtotal-preview .value {
  font-size: 1.125rem;
  font-weight: 800;
  color: #0f172a;
}

.subtotal-preview .value-bs {
  font-size: 0.8125rem;
  color: #94a3b8;
  font-weight: 600;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 8px;
}

.status-option {
  padding: 16px;
  border: 2px solid #f1f5f9;
  border-radius: 16px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-option.active {
  transform: scale(1.02);
  border-color: currentColor;
}

.status-option.pendiente {
  color: #b45309;
}

.status-option.pagado {
  color: #059669;
}

.status-option.por\ pagar {
  color: #1d4ed8;
}

.status-option.cancelado {
  color: #b91c1c;
}

.status-option:hover {
  background: #f8fafc;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.top-buyers-list {
  padding-bottom: 32px;
}

.mini-table thead th {
  background: #f8fafc;
  position: sticky;
  top: 0;
  z-index: 5;
}

.mini-table tbody tr:hover {
  background: rgba(79, 70, 229, 0.02);
}

.price-stack {
  display: flex;
  flex-direction: column;
}

.price-stack .price-bs {
  font-size: 0.75rem;
  color: #94a3b8;
  font-weight: 600;
}

/* MODERN LIST SECTION */
.section-header-premium {
  padding: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  flex-wrap: wrap;
  gap: 16px;
}

.title-with-subtitle h2 {
  font-size: 1.25rem;
  font-weight: 800;
  color: #1e293b;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.subtitle {
  font-size: 0.875rem;
  color: #94a3b8;
  font-weight: 500;
}

.search-premium {
  position: relative;
  width: 300px;
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
}

.search-premium input {
  width: 100%;
  padding: 10px 14px 10px 42px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  font-size: 0.9375rem;
  transition: all 0.2s;
}

.search-premium input:focus {
  outline: none;
  border-color: #4f46e5;
  background: white;
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.05);
}

.sales-modern-list {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sale-entry-card {
  display: grid;
  grid-template-columns: 220px 1fr 140px 140px 120px;
  align-items: center;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(0, 0, 0, 0.02);
  border-radius: 16px;
  gap: 20px;
  transition: all 0.2s;
}

.sale-entry-card:hover {
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
  transform: translateX(4px);
}

.sale-main-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.invoice-badge {
  background: #f1f5f9;
  color: #475569;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 6px;
}

.customer-details {
  display: flex;
  flex-direction: column;
}

.c-name {
  font-size: 1rem;
  font-weight: 700;
  color: #1e293b;
}

.c-date {
  font-size: 0.75rem;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 4px;
}

.due-alert {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  margin-top: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  width: fit-content;
}

.due-alert.overdue {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fee2e2;
}

.due-alert.urgent {
  background: #fffbeb;
  color: #d97706;
  border: 1px solid #fef3c7;
}

.due-alert.upcoming {
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #dcfce7;
}

.items-stack {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.item-tag {
  font-size: 0.75rem;
  font-weight: 600;
  background: white;
  padding: 4px 10px;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  color: #64748b;
}

.more-items {
  font-size: 0.75rem;
  color: #94a3b8;
  font-weight: 600;
  align-self: center;
}

.sale-financials-premium {
  text-align: right;
}

.price-usd {
  font-size: 1.125rem;
  font-weight: 800;
  color: #1e293b;
}

.price-bs {
  font-size: 0.75rem;
  color: #94a3b8;
  font-weight: 600;
}

.modern-badge {
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  text-align: center;
  display: flex;
  flex-direction: column;
  line-height: 1.2;
  cursor: pointer;
  width: 100%;
  transition: all 0.2s;
}

.status-date {
  font-size: 0.65rem;
  opacity: 0.8;
  font-weight: 500;
  margin-top: 2px;
}

.modern-badge.pendiente {
  background: #fffbeb;
  color: #b45309;
  border: 1px solid #fef3c7;
}

.modern-badge.pagado {
  background: #ecfdf5;
  color: #047857;
  border: 1px solid #d1fae5;
}

.modern-badge.por\ pagar {
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #dbeafe;
}

.modern-badge.cancelado {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fee2e2;
}

.sale-actions-premium {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.action-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: white;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.action-btn:hover {
  transform: scale(1.1);
}

.action-btn.edit:hover {
  color: #4f46e5;
  background: #eef2ff;
}

.action-btn.invoice:hover {
  color: #0891b2;
  background: #ecfeff;
}

.action-btn.delete:hover {
  color: #e11d48;
  background: #fff1f2;
}

.empty-state-premium {
  padding: 60px;
  text-align: center;
  color: #94a3b8;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.5;
}

.mini-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.mini-table th {
  text-align: left;
  padding: 12px 16px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #64748b;
  border-bottom: 2px solid #f1f5f9;
}

.mini-table td {
  padding: 14px 16px;
  font-size: 0.875rem;
  border-bottom: 1px solid #f1f5f9;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation: fadeIn 0.4s ease-out forwards;
}

/* MODALS & FORMS */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 24px;
  width: 100%;
  max-width: 600px;
  max-height: calc(100vh - 40px);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.large-modal {
  max-width: 900px;
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(20px);
  }

  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  font-size: 1.25rem;
  font-weight: 800;
  color: #1e293b;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-body {
  padding: 24px;
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.modal-footer {
  padding: 20px 24px;
  background: #f8fafc;
  border-top: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn {
  padding: 10px 20px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
}

.btn-primary {
  background: #4f46e5;
  color: white;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
}

.btn-primary:hover {
  background: #4338ca;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(79, 70, 229, 0.3);
}

.btn-outline {
  background: transparent;
  border: 1px solid #e2e8f0;
  color: #64748b;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 700;
  color: #64748b;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.form-input,
.form-select {
  width: 100%;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  font-size: 0.9375rem;
  transition: all 0.2s;
  background: #fff;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.05);
}

@media (max-width: 1024px) {
  .charts-grid-premium {
    grid-template-columns: 1fr;
  }

  .stats-cards-mini-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .sale-entry-card {
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .sale-products-overview {
    grid-column: span 2;
  }
}

@media (max-width: 640px) {
  .sales-container {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .header-left h1 {
    font-size: 1.75rem;
  }

  .header-actions {
    flex-direction: column;
    width: 100%;
    border-radius: 16px;
  }

  .header-actions .btn {
    width: 100%;
    justify-content: center;
  }

  .stats-grid-premium {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .stats-cards-mini-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .sale-entry-card {
    grid-template-columns: 1fr;
    padding: 16px;
    gap: 12px;
  }

  .sale-main-info,
  .sale-products-overview,
  .sale-financials-premium,
  .sale-status-area,
  .sale-actions-premium {
    grid-column: span 1;
  }

  .sale-financials-premium {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid #f1f5f9;
    padding-top: 12px;
  }

  .sale-actions-premium {
    justify-content: center;
    background: #f8fafc;
    padding: 8px;
    border-radius: 12px;
  }

  .grid-2 {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .modal-content {
    width: 100%;
    height: 100%;
    border-radius: 0;
    max-width: none;
    display: flex;
    flex-direction: column;
  }

  .modal-body {
    flex: 1;
    padding: 20px 16px;
    max-height: none;
  }

  .modal-footer {
    flex-direction: column;
    gap: 16px;
  }

  .modal-footer .actions {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .modal-footer .btn {
    width: 100%;
    justify-content: center;
  }

  .add-product-row {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
