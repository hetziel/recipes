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
              <th>Total</th>
              <th>Abonado / Saldo</th>
              <th>Estado</th>
              <th>Comprobante</th>
              <th>Fecha</th>
              <th>Acciones</th>
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
                  <span class="price-usd">${{ o.total_amount?.toFixed(2) || o.price_to_pay.toFixed(2) }}</span>
                </div>
              </td>
              <td>
                <div class="balance-stack">
                  <span class="text-success text-xs font-bold">Abonado: ${{ o.paid_amount || 0 }}</span>
                  <span v-if="(o.remaining_balance || 0) > 0" class="text-danger text-xs font-bold">Saldo: ${{ o.remaining_balance || 0 }}</span>
                </div>
              </td>
              <td>
                <span :class="['modern-badge', o.status]">{{ formatStatus(o.status) }}</span>
              </td>
              <td>
                <div v-if="o.receipt_uploaded" class="receipt-actions">
                  <span class="text-xs text-muted d-block">Ref: {{ o.payment_reference || 'N/A' }}</span>
                  <a v-if="o.receipt_url" :href="o.receipt_url" target="_blank" class="btn-link">Ver Link</a>
                  <span v-else class="text-xs italic text-muted">Archivo en Drive</span>
                </div>
                <span v-else class="text-xs text-muted">-</span>
              </td>
              <td>
                <div class="text-xs text-muted">{{ formatDate(o.created_at) }}</div>
              </td>
              <td>
                <button v-if="o.status !== 'pagado' && o.status !== 'cancelado'" class="btn-action" @click="openPaymentModal(o)">
                  <Icon name="check-decagram" size="sm" /> Validar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Payment Validation Modal -->
    <div v-if="showPaymentModal" class="modal-overlay">
      <div class="modal-content glass-card">
        <header class="modal-header">
          <h3>Validar Pago - Orden #{{ selectedOrder.id.slice(-6).toUpperCase() }}</h3>
          <button @click="closePaymentModal" class="btn-icon"><Icon name="close" /></button>
        </header>
        <div class="modal-body">
          <div class="order-summary-mini mb-4">
            <p><strong>Total Orden:</strong> ${{ (selectedOrder.total_amount || selectedOrder.price_to_pay).toFixed(2) }}</p>
            <p><strong>Abonado anteriormente:</strong> ${{ (selectedOrder.paid_amount || 0).toFixed(2) }}</p>
            <p class="text-danger"><strong>Saldo Pendiente:</strong> ${{ (selectedOrder.remaining_balance ?? selectedOrder.price_to_pay).toFixed(2) }}</p>
          </div>
          
          <div class="form-group">
            <label>Monto a Confirmar ($)</label>
            <input type="number" v-model="amountToConfirm" class="form-input" step="0.01" />
          </div>

          <div class="payment-decision mt-4">
            <label class="d-block mb-2">Decisión:</label>
            <div class="btn-group-decision">
              <button class="btn btn-success" @click="confirmPayment" :disabled="isProcessing">
                <Icon name="check" /> Confirmar Abono
              </button>
              <button class="btn btn-danger" @click="rejectOrder" :disabled="isProcessing">
                <Icon name="close" /> Rechazar Comprobante
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase.config'
import Icon from '@/components/ui/Icon.vue'

const loading = ref(true)
const isProcessing = ref(false)
const orders = ref<any[]>([])
const customersMap: Record<string, any> = reactive({})
const scenariosMap: Record<string, any> = reactive({})

// Modal States
const showPaymentModal = ref(false)
const selectedOrder = ref<any>(null)
const amountToConfirm = ref(0)

function openPaymentModal(order: any) {
  selectedOrder.value = order
  amountToConfirm.value = order.remaining_balance ?? order.price_to_pay
  showPaymentModal.value = true
}

function closePaymentModal() {
  showPaymentModal.value = false
  selectedOrder.value = null
}

async function confirmPayment() {
  if (!selectedOrder.value || amountToConfirm.value <= 0) return
  isProcessing.value = true
  
  try {
    const order = selectedOrder.value
    const currentPaid = order.paid_amount || 0
    const total = order.total_amount || order.price_to_pay
    const newPaid = currentPaid + amountToConfirm.value
    const newBalance = Math.max(0, total - newPaid)
    
    let newStatus = 'parcial_confirmado'
    if (newBalance <= 0) {
      newStatus = 'pagado'
    }

    await updateDoc(doc(db, 'orders', order.id), {
      paid_amount: newPaid,
      remaining_balance: newBalance,
      status: newStatus,
      updated_at: new Date().toISOString()
    })

    // Refresh local state
    const orderIdx = orders.value.findIndex(o => o.id === order.id)
    if (orderIdx !== -1) {
      orders.value[orderIdx] = { 
        ...orders.value[orderIdx], 
        paid_amount: newPaid, 
        remaining_balance: newBalance, 
        status: newStatus 
      }
    }
    
    closePaymentModal()
  } catch (e) {
    console.error(e)
    alert('Error al actualizar el pago')
  } finally {
    isProcessing.value = false
  }
}

async function rejectOrder() {
  if (!selectedOrder.value) return
  if (!confirm('¿Está seguro de rechazar este comprobante?')) return
  
  isProcessing.value = true
  try {
    await updateDoc(doc(db, 'orders', selectedOrder.value.id), {
      status: 'rechazado',
      updated_at: new Date().toISOString()
    })
    
    // Refresh local state
    const orderIdx = orders.value.findIndex(o => o.id === selectedOrder.value.id)
    if (orderIdx !== -1) {
      orders.value[orderIdx].status = 'rechazado'
    }
    
    closePaymentModal()
  } catch (e) {
    console.error(e)
  } finally {
    isProcessing.value = false
  }
}

onMounted(async () => {
  loading.value = true
  try {
    const ordersSnap = await getDocs(collection(db, 'orders'))
    orders.value = ordersSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
    
    // Sort orders manually
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

.modern-badge.en_verificacion, .modern-badge.parcial_en_verificacion {
  background: rgba(2, 132, 199, 0.1);
  color: #0284c7;
  border: 1px solid rgba(2, 132, 199, 0.2);
}

.modern-badge.parcial_confirmado {
  background: rgba(16, 163, 74, 0.1);
  color: #16a34a;
  border: 1px dashed rgba(16, 163, 74, 0.5);
}

.modern-badge.pagado {
  background: rgba(16, 163, 74, 0.1);
  color: #16a34a;
  border: 1px solid rgba(16, 163, 74, 0.2);
}

.modern-badge.rechazado {
  background: rgba(220, 38, 38, 0.1);
  color: #dc2626;
  border: 1px solid rgba(220, 38, 38, 0.2);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 400px;
  background: var(--surface);
  border-radius: 12px;
  padding: 0;
}

.modal-header {
  padding: 16px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
}

.modal-body {
  padding: 20px;
}

.order-summary-mini {
  background: var(--background);
  padding: 12px;
  border-radius: 8px;
  font-size: 0.9rem;
}

.order-summary-mini p { margin: 4px 0; }

.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-input { padding: 8px; border: 1px solid var(--border); border-radius: 4px; }

.btn-group-decision {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.btn-action {
  background: var(--primary);
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-link {
  color: var(--primary);
  font-size: 0.75rem;
  text-decoration: underline;
}

.receipt-actions {
  display: flex;
  flex-direction: column;
}

.balance-stack {
  display: flex;
  flex-direction: column;
}

.text-danger { color: #dc2626; }
.text-success { color: #16a34a; }
.italic { font-style: italic; }
.d-block { display: block; }
.mb-2 { margin-bottom: 8px; }
.mb-4 { margin-bottom: 16px; }
.btn-icon { background: none; border: none; cursor: pointer; }
.btn-success { background: #16a34a; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer; }
.btn-danger { background: #dc2626; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }

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
