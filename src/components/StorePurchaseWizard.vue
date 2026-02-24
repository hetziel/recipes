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
        <!-- STEP 1: Identification & SMS Auth -->
        <div v-if="step === 1" class="form-section fade-in">
          <h4>
            <Icon name="account" /> Datos del Cliente
          </h4>

          <div v-if="!currentUser && !isSmsSent">
            <p class="text-muted mb-4">Para continuar con su pedido, identifíquese con su número de teléfono.</p>
            <div class="grid-2">
              <div class="form-group">
                <label>Nombre y Apellido</label>
                <input v-model="customerName" class="form-input" placeholder="Ej: Juan Pérez" :disabled="isProcessing" />
              </div>
              <div class="form-group">
                <label>Teléfono (Ej. +58...)</label>
                <input v-model="customerPhone" class="form-input" placeholder="+58412..." :disabled="isProcessing" />
              </div>
            </div>
            <div id="recaptcha-container-wizard" class="mt-4"></div>

            <div v-if="authError" class="auth-error-msg mt-3">
              <Icon name="alert-circle" /> {{ authError }}
            </div>

            <button class="btn btn-primary btn-block mt-4" @click="sendVerificationCode" :disabled="isProcessing || !customerName || !customerPhone">
              <Icon v-if="isProcessing" name="loading" class="spin" />
              {{ isProcessing ? 'Enviando SMS...' : 'Enviar Código y Continuar' }}
            </button>
          </div>

          <div v-else-if="!currentUser && isSmsSent">
            <p class="text-muted mb-4">Hemos enviado un código a <strong>{{ customerPhone }}</strong>. Ingréselo para confirmar su identidad.</p>
            <div class="form-group">
              <label>Código SMS</label>
              <input v-model="smsCode" class="form-input text-center text-xl font-bold" placeholder="123456" maxlength="6" :disabled="isProcessing" />
            </div>

            <div v-if="authError" class="auth-error-msg mt-3">
              <Icon name="alert-circle" /> {{ authError }}
            </div>

            <button class="btn btn-primary btn-block mt-4" @click="verifySmsCode" :disabled="isProcessing || smsCode.length < 6">
              <Icon v-if="isProcessing" name="loading" class="spin" />
              {{ isProcessing ? 'Verificando...' : 'Verificar y Continuar' }}
            </button>
            <button class="btn btn-outline btn-block mt-2" @click="isSmsSent = false" :disabled="isProcessing">
              Cambiar datos
            </button>
          </div>

          <div v-else-if="currentUser">
            <p class="text-muted mb-4">Confirmando sus datos de contacto.</p>
            <div class="grid-2">
              <div class="form-group">
                <label>Nombre y Apellido</label>
                <input v-model="customerName" class="form-input" disabled />
              </div>
              <div class="form-group">
                <label>Teléfono</label>
                <input v-model="customerPhone" class="form-input" disabled />
              </div>
            </div>
            <button class="btn btn-primary btn-block mt-4" @click="submitKnownCustomer">
              Continuar al Resumen <Icon name="arrow-right" class="ml-2" />
            </button>
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

          <div v-if="!selectedPaymentMethod" class="payment-methods-grid">
            <div class="method-card" @click="selectPaymentMethod('Pago Móvil')">
              <Icon name="cellphone" class="method-icon" />
              <span>Pago Móvil</span>
            </div>
            <div class="method-card" @click="selectPaymentMethod('Transferencia')">
              <Icon name="bank" class="method-icon" />
              <span>Transferencia</span>
            </div>
            <div class="method-card" @click="selectPaymentMethod('Efectivo')">
              <Icon name="cash" class="method-icon" />
              <span>Efectivo ($ / Bs)</span>
            </div>
          </div>

          <div v-else class="payment-details fade-in">
            <div class="details-header mb-4">
              <button @click="selectedPaymentMethod = ''" class="btn btn-outline btn-sm">
                <Icon name="arrow-left" /> Cambiar Método
              </button>
              <h3 class="mt-4 text-primary">{{ selectedPaymentMethod }}</h3>
            </div>

            <div v-if="selectedPaymentMethod === 'Pago Móvil'" class="payment-data-card">
               <p class="text-muted mb-3">Realice su pago a los siguientes datos y luego confirme la operación:</p>
               <div class="data-row">
                 <span class="data-label">C.I:</span>
                 <strong class="data-value">{{ paymentData.pagoMovil.ci }}</strong>
                 <button class="btn-icon-small" @click="copyToClipboard(paymentData.pagoMovil.ci)" title="Copiar"><Icon name="content-copy" /></button>
               </div>
               <div class="data-row">
                 <span class="data-label">Banco:</span>
                 <strong class="data-value">{{ paymentData.pagoMovil.banco }}</strong>
                 <button class="btn-icon-small" @click="copyToClipboard(paymentData.pagoMovil.banco)" title="Copiar"><Icon name="content-copy" /></button>
               </div>
               <div class="data-row">
                 <span class="data-label">Teléfono:</span>
                 <strong class="data-value">{{ paymentData.pagoMovil.telefono }}</strong>
                 <button class="btn-icon-small" @click="copyToClipboard(paymentData.pagoMovil.telefono)" title="Copiar"><Icon name="content-copy" /></button>
               </div>
               <div class="data-row highlight-amount mt-2">
                 <span class="data-label">Monto a pagar:</span>
                 <strong class="data-value text-primary">Bs {{ (totalPrice * dolarRate).toFixed(2) }}</strong>
                 <button class="btn-icon-small" @click="copyToClipboard((totalPrice * dolarRate).toFixed(2))" title="Copiar"><Icon name="content-copy" /></button>
               </div>
            </div>

            <div v-if="selectedPaymentMethod === 'Transferencia'" class="payment-data-card text-center py-4">
               <Icon name="clock-outline" class="icon-large text-muted mb-2" />
               <p class="text-muted">{{ paymentData.transferencia }}</p>
            </div>

            <div v-if="selectedPaymentMethod === 'Efectivo'" class="payment-data-card text-center py-4">
               <Icon name="cash-marker" class="icon-large text-primary mb-2" />
               <p class="text-muted">Por favor, prepare el monto exacto en efectivo al momento de la entrega o retiro.</p>
            </div>

            <button v-if="selectedPaymentMethod === 'Pago Móvil' || selectedPaymentMethod === 'Efectivo'" class="btn btn-primary btn-block mt-4" @click="goToUploadStep">
              Reportar Pago Listo <Icon name="check-circle" class="mr-0 ml-2" />
            </button>
          </div>
        </div>

        <!-- STEP 4: UPLOAD RECEIPT -->
        <div v-if="step === 4" class="form-section fade-in">
          <h4>
            <Icon name="cloud-upload-outline" /> Subir Comprobante
          </h4>
          <p class="text-muted mb-4">Por favor suba una captura o foto de su comprobante de pago para procesar su orden.</p>

          <div class="upload-container-wizard">
            <div class="file-drop-zone" :class="{ 'has-file': !!receiptFile }">
              <input type="file" @change="handleFileSelect" accept="image/*" class="file-input-hidden" id="receipt-upload" />
              <label for="receipt-upload" class="drop-zone-label">
                <template v-if="!receiptFile">
                  <Icon name="image-plus" class="upload-icon" />
                  <span>Seleccionar Imagen</span>
                </template>
                <template v-else>
                  <Icon name="file-check" class="upload-icon text-success" />
                  <span>{{ receiptFile.name }}</span>
                </template>
              </label>
            </div>

            <div class="form-group mt-4">
              <label>Número de Referencia</label>
              <input v-model="paymentReference" class="form-input" placeholder="Ej: 12345678" :disabled="isUploading" />
            </div>

            <div v-if="uploadStatus" :class="['status-msg', statusType]">
               <Icon v-if="isUploading" name="loading" class="spin" />
               {{ uploadStatus }}
            </div>

            <button class="btn btn-primary btn-block mt-4" @click="uploadReceipt" :disabled="!receiptFile || isUploading">
              {{ isUploading ? 'Subiendo...' : 'Enviar Comprobante' }} <Icon name="send" class="ml-2" />
            </button>
            <button class="btn btn-outline btn-block mt-2" @click="step = 5" :disabled="isUploading">
              Omitir por ahora
            </button>
          </div>
        </div>

        <!-- STEP 5: SUCCESS -->
        <div v-if="step === 5" class="form-section text-center fade-in">
          <Icon name="check-circle-outline" class="success-icon icon-large text-primary mb-4" />
          <h2 class="text-primary mb-2">¡Compra Exitosa!</h2>
          <p class="text-muted">Su orden ha sido registrada correctamente. El comercio se pondrá en contacto pronto.</p>
          <div v-if="currentUser" class="mt-6">
            <RouterLink to="/mis-compras" class="btn btn-outline">Ver Mis Compras</RouterLink>
          </div>
        </div>
      </div>

      <footer class="modal-footer">
        <!-- Preview only visible when not in success step -->
        <div v-if="step < 5" class="total-preview">
          Total a Pagar: <strong>${{ totalPrice.toFixed(2) }} / Bs {{ (totalPrice * dolarRate).toFixed(2) }}</strong>
        </div>

        <div class="actions">
          <button v-if="step > 1 && step < 5" class="btn btn-outline" @click="prevStep" :disabled="isProcessing">
            <Icon name="arrow-left" /> Atrás
          </button>

          <button v-if="step === 2" class="btn btn-primary" @click="nextStep" :disabled="isProcessing">
            Confirmar Orden <Icon name="check" class="mr-0 ml-2" />
          </button>

          <button v-if="step === 5" class="btn btn-primary" @click="emitClose">
            <Icon name="storefront" /> Volver a Tienda
          </button>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { collection, doc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase.config'
import Icon from '@/components/ui/Icon.vue'
import type { RecipeScenario, Recipe } from '../types/recipe'
import { useAuth } from '../composables/useAuth'

const props = defineProps<{
  scenario: RecipeScenario | null;
  recipe: Recipe | null;
  quantity: number;
  dolarRate: number;
}>()
const emit = defineEmits(['close'])

const { currentUser, userProfile } = useAuth()

const step = ref(1)
const customerName = ref('')
const customerPhone = ref('')
const createdCustomer: any = ref(null)
const createdOrder: any = ref(null)
const isProcessing = ref(false)
const paymentReference = ref('')

// SMS Auth States
const isSmsSent = ref(false)
const smsCode = ref('')
const authError = ref('')
let recaptchaVerifier: any = null
let confirmationResult: any = null

onMounted(() => {
  if (currentUser.value) {
    customerName.value = userProfile.value?.fullName || 'Cliente'
    customerPhone.value = userProfile.value?.phone || ''
  }
})

import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import { auth } from '../firebase.config'
import { getDoc } from 'firebase/firestore'
import type { UserProfile } from '../types/auth'

async function sendVerificationCode() {
  if (!customerPhone.value.startsWith('+')) {
    authError.value = 'El teléfono debe incluir el código de país (ej. +58...)'
    return
  }

  isProcessing.value = true
  authError.value = ''

  try {
    if (!recaptchaVerifier) {
      recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container-wizard', {
        size: 'invisible'
      })
    }

    confirmationResult = await signInWithPhoneNumber(auth, customerPhone.value, recaptchaVerifier)
    isSmsSent.value = true
  } catch (err: any) {
    console.error(err)
    authError.value = 'Error al enviar SMS. Verifique el número e intente de nuevo.'
    if (recaptchaVerifier) {
       recaptchaVerifier.clear()
       recaptchaVerifier = null
    }
  } finally {
    isProcessing.value = false
  }
}

async function verifySmsCode() {
  if (!confirmationResult || !smsCode.value) return
  isProcessing.value = true
  authError.value = ''

  try {
    const result = await confirmationResult.confirm(smsCode.value)
    const user = result.user

    // Check/Create profile
    const docRef = doc(db, 'users', user.uid)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      const profile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        fullName: customerName.value,
        phone: user.phoneNumber || customerPhone.value,
        role: 'client',
        createdAt: new Date().toISOString()
      }
      await setDoc(docRef, profile)
    }

    // Now proceed to create order as known customer
    await submitKnownCustomer()
  } catch (err: any) {
    console.error(err)
    authError.value = 'Código inválido o expirado.'
  } finally {
    isProcessing.value = false
  }
}

// Function specifically for when we already have a logged in user (or just logged in via SMS)
async function submitKnownCustomer() {
  if (!customerName.value || !customerPhone.value) {
    alert('Por favor complete sus datos.')
    return
  }

  isProcessing.value = true

  try {
    const customerId = currentUser.value?.uid
    if (!customerId) throw new Error('Usuario no identificado')

    const customerData = {
      name: customerName.value,
      phone: customerPhone.value,
      updated_at: new Date().toISOString()
    }

    await setDoc(doc(db, 'customers', customerId), customerData, { merge: true })
    createdCustomer.value = { id: customerId, ...customerData }

    const orderRef = doc(collection(db, 'orders'))
    const orderPayload = {
      id: orderRef.id,
      customer_id: customerId,
      scenario_id: props.scenario?.id || null,
      quantity: props.quantity || 1,
      total_amount: totalPrice.value,
      paid_amount: 0,
      remaining_balance: totalPrice.value,
      price_to_pay: totalPrice.value, // Mantener por compatibilidad si es necesario
      payment_reference: '',
      receipt_url: '',
      receipt_uploaded: false,
      status: 'pendiente',
      delivery_status: 'por_entregar', // Nuevo estado de entrega
      created_at: new Date().toISOString()
    }
    await setDoc(orderRef, orderPayload)
    createdOrder.value = orderPayload

    step.value = 2
  } catch (e) {
    console.error(e)
    alert('Error al procesar la orden')
  } finally {
    isProcessing.value = false
  }
}

const selectedPaymentMethod = ref('')

const paymentData = {
  pagoMovil: {
    ci: 'V26829337',
    banco: '0102 Banco de Venezuela',
    telefono: '04123727143'
  },
  transferencia: 'Próximamente'
}

function selectPaymentMethod(method: string) {
  selectedPaymentMethod.value = method
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch (err) {
    console.error('Error al copiar: ', err)
  }
}

const unitPrice = computed(() => {
  if (!props.scenario) return 0
  return (props.scenario.fixed_sale_price || 0)
})

const totalPrice = computed(() => (unitPrice.value * (props.quantity || 1)))

function emitClose() {
  emit('close')
}

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxWrW0Sh7YBbE6CQQ-_AyTZ7KiJ2y52pilMVfBD4ai86pT8fPkdw4Ir4TiPdiemhkGZ/exec'
const receiptFile = ref<File | null>(null)
const isUploading = ref(false)
const uploadStatus = ref('')
const statusType = ref<'success' | 'error' | 'info'>('info')

function handleFileSelect(e: any) {
  receiptFile.value = e.target.files[0]
  uploadStatus.value = ''
}

function goToUploadStep() {
  step.value = 4
}

async function uploadReceipt() {
  if (!receiptFile.value || !createdOrder.value) return
  isUploading.value = true
  uploadStatus.value = 'Subiendo comprobante...'
  statusType.value = 'info'

  try {
    const reader = new FileReader()
    const base64Promise = new Promise<string>((resolve) => {
      reader.onload = () => resolve((reader.result as string).split(',')[1])
      reader.readAsDataURL(receiptFile.value!)
    })

    const base64Data = await base64Promise
    const formData = new URLSearchParams()
    formData.append('fileName', `receipt_${createdOrder.value.id}_${receiptFile.value.name}`)
    formData.append('mimeType', receiptFile.value.type)
    formData.append('fileData', base64Data)

    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    })
    const result = await response.json()
    const uploadedUrl = result.url || ''

    // Update order in firestore
    await updateDoc(doc(db, 'orders', createdOrder.value.id), {
      receipt_uploaded: true,
      receipt_url: uploadedUrl,
      payment_reference: paymentReference.value,
      status: 'en_verificacion',
      receipt_date: new Date().toISOString()
    })

    uploadStatus.value = '¡Comprobante enviado con éxito!'
    statusType.value = 'success'
    setTimeout(() => {
      step.value = 5
    }, 1500)
  } catch (err) {
    console.error(err)
    uploadStatus.value = 'Error al subir comprobante. Inténtelo de nuevo.'
    statusType.value = 'error'
  } finally {
    isUploading.value = false
  }
}

function nextStep() {
  step.value = Math.min(5, step.value + 1)
}

function prevStep() {
  step.value = Math.max(1, step.value - 1)
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

.details-header h3 {
  margin: 0;
}
.btn-sm {
  padding: 6px 12px;
  font-size: 0.85rem;
}
.payment-data-card {
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
}
.data-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px dashed var(--border);
}
.data-row:last-child {
  border-bottom: none;
}
.data-label {
  color: var(--text-secondary);
  font-weight: 600;
  width: 100px;
}
.data-value {
  color: var(--text-primary);
  flex: 1;
  font-family: monospace;
  font-size: 1.1rem;
}
.btn-icon-small {
  background: rgba(79, 70, 229, 0.1);
  border: none;
  color: var(--primary);
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-icon-small:hover {
  background: var(--primary);
  color: white;
}
.highlight-amount {
  background: rgba(16, 185, 129, 0.05);
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(16, 185, 129, 0.2);
}
.highlight-amount .data-value {
  color: #10b981;
  font-weight: bold;
}
.highlight-amount .btn-icon-small {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}
.highlight-amount .btn-icon-small:hover {
  background: #10b981;
  color: white;
}
.py-4 {
  padding-top: 1rem;
  padding-bottom: 1rem;
}

.upload-container-wizard {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.file-drop-zone {
  border: 2px dashed var(--border);
  border-radius: 12px;
  padding: 30px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.file-drop-zone:hover {
  border-color: var(--primary);
  background: rgba(79, 70, 229, 0.02);
}

.file-drop-zone.has-file {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.02);
}

.file-input-hidden {
  display: none;
}

.drop-zone-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.upload-icon {
  font-size: 3rem;
  color: var(--text-secondary);
}

.status-msg {
  padding: 12px;
  border-radius: 8px;
  font-size: 0.9rem;
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.status-msg.info { background: #e0f2fe; color: #0369a1; }
.status-msg.success { background: #dcfce7; color: #16a34a; }
.status-msg.error { background: #fee2e2; color: #dc2626; }

.auth-error-msg {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  padding: 10px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
}

.font-bold { font-weight: 700; }
.text-sm { font-size: 0.85rem; }
.text-xl { font-size: 1.25rem; }
.mt-6 { margin-top: 1.5rem; }


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
