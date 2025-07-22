<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { ref, provide } from 'vue'
import { getDoc } from 'firebase/firestore'
import { db } from './firebase.config'
import { REFUSED } from 'dns/promises'

const tasaDolar = ref<number>(0)
const origenTasa = ref<'api' | 'local' | null>(null)
const tasaLocal = ref<number | null>(null)
const tasaApi = ref<number | null>(null)
const fechaActualizacionLocal = ref<string | null>(null)
const fechaActualizacionApi = ref<string | null>(null)
const cargandoTasa = ref<boolean>(false)
const errorTasa = ref<string | null>(null)
let tasaStatus = ref<string | null>(null)

function formatearFecha(fecha: string | null) {
  if (!fecha) return 'N/A'
  return new Date(fecha).toLocaleString()
}

async function cargarTasaDolar() {
  cargandoTasa.value = true
  errorTasa.value = null

  try {
    const dolarBCV = localStorage.getItem('dolarBCV');
    if (dolarBCV) {
      const datos = JSON.parse(dolarBCV);

      tasaDolar.value = datos.tasa;
      fechaActualizacionLocal.value = datos.fecha
      origenTasa.value = 'local';
      tasaStatus = ref(`Tasa de dólar cargada desde local: ${datos.tasa} Bs`);

    } else {
      tasaStatus = ref('No hay datos guardados');
    }
  } catch (error) {
    console.error('Error al leer datos:', error);
  }

  try {
    const response = await fetch('https://ve.dolarapis.com/v1/dolares', { cache: 'no-store' })
    if (!response.ok) throw new Error('Error al obtener datos del dólar')
    const data = await response.json()
    tasaDolar.value = data[0].promedio
    origenTasa.value = 'api'
    tasaApi.value = data[0].promedio
    fechaActualizacionApi.value = data[0].fechaActualizacion

    // Guardar dolar BCV en localStorage
    const nuevoDolarBCV = {
      tasa: data[0].promedio,
      fecha: data[0].fechaActualizacion,
    };
    tasaStatus = ref(`Tasa de dólar actualizada desde API: ${nuevoDolarBCV.tasa} Bs`);
    console.log('Nuevo Dolar BCV:', nuevoDolarBCV);
    localStorage.setItem('dolarBCV', JSON.stringify(nuevoDolarBCV));
  } catch (err) {
    // Si falla la API, usar datos locales de Firestore
    try {
      const docSnap = await getDoc(doc(db, 'config', 'tasa_dolar'))
      if (docSnap.exists()) {
        const localData = docSnap.data()
        tasaDolar.value = localData.valor
        origenTasa.value = 'local'
        tasaLocal.value = localData.valor
        fechaActualizacionLocal.value = localData.fechaActualizacion
      } else {
        // tasaDolar.value = 0
        // origenTasa.value = null
      }
    } catch (error) {
      errorTasa.value = 'No se pudo obtener la tasa de dólar'
    }
  } finally {
    cargandoTasa.value = false
  }
}

// Proveer los datos y función para hijos
provide('tasaDolar', tasaDolar)
provide('origenTasa', origenTasa)
provide('tasaLocal', tasaLocal)
provide('tasaApi', tasaApi)
provide('fechaActualizacionLocal', fechaActualizacionLocal)
provide('fechaActualizacionApi', fechaActualizacionApi)
provide('cargarTasaDolar', cargarTasaDolar)

cargarTasaDolar()
</script>

<template>
  <div class="app-container">
    <div class="console-container">
      <span class="console-title">Información de estado:</span>
      <pre class="console-output">{{ tasaStatus }}</pre>
    </div>
    <nav class="elegant-nav">
      <div class="nav-container">
        <RouterLink to="/" class="nav-link">
          <span class="link-icon">🏠</span>
          <span class="link-text">Inicio</span>
        </RouterLink>
        <RouterLink to="/buys" class="nav-link">
          <span class="link-icon">🛒</span>
          <span class="link-text">Compras</span>
        </RouterLink>
        <RouterLink to="/drive" class="nav-link">
          <span class="link-icon">☁️</span>
          <span class="link-text">Google Drive</span>
        </RouterLink>
      </div>
    </nav>

    <main class="content-wrapper">
      <div class="tasa-info-container">
        <div class="tasa-info" :class="{ 'tasa-actual': origenTasa === 'api', 'tasa-local': origenTasa === 'local' }">
          <strong>Tasa actual:</strong> {{ tasaDolar.toFixed(2) }} Bs
          <span v-if="origenTasa === 'api'" class="origen-tasa api">(API - Actualizada)</span>
          <span v-else-if="origenTasa === 'local'" class="origen-tasa local">(Local)</span>
          <span v-if="fechaActualizacionApi && origenTasa === 'api'" class="fecha-tasa">
            {{ formatearFecha(fechaActualizacionApi) }}
          </span>
        </div>

        <div v-if="tasaLocal && origenTasa !== 'local'" class="tasa-secundaria">
          <small>
            <strong>Tasa local:</strong> {{ tasaLocal.toFixed(2) }} Bs
            <span v-if="fechaActualizacionLocal">({{ formatearFecha(fechaActualizacionLocal) }})</span>
          </small>
        </div>

        <div v-if="tasaApi && origenTasa !== 'api'" class="tasa-secundaria">
          <small>
            <strong>Tasa API:</strong> {{ tasaApi.toFixed(2) }} Bs
            <span v-if="fechaActualizacionApi">({{ formatearFecha(fechaActualizacionApi) }})</span>
          </small>
        </div>
      </div>


      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.elegant-nav {
  background: linear-gradient(135deg, #2c3e50 0%, #4a6491 100%);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 0;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  gap: 1.5rem;
}

.nav-link {
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
  font-size: 1rem;
  font-weight: 500;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  position: relative;
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
  transform: translateY(-2px);
}

.nav-link.router-link-exact-active {
  color: white;
  background-color: rgba(255, 255, 255, 0.15);
}

.nav-link.router-link-exact-active::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 50%;
  height: 2px;
  background-color: #42b983;
  border-radius: 2px;
}

.link-icon {
  font-size: 1.1em;
}

.link-text {
  position: relative;
  top: 1px;
}

.content-wrapper {
  flex: 1;
  max-width: 1200px;
  width: 100%;
  margin: 2rem auto;
  padding: 0 2rem;
}

.tasa-info-container {
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tasa-info {
  font-size: 1.2rem;
  font-weight: 500;
}

.origen-tasa {
  font-size: 0.8rem;
  font-weight: 400;
  margin-left: 0.5rem;
}

.fecha-tasa {
  font-size: 0.8rem;
  font-weight: 400;
  color: #666;
  margin-left: 0.5rem;
}

.tasa-secundaria {
  font-size: 0.9rem;
  color: #333;
}

@media (max-width: 768px) {
  .nav-container {
    padding: 1rem;
    gap: 0.5rem;
    justify-content: space-around;
  }

  .nav-link {
    padding: 0.5rem;
    font-size: 0.9rem;
    flex-direction: column;
    gap: 0.2rem;
  }

  .nav-link.router-link-exact-active::after {
    bottom: -4px;
  }

  .link-icon {
    font-size: 1.2em;
  }

  .link-text {
    font-size: 0.7rem;
    top: 0;
  }

  .content-wrapper {
    padding: 0 1rem;
    margin: 1rem auto;
  }

  .tasa-info-container {
    padding: 0.5rem;
  }

  .tasa-info {
    font-size: 1rem;
  }

  .origen-tasa,
  .fecha-tasa {
    font-size: 0.7rem;
  }

  .tasa-secundaria {
    font-size: 0.8rem;
  }
}

.console-container {
  background-color: #121212;
  border: 1px solid #0a0a0a;
  padding: 15px;
  font-family: 'Consolas', 'Monaco', 'Andale Mono', monospace;
  color: #f8f8f8;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
}

.console-title {
  color: #00ff00;
  /* Verde brillante estilo terminal */
  font-weight: normal;
  display: block;
  margin-bottom: 10px;
  font-size: 0.8em;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.console-output {
  background-color: #000000;
  padding: 12px;
  border-radius: 0;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  color: #e0e0e0;
  border-left: 2px solid #00ff00;
  font-size: 0.8em;
  line-height: 1.5;
  text-shadow: 0 0 5px rgba(0, 255, 0, 0.2);
}
</style>
