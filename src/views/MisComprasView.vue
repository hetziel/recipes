<template>
  <div class="orders-container">
    <header class="page-header-premium">
      <div class="header-content">
        <h1>
          <Icon name="package-variant-closed" /> Mis Compras
        </h1>
        <p class="subtitle">Historial de tus pedidos y estados de pago</p>
      </div>
    </header>

    <div v-if="loading" class="text-center py-12 fade-in">
      <Icon name="loading" class="spin icon-large text-primary" />
      <p class="mt-4 text-muted">Cargando tus compras...</p>
    </div>

    <div v-else-if="orders.length === 0" class="empty-state-premium fade-in">
      <Icon name="basket-outline" class="empty-icon" />
      <p>Aún no has realizado ninguna compra.</p>
      <RouterLink to="/store" class="btn btn-primary mt-4">Ir a la Tienda</RouterLink>
    </div>

    <div v-else class="orders-grid fade-in">
      <div v-for="order in orders" :key="order.id" class="glass-card order-card">
        <div class="card-header">
          <div class="order-info">
            <span class="order-id">Orden #{{ order.id.slice(-6).toUpperCase() }}</span>
            <span class="order-date">{{ formatDate(order.created_at) }}</span>
          </div>
          <div :class="['status-badge', order.status]">
            {{ formatStatus(order.status) }}
          </div>
        </div>

        <div v-if="order.status === 'en_verificacion' || order.status === 'parcial_en_verificacion'" class="verification-alert">
          <Icon name="clock-outline" size="sm" /> Tu pago está siendo validado por nuestro equipo
        </div>
        
        <div class="card-body">
          <div class="product-info">
            <Icon name="package-variant" class="product-icon" />
            <div class="product-details">
              <h3>{{ scenariosMap[order.scenario_id]?.name || 'Producto' }}</h3>
              <p>Cantidad: {{ order.quantity }}</p>
            </div>
          </div>

          <div class="price-info">
            <div class="price-stack">
              <span class="price-usd">${{ order.total_amount?.toFixed(2) || order.price_to_pay.toFixed(2) }}</span>
              <div v-if="order.remaining_balance > 0" class="balance-due">
                Saldo: ${{ order.remaining_balance.toFixed(2) }}
              </div>
              <span v-if="dolarRate" class="price-bs">Bs {{ ((order.total_amount || order.price_to_pay) * dolarRate).toFixed(2) }}</span>
            </div>
          </div>
        </div>

        <div class="card-footer">
          <div v-if="order.receipt_uploaded" class="receipt-info text-success">
            <Icon name="check-circle" /> Comprobante enviado
            <a v-if="order.receipt_url" :href="order.receipt_url" target="_blank" class="receipt-link">Ver</a>
          </div>
          <div v-else class="receipt-info warning">
            <Icon name="alert-circle" /> Pendiente de comprobante
          </div>
          <div v-if="order.payment_reference" class="reference-info">
            Ref: {{ order.payment_reference }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, inject, type Ref } from 'vue'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '../firebase.config'
import { useAuth } from '../composables/useAuth'
import Icon from '@/components/ui/Icon.vue'
import type { DolarBCV } from '../types/producto'

const { currentUser } = useAuth()
const { dolarBCV } = inject<{ dolarBCV: Ref<DolarBCV | null> }>('dolarBCV')!
const dolarRate = ref(dolarBCV.value?.promedio || 0)

const loading = ref(true)
const orders = ref<any[]>([])
const scenariosMap = ref<Record<string, any>>({})

onMounted(async () => {
  if (!currentUser.value) return
  
  loading.value = true
  try {
    const ordersQ = query(
      collection(db, 'orders'),
      where('customer_id', '==', currentUser.value.uid),
      orderBy('created_at', 'desc')
    )
    const ordersSnap = await getDocs(ordersQ)
    orders.value = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }))

    const scSnap = await getDocs(collection(db, 'scenarios'))
    scSnap.docs.forEach(d => { scenariosMap.value[d.id] = { id: d.id, ...d.data() } })
  } catch (err) {
    console.error('Error fetching orders:', err)
  } finally {
    loading.value = false
  }
})

function formatStatus(status: string) {
  const map: Record<string, string> = {
    'pendiente': 'Pendiente',
    'en_verificacion': 'En Verificación',
    'parcial_en_verificacion': 'Abono en Revisión',
    'parcial_confirmado': 'Abono Confirmado',
    'pagado': 'Pagado',
    'rechazado': 'Rechazado',
    'cancelado': 'Cancelado'
  }
  return map[status] || status.toUpperCase()
}

function formatDate(dateStr: string) {
</script>

<style scoped>
.orders-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 16px;
}

.page-header-premium {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  background: var(--surface);
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.05);
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

.orders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.glass-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  transition: transform 0.2s;
}

.glass-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.1);
}

.card-header {
  padding: 16px 20px;
  background: rgba(79, 70, 229, 0.03);
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.order-info {
  display: flex;
  flex-direction: column;
}

.order-id {
  font-weight: 700;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.order-date {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.status-badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
}

.status-badge.pendiente { background: #fef3c7; color: #d97706; }
.status-badge.en_verificacion, .status-badge.parcial_en_verificacion { background: #e0f2fe; color: #0284c7; }
.status-badge.parcial_confirmado { background: #dcfce7; color: #16a34a; border: 1px dashed #16a34a; }
.status-badge.pagado { background: #dcfce7; color: #16a34a; }
.status-badge.rechazado { background: #fee2e2; color: #dc2626; }
.status-badge.cancelado { background: #f3f4f6; color: #6b7280; }

.verification-alert {
  background: #fffbeb;
  border-bottom: 1px solid #fef3c7;
  padding: 8px 20px;
  font-size: 0.8rem;
  color: #92400e;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.balance-due {
  font-size: 0.85rem;
  color: #dc2626;
  font-weight: 700;
}

.receipt-link {
  margin-left: auto;
  color: var(--primary);
  text-decoration: underline;
  font-size: 0.8rem;
}

.reference-info {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 4px;
}

.card-body {
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.product-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.product-icon {
  color: var(--primary);
  font-size: 1.5rem;
}

.product-details h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.product-details p {
  margin: 4px 0 0 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.price-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.price-usd {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--primary);
}

.price-bs {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.card-footer {
  padding: 12px 20px;
  background: var(--background);
  border-top: 1px solid var(--border);
}

.receipt-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  font-weight: 600;
}

.receipt-info.text-success { color: #16a34a; }
.receipt-info.warning { color: #d97706; }

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

.spin { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }

.icon-large { font-size: 3rem; }
.text-center { text-align: center; }
.fade-in { animation: fadeIn 0.4s ease forwards; }
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
