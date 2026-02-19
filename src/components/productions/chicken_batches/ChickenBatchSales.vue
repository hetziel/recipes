<script setup lang="ts">
import { computed } from 'vue'
import Icon from '@/components/ui/Icon.vue'
import type { ChickenData, ChickenSale } from '@/types/recipe'

interface Props {
  modelValue: ChickenData
  readonly?: boolean
  totalIngredientsCost: number
  dolarRate: number
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false
})

const emit = defineEmits(['update:modelValue'])

const chickenData = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

function addSale() {
  if (props.readonly) return
  if (!chickenData.value.sales) chickenData.value.sales = []

  chickenData.value.sales.push({
    id: 'sale-' + Date.now(),
    date: new Date().toISOString().split('T')[0],
    quantity: 1,
    weight_per_unit_kg: 0,
    total_weight_kg: 0,
    price_per_kg: chickenData.value.live_weight_price_kg || 0
  })
}

function removeSale(index: number) {
  if (props.readonly) return
  chickenData.value.sales?.splice(index, 1)
}

function updateSaleWeight(sale: ChickenSale) {
  if (sale.quantity && sale.weight_per_unit_kg) {
    sale.total_weight_kg = Number((sale.quantity * sale.weight_per_unit_kg).toFixed(2))
  }
}

function updateSaleUnitWeight(sale: ChickenSale) {
  if (sale.quantity && sale.total_weight_kg) {
    sale.weight_per_unit_kg = Number((sale.total_weight_kg / sale.quantity).toFixed(2))
  }
}

const salesCalculations = computed(() => {
  const sales = chickenData.value.sales || []
  const totalSoldIncome = sales.reduce((sum, s) => sum + (s.total_weight_kg * (s.price_per_kg || 0)), 0)
  const totalSoldQuantity = sales.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0)
  const totalSoldWeight = sales.reduce((sum, s) => sum + (Number(s.total_weight_kg) || 0), 0)

  const remainingQuantity = Math.max(0, (chickenData.value.initial_quantity || 0) - totalSoldQuantity)
  const avgWeightSold = totalSoldQuantity > 0 ? totalSoldWeight / totalSoldQuantity : 0
  const avgPriceSold = totalSoldWeight > 0 ? totalSoldIncome / totalSoldWeight : 0
  const realProfit = totalSoldIncome - props.totalIngredientsCost

  return {
    totalSoldIncome,
    totalSoldQuantity,
    totalSoldWeight,
    remainingQuantity,
    avgWeightSold,
    avgPriceSold,
    realProfit
  }
})

function calculateProfitPercent(profit: number, cost: number): string {
  if (!cost || cost === 0) return '0.0'
  return ((profit / cost) * 100).toFixed(1)
}
</script>

<template>
  <div class="chicken-sales-component">
    <div class="section-header">
      <h3>
        <Icon name="cash-check" /> Ventas Realizadas
      </h3>
      <div v-if="!readonly" class="section-actions-group">
        <button @click="addSale" class="btn btn-sm btn-outline">
          <Icon name="plus" /> Registrar Venta
        </button>
      </div>
    </div>

    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Cantidad (und)</th>
            <th>Peso/Und (kg)</th>
            <th>Peso Total (kg)</th>
            <th>Precio/Kg ($)</th>
            <th>Monto Total</th>
            <th v-if="!readonly">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(sale, index) in chickenData.sales" :key="sale.id">
            <td>
              <input v-if="!readonly" v-model="sale.date" type="date" class="input-xs" />
              <span v-else>{{ sale.date }}</span>
            </td>
            <td>
              <input v-if="!readonly" v-model.number="sale.quantity" type="number" class="form-input input-sm" min="1"
                @input="updateSaleWeight(sale)" />
              <span v-else>{{ sale.quantity }}</span>
            </td>
            <td>
              <input v-if="!readonly" v-model.number="sale.weight_per_unit_kg" type="number" class="form-input input-sm" step="0.1"
                min="0" placeholder="0.0" @input="updateSaleWeight(sale)" />
              <span v-else>{{ sale.weight_per_unit_kg }}</span>
            </td>
            <td>
              <input v-if="!readonly" v-model.number="sale.total_weight_kg" type="number" class="form-input input-sm" step="0.1"
                min="0" @input="updateSaleUnitWeight(sale)" />
              <span v-else>{{ sale.total_weight_kg }}</span>
            </td>
            <td>
              <input v-if="!readonly" v-model.number="sale.price_per_kg" type="number" class="form-input input-sm" step="0.01"
                min="0" />
              <span v-else>${{ sale.price_per_kg?.toFixed(2) }}</span>
            </td>
            <td class="font-bold">
              ${{ (sale.total_weight_kg * (sale.price_per_kg || 0)).toFixed(2) }}
            </td>
            <td v-if="!readonly">
              <button @click="removeSale(index)" class="btn-icon text-danger">
                <Icon name="delete" />
              </button>
            </td>
          </tr>
          <tr v-if="!chickenData.sales || chickenData.sales.length === 0">
            <td :colspan="readonly ? 6 : 7" class="text-center text-muted py-8">
              No hay ventas registradas todavía.
            </td>
          </tr>
        </tbody>
        <tfoot v-if="chickenData.sales && chickenData.sales.length > 0">
          <tr class="table-summary">
            <td :colspan="readonly ? 5 : 5" class="text-right"><strong>Total Vendido:</strong></td>
            <td class="font-bold text-lg text-success">
              ${{ salesCalculations.totalSoldIncome.toFixed(2) }}
            </td>
            <td v-if="!readonly"></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div v-if="salesCalculations.totalSoldQuantity > 0"
      class="sales-performance-grid mt-8">
      <div class="performance-card">
        <label>Promedio Peso Vendido</label>
        <div class="perf-value">{{ salesCalculations.avgWeightSold.toFixed(2) }} kg</div>
      </div>
      <div class="performance-card">
        <label>Precio Promedio de Venta</label>
        <div class="perf-value">${{ salesCalculations.avgPriceSold.toFixed(2) }}/kg</div>
      </div>
      <div class="performance-card">
        <label>Pollos por Vender</label>
        <div class="perf-value" :class="{ 'text-success': salesCalculations.remainingQuantity === 0 }">
          {{ salesCalculations.remainingQuantity }} und
        </div>
      </div>
      <div class="performance-card highlight-profit">
        <label>Resultado Real (Ganancia Neta)</label>
        <div class="perf-value" :class="salesCalculations.realProfit >= 0 ? 'text-success' : 'text-danger'">
          ${{ salesCalculations.realProfit.toFixed(2) }}
          <small class="text-xs ml-1" style="font-weight: normal;">
            ({{ calculateProfitPercent(salesCalculations.realProfit, totalIngredientsCost) }}%)
          </small>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chicken-sales-component {
  width: 100%;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 12px;
}

.section-header h3 {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 1.1rem;
  margin: 0;
  color: var(--text-primary);
}

.table-responsive {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.data-table th {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.form-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--background);
  color: var(--text-primary);
  font-size: 0.85rem;
}

.input-sm {
  width: 80px;
}

.input-xs {
  font-size: 0.8rem;
  padding: 4px 6px;
  border-radius: 4px;
  border: 1px solid var(--border);
  max-width: 120px;
  background: var(--background);
}

.font-bold {
  font-weight: 700;
}

.text-danger {
  color: #ef4444;
}

.text-success {
  color: #10b981;
}

.text-muted {
  color: var(--text-secondary);
}

.text-xs {
  font-size: 0.7rem;
}

.text-lg {
  font-size: 1.15rem;
}

.text-right {
  text-align: right;
}

.py-8 {
  padding-top: 32px;
  padding-bottom: 32px;
}

.ml-1 {
  margin-left: 4px;
}

.mt-8 {
  margin-top: 32px;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.btn-icon:hover {
  background: rgba(0, 0, 0, 0.05);
}

.sales-performance-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  background: var(--background);
  padding: 20px;
  border-radius: 12px;
  border: 1px dashed var(--border);
}

.performance-card label {
  display: block;
  font-size: 0.65rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  font-weight: 700;
  margin-bottom: 4px;
}

.performance-card .perf-value {
  font-size: 1.15rem;
  font-weight: 700;
}

.performance-card.highlight-profit {
  border-left: 3px solid #10b981;
  padding-left: 12px;
}

.table-summary td {
  padding-top: 20px;
  border-bottom: none;
}
</style>
