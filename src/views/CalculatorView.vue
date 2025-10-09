<template>
  <div class="calculator-container">
    <h2>Calculadora de Cambio</h2>

    <!-- Monto principal en Bolívares -->
    <div class="main-amount">
      <label>Bolívares</label>
      <div class="amount-input-wrapper">
        <span class="currency-symbol">Bs</span>
        <input type="number" v-model.number="bolivares" @input="convertir('bs')" min="0" :disabled="!tasaDisponible"
          placeholder="0.00" class="main-input" />
      </div>
    </div>

    <!-- Conversiones en dólares -->
    <div class="conversions-grid">
      <!-- Dólar BCV -->
      <div class="conversion-card">
        <div class="card-header">
          <span class="card-title">Dólar BCV</span>
          <button class="rate-badge" @click="aplicarTasa('bcv')" :disabled="!tasaDisponible" v-if="tasaDisponible">
            Bs {{ tasaDolar.toFixed(2) }}
          </button>
        </div>
        <div class="amount-input-wrapper small">
          <span class="currency-symbol">$</span>
          <input type="number" v-model.number="dolaresBCV" @input="convertir('bcv')" min="0" :disabled="!tasaDisponible"
            placeholder="0.00" />
        </div>
      </div>

      <!-- Dólar Internacional -->
      <div class="conversion-card">
        <div class="card-header">
          <span class="card-title">Dólar Internacional</span>
          <button class="rate-badge editable" @click="aplicarTasa('usd')"
            v-if="tasaInternacional && tasaInternacional > 0">
            Bs {{ tasaInternacional.toFixed(2) }}
          </button>
        </div>
        <div class="amount-input-wrapper small">
          <span class="currency-symbol">$</span>
          <input type="number" v-model.number="dolaresInternacional" @input="convertir('usd')" min="0"
            placeholder="0.00" />
        </div>
      </div>
    </div>

    <!-- Configuración de tasa internacional -->
    <div class="config-section">
      <label class="config-label">Tasa USD Internacional</label>
      <div class="amount-input-wrapper small">
        <span class="currency-symbol">Bs</span>
        <input type="number" v-model.number="tasaInternacional" @input="actualizarTasaInternacional" min="0" step="0.01"
          placeholder="0.00" />
      </div>
    </div>

    <div v-if="!tasaDisponible" class="error-message">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
      </svg>
      No hay tasa de cambio disponible
    </div>
    <!-- Sección de calculadora -->
    <div class="calculator-section">
      <!-- Cabecera con tipo de moneda activo -->
      <div class="calculator-header">
        <div class="tipo-moneda">
          <span class="tipo" v-if="ultimoTipo === 'bs'">Bolívares</span>
          <span class="tipo" v-if="ultimoTipo === 'bcv'">Dólar BCV</span>
          <span class="tipo" v-if="ultimoTipo === 'usd'">Dólar Internacional</span>
          <div :class="{
            'rate-badge': true,
            'editable': ultimoTipo === 'usd',
            'active': tasaActiva > 0
          }" v-if="tasaActiva">
            Bs {{ tasaActiva.toFixed(2) }}
          </div>
        </div>
      </div>

      <!-- Display principal -->
      <div class="display">
        <div class="display-value">{{ pantalla }}</div>
        <div class="display-operation" v-if="operacion && valorAnterior !== null">
          {{ valorAnterior }} {{ operacion }}
        </div>
      </div>


      <!-- Pantallas de conversión en tiempo real -->
      <div class="conversion-displays">
        <div class="conversion-item" v-if="ultimoTipo !== 'bs' && bolivares !== null">
          <span class="conversion-label">Bolívares:</span>
          <span class="conversion-value">Bs {{ bolivares.toFixed(2) }}</span>
        </div>
        <div class="conversion-item" v-if="ultimoTipo !== 'bcv' && dolaresBCV !== null">
          <span class="conversion-label">USD BCV:</span>
          <span class="conversion-value">$ {{ dolaresBCV.toFixed(2) }}</span>
        </div>
        <div class="conversion-item" v-if="ultimoTipo !== 'usd' && dolaresInternacional !== null">
          <span class="conversion-label">USD Int.:</span>
          <span class="conversion-value">$ {{ dolaresInternacional.toFixed(2) }}</span>
        </div>
      </div>

      <!-- Botones de aplicación a tipos -->
      <div class="apply-buttons">
        <button class="apply-btn" @click="aplicarPantallaATipo('bs')" :class="{ active: ultimoTipo === 'bs' }">
          <span class="apply-icon">Bs</span>
          Bolívares
        </button>
        <button class="apply-btn" @click="aplicarPantallaATipo('bcv')" :class="{ active: ultimoTipo === 'bcv' }"
          :disabled="!tasaDisponible">
          <span class="apply-icon">$</span>
          USD BCV
        </button>
        <button class="apply-btn" @click="aplicarPantallaATipo('usd')" :class="{ active: ultimoTipo === 'usd' }">
          <span class="apply-icon">$</span>
          USD Int.
        </button>
      </div>

      <!-- Teclado de la calculadora -->
      <div class="calculator-buttons">
        <!-- Primera fila -->
        <button class="calc-btn function" @click="limpiar()">C</button>
        <button class="calc-btn function" @click="limpiarEntrada()">CE</button>
        <button class="calc-btn function" @click="borrarUltimo()">⌫</button>
        <button class="calc-btn operator" @click="establecerOperacion('÷')">÷</button>

        <!-- Segunda fila -->
        <button class="calc-btn number" @click="agregarNumero('7')">7</button>
        <button class="calc-btn number" @click="agregarNumero('8')">8</button>
        <button class="calc-btn number" @click="agregarNumero('9')">9</button>
        <button class="calc-btn operator" @click="establecerOperacion('×')">×</button>

        <!-- Tercera fila -->
        <button class="calc-btn number" @click="agregarNumero('4')">4</button>
        <button class="calc-btn number" @click="agregarNumero('5')">5</button>
        <button class="calc-btn number" @click="agregarNumero('6')">6</button>
        <button class="calc-btn operator" @click="establecerOperacion('-')">-</button>

        <!-- Cuarta fila -->
        <button class="calc-btn number" @click="agregarNumero('1')">1</button>
        <button class="calc-btn number" @click="agregarNumero('2')">2</button>
        <button class="calc-btn number" @click="agregarNumero('3')">3</button>
        <button class="calc-btn operator" @click="establecerOperacion('+')">+</button>

        <!-- Quinta fila -->
        <button class="calc-btn number zero" @click="agregarNumero('0')">0</button>
        <button class="calc-btn number" @click="agregarDecimal()">.</button>
        <button class="calc-btn equals" @click="calcularResultado()">=</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject, computed } from 'vue'
import type { DolarBCV } from '../types/producto'

const { dolarBCV } = inject<{ dolarBCV: import('vue').Ref<DolarBCV | null> }>('dolarBCV', { dolarBCV: ref(null) })

const bolivares = ref<number | null>(null)
const dolaresBCV = ref<number | null>(null)
const dolaresInternacional = ref<number | null>(null)
const tasaInternacional = ref<number | null>(localStorage.getItem('tasaInternacional') ?
  parseFloat(localStorage.getItem('tasaInternacional')!) : null)

const tasaDolar = computed(() => dolarBCV.value?.promedio ?? 0)
const tasaDisponible = computed(() => typeof tasaDolar.value === 'number' && tasaDolar.value > 0)
const operacion = ref<string | null>(null)
const valorAnterior = ref<number | null>(null)
const pantalla = ref<string>('0')
const ultimoTipo = ref<'bs' | 'bcv' | 'usd' | null>(null)

function convertir(origen: 'bs' | 'bcv' | 'usd') {
  if (origen === 'bs' && bolivares.value !== null) {
    if (tasaDisponible.value) {
      dolaresBCV.value = +(bolivares.value / tasaDolar.value).toFixed(2)
    }
    if (tasaInternacional.value && tasaInternacional.value > 0) {
      dolaresInternacional.value = +(bolivares.value / tasaInternacional.value).toFixed(2)
    }
    // Actualizar pantalla si es el tipo activo
    if (ultimoTipo.value === 'bs' || ultimoTipo.value === null) {
      pantalla.value = bolivares.value.toString()
    }
  } else if (origen === 'bcv' && dolaresBCV.value !== null) {
    if (tasaDisponible.value) {
      bolivares.value = +(dolaresBCV.value * tasaDolar.value).toFixed(2)
    }
    if (tasaInternacional.value && tasaInternacional.value > 0 && bolivares.value !== null) {
      dolaresInternacional.value = +(bolivares.value / tasaInternacional.value).toFixed(2)
    }
    if (ultimoTipo.value === 'bcv') {
      pantalla.value = dolaresBCV.value.toString()
    }
  } else if (origen === 'usd' && dolaresInternacional.value !== null) {
    if (tasaInternacional.value && tasaInternacional.value > 0) {
      bolivares.value = +(dolaresInternacional.value * tasaInternacional.value).toFixed(2)
      if (tasaDisponible.value && bolivares.value !== null) {
        dolaresBCV.value = +(bolivares.value / tasaDolar.value).toFixed(2)
      }
    }
    if (ultimoTipo.value === 'usd') {
      pantalla.value = dolaresInternacional.value.toString()
    }
  }
}

function actualizarTasaInternacional() {
  if (tasaInternacional.value && tasaInternacional.value > 0) {
    localStorage.setItem('tasaInternacional', tasaInternacional.value.toString())
    if (bolivares.value !== null) {
      dolaresInternacional.value = +(bolivares.value / tasaInternacional.value).toFixed(2)
    } else if (dolaresInternacional.value !== null) {
      bolivares.value = +(dolaresInternacional.value * tasaInternacional.value).toFixed(2)
      if (tasaDisponible.value && bolivares.value !== null) {
        dolaresBCV.value = +(bolivares.value / tasaDolar.value).toFixed(2)
      }
    }
  }
}

function aplicarTasa(tipo: 'bcv' | 'usd') {
  if (tipo === 'bcv' && tasaDisponible.value) {
    tasaInternacional.value = tasaDolar.value
    actualizarTasaInternacional()
  }
}
// Funciones matemáticas básicas
function agregarNumero(numero: string) {
  if (pantalla.value === '0' || pantalla.value === 'Error') {
    pantalla.value = numero
  } else {
    pantalla.value += numero
  }
  actualizarDesdePantalla()
}

function agregarDecimal() {
  if (!pantalla.value.includes('.')) {
    pantalla.value += '.'
  }
}

function limpiar() {
  pantalla.value = '0'
  operacion.value = null
  valorAnterior.value = null
  ultimoTipo.value = null
}

function limpiarEntrada() {
  pantalla.value = '0'
  actualizarDesdePantalla()
}

function borrarUltimo() {
  if (pantalla.value.length > 1) {
    pantalla.value = pantalla.value.slice(0, -1)
  } else {
    pantalla.value = '0'
  }
  actualizarDesdePantalla()
}

function establecerOperacion(op: string) {
  if (pantalla.value !== 'Error') {
    operacion.value = op
    valorAnterior.value = parseFloat(pantalla.value)
    pantalla.value = '0'
  }
}

function calcularResultado() {
  if (operacion.value && valorAnterior.value !== null) {
    const valorActual = parseFloat(pantalla.value)

    try {
      let resultado: number

      switch (operacion.value) {
        case '+':
          resultado = valorAnterior.value + valorActual
          break
        case '-':
          resultado = valorAnterior.value - valorActual
          break
        case '×':
          resultado = valorAnterior.value * valorActual
          break
        case '÷':
          if (valorActual === 0) throw new Error('División por cero')
          resultado = valorAnterior.value / valorActual
          break
        default:
          return
      }

      pantalla.value = resultado.toString()
      operacion.value = null
      valorAnterior.value = null
      actualizarDesdePantalla()

    } catch (error) {
      pantalla.value = 'Error'
      operacion.value = null
      valorAnterior.value = null
    }
  }
}

// Función para actualizar los valores desde la pantalla
function actualizarDesdePantalla() {
  const valor = parseFloat(pantalla.value)
  if (!isNaN(valor)) {
    if (ultimoTipo.value === 'bs') {
      bolivares.value = valor
      convertir('bs')
    } else if (ultimoTipo.value === 'bcv') {
      dolaresBCV.value = valor
      convertir('bcv')
    } else if (ultimoTipo.value === 'usd') {
      dolaresInternacional.value = valor
      convertir('usd')
    } else {
      // Si no hay tipo definido, usar bolívares por defecto
      bolivares.value = valor
      convertir('bs')
      ultimoTipo.value = 'bs'
    }
  }
}
// Función para aplicar el valor de pantalla a un tipo específico
function aplicarPantallaATipo(tipo: 'bs' | 'bcv' | 'usd') {
  const valor = parseFloat(pantalla.value)
  if (!isNaN(valor) && valor >= 0) {
    ultimoTipo.value = tipo

    if (tipo === 'bs') {
      bolivares.value = valor
      convertir('bs')
    } else if (tipo === 'bcv' && tasaDisponible.value) {
      dolaresBCV.value = valor
      convertir('bcv')
    } else if (tipo === 'usd' && tasaInternacional.value && tasaInternacional.value > 0) {
      dolaresInternacional.value = valor
      convertir('usd')
    }

    // Forzar actualización visual
    pantalla.value = valor.toString()
  }
}

// Agrega esta función para formatear números
function formatearNumero(valor: number | null): string {
  if (valor === null || isNaN(valor)) return '0.00'
  return valor.toFixed(2)
}

const tasaActiva = computed(() => {
  if (ultimoTipo.value === 'bcv') return tasaDolar.value
  if (ultimoTipo.value === 'usd') return tasaInternacional.value
  return tasaDolar.value // Para bs muestra tasa BCV como referencia
})

</script>

<style scoped>
* {
  box-sizing: border-box;
}

.calculator-container {
  max-width: 100%;
  margin: 0;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

h2 {
  color: white;
  text-align: center;
  font-size: 1.75rem;
  font-weight: 800;
  margin: 0 0 28px 0;
  letter-spacing: -0.5px;
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.15);
}

.main-amount {
  background: white;
  border-radius: 24px;
  padding: 24px 20px;
  margin-bottom: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s, box-shadow 0.3s;
}

.main-amount:active {
  transform: scale(0.99);
}

.main-amount label {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  color: #9ca3af;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 1.2px;
}

.main-input {
  font-size: 2.75rem !important;
  font-weight: 800;
  color: #111827;
  text-align: right;
  letter-spacing: -1px;
}

.conversions-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.conversion-card {
  background: white;
  border-radius: 20px;
  padding: 18px 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s, box-shadow 0.3s;
}

.conversion-card:active {
  transform: scale(0.98);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  gap: 8px;
}

.card-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  flex-shrink: 0;
}

.rate-badge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 5px 11px;
  border-radius: 100px;
  font-size: 0.7rem;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 3px 10px rgba(102, 126, 234, 0.25);
  white-space: nowrap;
  letter-spacing: -0.2px;
}

.rate-badge:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.35);
}

.rate-badge:active:not(:disabled) {
  transform: scale(0.95);
}

.rate-badge:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.rate-badge.editable {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  box-shadow: 0 3px 10px rgba(245, 87, 108, 0.25);
}

.rate-badge.editable:hover:not(:disabled) {
  box-shadow: 0 5px 15px rgba(245, 87, 108, 0.35);
}

.amount-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: #f9fafb;
  border-radius: 16px;
  padding: 14px 16px;
  border: 2px solid transparent;
  transition: all 0.25s;
}

.amount-input-wrapper:focus-within {
  background: #ffffff;
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.08);
}

.amount-input-wrapper.small {
  padding: 10px 14px;
  border-radius: 14px;
}

.currency-symbol {
  font-size: 1.35rem;
  font-weight: 800;
  color: #d1d5db;
  margin-right: 6px;
  flex-shrink: 0;
}

.amount-input-wrapper input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 1.65rem;
  font-weight: 700;
  color: #111827;
  text-align: right;
  outline: none;
  padding: 0;
  letter-spacing: -0.5px;
  min-width: 0;
}

.amount-input-wrapper.small input {
  font-size: 1.35rem;
}

.amount-input-wrapper input::placeholder {
  color: #e5e7eb;
  font-weight: 600;
}

.amount-input-wrapper input:disabled {
  color: #d1d5db;
  cursor: not-allowed;
}

.config-section {
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 20px;
  padding: 18px 16px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.config-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 1.2px;
}

.config-section .amount-input-wrapper {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.2);
}

.config-section .amount-input-wrapper:focus-within {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.4);
  box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.1);
}

.config-section .currency-symbol {
  color: rgba(255, 255, 255, 0.7);
}

.config-section input {
  color: white !important;
}

.config-section input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.error-message {
  background: rgba(255, 255, 255, 0.98);
  color: #dc2626;
  padding: 14px 16px;
  border-radius: 16px;
  margin-top: 16px;
  text-align: center;
  font-weight: 700;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 20px rgba(220, 38, 38, 0.12);
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.error-message svg {
  flex-shrink: 0;
}

input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
}

@media (min-width: 640px) {
  .calculator-container {
    max-width: 520px;
    padding: 32px 28px;
    border-radius: 28px;
    margin: 40px auto;
    min-height: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  }

  h2 {
    font-size: 2.25rem;
    margin-bottom: 36px;
  }

  .main-amount {
    padding: 28px 24px;
    border-radius: 26px;
    margin-bottom: 20px;
  }

  .main-amount label {
    font-size: 0.8rem;
    margin-bottom: 10px;
  }

  .main-input {
    font-size: 3.5rem !important;
  }

  .conversions-grid {
    flex-direction: row;
    gap: 16px;
    margin-bottom: 20px;
  }

  .conversion-card {
    flex: 1;
    padding: 20px 18px;
    border-radius: 22px;
  }

  .card-title {
    font-size: 0.8rem;
  }

  .rate-badge {
    padding: 6px 13px;
    font-size: 0.75rem;
  }

  .amount-input-wrapper {
    padding: 16px 18px;
  }

  .amount-input-wrapper.small {
    padding: 12px 16px;
  }

  .amount-input-wrapper input {
    font-size: 1.85rem;
  }

  .amount-input-wrapper.small input {
    font-size: 1.5rem;
  }

  .config-section {
    padding: 20px 18px;
    border-radius: 22px;
  }

  .config-label {
    font-size: 0.8rem;
  }
}

@media (min-width: 768px) {
  .calculator-container {
    max-width: 580px;
    padding: 40px 32px;
  }

  h2 {
    font-size: 2.5rem;
    margin-bottom: 40px;
  }

  .main-input {
    font-size: 4rem !important;
  }

  .conversions-grid {
    gap: 20px;
  }
}

.calculator-section {
  background: white;
  border-radius: 20px;
  padding: 20px;
  margin-top: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.calculator-header {
  margin-bottom: 16px;
}

.tipo-moneda {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tipo {
  font-size: 0.75rem;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  flex-shrink: 0;
}

.rate-display {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  background: #f3f4f6;
  padding: 4px 10px;
  border-radius: 6px;
}

.conversion-displays {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 8px;
}

.conversion-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 8px;
  border-left: 3px solid #3b82f6;
}

.conversion-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
}

.conversion-value {
  font-size: 0.875rem;
  font-weight: 700;
  color: #1f2937;
}

.display {
  background: #1f2937;
  color: white;
  padding: 20px;
  border-radius: 12px;
  text-align: right;
  margin-bottom: 16px;
  min-height: 80px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  /* border: 2px solid #374151; */
}

.display-value {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 4px;
}

.display-operation {
  font-size: 0.875rem;
  color: #9ca3af;
  font-weight: 500;
  /* font-family: 'Courier New', monospace; */
}

.calculator-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.calc-btn {
  padding: 16px 8px;
  border: none;
  border-radius: 12px;
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 56px;
  /* font-family: inherit; */
}

.calc-btn:active {
  transform: scale(0.95);
}

.calc-btn.number {
  background: #f3f4f6;
  color: #1f2937;
  /* border: 2px solid #e5e7eb; */
}

.calc-btn.number:active {
  background: #e5e7eb;
}

.calc-btn.operator {
  background: #3b82f6;
  color: white;
  border: 2px solid #2563eb;
}

.calc-btn.operator:active {
  background: #2563eb;
}

.calc-btn.function {
  background: #6b7280;
  color: white;
  border: 2px solid #4b5563;
}

.calc-btn.function:active {
  background: #4b5563;
}

.calc-btn.equals {
  background: #10b981;
  color: white;
  border: 2px solid #059669;
}

.calc-btn.equals:active {
  background: #059669;
}

.calc-btn.zero {
  grid-column: span 2;
}

.apply-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.apply-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border: 2px solid #e5e7eb;
  background: white;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
  color: #1f2937;
}

.apply-btn:not(:disabled):active {
  transform: scale(0.95);
}

.apply-btn.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.apply-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.apply-icon {
  font-size: 1rem;
  font-weight: 700;
}

@media (min-width: 640px) {
  .calculator-section {
    padding: 24px;
    border-radius: 24px;
  }

  .display {
    padding: 24px;
    border-radius: 16px;
    min-height: 100px;
  }

  .display-value {
    font-size: 2.5rem;
  }

  .calc-btn {
    padding: 20px 12px;
    font-size: 1.25rem;
    min-height: 64px;
  }

  .apply-btn {
    padding: 14px 8px;
    font-size: 0.875rem;
    flex-direction: row;
    justify-content: center;
    gap: 6px;
  }

  .apply-icon {
    font-size: 1.125rem;
  }

  .conversion-displays {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .conversion-item {
    flex: 1;
    min-width: 120px;
  }
}
</style>
