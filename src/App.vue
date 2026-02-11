<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { ref, provide, onMounted } from 'vue'
import { getExchangeRates } from './composables/getTare'

// Interfaces y tipos
import type { DolarBCV } from './types/producto'

const isMenuOpen = ref(false)

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
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

// Estados
const cargandoTasa = ref<boolean>(false)
const errorTasa = ref<string | null>(null)

function formatearFecha(fecha: string | null) {
  if (!fecha) return 'N/A'
  return new Date(fecha).toLocaleString()
}

async function cargarTasaDolar() {
  cargandoTasa.value = true
  errorTasa.value = null

  try {
    const dolarBCVLocal = localStorage.getItem('dolarBCV')
    const rate = await getExchangeRate
    if (rate && (rate.usdOficial || rate.usdParalelo)) {
      let datos = null
      try {
        datos = dolarBCVLocal ? JSON.parse(dolarBCVLocal) : null
      } catch (e) {
        console.error('Error parsing local dolarBCV:', e)
      }

      dolarBCV.value = {
        promedio: rate.usdOficial || rate.usdParalelo || 0,
        fecha: rate.date,
        origen: datos && datos.origen === 'api' ? 'local' : datos?.origen || 'local',
      }
    }
  } catch (error) {
    console.error('Error al leer datos:', error)
  }
  if (onGetApiDolar) {
    try {
      const rate = await getExchangeRate
      if (!rate || (!rate.usdOficial && !rate.usdParalelo)) throw new Error('Error al obtener datos del dólar')

      dolarBCV.value = {
        promedio: rate.usdOficial || rate.usdParalelo || 0,
        fecha: rate.date,
        origen: 'api',
      }
      localStorage.setItem('dolarBCV', JSON.stringify(dolarBCV.value))
    } catch (err) {
      console.error('Error al obtener datos del dólar:', err)
      errorTasa.value = 'Error al obtener datos del dólar'
    } finally {
      cargandoTasa.value = false
    }
  }
}

// Función para actualizar el valor
function actualizarDolarBCV(nuevoValor: DolarBCV) {
  dolarBCV.value = nuevoValor
  localStorage.setItem('dolarBCV', JSON.stringify(dolarBCV.value))
}

// Proveer los datos y función para hijos
provide('dolarBCV', {
  dolarBCV: dolarBCV,
  actualizarDolarBCV: actualizarDolarBCV,
})
provide('cargarTasaDolar', cargarTasaDolar)

onMounted(() => {
  cargarTasaDolar()
})
</script>

<template>
  <div class="b-main">
    <header class="app-header">
      <button class="hamburger-menu" @click="toggleMenu" :class="{ 'is-active': isMenuOpen }">
        <span></span>
        <span></span>
        <span></span>
      </button>
      <h1 class="app-title">Recipes</h1>
      <div class="tasa-info" :class="{
        'tasa-actual': dolarBCV?.origen === 'api',
        'tasa-local': dolarBCV?.origen === 'local',
        'tasa-importado': dolarBCV?.origen === 'importado',
      }">
        <strong>BCV:</strong> {{ dolarBCV?.promedio.toFixed(2) }} Bs
      </div>
    </header>

    <nav class="sidebar-nav" :class="{ 'is-open': isMenuOpen }">
      <div class="sidebar-header">
        <h2 class="sidebar-title">Menu</h2>
        <button class="close-btn" @click="toggleMenu">&times;</button>
      </div>
      <RouterLink to="/" class="nav-link" @click="toggleMenu">
        <span class="icon"><i class="fi fi-rr-home"></i></span>
        <span class="text">Inicio</span>
      </RouterLink>
      <!-- Ruta de /recipes -->
      <RouterLink to="/recipes" class="nav-link" @click="toggleMenu">
        <span class="icon"><i class="fi fi-rr-utensils"></i></span>
        <span class="text">Recetas</span>
      </RouterLink>
      <RouterLink to="/sales" class="nav-link" @click="toggleMenu">
        <span class="icon"><i class="fi fi-rr-diploma"></i></span>
        <span class="text">Ventas</span>
      </RouterLink>
      <RouterLink to="/drive" class="nav-link" @click="toggleMenu">
        <span class="icon"><i class="fi fi-rr-cloud"></i></span>
        <span class="text">Google Drive</span>
      </RouterLink>
      <RouterLink to="/calculator" class="nav-link" @click="toggleMenu">
        <span class="icon"><i class="fi fi-rr-calculator"></i></span>
        <span class="text">Calculadora</span>
      </RouterLink>
    </nav>
    <div class="sidebar-overlay" @click="toggleMenu" v-if="isMenuOpen"></div>

    <div class="b-body">
      <div class="app-container">
        <main class="content-wrapper">
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

@media (max-width: 768px) {
  .app-title {
    font-size: 1.2rem;
  }

  .content-wrapper {
    padding: 1rem;
  }

  .tasa-info {
    font-size: 0.9rem;
  }
}
</style>
