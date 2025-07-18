<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Producto {
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

async function cargarTasaDolar() {
  cargando.value = true
  error.value = null

  try {
    const response = await fetch('https://ve.dolarapi.com/v1/dolares')
    if (!response.ok) throw new Error('Error al obtener datos del dólar')

    const data: DolarData[] = await response.json()
    tasaDolar.value = data[0].promedio

    // Actualizar precios en Bs si ya hay productos cargados
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
        productos.value = datos.productos
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

        <div v-if="tasaDolar" class="tasa-info">
          Tasa de dólar actual: {{ tasaDolar.toFixed(2) }} Bs
        </div>
      </div>

      <div v-if="cargando" class="loading">
        Cargando datos...
      </div>

      <div v-else>
        <table v-if="productos.length" class="product-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Precio ($)</th>
              <th>Precio (Bs)</th>
              <th>Peso</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(producto, index) in productos" :key="index">
              <td>{{ producto.nombre }}</td>
              <td>{{ producto.precio?.toFixed(2) || '-' }}</td>
              <td>{{ producto.precioBs || '-' }}</td>
              <td>{{ producto.peso || '-' }}</td>
              <td>{{ producto.fecha || '-' }}</td>
            </tr>
          </tbody>
        </table>

        <p v-else class="empty-message">
          Selecciona un archivo JSON para ver los productos.
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
}

.file-input {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

button {
  padding: 8px 16px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.tasa-info {
  font-weight: bold;
  color: #2c3e50;
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