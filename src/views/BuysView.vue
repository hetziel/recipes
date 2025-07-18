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
                            <th class="table-header">Producto</th>
                            <th class="table-header numeric">Precio ($)</th>
                            <th class="table-header numeric">Precio (Bs)</th>
                            <th class="table-header numeric">Peso</th>
                            <th class="table-header">Fecha</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="producto in productos" :key="producto.id" class="product-row">
                            <td class="product-name">{{ producto.nombre }}</td>
                            <td class="numeric">{{ producto.precio ? '$' + producto.precio.toFixed(2) : '-' }}</td>
                            <td class="numeric">{{ producto.precioBs ? 'Bs ' + producto.precioBs : '-' }}</td>
                            <td class="numeric">{{ producto.peso ? producto.peso + ' kg' : '-' }}</td>
                            <td class="product-date">{{ producto.fecha ? formatDate(producto.fecha) : '-' }}</td>
                        </tr>
                    </tbody>
                    <tfoot v-if="productos.length">
                        <tr class="summary-row">
                            <td colspan="2">Total productos: {{ productos.length }}</td>
                            <td class="numeric">Bs {{ totalBs.toFixed(2) }}</td>
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
    [key: string]: any;
}

const STORAGE_KEY = 'productos-app-data';
const productos = ref<Producto[]>([]);

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
            productos.value = datos.productos || [];
        } catch (err) {
            productos.value = [];
        }
    }
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

.product-name {
    font-weight: 500;
    color: #2c3e50;
}

.numeric {
    text-align: right;
    font-family: 'Courier New', Courier, monospace;
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
}
</style>