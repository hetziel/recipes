<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Producto {
  id?: number;
  nombre: string;
  precio?: number;
  precioBs?: string;
  peso?: number | string;
  fecha?: string;
  [key: string]: any;
}

interface DolarData {
  fuente: string;
  nombre: string;
  compra: number | null;
  venta: number | null;
  promedio: number;
  fechaActualizacion: string;
}

const productos = ref<Producto[]>([])
const tasaDolar = ref<number>(0)
const error = ref<string | null>(null)
const cargando = ref<boolean>(false)
const nuevoProducto = ref<Producto>({
  nombre: '',
  precio: undefined,
  peso: '',
  fecha: new Date().toISOString().split('T')[0]
})
const mostrarFormulario = ref<boolean>(false)

// Generar ID único
function generarId() {
  return productos.value.length > 0
    ? Math.max(...productos.value.map(p => p.id || 0)) + 1
    : 1
}

async function cargarTasaDolar() {
  cargando.value = true
  error.value = null

  try {
    const response = await fetch('https://ve.dolarapi.com/v1/dolares')
    if (!response.ok) throw new Error('Error al obtener datos del dólar')

    const data: DolarData[] = await response.json()
    tasaDolar.value = data[0].promedio

    if (productos.value.length) {
      actualizarPreciosBs()
    }

    console.log('Tasa de dólar actualizada:', tasaDolar.value)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error desconocido'
    console.error('Error al cargar el precio del dólar:', err)
  } finally {
    cargando.value = false
  }
}

function actualizarPreciosBs() {
  productos.value.forEach(producto => {
    if (producto.precio && tasaDolar.value) {
      producto.precioBs = (producto.precio * tasaDolar.value).toFixed(2)
    }
  })
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
          id: p.id || generarId()
        }))
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
    fecha: nuevoProducto.value.fecha || new Date().toISOString().split('T')[0]
  }

  if (producto.precio && tasaDolar.value) {
    producto.precioBs = (producto.precio * tasaDolar.value).toFixed(2)
  }

  productos.value.push(producto)
  resetearFormulario()
}

function resetearFormulario() {
  nuevoProducto.value = {
    nombre: '',
    precio: undefined,
    peso: '',
    fecha: new Date().toISOString().split('T')[0]
  }
  mostrarFormulario.value = false
  error.value = null
}

function eliminarProducto(id: number) {
  productos.value = productos.value.filter(producto => producto.id !== id)
}

onMounted(() => {
  cargarTasaDolar()
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
        <input type="file" accept=".json" @change="cargarArchivo" class="file-input" :disabled="cargando" />

        <button @click="cargarTasaDolar" :disabled="cargando">
          {{ cargando ? 'Actualizando...' : 'Actualizar tasa de dólar' }}
        </button>

        <button @click="mostrarFormulario = true" class="add-button">
          Agregar Producto
        </button>

        <div v-if="tasaDolar" class="tasa-info">
          Tasa de dólar actual: {{ tasaDolar.toFixed(2) }} Bs
        </div>
      </div>

      <div v-if="cargando" class="loading">
        Cargando datos...
      </div>

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
              <th>Acciones</th>
              <th>Nombre</th>
              <th>Precio ($)</th>
              <th>Precio (Bs)</th>
              <th>Peso</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="producto in productos" :key="producto.id">
              <td>
                <button @click="eliminarProducto(producto.id!)" class="delete-button">
                  Eliminar
                </button>
              </td>
              <td>{{ producto.nombre }}</td>
              <td>{{ producto.precio?.toFixed(2) || '-' }}</td>
              <td>{{ producto.precioBs || '-' }}</td>
              <td>{{ producto.peso || '-' }}</td>
              <td>{{ producto.fecha || '-' }}</td>
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
  gap: 15px;
  align-items: center;
  flex-wrap: wrap;
}

.file-input {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

button {
  padding: 8px 16px;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

button:not(:disabled) {
  background-color: #42b983;
}

.add-button {
  background-color: #2196F3;
}

.delete-button {
  background-color: #f44336;
  padding: 5px 10px;
  font-size: 0.8em;
}

.tasa-info {
  font-weight: bold;
  color: #2c3e50;
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