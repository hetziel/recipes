<template>
  <main class="compras-container">
    <div class="header-section">
      <h1 class="page-title">Mis Compras Importadas</h1>
      <p class="page-subtitle">Resumen de productos adquiridos en el exterior</p>
    </div>
    <!-- Botón para abrir el modal -->
    <div class="controls">
      <button @click="showModal = true" class="btn btn-primary btn-add">
        <span class="add-icon">+</span> Agregar Producto
      </button>
      <button @click="resetSelecciones" class="btn btn-secondary" v-if="productos.length">
        <span class="reset-icon">🔄</span> Reiniciar selecciones
      </button>
    </div>

    <!-- Modal para agregar productos -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">Agregar Nuevo Producto</h2>
          <button @click="showModal = false" class="close-btn">&times;</button>
        </div>

        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label for="name" class="form-label">
                <span class="label-icon">📦</span> Nombre del Producto
              </label>
              <input id="name" v-model="nuevoProducto.name" type="text" class="form-input" />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="moneda" class="form-label">
                  <span class="label-icon">💰</span> Moneda
                </label>
                <div class="currency-selector">
                  <button type="button" @click="nuevoProducto.moneda = 'USD'"
                    :class="['currency-btn', { active: nuevoProducto.moneda === 'USD' }]">
                    <span class="currency-symbol">$</span> USD
                  </button>
                  <button type="button" @click="nuevoProducto.moneda = 'BS'"
                    :class="['currency-btn', { active: nuevoProducto.moneda === 'BS' }]">
                    <span class="currency-symbol">Bs</span> BS
                  </button>
                </div>
              </div>
              <div class="form-group">
                <label for="price" class="form-label">
                  <span class="label-icon">🏷️</span> Precio
                </label>
                <div class="price-input">
                  <span class="price-prefix">{{
                    nuevoProducto.moneda === 'USD' ? '$' : 'Bs'
                    }}</span>
                  <input id="price" v-model.number="nuevoProducto.price" type="number" min="0" step="0.01"
                    @input="convertirMoneda" class="form-input" />
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">
                <span class="label-icon">🔄</span>
                {{ nuevoProducto.moneda === 'USD' ? 'Precio en Bs' : 'Precio en $' }}
              </label>
              <div class="converted-price">
                <div class="converted-value">
                  {{ nuevoProducto.moneda === 'USD' ? 'Bs' : '$' }}
                  {{ precioConvertido }}
                </div>
                <div class="conversion-info">
                  <span class="info-icon">ℹ️</span>
                  Tipo de cambio: {{ dolarBCV?.promedio?.toFixed(2) || 'Cargando...' }}
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="weight" class="form-label">
                  <span class="label-icon">⚖️</span> Peso (kg)
                </label>
                <input id="weight" v-model.number="nuevoProducto.weight" type="number" min="0" step="0.1"
                  class="form-input" />
              </div>
              <div class="form-group">
                <label for="cantidad" class="form-label">
                  <span class="label-icon">📊</span> Cantidad
                </label>
                <input id="cantidad" v-model.number="nuevoProducto.cantidad" type="number" min="1" class="form-input" />
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <div class="form-actions">
            <button @click="showModal = false" class="btn btn-secondary">
              <span class="btn-icon">✕</span> Cancelar
            </button>
            <button @click="agregarProducto" class="btn btn-primary">
              <span class="btn-icon">✓</span> Agregar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Menú de navegación -->
    <div class="navigation-menu">
      <button @click="activeSection = 'selector'" :class="['nav-btn', { active: activeSection === 'selector' }]">
        <span class="nav-icon">✅</span> Selector
      </button>
      <button @click="activeSection = 'table'" :class="['nav-btn', { active: activeSection === 'table' }]">
        <span class="nav-icon">📋</span> Lista
      </button>
      <button @click="activeSection = 'selected'" :class="['nav-btn', { active: activeSection === 'selected' }]">
        <span class="nav-icon">🛒</span> Seleccionados
        <span class="nav-badge" v-if="productosSeleccionados.length > 0">
          {{ productosSeleccionados.length }}
        </span>
      </button>
      <button @click="activeSection = 'budget'" :class="['nav-btn', { active: activeSection === 'budget' }]">
        <span class="nav-icon">💰</span> Presupuesto
      </button>
    </div>

    <!-- Buscador -->
    <div class="search-container" v-if="activeSection = 'selector'">
      <div class="search-input-wrapper">
        <input v-model="searchQuery" type="text" placeholder="Buscar productos..." class="search-input" />
        <span class="search-icon">🔍</span>
      </div>
      <div class="search-stats">
        <span class="stats-item">{{ productosFiltrados.length }} productos</span>
        <span class="stats-item">{{ productosSeleccionados.length }} seleccionados</span>
      </div>
    </div>

    <div class="content-section">
      <!-- Sección de Tabla -->
      <div v-if="activeSection === 'table'" class="section-content">
        <div class="table-header-info">
          <h3 class="section-title">Lista de Productos</h3>
          <div class="pagination-info">
            Página {{ currentPage }} de {{ totalPages }} • Mostrando
            {{ productosPaginados.length }} de {{ productosFiltrados.length }} productos
          </div>
        </div>

        <div class="table-container" v-if="productosFiltrados.length">
          <table class="product-table">
            <thead>
              <tr>
                <th class="table-header"></th>
                <th class="table-header">Producto</th>
                <th class="table-header numeric">Precio ($)</th>
                <th class="table-header numeric">Precio (Bs)</th>
                <th class="table-header numeric">Cantidad</th>
                <th class="table-header numeric">Peso</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="producto in productosPaginados" :key="producto.id" class="product-row">
                <td class="checkbox-cell">
                  <input type="checkbox" v-model="producto.seleccionado" @change="guardarSelecciones" />
                </td>
                <td class="product-name">{{ producto.name }}</td>
                <td class="numeric">
                  {{ producto.price ? '$' + producto.price.toFixed(2) : '-' }}
                </td>
                <td class="numeric">
                  {{
                    producto?.price && dolarBCV?.promedio
                      ? 'Bs ' + (producto.price * dolarBCV.promedio).toFixed(2)
                      : '-'
                  }}
                </td>
                <td class="numeric">
                  <input type="number" v-model.number="producto.cantidad" min="1" class="quantity-input"
                    @change="guardarSelecciones" />
                </td>
                <td class="numeric">{{ producto.weight ? producto.weight + ' kg' : '-' }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="summary-row">
                <td colspan="6">
                  <div class="summary-content">
                    <div class="summary-item">
                      <span class="summary-label">Total productos:</span>
                      <span class="summary-value">{{ productosFiltrados.length }}</span>
                    </div>
                    <div class="summary-item">
                      <span class="summary-label">Total Bs:</span>
                      <span class="summary-value">Bs {{ totalBs.toFixed(2) }}</span>
                    </div>
                    <div class="summary-item">
                      <span class="summary-label">Total peso:</span>
                      <span class="summary-value">{{ totalPeso }} kg</span>
                    </div>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>

          <!-- Paginación -->
          <div class="pagination-container" v-if="totalPages > 1">
            <button @click="prevPage" :disabled="currentPage === 1" class="pagination-btn">
              ← Anterior
            </button>
            <div class="pagination-numbers">
              <button v-for="page in pagesToShow" :key="page" @click="goToPage(page)"
                :class="['page-btn', { active: page === currentPage }]">
                {{ page }}
              </button>
              <span v-if="showEllipsis" class="ellipsis">...</span>
            </div>
            <button @click="nextPage" :disabled="currentPage === totalPages" class="pagination-btn">
              Siguiente →
            </button>
          </div>
        </div>

        <div v-else class="empty-state">
          <img src="@/assets/empty-box.png" alt="Caja vacía" class="empty-icon" />
          <p class="empty-message">No se encontraron productos</p>
          <button @click="searchQuery = ''" class="btn btn-secondary">Limpiar búsqueda</button>
        </div>
      </div>

      <!-- Sección de Productos Seleccionados -->
      <div v-if="activeSection === 'selected'" class="section-content">
        <div class="selected-header">
          <h3 class="section-title">Productos para comprar</h3>
          <div class="selected-stats">
            <span class="selected-count">{{ productosSeleccionados.length }} seleccionados</span>
            <span class="selected-total">Total: ${{ totalSeleccionadoUSD.toFixed(2) }}</span>
          </div>
        </div>

        <div v-if="productosSeleccionados.length > 0" class="selected-products-section">
          <table class="selected-table">
            <thead>
              <tr>
                <th class="selected-header">Producto</th>
                <th class="selected-header numeric">Cantidad</th>
                <th class="selected-header numeric">Precio Unit. ($)</th>
                <th class="selected-header numeric">Subtotal ($)</th>
                <th class="selected-header numeric">Subtotal (Bs)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="producto in productosSeleccionados" :key="'selected-' + producto.id">
                <td>{{ producto.name }}</td>
                <td class="numeric">{{ producto.cantidad }}</td>
                <td class="numeric">${{ producto.price?.toFixed(2) || '0.00' }}</td>
                <td class="numeric">
                  ${{ ((producto.price ?? 0) * (producto.cantidad ?? 0)).toFixed(2) }}
                </td>
                <td class="numeric">
                  Bs
                  {{
                    producto?.price && dolarBCV?.promedio && producto?.cantidad
                      ? (producto.price * dolarBCV.promedio * producto.cantidad).toFixed(2)
                      : '0.00'
                  }}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="selected-summary">
                <td colspan="5">
                  <div class="selected-summary-content">
                    <div class="summary-item">
                      <span class="summary-label">Total productos:</span>
                      <span class="summary-value">{{ productosSeleccionados.length }}</span>
                    </div>
                    <div class="summary-item">
                      <span class="summary-label">Total USD:</span>
                      <span class="summary-value">${{ totalSeleccionadoUSD.toFixed(2) }}</span>
                    </div>
                    <div class="summary-item">
                      <span class="summary-label">Total Bs:</span>
                      <span class="summary-value">Bs {{ totalSeleccionadoBS.toFixed(2) }}</span>
                    </div>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div v-else class="empty-state">
          <!-- <img src="@/assets/empty-cart.png" alt="Carrito vacío" class="empty-icon" /> -->
          <p class="empty-message">No hay productos seleccionados</p>
          <p class="empty-subtitle">Selecciona productos de la lista para verlos aquí</p>
          <button @click="activeSection = 'table'" class="btn btn-primary">
            <span class="btn-icon">📋</span> Ver lista
          </button>
        </div>
      </div>

      <!-- Sección de Presupuesto -->
      <div v-if="activeSection === 'budget'" class="section-content">
        <div class="budget-section">
          <div class="budget-header">
            <h3 class="section-title">Presupuesto y Saldo</h3>
            <div class="budget-exchange">
              <span class="exchange-rate">Tipo de cambio: Bs {{ dolarBCV?.promedio?.toFixed(2) }}</span>
            </div>
          </div>

          <div class="budget-inputs">
            <div class="budget-input-group">
              <label for="dolares-disponibles" class="budget-label">
                <span class="budget-label-icon">💵</span> Dólares Disponibles ($)
              </label>
              <div class="budget-input-wrapper">
                <span class="input-prefix">$</span>
                <input id="dolares-disponibles" type="number" min="0" step="0.01" v-model.number="presupuesto.dolares"
                  class="budget-input" />
              </div>
              <span class="budget-converted">
                ≈ Bs {{ (presupuesto.dolares * dolarBCV.promedio).toFixed(2) }}
              </span>
            </div>

            <div class="budget-input-group">
              <label for="bolivares-disponibles" class="budget-label">
                <span class="budget-label-icon">💸</span> Bolívares Disponibles (Bs)
              </label>
              <div class="budget-input-wrapper">
                <span class="input-prefix">Bs</span>
                <input id="bolivares-disponibles" type="number" min="0" step="0.01"
                  v-model.number="presupuesto.bolivares" class="budget-input" />
              </div>
              <span class="budget-converted">
                ≈ ${{ (presupuesto.bolivares / dolarBCV.promedio).toFixed(2) }}
              </span>
            </div>
          </div>

          <div class="budget-summary">
            <div class="budget-total">
              <span class="budget-label">Total a pagar:</span>
              <span class="budget-value">
                ${{ totalSeleccionadoUSD.toFixed(2) }} / Bs {{ totalSeleccionadoBS.toFixed(2) }}
              </span>
            </div>

            <div class="budget-total-available">
              <span class="budget-label">Total disponible:</span>
              <span class="budget-value">
                ${{ (Number(presupuesto.dolares) || 0).toFixed(2) }} + Bs
                {{ (Number(presupuesto.bolivares) || 0).toFixed(2) }}
                <br />
                <small>(≈ ${{
                  (
                    (Number(presupuesto.dolares) || 0) +
                    (Number(presupuesto.bolivares) || 0) / dolarBCV.promedio
                  ).toFixed(2)
                }})</small>
              </span>
            </div>

            <div class="budget-remaining" :class="{
              sufficient: saldoRestante.suficiente,
              insufficient: !saldoRestante.suficiente,
            }">
              <span class="budget-label">Saldo restante:</span>
              <span class="budget-value">
                ${{ saldoRestante.dolares.toFixed(2) }} / Bs
                {{ saldoRestante.bolivares.toFixed(2) }}
              </span>
            </div>

            <div v-if="!saldoRestante.suficiente" class="budget-warning">
              <span class="warning-icon">⚠️</span>
              <div class="warning-content">
                <strong>Fondos insuficientes.</strong>
                <small>Necesitas más fondos para completar esta compra.</small>
              </div>
            </div>

            <div v-else class="budget-success">
              <span class="success-icon">✅</span>
              <div class="success-content">
                <strong>¡Fondos suficientes!</strong>
                <small>Puedes proceder con la compra.</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, inject, type Ref } from 'vue'
import type { DolarBCV } from '../types/producto'

interface Product {
  id?: number
  name: string
  price?: number
  weight?: number | string
  updated_at?: string
  seleccionado?: boolean
  cantidad?: number
}

const STORAGE_KEY = 'productos-app-data'
const SELECTION_KEY = 'productos-seleccionados'
const productos = ref<Product[]>([])
const productosSeleccionados = ref<Product[]>([])

const { dolarBCV: dolarBCV } = inject<{
  dolarBCV: Ref<DolarBCV>
}>('dolarBCV')!

// Estado del presupuesto
const presupuesto = ref({
  dolares: 0,
  bolivares: 0,
})

// Estado para búsqueda y paginación
const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = 10
const activeSection = ref<'selector', 'table' | 'selected' | 'budget'>('table')

// Productos filtrados por búsqueda
const productosFiltrados = computed(() => {
  if (!searchQuery.value.trim()) {
    return productos.value
  }

  const query = searchQuery.value.toLowerCase()
  return productos.value.filter((producto) => producto.name.toLowerCase().includes(query))
})

// Paginación
const totalPages = computed(() => {
  return Math.ceil(productosFiltrados.value.length / itemsPerPage)
})

const productosPaginados = computed(() => {
  const startIndex = (currentPage.value - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  return productosFiltrados.value.slice(startIndex, endIndex)
})

// Cálculo de páginas para mostrar en la paginación
const pagesToShow = computed(() => {
  const pages = []
  const maxPagesToShow = 5

  if (totalPages.value <= maxPagesToShow) {
    for (let i = 1; i <= totalPages.value; i++) {
      pages.push(i)
    }
  } else {
    const half = Math.floor(maxPagesToShow / 2)
    let start = currentPage.value - half
    let end = currentPage.value + half

    if (start < 1) {
      start = 1
      end = maxPagesToShow
    }

    if (end > totalPages.value) {
      end = totalPages.value
      start = end - maxPagesToShow + 1
    }

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
  }

  return pages
})

const showEllipsis = computed(() => {
  return totalPages.value > maxPagesToShow && currentPage.value < totalPages.value - 2
})

// Métodos de paginación
function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

function goToPage(page: number) {
  currentPage.value = page
}

// Computed para saldos restantes
const saldoRestante = computed(() => {
  const totalNecesarioUSD = Number(totalSeleccionadoUSD.value)
  const tasaDolar = Number(dolarBCV.value.promedio)
  const presupuestoUSD = Number(presupuesto.value.dolares)
  const presupuestoBS = Number(presupuesto.value.bolivares)

  // Convertimos todo a dólares
  const bsEnUSD = presupuestoBS / tasaDolar
  const totalDisponibleUSD = presupuestoUSD + bsEnUSD

  // Calculamos la diferencia con un umbral de tolerancia
  const diferenciaUSD = totalDisponibleUSD - totalNecesarioUSD
  const TOLERANCIA = 0.0001
  const suficiente = diferenciaUSD >= -TOLERANCIA

  const diferenciaRedondeada = parseFloat(diferenciaUSD.toFixed(4))

  if (suficiente) {
    const dolaresRestantes = Math.max(0, presupuestoUSD - totalNecesarioUSD)
    const bolivaresRestantes = Math.max(0, (diferenciaRedondeada - dolaresRestantes) * tasaDolar)

    return {
      dolares: parseFloat(dolaresRestantes.toFixed(2)),
      bolivares: parseFloat(bolivaresRestantes.toFixed(2)),
      suficiente: true,
    }
  } else {
    const faltanteUSD = Math.abs(diferenciaRedondeada)

    return {
      dolares: parseFloat((-faltanteUSD).toFixed(2)),
      bolivares: parseFloat((faltanteUSD * tasaDolar).toFixed(2)),
      suficiente: false,
    }
  }
})

// Computed properties
const totalBs = computed(() => {
  if (!productos.value || !dolarBCV.value?.promedio) return 0

  return productosFiltrados.value.reduce((sum, producto) => {
    const price = Number(producto?.price) || 0
    const tasa = Number(dolarBCV.value?.promedio) || 0
    return sum + price * tasa
  }, 0)
})

const totalPeso = computed(() => {
  return productosFiltrados.value
    .reduce((sum, producto) => {
      return sum + (parseFloat(producto.weight?.toString() || '0') || 0)
    }, 0)
    .toFixed(2)
})

const totalCantidad = computed(() => {
  return productosFiltrados.value.reduce((sum, producto) => {
    return sum + (producto.cantidad || 0)
  }, 0)
})

const totalSeleccionadoUSD = computed(() => {
  return productosSeleccionados.value.reduce((sum, producto) => {
    return sum + (producto.price || 0) * (producto.cantidad || 1)
  }, 0)
})

const totalSeleccionadoBS = computed(() => {
  return productosSeleccionados.value.reduce((sum, producto) => {
    const price = producto.price || 0
    const cantidad = producto.cantidad || 1
    const subtotalBs = price * dolarBCV.value.promedio * cantidad
    return sum + subtotalBs
  }, 0)
})

// Methods
function formatDate(dateString: string) {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }
  return new Date(dateString).toLocaleDateString('es-ES', options)
}

function cargarProductos() {
  const datosGuardados = localStorage.getItem(STORAGE_KEY)
  if (datosGuardados) {
    try {
      const datos = JSON.parse(datosGuardados)
      productos.value = (datos || []).map((p: Product) => ({
        ...p,
        cantidad: p.cantidad || 1,
      }))
      cargarSeleccionesGuardadas()
    } catch (err) {
      console.error('Error al cargar productos:', err)
      productos.value = []
    }
  }
}

function cargarSeleccionesGuardadas() {
  const seleccionesGuardadas = localStorage.getItem(SELECTION_KEY)
  if (seleccionesGuardadas) {
    try {
      const selecciones = JSON.parse(seleccionesGuardadas)
      productos.value.forEach((producto) => {
        const productoGuardado = selecciones.find((p: Product) => p.id === producto.id)
        if (productoGuardado) {
          producto.seleccionado = productoGuardado.seleccionado
          producto.cantidad = productoGuardado.cantidad || 1
        } else {
          producto.seleccionado = false
          producto.cantidad = producto.cantidad || 1
        }
      })
      actualizarProductosSeleccionados()
    } catch (err) {
      console.error('Error al cargar selecciones:', err)
    }
  }
}

function guardarSelecciones() {
  actualizarProductosSeleccionados()
  const seleccionesParaGuardar = productos.value.map((producto) => ({
    id: producto.id,
    seleccionado: producto.seleccionado,
    cantidad: producto.cantidad,
  }))
  localStorage.setItem(SELECTION_KEY, JSON.stringify(seleccionesParaGuardar))
}

function actualizarProductosSeleccionados() {
  productosSeleccionados.value = productos.value.filter((p) => p.seleccionado)
}

function resetSelecciones() {
  if (confirm('¿Estás seguro de que deseas reiniciar todas las selecciones y cantidades?')) {
    productos.value.forEach((producto) => {
      producto.seleccionado = false
      producto.cantidad = 1
    })
    productosSeleccionados.value = []
    localStorage.removeItem(SELECTION_KEY)
  }
}

// Nuevas variables para el modal
const showModal = ref(false)
const nuevoProducto = ref({
  name: '',
  price: 0,
  precioBs: '',
  moneda: 'USD',
  weight: 0,
  cantidad: 1,
})

// Computed para el price convertido
const precioConvertido = computed(() => {
  if (!nuevoProducto.value.price) return '0.00'

  if (nuevoProducto.value.moneda === 'USD') {
    return (nuevoProducto.value.price * dolarBCV.value.promedio).toFixed(2)
  } else {
    return (nuevoProducto.value.price / dolarBCV.value.promedio).toFixed(2)
  }
})

function convertirMoneda() {
  // La conversión se maneja automáticamente con el computed property
}

function agregarProducto() {
  if (!nuevoProducto.value.name) {
    alert('Por favor ingresa un name para el producto')
    return
  }

  const producto: Product = {
    id: Date.now(),
    name: nuevoProducto.value.name,
    cantidad: nuevoProducto.value.cantidad || 1,
    weight: nuevoProducto.value.weight || 0,
    seleccionado: false,
  }

  // Asignar precios según la moneda seleccionada
  if (nuevoProducto.value.moneda === 'USD') {
    producto.price = nuevoProducto.value.price
  } else {
    producto.price = nuevoProducto.value.price / dolarBCV.value.promedio
  }

  productos.value.push(producto)
  guardarEnLocalStorage()

  // Resetear el formulario
  nuevoProducto.value = {
    name: '',
    price: 0,
    precioBs: '',
    moneda: 'USD',
    weight: 0,
    cantidad: 1,
  }

  showModal.value = false
  currentPage.value = 1
}

function guardarEnLocalStorage() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      productos: productos.value,
      tasaCambio: dolarBCV.value.promedio,
    }),
  )
}

// Watchers
watch(
  productos,
  () => {
    guardarSelecciones()
  },
  { deep: true },
)

watch(searchQuery, () => {
  currentPage.value = 1
})

onMounted(cargarProductos)
</script>

<style scoped>
.compras-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.controls {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.btn {
  padding: 12px 24px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-primary {
  background: #4f46e5;
  color: white;
}

.btn-primary:hover {
  background: #4338ca;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: 2px solid #e5e7eb;
}

.btn-secondary:hover {
  background: #e5e7eb;
  color: #111827;
}

.header-section {
  margin-bottom: 32px;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 8px 0;
}

.page-subtitle {
  font-size: 16px;
  color: #6b7280;
  margin: 0;
}

/* Buscador */
.search-container {
  margin-bottom: 24px;
  background: #f9fafb;
  border-radius: 12px;
  padding: 20px;
  border: 2px solid #e5e7eb;
}

.search-input-wrapper {
  position: relative;
  margin-bottom: 12px;
}

.search-input {
  width: 100%;
  padding: 12px 48px 12px 16px;
  border: 2px solid #d1d5db;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.2s ease;
  background: white;
}

.search-input:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.search-icon {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
}

.search-stats {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #6b7280;
}

.stats-item {
  padding: 4px 12px;
  background: #e5e7eb;
  border-radius: 20px;
  font-weight: 500;
}

/* Menú de navegación */
.navigation-menu {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  padding: 8px;
  background: #f9fafb;
  border-radius: 12px;
  border: 2px solid #e5e7eb;
}

.nav-btn {
  flex: 1;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: #6b7280;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 8px;
  position: relative;
}

.nav-btn:hover {
  background: #e5e7eb;
  color: #374151;
}

.nav-btn.active {
  background: #4f46e5;
  color: white;
}

.nav-icon {
  font-size: 18px;
}

.nav-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: #ef4444;
  color: white;
  font-size: 12px;
  font-weight: 600;
  min-width: 20px;
  height: 20px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
}

/* Secciones de contenido */
.section-content {
  background: white;
  border-radius: 12px;
  border: 2px solid #e5e7eb;
  overflow: hidden;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.table-header-info {
  padding: 20px;
  border-bottom: 2px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f9fafb;
}

.pagination-info {
  font-size: 14px;
  color: #6b7280;
}

/* Tabla de productos */
.table-container {
  overflow-x: auto;
}

.product-table {
  width: 100%;
  border-collapse: collapse;
}

.table-header {
  padding: 16px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  background: #f9fafb;
  border-bottom: 2px solid #e5e7eb;
}

.numeric {
  text-align: right;
}

.product-row {
  border-bottom: 1px solid #e5e7eb;
  transition: background-color 0.2s;
}

.product-row:hover {
  background-color: #f9fafb;
}

.checkbox-cell {
  padding: 16px;
  width: 40px;
}

.product-name {
  padding: 16px;
  font-weight: 500;
  color: #111827;
}

.quantity-input {
  width: 80px;
  padding: 8px 12px;
  border: 2px solid #d1d5db;
  border-radius: 6px;
  text-align: center;
  font-size: 14px;
}

.quantity-input:focus {
  outline: none;
  border-color: #4f46e5;
}

/* Resumen de tabla */
.summary-row {
  background: #f9fafb;
}

.summary-content {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-label {
  font-size: 12px;
  color: #6b7280;
}

.summary-value {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

/* Paginación */
.pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-top: 2px solid #e5e7eb;
  background: #f9fafb;
}

.pagination-btn {
  padding: 8px 16px;
  border: 2px solid #d1d5db;
  background: white;
  color: #374151;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pagination-btn:hover:not(:disabled) {
  border-color: #4f46e5;
  color: #4f46e5;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-numbers {
  display: flex;
  gap: 8px;
  align-items: center;
}

.page-btn {
  width: 36px;
  height: 36px;
  border: 2px solid #d1d5db;
  background: white;
  color: #374151;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-btn:hover {
  border-color: #4f46e5;
}

.page-btn.active {
  background: #4f46e5;
  color: white;
  border-color: #4f46e5;
}

.ellipsis {
  color: #6b7280;
  padding: 0 8px;
}

/* Productos seleccionados */
.selected-header {
  padding: 20px;
  border-bottom: 2px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f9fafb;
}

.selected-stats {
  display: flex;
  gap: 16px;
  align-items: center;
}

.selected-count {
  padding: 8px 16px;
  background: #dbeafe;
  color: #1e40af;
  border-radius: 20px;
  font-weight: 600;
  font-size: 14px;
}

.selected-total {
  font-size: 18px;
  font-weight: 600;
  color: #059669;
}

.selected-table {
  width: 100%;
  border-collapse: collapse;
}

.selected-header {
  padding: 16px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  background: #f9fafb;
  border-bottom: 2px solid #e5e7eb;
}

.selected-summary {
  background: #f9fafb;
}

.selected-summary-content {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Presupuesto */
.budget-section {
  padding: 24px;
}

.budget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.budget-exchange {
  font-size: 14px;
  color: #6b7280;
}

.exchange-rate {
  padding: 6px 12px;
  background: #e0e7ff;
  color: #3730a3;
  border-radius: 20px;
  font-weight: 500;
}

.budget-inputs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.budget-input-group {
  background: #f9fafb;
  padding: 20px;
  border-radius: 12px;
  border: 2px solid #e5e7eb;
}

.budget-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-weight: 600;
  color: #374151;
}

.budget-label-icon {
  font-size: 20px;
}

.budget-input-wrapper {
  position: relative;
  margin-bottom: 8px;
}

.input-prefix {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
  font-weight: 500;
}

.budget-input {
  width: 100%;
  padding: 12px 12px 12px 40px;
  border: 2px solid #d1d5db;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.2s ease;
  background: white;
}

.budget-input:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.budget-converted {
  font-size: 14px;
  color: #6b7280;
  font-style: italic;
}

.budget-summary {
  background: #f9fafb;
  padding: 24px;
  border-radius: 12px;
  border: 2px solid #e5e7eb;
}

.budget-total,
.budget-total-available,
.budget-remaining {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #e5e7eb;
}

.budget-remaining {
  border-bottom: none;
}

.budget-label {
  font-weight: 600;
  color: #374151;
}

.budget-value {
  font-weight: 700;
  color: #111827;
}

.sufficient .budget-value {
  color: #059669;
}

.insufficient .budget-value {
  color: #dc2626;
}

.budget-warning,
.budget-success {
  margin-top: 16px;
  padding: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.budget-warning {
  background: #fef2f2;
  border: 2px solid #fca5a5;
  color: #dc2626;
}

.budget-success {
  background: #f0fdf4;
  border: 2px solid #86efac;
  color: #059669;
}

.warning-icon,
.success-icon {
  font-size: 24px;
}

.warning-content,
.success-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.warning-content small,
.success-content small {
  font-size: 12px;
  opacity: 0.8;
}

/* Estados vacíos */
.empty-state {
  padding: 80px 24px;
  text-align: center;
  background: #f9fafb;
  border-radius: 12px;
  margin: 20px;
}

.empty-icon {
  width: 80px;
  height: 80px;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-message {
  font-size: 18px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 8px 0;
}

.empty-subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 20px 0;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  padding: 24px;
  border-bottom: 2px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.close-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: #f3f4f6;
  color: #6b7280;
  border-radius: 8px;
  cursor: pointer;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #e5e7eb;
}

.modal-body {
  padding: 24px;
}

.form-grid {
  display: grid;
  gap: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.form-group {
  margin-bottom: 0;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
}

.label-icon {
  font-size: 18px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.currency-selector {
  display: flex;
  gap: 8px;
}

.currency-btn {
  flex: 1;
  padding: 12px;
  border: 2px solid #d1d5db;
  border-radius: 8px;
  background: white;
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
  font-weight: 500;
}

.currency-btn.active {
  border-color: #4f46e5;
  background: #4f46e5;
  color: white;
}

.currency-btn:hover:not(.active) {
  border-color: #4f46e5;
}

.price-input {
  display: flex;
  align-items: center;
}

.price-prefix {
  padding: 12px 0 12px 16px;
  background: #f3f4f6;
  border: 2px solid #d1d5db;
  border-right: none;
  border-radius: 8px 0 0 8px;
  color: #6b7280;
  font-weight: 500;
}

.price-input .form-input {
  border-radius: 0 8px 8px 0;
  padding-left: 12px;
}

.converted-price {
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
  border: 2px solid #e5e7eb;
}

.converted-value {
  font-size: 20px;
  font-weight: 700;
  color: #4f46e5;
  margin-bottom: 8px;
}

.conversion-info {
  font-size: 13px;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 6px;
}

.info-icon {
  font-size: 16px;
}

.modal-footer {
  padding: 24px;
  border-top: 2px solid #e5e7eb;
  background: #f9fafb;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-icon {
  font-size: 18px;
}

/* Responsive */
@media (max-width: 768px) {
  .compras-container {
    padding: 16px;
  }

  .form-row,
  .budget-inputs {
    grid-template-columns: 1fr;
  }

  .controls {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }

  .navigation-menu {
    flex-direction: column;
  }

  .selected-header,
  .table-header-info {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .summary-content,
  .selected-summary-content {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .pagination-container {
    flex-direction: column;
    gap: 16px;
  }

  .modal-content {
    width: 95%;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 24px;
  }

  .search-stats {
    flex-direction: column;
    gap: 8px;
  }

  .form-actions {
    flex-direction: column;
  }
}
</style>
