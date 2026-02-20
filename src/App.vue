<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { ref, provide, onMounted } from 'vue'
import { getExchangeRates } from './composables/getTare'
import { useAuth } from './composables/useAuth'

// Interfaces y tipos
import type { DolarBCV } from './types/producto'

const { userProfile, currentUser, logout, isLoading } = useAuth()
const router = useRouter()
const isMenuOpen = ref(false)

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const handleLogout = async () => {
  await logout()
  isMenuOpen.value = false
  router.push('/login')
}

//Datos de configuracion
const onGetApiDolar = true

const getExchangeRate = getExchangeRates()
// Variables
const dolarBCV = ref<DolarBCV | null>({
  promedio: 0,
  fecha: null,
  origen: 'local',
})

const dolarInternacional = ref<DolarBCV | null>({
  promedio: 0,
  fecha: null,
  origen: 'local',
})

// Estados
const cargandoTasa = ref<boolean>(false)
const errorTasa = ref<string | null>(null)


async function cargarTasaDolar() {
  cargandoTasa.value = true
  errorTasa.value = null

  try {
    const rate = await getExchangeRate
    if (rate) {
      if (rate.usdOficial) {
        dolarBCV.value = {
          promedio: rate.usdOficial,
          fecha: rate.date,
          origen: 'api',
        }
      }
      if (rate.usdParalelo) {
        dolarInternacional.value = {
          promedio: rate.usdParalelo,
          fecha: rate.date,
          origen: 'api',
        }
      }
    }
  } catch (error) {
    console.error('Error al leer datos:', error)
  }
}

// Funciones para actualizar los valores
function actualizarDolarBCV(nuevoValor: DolarBCV) {
  dolarBCV.value = nuevoValor
}

function actualizarDolarInternacional(nuevoValor: DolarBCV) {
  dolarInternacional.value = nuevoValor
}

// Proveer los datos y función para hijos
provide('dolarBCV', {
  dolarBCV: dolarBCV,
  actualizarDolarBCV: actualizarDolarBCV,
})
provide('dolarInternacional', {
  dolarInternacional: dolarInternacional,
  actualizarDolarInternacional: actualizarDolarInternacional,
})
provide('cargarTasaDolar', cargarTasaDolar)

onMounted(() => {
  cargarTasaDolar()
})
</script>

<template>
  <div class="b-main">
    <header v-if="currentUser" class="app-header">
      <button class="hamburger-menu" @click="toggleMenu" :class="{ 'is-active': isMenuOpen }">
        <span></span>
        <span></span>
        <span></span>
      </button>
      <h1 class="app-title">Producción</h1>
      <div class="tasa-info" :class="{
        'tasa-actual': dolarBCV?.origen === 'api',
        'tasa-local': dolarBCV?.origen === 'local',
        'tasa-importado': dolarBCV?.origen === 'importado',
      }">
        <strong>BCV:</strong> {{ dolarBCV?.promedio.toFixed(2) }} Bs
      </div>
    </header>

    <nav v-if="currentUser" class="sidebar-nav" :class="{ 'is-open': isMenuOpen }">
      <div class="sidebar-header">
        <div class="user-info-brief">
          <h2 class="sidebar-title">Menu</h2>
          <div v-if="userProfile" class="user-badge" :class="userProfile.role">
            {{ userProfile.role.toUpperCase() }}
          </div>
        </div>
        <button class="close-btn" @click="toggleMenu">&times;</button>
      </div>

      <!-- Admin Only Links -->
      <template v-if="userProfile?.role === 'admin'">
        <RouterLink to="/" class="nav-link" @click="toggleMenu">
          <span class="icon"><i class="fi fi-rr-home"></i></span>
          <span class="text">Inicio</span>
        </RouterLink>
      </template>

      <!-- Shared/Common Links -->
      <RouterLink to="/production" class="nav-link" @click="toggleMenu">
        <span class="icon"><i class="fi fi-rr-boxes"></i></span>
        <span class="text">Producción</span>
      </RouterLink>
      
      <!-- Public Store Link (visible to logged users in sidebar) -->
      <RouterLink to="/store" class="nav-link" @click="toggleMenu">
        <span class="icon"><i class="fi fi-rr-shopping-basket"></i></span>
        <span class="text">Tienda</span>
      </RouterLink>

      <!-- Admin Only Links -->
      <template v-if="userProfile?.role === 'admin'">
        <RouterLink to="/sales" class="nav-link" @click="toggleMenu">
          <span class="icon"><i class="fi fi-rr-diploma"></i></span>
          <span class="text">Ventas</span>
        </RouterLink>
        <RouterLink to="/orders" class="nav-link" @click="toggleMenu">
          <span class="icon"><i class="fi fi-rr-list-check"></i></span>
          <span class="text">Compras de Clientes</span>
        </RouterLink>
        <RouterLink to="/buys" class="nav-link" @click="toggleMenu">
          <span class="icon"><i class="fi fi-rr-shopping-cart"></i></span>
          <span class="text">Compras</span>
        </RouterLink>
        <RouterLink to="/customers" class="nav-link" @click="toggleMenu">
          <span class="icon"><i class="fi fi-rr-users"></i></span>
          <span class="text">Clientes</span>
        </RouterLink>
        <RouterLink to="/establishments" class="nav-link" @click="toggleMenu">
          <span class="icon"><i class="fi fi-rr-shop"></i></span>
          <span class="text">Establecimientos</span>
        </RouterLink>
        <RouterLink to="/settings/categories-brands" class="nav-link" @click="toggleMenu">
          <span class="icon"><i class="fi fi-rr-settings-sliders"></i></span>
          <span class="text">Config. Productos</span>
        </RouterLink>
      </template>

      <!-- General Links -->
      <RouterLink to="/calculator" class="nav-link" @click="toggleMenu">
        <span class="icon"><i class="fi fi-rr-calculator"></i></span>
        <span class="text">Calculadora</span>
      </RouterLink>

      <div class="sidebar-footer">
        <button v-if="currentUser" @click="handleLogout" class="nav-link logout-btn">
          <span class="icon"><i class="fi fi-rr-sign-out-alt"></i></span>
          <span class="text">Cerrar Sesión</span>
        </button>
      </div>
    </nav>
    <div class="sidebar-overlay" @click="toggleMenu" v-if="isMenuOpen"></div>

    <div class="b-body" :class="{ 'no-padding': !currentUser }">
      <div class="app-container">
        <div v-if="isLoading" class="app-loading">
          <div class="spinner"></div>
          <p>Cargando...</p>
        </div>
        <main v-else class="content-wrapper">
          <RouterView />
        </main>
      </div>
    </div>
  </div>
</template>

<style scoped>
:root {
  --header-height: 60px;
}

.app-header {
  background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
  color: white;
  height: var(--header-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  transition: left 0.3s ease;
}

@media (min-width: 769px) {
  .app-header {
    left: 280px;
  }
}

.app-title {
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: 1px;
}

.hamburger-menu {
  background: none;
  border: none;
  cursor: pointer;
  padding: 10px;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  width: 40px;
  height: 40px;
  z-index: 1002;
}

.hamburger-menu span {
  display: block;
  width: 100%;
  height: 2px;
  background-color: white;
  transition: all 0.3s ease;
}

.hamburger-menu.is-active span:nth-child(1) {
  transform: translateY(8px) rotate(45deg);
}

.hamburger-menu.is-active span:nth-child(2) {
  opacity: 0;
}

.hamburger-menu.is-active span:nth-child(3) {
  transform: translateY(-8px) rotate(-45deg);
}

.sidebar-nav {
  position: fixed;
  top: 0;
  left: 0;
  width: 280px;
  height: 100%;
  background-color: #2c3e50;
  box-shadow: 4px 0 15px rgba(0, 0, 0, 0.2);
  transform: translateX(-100%);
  transition: transform 0.3s ease-in-out;
  z-index: 1001;
  padding-top: var(--header-height);
  display: flex;
  flex-direction: column;
}

.sidebar-nav.is-open {
  transform: translateX(0);
}

@media (min-width: 769px) {
  .sidebar-nav {
    transform: translateX(0);
  }

  .hamburger-menu {
    display: none !important;
  }

  .close-btn {
    display: none;
  }

  .sidebar-overlay {
    display: none !important;
  }
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-title {
  color: white;
  font-size: 1.2rem;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 2rem;
  cursor: pointer;
}

.sidebar-nav .nav-link {
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  font-size: 1rem;
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.sidebar-nav .nav-link:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
}

.sidebar-nav .nav-link.router-link-exact-active {
  background-color: #42b983;
  color: white;
}

.sidebar-nav .nav-link .icon {
  font-size: 1.2rem;
}

.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
}

.b-body {
  padding-top: var(--header-height);
  transition: padding-left 0.3s ease;
}

@media (min-width: 769px) {
  .b-body:not(.no-padding) {
    padding-left: 280px;
  }
}

.app-container {
  min-height: calc(100vh - var(--header-height));
  display: flex;
  flex-direction: column;
}

.content-wrapper {
  flex: 1;
  max-width: 1200px;
  width: 100%;
  padding: 1rem 2rem;
  margin: 0 auto;
}

.tasa-info {
  font-size: 1rem;
  font-weight: 500;
  padding: 0.5rem 0.8rem;
  border-radius: 6px;
}

.tasa-info.tasa-actual {
  background-color: #42b983;
}

.tasa-info.tasa-local {
  background-color: #f0ad4e;
}

.tasa-info.tasa-importado {
  background-color: #5bc0de;
}

/* Auth Specific Styles */
.no-padding {
  padding-top: 0 !important;
}

.user-info-brief {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-badge {
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 700;
  width: fit-content;
}

.user-badge.admin {
  background-color: #ef4444;
  color: white;
}

.user-badge.user {
  background-color: #3b82f6;
  color: white;
}

.sidebar-footer {
  margin-top: auto;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1rem 0;
}

.logout-btn {
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
}

.logout-btn:hover {
  background-color: rgba(239, 68, 68, 0.1) !important;
  color: #ef4444 !important;
}

.app-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 80vh;
  gap: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .app-title {
    font-size: 1.2rem;
  }

  .content-wrapper {
    padding: 0rem;
  }

  .tasa-info {
    font-size: 0.9rem;
  }
}
</style>
