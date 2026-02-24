<template>
  <div class="store-container">
    <header class="page-header-premium">
      <div class="header-content">
        <h1>
          <Icon name="storefront-outline" /> Tienda Pública
        </h1>
        <p class="subtitle">Explora nuestros paquetes y productos disponibles</p>
      </div>
      <div v-if="dolarRate" class="rate-badge fade-in">
        <Icon name="cash-multiple" /> Tasa: Bs {{ dolarRate.toFixed(2) }}
      </div>
    </header>

    <div v-if="loading" class="text-center py-12 fade-in">
      <Icon name="loading" class="spin icon-large text-primary" />
      <p class="mt-4 text-muted">Cargando productos...</p>
    </div>

    <div v-if="!loading && scenarios.length === 0" class="empty-state-premium fade-in">
      <Icon name="package-variant-closed" class="empty-icon" />
      <p>No hay paquetes publicados aún.</p>
    </div>

    <div class="products-grid fade-in" v-if="!loading && scenarios.length > 0">
      <div class="glass-card product-card" v-for="sc in scenarios" :key="sc.id">
        <div class="card-header">
          <div class="title-with-icon">
            <Icon name="package-variant" class="product-icon" />
            <h3 class="card-title">{{ sc.name }}</h3>
          </div>
          <div class="recipe-name">{{ recipesMap[sc.recipe_id]?.name || 'Producto' }}</div>
        </div>
        
        <div class="card-body">
          <div class="price-section">
            <label>Precio Unitario</label>
            <div class="price-stack">
              <span class="price-usd">${{ priceForScenario(sc).toFixed(2) }}</span>
              <span class="price-bs">Bs {{ (priceForScenario(sc) * dolarRate).toFixed(2) }}</span>
            </div>
          </div>

          <div class="qty-section">
            <label>Cantidad</label>
            <div class="qty-controls">
              <button @click="decrement(sc.id)" class="btn-qty" title="Reducir">
                <Icon name="minus" />
              </button>
              <input type="number" v-model.number="quantities[sc.id || '']" min="1" class="qty-input" />
              <button @click="increment(sc.id)" class="btn-qty" title="Aumentar">
                <Icon name="plus" />
              </button>
            </div>
          </div>
          
          <div v-if="(quantities[sc.id || ''] || 1) > 1" class="total-section fade-in">
            <label>Precio Total</label>
            <div class="price-stack">
              <span class="total-usd">${{ (priceForScenario(sc) * (quantities[sc.id || ''] || 1)).toFixed(2) }}</span>
              <span class="price-bs">Bs {{ (priceForScenario(sc) * (quantities[sc.id || ''] || 1) * dolarRate).toFixed(2) }}</span>
            </div>
          </div>

        </div>
        
        <div class="card-footer">
          <button class="btn btn-primary btn-block buy-btn" @click="openBuy(sc)">
            <Icon name="cart-arrow-down" /> Comprar Ahora
          </button>
        </div>
      </div>
    </div>

    <StorePurchaseWizard v-if="showWizard" :scenario="activeScenario" :recipe="activeRecipe" :quantity="activeQuantity" :dolarRate="dolarRate" @close="closeWizard" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, inject, type Ref, computed } from 'vue'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase.config'
import StorePurchaseWizard from '@/components/StorePurchaseWizard.vue'
import Icon from '@/components/ui/Icon.vue'
import type { RecipeScenario, Recipe } from '../types/recipe'
import type { DolarBCV } from '../types/producto'
import { useProduction } from '../composables/useProduction'

const { dolarBCV } = inject<{ dolarBCV: Ref<DolarBCV | null> }>('dolarBCV')!
const dolarRate = computed(() => dolarBCV.value?.promedio || 0)

const loading = ref(true)
const scenarios = ref<RecipeScenario[]>([])
const recipesMap: Record<string, Recipe> = reactive({})
const quantities: Record<string, number> = reactive({})
const showWizard = ref(false)
const activeScenario = ref<RecipeScenario | null>(null)
const activeRecipe = ref<Recipe | null>(null)
const activeQuantity = ref(1)

const availableProducts = ref([])

onMounted(async () => {
  loading.value = true
  try {
    const scQ = query(collection(db, 'scenarios'), where('published', '==', true))
    const scSnap = await getDocs(scQ)
    scenarios.value = scSnap.docs.map(d => ({ id: d.id, ...d.data() } as RecipeScenario))

    const recSnap = await getDocs(collection(db, 'recipes'))
    recSnap.docs.forEach(d => { recipesMap[d.id] = { id: d.id, ...(d.data() as any) } })

    const [prodSnap, myProdSnap] = await Promise.all([
      getDocs(collection(db, 'productos')),
      getDocs(collection(db, 'my_products'))
    ])
    availableProducts.value = [...prodSnap.docs.map(d => ({ id: d.id, ...d.data() })), ...myProdSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any] as any

    // init quantities
    scenarios.value.forEach(sc => {
      quantities[sc.id || ''] = 1
    })
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

function priceForScenario(sc: RecipeScenario) {
  const recipe = recipesMap[sc.recipe_id]
  if (!recipe) return sc.fixed_sale_price || 0
  const { calculateScenarioSalePrice } = useProduction(availableProducts as any, dolarRate)
  try {
    return calculateScenarioSalePrice(recipe as any, sc)
  } catch (e) {
    return sc.fixed_sale_price || 0
  }
}

function increment(id?: string) {
  if (!id) return
  quantities[id] = (quantities[id] || 1) + 1
}

function decrement(id?: string) {
  if (!id) return
  quantities[id] = Math.max(1, (quantities[id] || 1) - 1)
}

function openBuy(sc: RecipeScenario) {
  activeScenario.value = sc
  activeRecipe.value = recipesMap[sc.recipe_id]
  activeQuantity.value = quantities[sc.id || ''] || 1
  showWizard.value = true
}

function closeWizard() {
  showWizard.value = false
  activeScenario.value = null
  activeRecipe.value = null
}
</script>

<style scoped>
.store-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
}

.page-header-premium {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  background: var(--surface);
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--border);
}

.header-content h1 {
  margin: 0;
  font-size: 2rem;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-content h1 :deep(svg) {
  color: var(--primary);
}

.subtitle {
  margin: 8px 0 0 0;
  color: var(--text-secondary);
  font-size: 1rem;
}

.rate-badge {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.glass-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 16px;
  padding: 0;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

@media (prefers-color-scheme: dark) {
  :root[data-theme="dark"] .glass-card {
    background: rgba(30, 30, 35, 0.7);
    border-color: rgba(255, 255, 255, 0.1);
  }
}

.glass-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 25px rgba(0, 0, 0, 0.1);
}

.card-header {
  padding: 20px 20px 16px;
  border-bottom: 1px dashed var(--border);
  background: rgba(79, 70, 229, 0.03);
}

.title-with-icon {
  display: flex;
  align-items: center;
  gap: 8px;
}

.product-icon {
  color: var(--primary);
  font-size: 1.2rem;
}

.card-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
}

.recipe-name {
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin-top: 4px;
  padding-left: 28px;
}

.card-body {
  padding: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

label {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}

.price-section, .total-section {
  display: flex;
  flex-direction: column;
}

.price-stack {
  display: flex;
  flex-direction: column;
}

.price-usd, .total-usd {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.2;
}

.total-usd {
  color: var(--primary);
}

.price-bs {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.qty-section {
  margin-top: auto;
}

.qty-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--background);
  border-radius: 12px;
  padding: 4px;
  border: 1px solid var(--border);
}

.btn-qty {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-primary);
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-qty:hover {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.qty-input {
  width: 60px;
  text-align: center;
  border: none;
  background: transparent;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  -moz-appearance: textfield;
}

.qty-input::-webkit-outer-spin-button,
.qty-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.qty-input:focus {
  outline: none;
}

.card-footer {
  padding: 16px 20px;
  background: var(--background);
  border-top: 1px solid var(--border);
}

.buy-btn {
  font-size: 1rem;
  font-weight: 600;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 12px;
}

.empty-state-premium {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 20px;
  background: var(--surface);
  border-radius: 16px;
  border: 1px dashed var(--border);
  text-align: center;
}

.empty-icon {
  font-size: 4rem;
  color: var(--border);
  margin-bottom: 16px;
}

.empty-state-premium p {
  color: var(--text-secondary);
  font-size: 1.1rem;
}

.fade-in {
  animation: fadeIn 0.4s ease forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

.icon-large {
  font-size: 3rem;
}

@media (max-width: 768px) {
  .page-header-premium {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 16px;
  }
  
  .products-grid {
    grid-template-columns: 1fr;
  }
}
</style>
