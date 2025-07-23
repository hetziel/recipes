<template>
  <div class="calculator-container">
    <h2>Calculadora Bs ⇄ USD</h2>
    <div class="calc-row">
      <label>Bolívares (Bs):</label>
      <input type="number" v-model.number="bolivares" @input="convertir('bs')" min="0" :disabled="!tasaDisponible"
        placeholder="Introduce Bs" />
    </div>
    <div class="calc-row">
      <label>Dólares (USD):</label>
      <input type="number" v-model.number="dolares" @input="convertir('usd')" min="0" :disabled="!tasaDisponible"
        placeholder="Introduce USD" />
    </div>
    <div v-if="!tasaDisponible" class="error-message">
      No hay tasa de cambio disponible.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject, computed } from 'vue'
import type { DolarBCV } from '../types/producto'

const { dolarBCV } = inject<{ dolarBCV: import('vue').Ref<DolarBCV | null> }>('dolarBCV', { dolarBCV: ref(null) })

const bolivares = ref<number | null>(null)
const dolares = ref<number | null>(null)

const tasaDolar = computed(() => dolarBCV.value?.promedio ?? 0)
const tasaDisponible = computed(() => typeof tasaDolar.value === 'number' && tasaDolar.value > 0)

function convertir(origen: 'bs' | 'usd') {
  if (!tasaDisponible.value) return
  if (origen === 'bs' && bolivares.value !== null) {
    dolares.value = +(bolivares.value / tasaDolar.value).toFixed(2)
  } else if (origen === 'usd' && dolares.value !== null) {
    bolivares.value = +(dolares.value * tasaDolar.value).toFixed(2)
  }
}
</script>

<style scoped>
.calculator-container {
  max-width: 400px;
  margin: 40px auto;
  padding: 24px;
  background: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 2px 8px #0001;
}

.calc-row {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.calc-row label {
  width: 120px;
  font-weight: bold;
}

.calc-row input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.error-message {
  color: #ff4444;
  padding: 10px;
  background-color: #ffeeee;
  border-radius: 4px;
  margin-top: 15px;
  text-align: center;
}
</style>
