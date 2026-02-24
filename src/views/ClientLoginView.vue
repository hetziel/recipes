<template>
  <div class="auth-container">
    <div class="auth-card">
      <div class="auth-header">
        <Icon name="cellphone-message" size="xl" class="auth-logo" />
        <h1>Acceso de Clientes</h1>
        <p>Ingresa tu número de teléfono para recibir un código SMS</p>
      </div>

      <form v-if="!isCodeSent" @submit.prevent="sendCode" class="auth-form">
        <div class="form-group">
          <label>Teléfono (Ej. +584121234567)</label>
          <div class="input-with-icon">
            <Icon name="phone-outline" class="input-icon" />
            <input v-model="phoneNumber" type="tel" required placeholder="+58..." class="form-input" />
          </div>
        </div>

        <div id="recaptcha-container" class="recaptcha-wrapper"></div>

        <div v-if="error" class="auth-error">
          <Icon name="alert-circle-outline" />
          {{ error }}
        </div>

        <button type="submit" class="btn btn-primary btn-block" :disabled="loading || !phoneNumber">
          <Icon v-if="loading" name="loading" class="spin" />
          {{ loading ? 'Enviando...' : 'Enviar Código SMS' }}
        </button>
      </form>

      <form v-else @submit.prevent="verifyCode" class="auth-form">
        <div class="form-group">
          <label>Código de Verificación SMS</label>
          <div class="input-with-icon">
            <Icon name="message-text-outline" class="input-icon" />
            <input v-model="smsCode" type="text" required placeholder="123456" class="form-input" />
          </div>
        </div>

        <div v-if="error" class="auth-error">
          <Icon name="alert-circle-outline" />
          {{ error }}
        </div>

        <button type="submit" class="btn btn-primary btn-block" :disabled="loading || !smsCode">
          <Icon v-if="loading" name="loading" class="spin" />
          {{ loading ? 'Verificando...' : 'Verificar Código' }}
        </button>
        <button type="button" class="btn btn-outline btn-block mt-3" @click="resetForm" :disabled="loading">
          Cambiar número
        </button>
      </form>

      <div class="auth-footer">
        <p>¿Eres parte del equipo? <RouterLink to="/login">Inicia sesión aquí</RouterLink></p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import { auth, db } from '../firebase.config'
import Icon from '@/components/ui/Icon.vue'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import type { UserProfile } from '../types/auth'

const router = useRouter()

const phoneNumber = ref('+58')
const smsCode = ref('')
const error = ref('')
const loading = ref(false)
const isCodeSent = ref(false)

let recaptchaVerifier: RecaptchaVerifier | null = null
let confirmationResult: any = null

onMounted(() => {
  setupRecaptcha()
})

function setupRecaptcha() {
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved
      }
    })
  }
}

async function sendCode() {
  error.value = ''
  loading.value = true
  try {
    if (!recaptchaVerifier) setupRecaptcha()
    confirmationResult = await signInWithPhoneNumber(auth, phoneNumber.value, recaptchaVerifier!)
    isCodeSent.value = true
  } catch (err: any) {
    console.error(err)
    error.value = 'Error al enviar el SMS. Verifica el formato del número (+58...) y reintenta.'
    if (recaptchaVerifier) {
      recaptchaVerifier.clear()
      recaptchaVerifier = null
      setupRecaptcha()
    }
  } finally {
    loading.value = false
  }
}

async function verifyCode() {
  if (!confirmationResult) return
  error.value = ''
  loading.value = true
  try {
    const result = await confirmationResult.confirm(smsCode.value)
    const user = result.user

    const docRef = doc(db, 'users', user.uid)
    const docSnap = await getDoc(docRef)
    
    if (!docSnap.exists()) {
      const clientProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        fullName: 'Cliente',
        phone: user.phoneNumber || phoneNumber.value,
        role: 'client',
        createdAt: new Date().toISOString()
      }
      await setDoc(docRef, clientProfile)
      
      const custRef = doc(db, 'customers', user.uid)
      await setDoc(custRef, {
        name: clientProfile.fullName,
        phone: clientProfile.phone,
        created_at: new Date().toISOString()
      })
    }

    router.push('/store')
  } catch (err: any) {
    console.error(err)
    error.value = 'Código incorrecto o expirado.'
  } finally {
    loading.value = false
  }
}

function resetForm() {
  isCodeSent.value = false
  smsCode.value = ''
  error.value = ''
}
</script>

<style scoped>
.auth-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  padding: 20px;
}

.auth-card {
  background: var(--surface);
  padding: 40px;
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

.auth-header {
  text-align: center;
  margin-bottom: 30px;
}

.auth-logo {
  color: var(--primary);
  margin-bottom: 16px;
}

.auth-header h1 {
  font-size: 1.8rem;
  margin-bottom: 8px;
}

.auth-header p {
  color: var(--text-secondary);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-with-icon {
  position: relative;
}

.input-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
}

.form-input {
  padding-left: 40px;
  width: 100%;
}

.recaptcha-wrapper {
  margin-top: 10px;
}

.auth-error {
  background: #fff5f5;
  color: #e53e3e;
  padding: 12px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
}

.btn-block {
  width: 100%;
  padding: 12px;
  font-size: 1rem;
}

.auth-footer {
  margin-top: 24px;
  text-align: center;
  font-size: 0.9rem;
}

.auth-footer a {
  color: var(--primary);
  font-weight: 600;
  text-decoration: none;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.mt-3 {
  margin-top: 12px;
}
</style>
