<template>
  <div class="orders-container">
    <header class="page-header-premium">
      <div class="header-content">
        <h1>
          <Icon name="basket-outline" /> Órdenes de Clientes
        </h1>
        <p class="subtitle">Gestiona las compras realizadas desde la tienda pública</p>
      </div>
    </header>

    <div v-if="loading" class="text-center py-12 fade-in">
      <Icon name="loading" class="spin icon-large text-primary" />
      <p class="mt-4 text-muted">Cargando órdenes...</p>
    </div>
    
    <div v-if="!loading && orders.length === 0" class="empty-state-premium fade-in">
      <Icon name="basket-off-outline" class="empty-icon" />
      <p>No hay órdenes registradas aún.</p>
    </div>

    <div v-if="!loading && orders.length > 0" class="glass-card fade-in mt-4">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Contacto</th>
              <th>Paquete Solicitado</th>
              <th>Cant.</th>
              <th>Total a Pagar</th>
              <th>Estado</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in orders" :key="o.id" class="table-row">
              <td>
                <div class="font-bold">{{ customersMap[o.customer_id]?.name || o.customer_id }}</div>
              </td>
              <td>
                <div class="text-xs text-muted"><Icon name="phone" size="sm" /> {{ customersMap[o.customer_id]?.phone || 'N/A' }}</div>
              </td>
              <td>
                <div class="scenario-badge">
                  <Icon name="package-variant" size="sm" /> {{ scenariosMap[o.scenario_id]?.name || o.scenario_id }}
                </div>
              </td>
              <td class="text-center">
                <span class="qty-badge">{{ o.quantity }}</span>
              </td>
              <td>
                <div class="price-stack">
                  <span class="price-usd">${{ o.price_to_pay.toFixed(2) }}</span>
                </div>
              </td>
              <td>
                <span :class="['modern-badge', o.status]">{{ formatStatus(o.status) }}</span>
              </td>
              <td>
                <div class="text-xs text-muted">{{ formatDate(o.created_at) }}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase.config'
import Icon from '@/components/ui/Icon.vue'

const loading = ref(true)
const orders = ref<any[]>([])
const customersMap: Record<string, any> = reactive({})
const scenariosMap: Record<string, any> = reactive({})

onMounted(async () => {
  loading.value = true
  try {
    const ordersSnap = await getDocs(collection(db, 'orders'))
    orders.value = ordersSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
    
    // Sort orders manually since we might not have the correct index in Firebase
    orders.value.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    const custSnap = await getDocs(collection(db, 'customers'))
    custSnap.docs.forEach(d => { customersMap[d.id] = d.data() })

    const scSnap = await getDocs(collection(db, 'scenarios'))
    scSnap.docs.forEach(d => { scenariosMap[d.id] = d.data() })
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

function formatStatus(status: string) {
  if (!status) return 'Pendiente'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function formatDate(dateStr: string) {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleDateString() + ' ' + new Date(dateStr).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
}
</script>

<style scoped>
.orders-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
}

.page-header-premium {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  background: var(--surface);
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--border);
}

.header-content h1 {
  margin: 0;
  font-size: 2rem;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-content h1 :deep(svg) {
  color: var(--primary);
}

.subtitle {
  margin: 8px 0 0 0;
  color: var(--text-secondary);
  font-size: 1rem;
}

.glass-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 16px;
  padding: 0;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

@media (prefers-color-scheme: dark) {
  :root[data-theme="dark"] .glass-card {
    background: rgba(30, 30, 35, 0.7);
    border-color: rgba(255, 255, 255, 0.1);
  }
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  background: rgba(79, 70, 229, 0.03);
  color: var(--text-secondary);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 16px;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.data-table td {
  padding: 16px;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}

.table-row {
  transition: background 0.2s;
}

.table-row:hover {
  background: var(--background);
}

.font-bold {
  font-weight: 700;
  color: var(--text-primary);
}

.text-xs { font-size: 0.75rem; }
.text-muted { color: var(--text-secondary); }
.text-center { text-align: center; }
.mt-4 { margin-top: 16px; }

.scenario-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--background);
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.85rem;
  color: var(--text-primary);
  border: 1px solid var(--border);
}

.qty-badge {
  background: rgba(79, 70, 229, 0.1);
  color: var(--primary);
  padding: 4px 12px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.9rem;
}

.price-stack {
  display: flex;
  flex-direction: column;
}

.price-usd {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--primary);
}

.modern-badge {
  display: inline-block;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.modern-badge.pendiente {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.empty-state-premium {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 20px;
  background: var(--surface);
  border-radius: 16px;
  border: 1px dashed var(--border);
  text-align: center;
}

.empty-icon {
  font-size: 4rem;
  color: var(--border);
  margin-bottom: 16px;
}

.empty-state-premium p {
  color: var(--text-secondary);
  font-size: 1.1rem;
}

.fade-in { animation: fadeIn 0.4s ease forwards; }
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.spin { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }
.icon-large { font-size: 3rem; }

@media (max-width: 768px) {
  .page-header-premium {
    flex-direction: column;
    align-items: flex-start;
    padding: 16px;
  }
}
</style>
