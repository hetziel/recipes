<template>
  <main class="compras-container">
    <div class="header-section">
      <h1 class="page-title">Mis Compras Importadas</h1>
      <p class="page-subtitle">Resumen de productos adquiridos en el exterior</p>
    </div>

    <div class="content-section">
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
                <input type="checkbox" v-model="producto.seleccionado" @change="actualizarProductosSeleccionados" />
              </td>
              <td class="product-name">{{ producto.nombre }}</td>
              <td class="numeric">{{ producto.precio ? '$' + producto.precio.toFixed(2) : '-' }}</td>
              <td class="numeric">{{ producto.precioBs ? 'Bs ' + producto.precioBs : '-' }}</td>
              <td class="numeric">
                <input type="number" v-model.number="producto.cantidad" min="1" class="quantity-input"
                  @change="actualizarProductosSeleccionados" />
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
        <h2 class="selected-title">Productos para comprar</h2>
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
              <td class="numeric">Bs {{ (parseFloat(producto.precioBs || '0') *
                producto.cantidad).toFixed(2) }}</td>
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
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

interface Producto {
  id?: number;
  nombre: string;
  precio?: number;
  precioBs?: string;
  peso?: number | string;
  fecha?: string;
  seleccionado?: boolean;
  cantidad?: number;
  [key: string]: any;
}

const STORAGE_KEY = 'productos-app-data';
const productos = ref<Producto[]>([]);
const productosSeleccionados = ref<Producto[]>([]);

// Computed properties
const totalBs = computed(() => {
  return productos.value.reduce((sum, producto) => {
    return sum + (parseFloat(producto.precioBs || '0') || 0)
  }, 0)
})

const totalPeso = computed(() => {
  return productos.value.reduce((sum, producto) => {
    return sum + (parseFloat(producto.peso?.toString() || '0') || 0)
  }, 0).toFixed(2)
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
    return sum + (parseFloat(producto.precioBs || '0') * (producto.cantidad || 1))
  }, 0)
})

// Methods
function formatDate(dateString: string) {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
  return new Date(dateString).toLocaleDateString('es-ES', options)
}

function cargarProductos() {
  const datosGuardados = localStorage.getItem(STORAGE_KEY);
  if (datosGuardados) {
    try {
      const datos = JSON.parse(datosGuardados);
      productos.value = (datos.productos || []).map((p: Producto) => ({
        ...p,
        seleccionado: false,
        cantidad: p.cantidad || 1
      }));
    } catch (err) {
      productos.value = [];
    }
  }
}

function actualizarProductosSeleccionados() {
  productosSeleccionados.value = productos.value.filter(p => p.seleccionado);
}

onMounted(cargarProductos);
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
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.3rem;
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
}
</style>
