<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Producto {
  id?: number
  nombre: string
  precio?: number
  precioBs?: string
  peso?: number | string
  fecha?: string
  [key: string]: any
}

interface DolarData {
  fuente: string
  nombre: string
  compra: number | null
  venta: number | null
  promedio: number
  fechaActualizacion: string
}

interface LocalStorageData {
  productos: Producto[]
  tasaDolar: number
  fechaGuardado: string
  tasaApi?: {
    valor: number
    fechaActualizacion: string
  }
}

const STORAGE_KEY = 'productos-app-data'

const productos = ref<Producto[]>([])
const tasaDolar = ref<number>(0)
const origenTasa = ref<'api' | 'local' | null>(null)
const error = ref<string | null>(null)
const cargando = ref<boolean>(false)
const nuevoProducto = ref<Producto>({
  nombre: '',
  precio: undefined,
  peso: '',
  fecha: new Date().toISOString().split('T')[0],
})
const mostrarFormulario = ref<boolean>(false)
const tasaLocal = ref<number | null>(null)
const tasaApi = ref<number | null>(null)
const fechaActualizacionLocal = ref<string | null>(null)
const fechaActualizacionApi = ref<string | null>(null)

// Cargar datos del LocalStorage al iniciar
function cargarDesdeLocalStorage() {
  const datosGuardados = localStorage.getItem(STORAGE_KEY)
  if (datosGuardados) {
    try {
      const datos: LocalStorageData = JSON.parse(datosGuardados)
      tasaLocal.value = datos.tasaDolar || null
      fechaActualizacionLocal.value = datos.fechaGuardado || null

      if (datos.tasaApi) {
        tasaApi.value = datos.tasaApi.valor
        fechaActualizacionApi.value = datos.tasaApi.fechaActualizacion
      }

      productos.value = datos.productos || []
    } catch (err) {
      console.error('Error al cargar datos del LocalStorage:', err)
    }
  }
}

// Guardar datos en LocalStorage
function guardarEnLocalStorage(tasaApiData?: DolarData) {
  const datosAGuardar: LocalStorageData = {
    productos: productos.value,
    tasaDolar: tasaDolar.value,
    fechaGuardado: new Date().toISOString(),
  }

  if (tasaApiData) {
    datosAGuardar.tasaApi = {
      valor: tasaApiData.promedio,
      fechaActualizacion: tasaApiData.fechaActualizacion,
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(datosAGuardar))
}

// Determinar la mejor tasa disponible
function determinarMejorTasa(apiData: DolarData | null) {
  if (apiData) {
    // Priorizar API si está disponible
    tasaDolar.value = apiData.promedio
    origenTasa.value = 'api'
    fechaActualizacionApi.value = apiData.fechaActualizacion
    guardarEnLocalStorage(apiData)
  } else if (tasaLocal.value) {
    // Usar tasa local si no hay datos de API
    tasaDolar.value = tasaLocal.value
    origenTasa.value = 'local'
  } else {
    // No hay tasas disponibles
    tasaDolar.value = 0
    origenTasa.value = null
  }
}

async function cargarTasaDolar() {
  cargando.value = true
  error.value = null

  try {
    const response = await fetch('https://ve.dolarapi.com/v1/dolares')
    if (!response.ok) throw new Error('Error al obtener datos del dólar')

    const data: DolarData[] = await response.json()
    determinarMejorTasa(data[0])

    if (productos.value.length) {
      actualizarPreciosBs()
    }
  } catch (err) {
    console.error('Error al cargar el precio del dólar:', err)

    // Si falla la API, usar datos locales si existen
    if (tasaLocal.value) {
      tasaDolar.value = tasaLocal.value
      origenTasa.value = 'local'
      error.value = 'Error al actualizar tasa. Usando valor local.'
    } else {
      error.value = err instanceof Error ? err.message : 'Error desconocido al cargar tasa'
    }
  } finally {
    cargando.value = false
  }
}

function actualizarPreciosBs() {
  productos.value.forEach((producto) => {
    if (producto.precio && tasaDolar.value) {
      producto.precioBs = (producto.precio * tasaDolar.value).toFixed(2)
    }
  })
  guardarEnLocalStorage()
}

function cargarArchivo(event: Event) {
  const input = event.target as HTMLInputElement
  const archivo = input.files?.[0]

  if (!archivo) return

  const lector = new FileReader()
  lector.onload = (e) => {
    try {
      const resultado = e.target?.result as string
      const datos = JSON.parse(resultado)

      if (datos.productos && Array.isArray(datos.productos)) {
        productos.value = datos.productos.map((p: Producto) => ({
          ...p,
          id: p.id || generarId(),
        }))

        if (datos.tasaDolar) {
          tasaLocal.value = datos.tasaDolar
          fechaActualizacionLocal.value = new Date().toISOString()
          guardarEnLocalStorage()
        }

        if (tasaDolar.value) {
          actualizarPreciosBs()
        }
      } else {
        throw new Error('El archivo JSON no tiene el formato correcto.')
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error al leer el archivo'
    }
  }

  lector.onerror = () => {
    error.value = 'Error al leer el archivo'
  }

  lector.readAsText(archivo)
}

function agregarProducto() {
  if (!nuevoProducto.value.nombre) {
    error.value = 'El nombre del producto es requerido'
    return
  }

  const producto: Producto = {
    id: generarId(),
    nombre: nuevoProducto.value.nombre,
    precio: nuevoProducto.value.precio || 0,
    peso: nuevoProducto.value.peso || '',
    fecha: nuevoProducto.value.fecha || new Date().toISOString().split('T')[0],
  }

  if (producto.precio && tasaDolar.value) {
    producto.precioBs = (producto.precio * tasaDolar.value).toFixed(2)
  }

  productos.value.push(producto)
  guardarEnLocalStorage()
  resetearFormulario()
}

function generarId() {
  return productos.value.length > 0 ? Math.max(...productos.value.map((p) => p.id || 0)) + 1 : 1
}

function resetearFormulario() {
  nuevoProducto.value = {
    nombre: '',
    precio: undefined,
    peso: '',
    fecha: new Date().toISOString().split('T')[0],
  }
  mostrarFormulario.value = false
  error.value = null
}

function eliminarProducto(id: number) {
  productos.value = productos.value.filter((producto) => producto.id !== id)
  guardarEnLocalStorage()
}

function exportarAJSON() {
  const datos = {
    productos: productos.value,
    tasaDolar: tasaDolar.value,
    origenTasa: origenTasa.value,
    fechaExportacion: new Date().toISOString(),
    tasaLocal: tasaLocal.value,
    tasaApi: tasaApi.value,
  }

  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `productos-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function limpiarLocalStorage() {
  if (confirm('¿Estás seguro de que quieres borrar todos los datos guardados?')) {
    localStorage.removeItem(STORAGE_KEY)
    productos.value = []
  }
}

function formatearFecha(fecha: string | null) {
  if (!fecha) return 'N/A'
  return new Date(fecha).toLocaleString()
}

onMounted(() => {
  cargarDesdeLocalStorage()
  cargarTasaDolar()

  // Cargar tasa de dólar si no hay una reciente
  const fechaLocal = fechaActualizacionLocal.value ? new Date(fechaActualizacionLocal.value) : null
  const umbralActualizacion = 1000 * 60 * 60 * 2 // 2 horas

  if (!fechaLocal || new Date().getTime() - fechaLocal.getTime() > umbralActualizacion) {
    cargarTasaDolar()
  } else if (tasaLocal.value) {
    tasaDolar.value = tasaLocal.value
    origenTasa.value = 'local'

    if (productos.value.length) {
      actualizarPreciosBs()
    }
  }
})
</script>

<template>
  <main class="container">
    <div>
      <h1>Lista de Productos</h1>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <div class="controls">
        <input
          type="file"
          accept=".json"
          @change="cargarArchivo"
          class="file-input"
          :disabled="cargando"
        />

        <button @click="cargarTasaDolar" :disabled="cargando">
          {{ cargando ? 'Actualizando...' : 'Actualizar tasa' }}
        </button>

        <button @click="mostrarFormulario = true" class="add-button">Agregar Producto</button>

        <button @click="exportarAJSON" class="export-button">Exportar a JSON</button>

        <button @click="limpiarLocalStorage" class="clear-button">Limpiar Datos</button>
      </div>

      <div class="tasa-info-container">
        <div
          class="tasa-info"
          :class="{ 'tasa-actual': origenTasa === 'api', 'tasa-local': origenTasa === 'local' }"
        >
          <strong>Tasa actual:</strong> {{ tasaDolar.toFixed(2) }} Bs
          <span v-if="origenTasa === 'api'" class="origen-tasa api">(API - Actualizada)</span>
          <span v-else-if="origenTasa === 'local'" class="origen-tasa local">(Local)</span>
          <span v-if="fechaActualizacionApi && origenTasa === 'api'" class="fecha-tasa">
            {{ formatearFecha(fechaActualizacionApi) }}
          </span>
        </div>

        <div v-if="tasaLocal && origenTasa !== 'local'" class="tasa-secundaria">
          <small>
            <strong>Tasa local:</strong> {{ tasaLocal.toFixed(2) }} Bs
            <span v-if="fechaActualizacionLocal"
              >({{ formatearFecha(fechaActualizacionLocal) }})</span
            >
          </small>
        </div>

        <div v-if="tasaApi && origenTasa !== 'api'" class="tasa-secundaria">
          <small>
            <strong>Tasa API:</strong> {{ tasaApi.toFixed(2) }} Bs
            <span v-if="fechaActualizacionApi">({{ formatearFecha(fechaActualizacionApi) }})</span>
          </small>
        </div>
      </div>

      <div v-if="cargando" class="loading">Cargando datos...</div>

      <div v-else>
        <!-- Formulario para agregar nuevo producto -->
        <div v-if="mostrarFormulario" class="form-container">
          <h2>Agregar Nuevo Producto</h2>
          <form @submit.prevent="agregarProducto">
            <div class="form-group">
              <label>Nombre:</label>
              <input v-model="nuevoProducto.nombre" required />
            </div>

            <div class="form-group">
              <label>Precio ($):</label>
              <input v-model.number="nuevoProducto.precio" type="number" step="0.01" />
            </div>

            <div class="form-group">
              <label>Peso:</label>
              <input v-model="nuevoProducto.peso" />
            </div>

            <div class="form-group">
              <label>Fecha:</label>
              <input v-model="nuevoProducto.fecha" type="date" />
            </div>

            <div class="form-actions">
              <button type="submit">Guardar</button>
              <button type="button" @click="resetearFormulario">Cancelar</button>
            </div>
          </form>
        </div>

        <table v-if="productos.length" class="product-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Precio ($)</th>
              <th>Precio (Bs)</th>
              <th>Peso</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="producto in productos" :key="producto.id">
              <td>{{ producto.nombre }}</td>
              <td>{{ producto.precio?.toFixed(2) || '-' }}</td>
              <td>{{ producto.precioBs || '-' }}</td>
              <td>{{ producto.peso || '-' }}</td>
              <td>{{ producto.fecha || '-' }}</td>
              <td>
                <button
                  @click="eliminarProducto(producto.id!)"
                  class="delete-button"
                  title="Eliminar"
                >
                  &times;
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <p v-else class="empty-message">
          No hay productos. Agrega manualmente o carga un archivo JSON.
        </p>
      </div>
    </div>
  </main>
</template>

<style scoped>
.container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.controls {
  margin: 20px 0;
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.tasa-info-container {
  margin: 15px 0;
  padding: 10px;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.tasa-info {
  padding: 8px 12px;
  border-radius: 4px;
  font-weight: bold;
  margin-bottom: 5px;
}

.tasa-actual {
  background-color: #e8f5e9;
  border-left: 4px solid #4caf50;
}

.tasa-local {
  background-color: #fff8e1;
  border-left: 4px solid #ffc107;
}

.origen-tasa {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.8em;
  margin-left: 5px;
}

.origen-tasa.api {
  background-color: #4caf50;
  color: white;
}

.origen-tasa.local {
  background-color: #ffc107;
  color: #333;
}

.fecha-tasa {
  margin-left: 10px;
  font-size: 0.9em;
  color: #666;
}

.tasa-secundaria {
  padding: 5px 12px;
  font-size: 0.9em;
  color: #666;
}

.file-input {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

button {
  padding: 8px 12px;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

button:not(:disabled) {
  background-color: #42b983;
}

.add-button {
  background-color: #2196f3;
}

.delete-button {
  background-color: #f44336;
  padding: 5px 10px;
  font-size: 0.8em;
}

.export-button {
  background-color: #9c27b0;
}

.clear-button {
  background-color: #ff9800;
}

.form-container {
  margin: 20px 0;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #f9f9f9;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.product-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

.product-table th,
.product-table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

.product-table th {
  background-color: #f2f2f2;
}

.product-table tr:nth-child(even) {
  background-color: #f9f9f9;
}

.error-message {
  color: #ff4444;
  padding: 10px;
  background-color: #ffeeee;
  border-radius: 4px;
  margin-bottom: 15px;
}

.loading {
  padding: 15px;
  text-align: center;
  color: #666;
}

.empty-message {
  color: #666;
  font-style: italic;
  margin-top: 20px;
}
</style>
