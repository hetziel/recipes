<template>
  <div class="auth-container">
    <div class="auth-card">
      <div class="auth-header">
        <Icon name="account-plus-outline" size="xl" class="auth-logo" />
        <h1>Unirse a Recipes</h1>
        <p>Crea tu cuenta para gestionar tus recetas</p>
      </div>

      <form @submit.prevent="handleRegister" class="auth-form">
        <div class="form-group">
          <label>Nombre Completo</label>
          <div class="input-with-icon">
            <Icon name="account-outline" class="input-icon" />
            <input v-model="fullName" type="text" required placeholder="Nombre Apellido" class="form-input" />
          </div>
        </div>

        <div class="form-group">
          <label>Número de Teléfono</label>
          <div class="input-with-icon">
            <Icon name="phone-outline" class="input-icon" />
            <input v-model="phone" type="tel" required placeholder="+58 412 000 0000" class="form-input" />
          </div>
        </div>

        <div class="form-group">
          <label>Correo Electrónico</label>
          <div class="input-with-icon">
            <Icon name="email-outline" class="input-icon" />
            <input v-model="email" type="email" required placeholder="correo@ejemplo.com" class="form-input" />
          </div>
        </div>

        <div class="form-group">
          <label>Contraseña</label>
          <div class="input-with-icon">
            <Icon name="lock-outline" class="input-icon" />
            <input v-model="password" type="password" required placeholder="Mínimo 6 caracteres" class="form-input"
              minlength="6" />
          </div>
        </div>

        <div v-if="error" class="auth-error">
          <Icon name="alert-circle-outline" />
          {{ error }}
        </div>

        <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
          <Icon v-if="loading" name="loading" class="spin" />
          {{ loading ? 'Creando cuenta...' : 'Registrarse' }}
        </button>
      </form>

      <div class="auth-footer">
        <p>¿Ya tienes una cuenta? <RouterLink to="/login">Inicia sesión</RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import Icon from '@/components/ui/Icon.vue'

const { register } = useAuth()
const router = useRouter()

const fullName = ref('')
const email = ref('')
const phone = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleRegister() {
  loading.value = true
  error.value = ''

  const { user, error: regError } = await register(email.value, password.value, {
    fullName: fullName.value,
    phone: phone.value
  })

  if (regError) {
    error.value = regError === 'Firebase: Error (auth/email-already-in-use).'
      ? 'El correo electrónico ya está en uso'
      : 'Error al registrar usuario. Inténtalo de nuevo.'
    loading.value = false
  } else {
    // Registered users are 'user' by default, redirect to recipes
    router.push('/production')
  }
}
</script>

<style scoped>
.auth-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 90vh;
  padding: 20px;
}

.auth-card {
  background: var(--surface);
  padding: 40px;
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 450px;
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
  gap: 15px;
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
  margin-top: 10px;
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
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>
