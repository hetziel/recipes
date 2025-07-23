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
          <label for="nombre">Nombre del Producto</label>
          <input id="nombre" v-model="nuevoProducto.nombre" type="text" class="form-input" />
        </div>

        <div class="form-group">
          <label for="moneda">Moneda</label>
          <select id="moneda" v-model="nuevoProducto.moneda" @change="convertirMoneda" class="form-select">
            <option value="USD">Dólares (USD)</option>
            <option value="BS">Bolívares (BS)</option>
          </select>
        </div>

        <div class="form-group">
          <label for="precio">Precio</label>
          <input id="precio" v-model.number="nuevoProducto.precio" type="number" min="0" step="0.01"
            @input="convertirMoneda" class="form-input" />
        </div>

        <div class="form-group">
          <label for="precioConvertido">{{
            nuevoProducto.moneda === 'USD' ? 'Precio en Bs' : 'Precio en $'
          }}</label>
          <input id="precioConvertido" :value="precioConvertido" type="text" readonly class="form-input" />
        </div>

        <div class="form-group">
          <label for="peso">Peso (kg)</label>
          <input id="peso" v-model.number="nuevoProducto.peso" type="number" min="0" step="0.1" class="form-input" />
        </div>

        <div class="form-group">
          <label for="fecha">Fecha</label>
          <input id="fecha" v-model="nuevoProducto.fecha" type="date" class="form-input" />
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
              <th class="table-header">Fecha</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="producto in productos" :key="producto.id" class="product-row">
              <td class="checkbox-cell">
                <input type="checkbox" v-model="producto.seleccionado" @change="guardarSelecciones" />
              </td>
              <td class="product-name">{{ producto.nombre }}</td>
              <td class="numeric">
                {{ producto.precio ? '$' + producto.precio.toFixed(2) : '-' }}
              </td>
              <td class="numeric">{{ producto.precio ? 'Bs ' + producto.precio * dolarBCV.promedio.toFixed(2) : '-' }}
              </td>
              <td class="numeric">
                <input type="number" v-model.number="producto.cantidad" min="1" class="quantity-input"
                  @change="guardarSelecciones" />
              </td>
              <td class="numeric">{{ producto.peso ? producto.peso + ' kg' : '-' }}</td>
              <td class="product-date">{{ producto.fecha ? formatDate(producto.fecha) : '-' }}</td>
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
              <td>{{ producto.nombre }}</td>
              <td class="numeric">{{ producto.cantidad }}</td>
              <td class="numeric">${{ producto.precio?.toFixed(2) || '0.00' }}</td>
              <td class="numeric">${{ (producto.precio * producto.cantidad).toFixed(2) }}</td>
              <td class="numeric">
                Bs {{ (parseFloat(producto.precio * dolarBCV.promedio.toFixed(2) || '0') * producto.cantidad).toFixed(2)
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
            ⚠️ Fondos insuficientes. Te faltan:
            <span v-if="saldoRestante.dolares < 0">
              ${{ Math.abs(saldoRestante.dolares).toFixed(2) }}
            </span>
            <span v-if="saldoRestante.dolares < 0 && saldoRestante.bolivares < 0"> o </span>
            <span v-if="saldoRestante.bolivares < 0">
              Bs {{ Math.abs(saldoRestante.bolivares).toFixed(2) }}
            </span>
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
import { ref, onMounted, computed, watch, inject } from 'vue'

interface Producto {
  id?: number
  nombre: string
  precio?: number
  peso?: number | string
  fecha?: string
  seleccionado?: boolean
  cantidad?: number
  [key: string]: any
}

const STORAGE_KEY = 'productos-app-data'
const SELECTION_KEY = 'productos-seleccionados'
const productos = ref<Producto[]>([])
const productosSeleccionados = ref<Producto[]>([])

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
  const totalDolaresNecesarios = totalSeleccionadoUSD.value;
  const totalBolivaresNecesarios = totalSeleccionadoBS.value;

  // Convertimos todo a dólares equivalentes para calcular
  const dolaresEquivalentes = presupuesto.value.dolares + (presupuesto.value.bolivares / dolarBCV.value.promedio);
  const totalDolaresEquivalentes = totalDolaresNecesarios + (totalBolivaresNecesarios / dolarBCV.value.promedio);


  console.log(dolaresEquivalentes, totalDolaresEquivalentes);
  const diferencia = dolaresEquivalentes - totalDolaresEquivalentes;


  if (diferencia >= 0) {
    // Hay suficiente dinero - calculamos cómo distribuirlo
    return calcularDistribucionOptima(
      presupuesto.value,
      totalSeleccionadoUSD.value,
      totalSeleccionadoBS.value,
      dolarBCV.promedio
    );
  } else {
    // No hay suficiente dinero
    return {
      dolares: presupuesto.value.dolares - totalSeleccionadoUSD.value,
      bolivares: presupuesto.value.bolivares - totalBolivaresNecesarios,
      suficiente: false
    };
  }
});

// Función optimizada para calcular la distribución óptima del pago
function calcularDistribucionOptima(
  presupuesto: { dolares: number; bolivares: number },
  totalUSD: number,
  totalBS: number,
  tasa: number
) {
  // Convertimos todo a dólares equivalentes para el cálculo global
  const totalPresupuestoUSD = presupuesto.dolares + (presupuesto.bolivares / tasa);
  const totalCompraUSD = totalUSD + (totalBS / dolarBCV.promedio);

  if (totalPresupuestoUSD < totalCompraUSD) {
    // No hay suficiente dinero
    return {
      dolares: presupuesto.dolares - totalUSD,
      bolivares: presupuesto.bolivares - totalBS,
      suficiente: false
    };
  }

  // Primero pagamos con dólares
  let dolaresRestantes = presupuesto.dolares - totalUSD;
  let bolivaresRestantes = presupuesto.bolivares;

  // Si faltan dólares, cubrimos con bolívares
  if (dolaresRestantes < 0) {
    const dolaresFaltantes = Math.abs(dolaresRestantes);
    const bolivaresNecesarios = dolaresFaltantes * dolarBCV.promedio;

    if (bolivaresRestantes >= bolivaresNecesarios) {
      bolivaresRestantes -= bolivaresNecesarios;
      dolaresRestantes = 0;
    } else {
      // No hay suficientes bolívares para cubrir la diferencia
      return {
        dolares: dolaresRestantes,
        bolivares: bolivaresRestantes - totalBS,
        suficiente: false
      };
    }
  }

  // Luego pagamos los bolívares
  bolivaresRestantes -= totalBS;

  // Si faltan bolívares, cubrimos con dólares
  if (bolivaresRestantes < 0) {
    const bolivaresFaltantes = Math.abs(bolivaresRestantes);
    const dolaresNecesarios = bolivaresFaltantes / dolarBCV.promedio;

    if (dolaresRestantes >= dolaresNecesarios) {
      dolaresRestantes -= dolaresNecesarios;
      bolivaresRestantes = 0;
    } else {
      // No hay suficientes dólares para cubrir la diferencia
      return {
        dolares: dolaresRestantes,
        bolivares: bolivaresRestantes,
        suficiente: false
      };
    }
  }

  return {
    dolares: dolaresRestantes,
    bolivares: bolivaresRestantes,
    suficiente: true
  };
}

// Computed properties
const totalBs = computed(() => {
  return productos.value.reduce((sum, producto) => {
    return sum + (parseFloat(producto.precioBs || '0') || 0)
  }, 0)
})

const totalPeso = computed(() => {
  return productos.value
    .reduce((sum, producto) => {
      return sum + (parseFloat(producto.peso?.toString() || '0') || 0)
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
    return sum + (producto.precio || 0) * (producto.cantidad || 1)
  }, 0)
})

const totalSeleccionadoBS = computed(() => {
  return productosSeleccionados.value.reduce((sum, producto) => {

    const precio = producto.precio || 0
    const cantidad = producto.cantidad || 1
    const subtotalBs = precio * dolarBCV.value.promedio * cantidad
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

      productos.value = (datos || []).map((p: Producto) => ({
        ...p,
        cantidad: p.cantidad || 1,
      }))

      cargarSeleccionesGuardadas()
    } catch (err) {
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
        const productoGuardado = selecciones.find((p: Producto) => p.id === producto.id)
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
  nombre: '',
  precio: 0,
  precioBs: '',
  moneda: 'USD',
  peso: 0,
  fecha: new Date().toISOString().split('T')[0],
  cantidad: 1,
})

// Computed para el precio convertido
const precioConvertido = computed(() => {
  if (!nuevoProducto.value.precio) return '0.00'

  if (nuevoProducto.value.moneda === 'USD') {
    return (nuevoProducto.value.precio * dolarBCV.promedio).toFixed(2) + ' Bs'
  } else {
    return (nuevoProducto.value.precio / dolarBCV.promedio).toFixed(2) + ' USD'
  }
})

// Método para convertir moneda
function convertirMoneda() {
  // La conversión se maneja automáticamente con el computed property
}

// Método para agregar producto
function agregarProducto() {
  if (!nuevoProducto.value.nombre) {
    alert('Por favor ingresa un nombre para el producto')
    return
  }

  const producto: Producto = {
    id: Date.now(), // Usamos timestamp como ID simple
    nombre: nuevoProducto.value.nombre,
    cantidad: nuevoProducto.value.cantidad || 1,
    peso: nuevoProducto.value.peso || 0,
    fecha: nuevoProducto.value.fecha,
    seleccionado: false,
  }

  // Asignar precios según la moneda seleccionada
  if (nuevoProducto.value.moneda === 'USD') {
    producto.precio = nuevoProducto.value.precio
    producto.precioBs = (nuevoProducto.value.precio * dolarBCV.promedio).toFixed(2)
  } else {
    producto.precioBs = nuevoProducto.value.precio.toFixed(2)
    producto.precio = nuevoProducto.value.precio / dolarBCV.promedio
  }

  productos.value.push(producto)
  guardarEnLocalStorage()

  // Resetear el formulario
  nuevoProducto.value = {
    nombre: '',
    precio: 0,
    precioBs: '',
    moneda: 'USD',
    peso: 0,
    fecha: new Date().toISOString().split('T')[0],
    cantidad: 1,
  }

  showModal.value = false
}

function guardarEnLocalStorage() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      productos: productos.value,
      tasaCambio: dolarBCV.promedio,
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

<style scoped>
.compras-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  color: #333;
}

.header-section {
  margin-bottom: 2rem;
  text-align: center;
}

.page-title {
  font-size: 2rem;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.page-subtitle {
  font-size: 1.1rem;
  color: #7f8c8d;
  margin-top: 0;
}

.content-section {
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
}

.controls {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1rem;
}

.reset-button {
  background-color: #f5f5f5;
  color: #555;
  border: 1px solid #ddd;
  padding: 8px 16px;
  border-radius: 5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.reset-button:hover {
  background-color: #e0e0e0;
  border-color: #ccc;
}

.reset-icon {
  font-size: 1.1em;
}

.table-container {
  overflow-x: auto;
  margin-bottom: 2rem;
}

.product-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.95rem;
}

.table-header {
  background-color: #3498db;
  color: white;
  padding: 12px 15px;
  text-align: left;
  font-weight: 500;
  position: sticky;
  top: 0;
}

.table-header.numeric {
  text-align: right;
}

.product-row {
  transition: background-color 0.2s;
  border-bottom: 1px solid #ecf0f1;
}

.product-row:hover {
  background-color: #f8f9fa;
}

.product-row td {
  padding: 12px 15px;
  border-bottom: 1px solid #ecf0f1;
}

.checkbox-cell {
  text-align: center;
  width: 40px;
}

.product-name {
  font-weight: 500;
  color: #2c3e50;
}

.numeric {
  text-align: right;
  font-family: 'Courier New', Courier, monospace;
}

.quantity-input {
  width: 60px;
  padding: 5px;
  text-align: center;
  border: 1px solid #ddd;
  border-radius: 4px;
  transition: border-color 0.2s;
}

.quantity-input:focus {
  border-color: #3498db;
  outline: none;
}

.product-date {
  color: #7f8c8d;
  white-space: nowrap;
}

.summary-row {
  background-color: #f8f9fa;
  font-weight: 500;
}

.summary-row td {
  padding: 10px 15px;
}

.empty-state {
  text-align: center;
  padding: 3rem 0;
}

.empty-icon {
  width: 100px;
  opacity: 0.6;
  margin-bottom: 1.5rem;
}

.empty-message {
  color: #7f8c8d;
  font-size: 1.1rem;
  margin-bottom: 1.5rem;
}

.action-button {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.action-button:hover {
  background-color: #2980b9;
}

.selected-products-section {
  margin-top: 2rem;
  padding: 1.5rem;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.selected-title {
  color: #2c3e50;
  margin: 0;
  font-size: 1.3rem;
}

.selected-count {
  background-color: #e3e3e3;
  padding: 5px 10px;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 500;
}

.selected-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}

.selected-header {
  background-color: #2c3e50;
  color: white;
  padding: 10px 15px;
  text-align: left;
  font-weight: 500;
}

.selected-header.numeric {
  text-align: right;
}

.selected-table td {
  padding: 10px 15px;
  border-bottom: 1px solid #ddd;
}

.selected-summary {
  background-color: #e3e3e3;
  font-weight: 500;
}

.selected-summary td {
  padding: 12px 15px;
}

@media (max-width: 768px) {
  .compras-container {
    padding: 1rem;
  }

  .page-title {
    font-size: 1.5rem;
  }

  .product-table {
    font-size: 0.85rem;
  }

  .product-row td {
    padding: 8px 10px;
  }

  .quantity-input {
    width: 50px;
  }

  .reset-button {
    padding: 6px 12px;
    font-size: 0.9rem;
  }
}

/* Estilos para el botón de agregar */
.add-button {
  background-color: #2ecc71;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 10px;
}

.add-button:hover {
  background-color: #27ae60;
}

.add-icon {
  font-size: 1.1em;
}

/* Estilos para el modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 2rem;
  border-radius: 10px;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: auto;
  height: 80vh;
}

.modal-title {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: #2c3e50;
  font-size: 1.5rem;
}

.form-group {
  margin-bottom: 1.2rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #34495e;
}

.form-input,
.form-select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-select:focus {
  border-color: #3498db;
  outline: none;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 2rem;
}

.modal-button {
  padding: 10px 20px;
  border-radius: 5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.modal-button.cancel {
  background-color: #f5f5f5;
  color: #555;
}

.modal-button.cancel:hover {
  background-color: #e0e0e0;
}

.modal-button.confirm {
  background-color: #3498db;
  color: white;
}

.modal-button.confirm:hover {
  background-color: #2980b9;
}

@media (max-width: 600px) {
  .modal-content {
    padding: 1.5rem;
    margin: 0 1rem;
  }

  .modal-actions {
    justify-content: space-between;
  }
}

.budget-section {
  margin-top: 2rem;
  padding: 1.5rem;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.budget-title {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: #2c3e50;
  font-size: 1.2rem;
}

.budget-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.budget-input-group {
  display: flex;
  flex-direction: column;
  position: relative;
}

.budget-input-group label {
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #34495e;
}

.budget-input {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;
  width: 100%;
}

.budget-converted {
  position: absolute;
  right: 10px;
  bottom: 10px;
  font-size: 0.8rem;
  color: #7f8c8d;
}

.budget-summary {
  background-color: white;
  padding: 1rem;
  border-radius: 5px;
  border: 1px solid #e0e0e0;
}

.budget-total,
.budget-total-available,
.budget-remaining {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f0f0f0;
}

.budget-total span:last-child,
.budget-total-available span:last-child,
.budget-remaining span:last-child {
  font-weight: 500;
  text-align: right;
}

.budget-remaining.sufficient {
  background-color: #e8f5e9;
  border-radius: 4px;
  padding: 0.5rem;
}

.budget-remaining.insufficient {
  background-color: #ffebee;
  border-radius: 4px;
  padding: 0.5rem;
}

.budget-warning {
  color: #e74c3c;
  font-weight: 500;
  margin-top: 0.5rem;
  padding: 0.5rem;
  background-color: #fdecea;
  border-radius: 4px;
  text-align: center;
}

.budget-success {
  color: #2ecc71;
  font-weight: 500;
  margin-top: 0.5rem;
  padding: 0.5rem;
  background-color: #e8f5e9;
  border-radius: 4px;
  text-align: center;
}

@media (max-width: 768px) {
  .budget-inputs {
    grid-template-columns: 1fr;
  }

  .budget-total,
  .budget-total-available,
  .budget-remaining {
    flex-direction: column;
    gap: 0.3rem;
  }

  .budget-total span:last-child,
  .budget-total-available span:last-child,
  .budget-remaining span:last-child {
    text-align: left;
  }
}
</style>
