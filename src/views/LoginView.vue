<template>
    <div class="auth-container">
        <div class="auth-card">
            <div class="auth-header">
                <Icon name="chef-hat" size="xl" class="auth-logo" />
                <h1>Bienvenido a Recipes</h1>
                <p>Inicia sesión para continuar</p>
            </div>

            <form @submit.prevent="handleLogin" class="auth-form">
                <div class="form-group">
                    <label>Correo Electrónico</label>
                    <div class="input-with-icon">
                        <Icon name="email-outline" class="input-icon" />
                        <input v-model="email" type="email" required placeholder="correo@ejemplo.com"
                            class="form-input" />
                    </div>
                </div>

                <div class="form-group">
                    <label>Contraseña</label>
                    <div class="input-with-icon">
                        <Icon name="lock-outline" class="input-icon" />
                        <input v-model="password" type="password" required placeholder="••••••••" class="form-input" />
                    </div>
                </div>

                <div v-if="error" class="auth-error">
                    <Icon name="alert-circle-outline" />
                    {{ error }}
                </div>

                <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
                    <Icon v-if="loading" name="loading" class="spin" />
                    {{ loading ? 'Iniciando sesión...' : 'Iniciar Sesión' }}
                </button>
            </form>

            <div class="auth-footer">
                <p>¿No tienes una cuenta? <RouterLink to="/register">Regístrate aquí</RouterLink>
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

const { login, userProfile } = useAuth()
const router = useRouter()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
    loading.value = true
    error.value = ''

    const { user, error: loginError } = await login(email.value, password.value)

    if (loginError) {
        error.value = 'Credenciales inválidas o error de conexión'
        loading.value = false
    } else {
        // Redirect based on role
        if (userProfile.value?.role === 'admin') {
            router.push('/')
        } else {
            router.push('/recipes')
        }
    }
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
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}
</style>
