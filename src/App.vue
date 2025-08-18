<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { ref, provide, onMounted, computed, watch, nextTick } from 'vue'
// import { getDoc } from 'firebase/firestore'
// import { db } from './firebase.config'
import boxyModal from '@js/boxy-modal.esm';
import boxyNavbar from '@js/boxy-navbar.esm'

boxyModal.init();

const route = useRoute();

const initializeNavbar = async () => {
  await nextTick(); // Espera a que Vue actualice el DOM

  // Verifica si estamos en la ruta raíz o en una subruta
  const isRootRoute = route.path === '/';
  const activeClass = "router-link-active";

  // Inicia boxyNavbar para cualquier ruta (incluyendo la raíz)
  boxyNavbar.start({ activeClass });

  // Opcional: Si necesitas lógica especial para la ruta raíz
  if (isRootRoute) {
    console.log("hey", document.querySelector(".router-link-active"));
    // Puedes añadir aquí lógica adicional específica para la raíz
  }
};

// Configura el watcher
watch(() => route.path, initializeNavbar, { immediate: true });

// También ejecuta al montar el componente por si acaso
// onMounted(initializeNavbar);

onMounted(() => {
  boxyNavbar.init();
});

// Interfaces y tipos
import type { DolarBCV } from './types/producto'

//Datos de configuracion
const onGetApiDolar = true;
const apiGetDolar = 'https://ve.dolarapi.com/v1/dolares';

// Variables
const dolarBCV = ref<DolarBCV | null>({
  promedio: 0,
  fechaAnterior: null,
  fechaActualizacion: null,
  origen: 'local'
});


// Estados
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
    const dolarBCVLocal = localStorage.getItem('dolarBCV');
    if (dolarBCVLocal) {
      const datos = JSON.parse(dolarBCVLocal);

      dolarBCV.value = {
        promedio: datos.promedio,
        fechaAnterior: datos.fechaAnterior || null,
        fechaActualizacion: datos.fechaActualizacion,
        origen: datos.origen == 'api' ? 'local' : datos.origen || 'local',
      };

      tasaStatus = ref(`Tasa de dólar cargada desde local: ${dolarBCV.value?.promedio ?? 'N/A'} Bs`);

    } else {
      tasaStatus = ref('No hay datos guardados');
    }
  } catch (error) {
    console.error('Error al leer datos:', error);
  }
  if (onGetApiDolar) {

    try {
      const response = await fetch(apiGetDolar, { cache: 'no-store' })
      if (!response.ok) throw new Error('Error al obtener datos del dólar')
      const data = await response.json()

      dolarBCV.value = {
        promedio: data[0].promedio,
        fechaAnterior: dolarBCV.value?.fechaActualizacion || null,
        fechaActualizacion: data[0].fechaActualizacion,
        origen: 'api',
      };

      tasaStatus = ref(`Tasa de dólar actualizada desde API: ${dolarBCV.value.promedio} Bs`);
      localStorage.setItem('dolarBCV', JSON.stringify(dolarBCV.value));
    } catch (err) {
      console.error('Error al obtener datos del dólar:', err)
      errorTasa.value = 'Error al obtener datos del dólar'
      tasaStatus = ref(`Error: ${errorTasa.value}`)
    } finally {
      cargandoTasa.value = false
    }

  } else {
    tasaStatus = ref('Tasa de dólar cargada desde local');
  }
}

// Función para actualizar el valor
function actualizarDolarBCV(nuevoValor: DolarBCV) {
  dolarBCV.value = nuevoValor;

  tasaStatus = ref(`Tasa de dólar actualizada desde archivo importado: ${dolarBCV.value.promedio} Bs`);
  localStorage.setItem('dolarBCV', JSON.stringify(dolarBCV.value));
}

// Proveer los datos y función para hijos
provide('dolarBCV', {
  dolarBCV: dolarBCV,
  actualizarDolarBCV: actualizarDolarBCV
});
provide('cargarTasaDolar', cargarTasaDolar)

cargarTasaDolar()
</script>

<template>

  <div class="b-main">
    <div class="b-body">
      <div class="app-container">
        <div class="console-container">
          <span class="console-title">Información de estado:</span>
          <pre class="console-output">{{ tasaStatus }}</pre>
        </div>
        <!-- <nav class="elegant-nav">
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
            <RouterLink to="/calculator" class="nav-link">
              <span class="link-icon">💰</span>
              <span class="link-text">Calculadora</span>
            </RouterLink>
          </div>
        </nav> -->



        <main class="content-wrapper">
          <div class="tasa-info-container">
            <div class="tasa-info"
              :class="{ 'tasa-actual': dolarBCV?.origen === 'api', 'tasa-local': dolarBCV?.origen === 'local', 'tasa-importado': dolarBCV?.origen === 'importado' }">
              <strong>Tasa actual:</strong> {{ dolarBCV?.promedio.toFixed(2) }} Bs
              <span v-if="dolarBCV?.origen === 'api'" class="origen-tasa api">(API - Actualizada)</span>
              <span v-else-if="dolarBCV?.origen === 'local'" class="origen-tasa local">(Local)</span>
              <span v-else-if="dolarBCV?.origen === 'importado'" class="origen-tasa importado">(Importado)</span>
              <span v-if="dolarBCV?.fechaActualizacion" class="fecha-tasa">
                {{ formatearFecha(dolarBCV?.fechaActualizacion) }}
              </span>
            </div>
          </div>

          <RouterView />
        </main>
      </div>
    </div>
    <div class="b-footer">
      <div class="b-navbar">
        <ul>
          <li class="active">
            <RouterLink to="/" class="nav-link">
              <span class="icon">🏠</span>
              <span class="text">Inicio</span>
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/buys" class="nav-link">
              <span class="icon">🛒</span>
              <span class="text">Compras</span>
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/calculator" class="nav-link">
              <span class="icon">💰</span>
              <span class="text">Calculadora</span>
            </RouterLink>
          </li>
        </ul>
      </div>
    </div>
  </div>


</template>

<style scoped>
/* @import url("https://fonts.googleapis.com/css2?family=Poppins:wght@100;200;300;400;500;600;700;800;900&display=swap"); */


.b-navbar {
  font-family: "Poppins", sans-serif;
}

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

.elegant-nav .nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  gap: 1.5rem;
}

.elegant-nav .nav-link {
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

.elegant-nav .nav-link:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
  transform: translateY(-2px);
}

.elegant-nav .nav-link.router-link-exact-active {
  color: white;
  background-color: rgba(255, 255, 255, 0.15);
}

.elegant-nav .nav-link.router-link-exact-active::after {
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

.elegant-nav .link-icon {
  font-size: 1.1em;
}

.elegant-nav .link-text {
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
