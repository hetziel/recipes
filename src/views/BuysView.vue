<template>
  <main class="compras-container">
    <!-- Botón para abrir el modal -->
    <div class="controls">
      <button @click="showModal = true" class="add-button">
        <span class="add-icon">+</span> Agregar Producto
      </button>
      <button @click="resetSelecciones" class="reset-button" v-if="productos.length">
        <span class="reset-icon">🔄</span> Reiniciar selecciones
      </button>
    </div>

    <!-- Modal para agregar productos -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal-content">
        <h2 class="modal-title">Agregar Nuevo Producto</h2>

        <div class="form-group">
          <label for="name">Nombre del Producto</label>
          <input id="name" v-model="nuevoProducto.name" type="text" class="form-input" />
        </div>

        <div class="form-group">
          <label for="moneda">Moneda</label>
          <select id="moneda" v-model="nuevoProducto.moneda" @change="convertirMoneda" class="form-select">
            <option value="USD">Dólares (USD)</option>
            <option value="BS">Bolívares (BS)</option>
          </select>
        </div>

        <div class="form-group">
          <label for="price">Precio</label>
          <input id="price" v-model.number="nuevoProducto.price" type="number" min="0" step="0.01"
            @input="convertirMoneda" class="form-input" />
        </div>

        <div class="form-group">
          <label for="precioConvertido">{{
            nuevoProducto.moneda === 'USD' ? 'Precio en Bs' : 'Precio en $'
            }}</label>
          <input id="precioConvertido" :value="precioConvertido" type="text" readonly class="form-input" />
        </div>

        <div class="form-group">
          <label for="weight">Peso (kg)</label>
          <input id="weight" v-model.number="nuevoProducto.weight" type="number" min="0" step="0.1"
            class="form-input" />
        </div>

        <div class="form-group">
          <label for="cantidad">Cantidad</label>
          <input id="cantidad" v-model.number="nuevoProducto.cantidad" type="number" min="1" class="form-input" />
        </div>

        <div class="modal-actions">
          <button @click="showModal = false" class="modal-button cancel">Cancelar</button>
          <button @click="agregarProducto" class="modal-button confirm">Agregar</button>
        </div>
      </div>
    </div>
    <div class="header-section">
      <h1 class="page-title">Mis Compras Importadas</h1>
      <p class="page-subtitle">Resumen de productos adquiridos en el exterior</p>
    </div>

    <div class="content-section">
      <div class="controls">
        <button @click="resetSelecciones" class="reset-button" v-if="productos.length">
          <span class="reset-icon">🔄</span> Reiniciar selecciones
        </button>
      </div>

      <div class="table-container" v-if="productos.length">
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
            <tr v-for="producto in productos" :key="producto.id" class="product-row">
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
          <tfoot v-if="productos.length">
            <tr class="summary-row">
              <td colspan="3">Total productos: {{ productos.length }}</td>
              <td class="numeric">Bs {{ totalBs.toFixed(2) }}</td>
              <td class="numeric">{{ totalCantidad }}</td>
              <td class="numeric">{{ totalPeso }} kg</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div v-else class="empty-state">
        <img src="@/assets/empty-box.png" alt="Caja vacía" class="empty-icon" />
        <p class="empty-message">No hay productos importados registrados</p>
        <button class="action-button">Agregar primer producto</button>
      </div>

      <!-- Tabla de productos seleccionados -->
      <div v-if="productosSeleccionados.length > 0" class="selected-products-section">
        <div class="selected-header">
          <h2 class="selected-title">Productos para comprar</h2>
          <span class="selected-count">{{ productosSeleccionados.length }} seleccionados</span>
        </div>
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
                ${{
                  ((producto.price ?? 0) * (producto.cantidad ?? 0)).toFixed(2)
                }}
              </td>
              <td class="numeric">
                Bs {{
                  (producto?.price && dolarBCV?.promedio && producto?.cantidad
                    ? (producto.price * dolarBCV.promedio * producto.cantidad).toFixed(2)
                    : '0.00'
                  )
                }}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="selected-summary">
              <td colspan="2">Total seleccionados: {{ productosSeleccionados.length }}</td>
              <td></td>
              <td class="numeric">${{ totalSeleccionadoUSD.toFixed(2) }}</td>
              <td class="numeric">Bs {{ totalSeleccionadoBS.toFixed(2) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="budget-section">
        <h3 class="budget-title">Presupuesto y Saldo</h3>

        <div class="budget-inputs">
          <div class="budget-input-group">
            <label for="dolares-disponibles">Dólares Disponibles ($)</label>
            <input id="dolares-disponibles" type="number" min="0" step="0.01" v-model.number="presupuesto.dolares"
              class="budget-input">
            <span class="budget-converted">
              ≈ Bs {{ (presupuesto.dolares * dolarBCV.promedio).toFixed(2) }}
            </span>
          </div>

          <div class="budget-input-group">
            <label for="bolivares-disponibles">Bolívares Disponibles (Bs)</label>
            <input id="bolivares-disponibles" type="number" min="0" step="0.01" v-model.number="presupuesto.bolivares"
              class="budget-input">
            <span class="budget-converted">
              ≈ ${{ (presupuesto.bolivares / dolarBCV.promedio).toFixed(2) }}
            </span>
          </div>
        </div>

        <div class="budget-summary">
          <div class="budget-total">
            <span>Total a pagar:</span>
            <span>
              ${{ totalSeleccionadoUSD.toFixed(2) }} /
              Bs {{ totalSeleccionadoBS.toFixed(2) }}
            </span>
          </div>

          <div class="budget-total-available">
            <span>Total disponible:</span>
            <span>
              ${{ (Number(presupuesto.dolares) || 0).toFixed(2) }} +
              Bs {{ (Number(presupuesto.bolivares) || 0).toFixed(2) }}
              (≈ ${{ ((Number(presupuesto.dolares) || 0) + ((Number(presupuesto.bolivares) || 0) /
                dolarBCV.promedio)).toFixed(2) }})
            </span>
          </div>

          <div class="budget-remaining" :class="{
            'sufficient': saldoRestante.suficiente,
            'insufficient': !saldoRestante.suficiente
          }">
            <span>Saldo restante:</span>
            <span>
              ${{ saldoRestante.dolares.toFixed(2) }} /
              Bs {{ saldoRestante.bolivares.toFixed(2) }}
            </span>
          </div>

          <div v-if="!saldoRestante.suficiente" class="budget-warning">
            ⚠️ Fondos insuficientes.
          </div>

          <div v-else class="budget-success">
            ✅ Fondos suficientes para esta compra
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
  dolarBCV: Ref<DolarBCV>;
}>('dolarBCV')!; // El ! asume que siempre estará disponible

// Presupuesto disponible
const presupuesto = ref({
  dolares: 0,
  bolivares: 0
});


// Computed para saldos restantes
const saldoRestante = computed(() => {
  const totalNecesarioUSD = Number(totalSeleccionadoUSD.value);
  const tasaDolar = Number(dolarBCV.value.promedio);
  const presupuestoUSD = Number(presupuesto.value.dolares);
  const presupuestoBS = Number(presupuesto.value.bolivares);

  // Convertimos todo a dólares
  const bsEnUSD = presupuestoBS / tasaDolar;
  const totalDisponibleUSD = presupuestoUSD + bsEnUSD;

  // Calculamos la diferencia con un umbral de tolerancia para errores de punto flotante
  const diferenciaUSD = totalDisponibleUSD - totalNecesarioUSD;
  const TOLERANCIA = 0.0001; // 1 milésimo de dólar como margen
  const suficiente = diferenciaUSD >= -TOLERANCIA; // Consideramos positivo si está dentro del margen

  // Redondeamos la diferencia real para evitar microvalores
  const diferenciaRedondeada = parseFloat(diferenciaUSD.toFixed(4));

  // Calculamos los resultados
  if (suficiente) {
    // Cuando hay suficiente dinero (incluyendo el margen de tolerancia)
    const dolaresRestantes = Math.max(0, presupuestoUSD - totalNecesarioUSD);
    const bolivaresRestantes = Math.max(0, (diferenciaRedondeada - dolaresRestantes) * tasaDolar);

    return {
      dolares: parseFloat(dolaresRestantes.toFixed(2)),
      bolivares: parseFloat(bolivaresRestantes.toFixed(2)),
      suficiente: true
    };
  } else {
    // Cuando no hay suficiente dinero
    const faltanteUSD = Math.abs(diferenciaRedondeada);

    return {
      dolares: parseFloat((-faltanteUSD).toFixed(2)),
      bolivares: parseFloat((faltanteUSD * tasaDolar).toFixed(2)),
      suficiente: false
    };
  }
});

// Computed properties
const totalBs = computed(() => {
  if (!productos.value || !dolarBCV.value?.promedio) return 0

  return productos.value.reduce((sum, producto) => {
    const price = Number(producto?.price) || 0
    const tasa = Number(dolarBCV.value?.promedio) || 0
    return sum + (price * tasa)
  }, 0)
})

const totalPeso = computed(() => {
  return productos.value
    .reduce((sum, producto) => {
      return sum + (parseFloat(producto.weight?.toString() || '0') || 0)
    }, 0)
    .toFixed(2)
})

const totalCantidad = computed(() => {
  return productos.value.reduce((sum, producto) => {
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
    return (nuevoProducto.value.price * dolarBCV.value.promedio).toFixed(2) + ' Bs'
  } else {
    return (nuevoProducto.value.price / dolarBCV.value.promedio).toFixed(2) + ' USD'
  }
})

// Método para convertir moneda
function convertirMoneda() {
  // La conversión se maneja automáticamente con el computed property
}

// Método para agregar producto
function agregarProducto() {
  if (!nuevoProducto.value.name) {
    alert('Por favor ingresa un name para el producto')
    return
  }

  const producto: Product = {
    id: Date.now(), // Usamos timestamp como ID simple
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

// Watcher para actualizar automáticamente cuando cambian los productos
watch(
  productos,
  () => {
    guardarSelecciones()
  },
  { deep: true },
)

onMounted(cargarProductos)
</script>
