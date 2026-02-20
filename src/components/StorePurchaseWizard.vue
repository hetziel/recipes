<template>
  <div class="modal-overlay">
    <div class="modal-content large-modal">
      <header class="modal-header">
        <h3>
          <Icon name="cart-outline" /> Comprar: {{ scenario?.name }}
        </h3>
        <button @click="emitClose" class="btn-icon">
          <Icon name="close" />
        </button>
      </header>

      <div class="modal-body scrollable">
        <!-- STEP 1 -->
        <div v-if="step === 1" class="form-section fade-in">
          <h4>
            <Icon name="account" /> Datos del Cliente
          </h4>
          <p class="text-muted mb-4">Por favor ingrese sus datos para procesar la orden.</p>
          <div class="grid-2">
            <div class="form-group">
              <label>Nombre y Apellido</label>
              <input v-model="customerName" class="form-input" placeholder="Ej: Juan Pérez" />
            </div>
            <div class="form-group">
              <label>Teléfono</label>
              <input v-model="customerPhone" class="form-input" placeholder="Ej: 0412-1234567" />
            </div>
          </div>
        </div>

        <!-- STEP 2 -->
        <div v-if="step === 2" class="form-section fade-in">
          <h4>
            <Icon name="file-document-outline" /> Resumen de la Orden
          </h4>
          <div class="summary-card mt-4">
            <div class="summary-item">
              <span class="label">Cliente:</span>
              <span class="value">{{ createdCustomer?.name || customerName }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Escenario/Paquete:</span>
              <span class="value">{{ scenario?.name }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Cantidad:</span>
              <span class="value">{{ quantity }}</span>
            </div>
            <div class="summary-item divider"></div>
            <div class="summary-item">
              <span class="label">Precio Unitario:</span>
              <div class="price-stack-right">
                <span class="price-usd">${{ unitPrice.toFixed(2) }}</span>
                <span class="price-bs">Bs {{ (unitPrice * dolarRate).toFixed(2) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- STEP 3 -->
        <div v-if="step === 3" class="form-section fade-in">
          <h4>
            <Icon name="cash-multiple" /> Método de Pago
          </h4>
          <p class="text-muted mb-4">Seleccione cómo desea pagar su orden por <strong>${{ totalPrice.toFixed(2) }} (Bs {{ (totalPrice * dolarRate).toFixed(2) }})</strong>.</p>
          
          <div class="payment-methods-grid">
            <div class="method-card" @click="finishPayment('Pago Móvil')">
              <Icon name="cellphone" class="method-icon" />
              <span>Pago Móvil</span>
            </div>
            <div class="method-card" @click="finishPayment('Transferencia')">
              <Icon name="bank" class="method-icon" />
              <span>Transferencia</span>
            </div>
            <div class="method-card" @click="finishPayment('Efectivo')">
              <Icon name="cash" class="method-icon" />
              <span>Efectivo ($ / Bs)</span>
            </div>
          </div>
        </div>

        <!-- STEP 4 -->
        <div v-if="step === 4" class="form-section text-center fade-in">
          <Icon name="check-circle-outline" class="success-icon icon-large text-primary mb-4" />
          <h2 class="text-primary mb-2">¡Compra Exitosa!</h2>
          <p class="text-muted">Su orden ha sido registrada correctamente. El comercio se pondrá en contacto pronto.</p>
        </div>
      </div>

      <footer class="modal-footer">
        <!-- Preview only visible when not in success step -->
        <div v-if="step < 4" class="total-preview">
          Total a Pagar: <strong>${{ totalPrice.toFixed(2) }} / Bs {{ (totalPrice * dolarRate).toFixed(2) }}</strong>
        </div>

        <div class="actions">
          <button v-if="step > 1 && step < 4" class="btn btn-outline" @click="prevStep" :disabled="isProcessing">
            <Icon name="arrow-left" /> Atrás
          </button>
          
          <button v-if="step === 1" class="btn btn-primary" @click="submitCustomer" :disabled="isProcessing || !customerName || !customerPhone">
            Continuar <Icon name="arrow-right" class="mr-0 ml-2" />
          </button>
          
          <button v-if="step === 2" class="btn btn-primary" @click="nextStep" :disabled="isProcessing">
            Confirmar Orden <Icon name="check" class="mr-0 ml-2" />
          </button>

          <button v-if="step === 4" class="btn btn-primary" @click="emitClose">
            <Icon name="storefront" /> Volver a Tienda
          </button>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { collection, addDoc, doc, setDoc } from 'firebase/firestore'
import { db } from '../firebase.config'
import Icon from '@/components/ui/Icon.vue'
import type { RecipeScenario, Recipe } from '../types/recipe'

const props = defineProps<{ 
  scenario: RecipeScenario | null; 
  recipe: Recipe | null; 
  quantity: number;
  dolarRate: number;
}>()
const emit = defineEmits(['close'])

const step = ref(1)
const customerName = ref('')
const customerPhone = ref('')
const createdCustomer: any = ref(null)
const createdOrder: any = ref(null)
const isProcessing = ref(false)

const unitPrice = computed(() => {
  if (!props.scenario) return 0
  return (props.scenario.fixed_sale_price || 0)
})

const totalPrice = computed(() => (unitPrice.value * (props.quantity || 1)))

function emitClose() {
  emit('close')
}

// Validation logic and transitions as implemented originally
async function submitCustomer() {
  if (!customerName.value || !customerPhone.value) return
  isProcessing.value = true
  try {
    const custRef = await addDoc(collection(db, 'customers'), {
      name: customerName.value,
      phone: customerPhone.value,
      created_at: new Date().toISOString()
    })
    createdCustomer.value = { id: custRef.id, name: customerName.value, phone: customerPhone.value }

    const orderRef = doc(collection(db, 'orders'))
    const orderPayload = {
      id: orderRef.id,
      customer_id: custRef.id,
      scenario_id: props.scenario?.id || null,
      quantity: props.quantity || 1,
      price_to_pay: totalPrice.value,
      status: 'pendiente',
      created_at: new Date().toISOString()
    }
    await setDoc(orderRef, orderPayload)
    createdOrder.value = orderPayload

    step.value = 2
  } catch (e) {
    console.error(e)
    alert('Error creando cliente u orden')
  } finally {
    isProcessing.value = false
  }
}

function nextStep() {
  step.value = Math.min(4, step.value + 1)
}

function prevStep() {
  step.value = Math.max(1, step.value - 1)
}

function finishPayment(method: string) {
  // Payment info logic here in the future
  step.value = 4
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  z-index: 100;
}

.modal-content.large-modal {
  background: var(--surface);
  border-radius: 16px;
  width: 600px;
  max-width: 95vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
  overflow: hidden;
}

.modal-header, .modal-footer {
  padding: 20px 24px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border);
  background: rgba(79, 70, 229, 0.03);
}

.modal-header h3 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-primary);
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  border-top: 1px solid var(--border);
  background: var(--background);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.total-preview {
  font-size: 1.1rem;
  color: var(--text-secondary);
}

.total-preview strong {
  color: var(--text-primary);
}

.actions {
  display: flex;
  gap: 12px;
}

.btn-icon {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 8px;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: rgba(0,0,0,0.05);
  color: var(--text-primary);
}

.form-section h4 {
  margin: 0 0 8px 0;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.1rem;
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.form-input {
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text-primary);
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary);
}

.summary-card {
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-item .label {
  color: var(--text-secondary);
  font-weight: 600;
}

.summary-item .value {
  color: var(--text-primary);
  font-weight: 700;
  font-size: 1.1rem;
}

.summary-item.divider {
  height: 1px;
  background: var(--border);
  margin: 8px 0;
}

.price-stack-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.price-usd {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text-primary);
}

.price-bs {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.payment-methods-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
}

.method-card {
  background: var(--background);
  border: 2px solid var(--border);
  border-radius: 12px;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.method-card:hover {
  border-color: var(--primary);
  background: rgba(79, 70, 229, 0.03);
  transform: translateY(-2px);
}

.method-icon {
  font-size: 2.5rem;
  color: var(--primary);
}

.method-card span {
  font-weight: 600;
  color: var(--text-primary);
}

.success-icon {
  font-size: 5rem;
  color: #10b981;
}

.text-primary { color: var(--primary); }
.text-muted { color: var(--text-secondary); }
.text-center { text-align: center; }

@media (max-width: 600px) {
  .grid-2 { grid-template-columns: 1fr; }
  .modal-footer {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  .actions {
    justify-content: space-between;
  }
}

.fade-in { animation: fadeIn 0.3s ease; }
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
