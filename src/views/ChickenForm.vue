<template>
    <div class="recipe-form-container chicken-batch-form">
        <header class="page-header">
            <div class="header-left">
                <button @click="$router.push('/recipes')" class="btn-back">
                    <Icon name="arrow-left" />
                </button>
                <h1>{{ isEditing ? 'Editar Lote de Pollos' : 'Nuevo Lote de Pollos' }}</h1>
            </div>
            <div class="header-actions">
                <button @click="saveRecipe" class="btn btn-primary" :disabled="isSaving">
                    <Icon name="content-save" />
                    {{ isSaving ? 'Guardando...' : 'Guardar Lote' }}
                </button>
            </div>
        </header>

        <div class="form-content">
            <!-- DETALLES BÁSICOS DEL LOTE -->
            <section class="card basic-info">
                <div class="form-grid">
                    <div class="form-group">
                        <label>Nombre de la Producción / Lote</label>
                        <input v-model="recipe.name" type="text" class="form-input"
                            placeholder="Ej: Lote #001 - Enero" />
                    </div>
                </div>

                <div class="chicken-batch-fields mt-4">
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Cantidad de Pollos</label>
                            <input v-model.number="recipe.chicken_data!.initial_quantity" type="number"
                                class="form-input" min="1" />
                        </div>
                        <div class="form-group">
                            <label>Precio por Kg en Pie ($)</label>
                            <input v-model.number="recipe.chicken_data!.live_weight_price_kg" type="number"
                                class="form-input" step="0.01" />
                        </div>
                        <div class="form-group">
                            <label>Peso Promedio Actual (g)</label>
                            <input v-model.number="recipe.chicken_data!.current_avg_weight_g" type="number"
                                class="form-input" />
                        </div>
                        <div class="form-group">
                            <label>Peso Objetivo (g)</label>
                            <input v-model.number="recipe.chicken_data!.target_weight_g" type="number"
                                class="form-input" />
                        </div>
                    </div>

                    <div class="form-grid mt-4">
                        <div class="form-group">
                            <label>Estimado Alimento Inicio (g/pollo)</label>
                            <input v-model.number="recipe.chicken_data!.starter_feed_per_chicken_g" type="number"
                                class="form-input" />
                        </div>
                        <div class="form-group">
                            <label>Estimado Alimento Engorde (g/pollo)</label>
                            <input v-model.number="recipe.chicken_data!.fattening_feed_per_chicken_g" type="number"
                                class="form-input" />
                        </div>
                        <div class="form-group full-width">
                            <label>Alimento que consumen actualmente</label>
                            <div class="select-feed-wrapper">
                                <button @click="openFeedModal" class="btn btn-outline btn-block">
                                    <Icon name="grain" />
                                    {{ recipe.chicken_data?.current_feed_id ?
                                        getProductById(recipe.chicken_data.current_feed_id)?.name :
                                        'Seleccionar Alimento' }}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- PRODUCTOS / INGREDIENTES (ALIMENTO, MEDICINAS, ETC) -->
            <section class="card ingredients-section">
                <div class="section-header">
                    <h2>
                        <Icon name="basket" /> Insumos del Lote
                    </h2>
                    <div class="section-actions-group">
                        <button @click="openProductModal" class="btn btn-sm btn-outline">
                            <Icon name="plus" /> Agregar Insumo
                        </button>
                    </div>
                </div>

                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Costo (Pkg)</th>
                                <th>Establecimiento</th>
                                <th>Peso (Pkg)</th>
                                <th>Utilizado</th>
                                <th>Costo/Uso</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(ing, index) in recipe.ingredients" :key="index">
                                <td>
                                    {{ getProductById(ing.product_id)?.name || 'Cargando...' }}
                                    <span v-if="getProductById(ing.product_id)?.brand_id" class="text-xs text-muted">
                                        ({{ getBrandName(getProductById(ing.product_id)?.brand_id) }})
                                    </span>
                                </td>
                                <td>${{ getIngredientPackagePrice(ing).toFixed(2) }}</td>
                                <td>
                                    <select v-model="ing.establishment_id" class="input-xs">
                                        <option :value="undefined">Promedio</option>
                                        <option v-for="price in getProductById(ing.product_id)?.prices"
                                            :key="price.establishment_id" :value="price.establishment_id">
                                            {{ getEstablishmentName(price.establishment_id) }} - ${{
                                                price.price.toFixed(2) }}
                                        </option>
                                    </select>
                                </td>
                                <td>{{ getProductById(ing.product_id)?.measurement_value || 0 }}g</td>
                                <td>
                                    <input v-model.number="ing.usage_weight" type="number" class="input-sm" min="0" />
                                </td>
                                <td>${{ calculateIngredientCost(ing).toFixed(2) }}</td>
                                <td>
                                    <button @click="removeIngredient(index)" class="btn-icon text-danger">
                                        <Icon name="delete" />
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr class="table-summary">
                                <td colspan="5" class="text-right"><strong>Inversión Acumulada:</strong></td>
                                <td>
                                    <strong>${{ totalIngredientsCost.toFixed(2) }}</strong>
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </section>

            <!-- RESUMEN Y PROYECCIONES -->
            <section v-if="chickenCalculations" class="card summary-section">
                <div class="section-header">
                    <h2>
                        <Icon name="chart-line" /> Resumen y Proyecciones
                    </h2>
                </div>

                <div class="chicken-summary-grid">
                    <div class="summary-card investment">
                        <Icon name="cash-multiple" />
                        <div class="summary-details">
                            <label>Inversión en Alimento</label>
                            <div class="value">${{ chickenCalculations.feedInvestment.toFixed(2) }}</div>
                            <div class="sub-value">Bs {{ (chickenCalculations.feedInvestment * dolarRate).toFixed(2) }}
                            </div>
                        </div>
                    </div>
                    <div class="summary-card cost">
                        <Icon name="bird" />
                        <div class="summary-details">
                            <label>Costo por Pollo</label>
                            <div class="value">${{ chickenCalculations.costPerChicken.toFixed(2) }}</div>
                            <div class="sub-value">Bs {{ (chickenCalculations.costPerChicken * dolarRate).toFixed(2) }}
                            </div>
                        </div>
                    </div>
                    <div class="summary-card feeds">
                        <Icon name="grain" />
                        <div class="summary-details">
                            <label>Alimento Restante (Est.)</label>
                            <div class="value-group">
                                <span>Inicio: {{ chickenCalculations.totalStarterNeeded.toFixed(1) }}kg</span>
                                <span>Engorde: {{ chickenCalculations.totalFatteningNeeded.toFixed(1) }}kg</span>
                            </div>
                        </div>
                    </div>
                    <div class="summary-card projection success">
                        <Icon name="trending-up" />
                        <div class="summary-details">
                            <label>Ganancia Proyectada</label>
                            <div class="value">${{ chickenCalculations.projectedProfit.toFixed(2) }}</div>
                            <div class="sub-value">Venta Est: ${{ chickenCalculations.projectedIncome.toFixed(2) }}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>

        <!-- PRODUCT SELECTOR MODAL -->
        <div v-if="showProductModal" class="modal-overlay">
            <div class="modal-content">
                <h3>Seleccionar Insumo</h3>
                <input v-model="productSearch" placeholder="Buscar producto..." class="form-input mb-4" />
                <div class="product-list">
                    <div v-for="prod in filteredProducts" :key="prod.id" class="product-item"
                        @click="selectProduct(prod)">
                        <div class="product-info-mini">
                            <span class="product-name-mini">{{ prod.name }}</span>
                            <span v-if="prod.brand_id" class="product-brand-mini">{{ getBrandName(prod.brand_id)
                            }}</span>
                        </div>
                        <span>${{ prod.price }} ({{ prod.measurement_value }}g)</span>
                    </div>
                </div>
                <button @click="showProductModal = false" class="btn btn-secondary mt-4">Cancelar</button>
            </div>
        </div>

        <!-- FEED SELECTOR MODAL -->
        <div v-if="showFeedModal" class="modal-overlay">
            <div class="modal-content">
                <h3>Seleccionar Alimento</h3>
                <input v-model="productSearch" placeholder="Buscar alimento..." class="form-input mb-4" />
                <div class="product-list">
                    <div v-for="prod in filteredFeeds" :key="prod.id" class="product-item" @click="selectFeed(prod)">
                        <div class="product-info-mini">
                            <span class="product-name-mini">{{ prod.name }}</span>
                        </div>
                        <span>${{ prod.price }}</span>
                    </div>
                </div>
                <button @click="showFeedModal = false" class="btn btn-secondary mt-4">Cancelar</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase.config'
import Icon from '@/components/ui/Icon.vue'
import type { Recipe, RecipeIngredient } from '../types/recipe'
import type { Product, DolarBCV } from '../types/producto'
import { useBrands } from '../composables/useBrands'
import { useEstablishments } from '../composables/useEstablishments'
import { useProduction } from '../composables/useProduction'

const route = useRoute()
const router = useRouter()
const { getBrandName } = useBrands()
const { loadEstablishments, getEstablishmentName } = useEstablishments()
const { dolarBCV } = inject<{ dolarBCV: Ref<DolarBCV | null> }>('dolarBCV')!
const dolarRate = computed(() => dolarBCV.value?.promedio || 0)

const availableProducts = ref<Product[]>([])
const {
    calculateIngredientCost,
    calculateChickenCalculations
} = useProduction(availableProducts, dolarRate)

const isEditing = ref(false)
const isSaving = ref(false)
const showProductModal = ref(false)
const showFeedModal = ref(false)
const productSearch = ref('')

const recipe = ref<Recipe>({
    name: '',
    ingredients: [],
    total_weight: 0,
    weight_loss: 0,
    total_cost_ingredients: 0,
    has_production_units: false,
    profit_margin_percent: 30, // Global profit margin (required by type)
    is_chicken_batch: true,
    chicken_data: {
        initial_quantity: 40,
        live_weight_price_kg: 2,
        current_avg_weight_g: 0,
        target_weight_g: 2800,
        starter_feed_per_chicken_g: 550,
        fattening_feed_per_chicken_g: 2000,
    },
    created_at: new Date().toISOString().split('T')[0],
})

onMounted(async () => {
    loadEstablishments()
    const prodSnap = await getDocs(collection(db, 'productos'))
    availableProducts.value = prodSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product))

    if (route.params.id) {
        isEditing.value = true
        const docRef = doc(db, 'recipes', route.params.id as string)
        const snap = await getDoc(docRef)
        if (snap.exists()) {
            recipe.value = { ...snap.data(), id: snap.id } as Recipe
        }
    }
})

function getProductById(id: string): Product | undefined {
    return availableProducts.value.find(p => p.id === id)
}

const totalIngredientsCost = computed(() => {
    return recipe.value.ingredients.reduce((sum, ing) => sum + calculateIngredientCost(ing), 0)
})

const chickenCalculations = computed(() => {
    return calculateChickenCalculations(recipe.value)
})

const filteredProducts = computed(() => {
    if (!productSearch.value) return availableProducts.value
    const q = productSearch.value.toLowerCase()
    return availableProducts.value.filter(p => p.name.toLowerCase().includes(q))
})

const filteredFeeds = computed(() => {
    const feeds = availableProducts.value.filter(p => p.type === 'alimento')
    if (!productSearch.value) return feeds
    const q = productSearch.value.toLowerCase()
    return feeds.filter(p => p.name.toLowerCase().includes(q))
})

function openProductModal() { showProductModal.value = true }
function openFeedModal() { showFeedModal.value = true }

function selectProduct(prod: Product) {
    recipe.value.ingredients.push({
        product_id: prod.id!,
        usage_weight: 0
    })
    showProductModal.value = false
}

function selectFeed(prod: Product) {
    if (!recipe.value.chicken_data) return
    recipe.value.chicken_data.current_feed_id = prod.id
    showFeedModal.value = false
}

function removeIngredient(index: number) {
    recipe.value.ingredients.splice(index, 1)
}

function getIngredientPackagePrice(ing: RecipeIngredient): number {
    const prod = getProductById(ing.product_id)
    return prod?.price || 0
}

async function saveRecipe() {
    isSaving.value = true
    try {
        const data = { ...recipe.value, total_cost_ingredients: totalIngredientsCost.value, updated_at: new Date().toISOString() }
        if (isEditing.value) {
            await updateDoc(doc(db, 'recipes', recipe.value.id!), data)
        } else {
            await setDoc(doc(collection(db, 'recipes')), data)
        }
        router.push('/recipes')
    } catch (e) {
        console.error(e)
    } finally {
        isSaving.value = false
    }
}
</script>

<style scoped>
.recipe-form-container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 20px;
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 16px;
}

.card {
    background: var(--surface);
    padding: 24px;
    border-radius: 12px;
    border: 1px solid var(--border);
    margin-bottom: 24px;
}

.form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
}

.form-group label {
    display: block;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 8px;
}

.form-input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--background);
    color: var(--text-primary);
}

.chicken-batch-fields {
    background: rgba(255, 152, 0, 0.05);
    border: 1px dashed #ff9800;
    padding: 20px;
    border-radius: 12px;
}

.full-width {
    grid-column: 1 / -1;
}

.chicken-summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
}

.summary-card {
    background: var(--surface);
    border: 1px solid var(--border);
    padding: 16px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 16px;
}

.summary-card.success {
    border-color: #10b981;
    background: rgba(16, 185, 129, 0.05);
}

.summary-details label {
    font-size: 0.75rem;
    color: var(--text-secondary);
    display: block;
    text-transform: uppercase;
    font-weight: 700;
}

.summary-details .value {
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--text-primary);
}

.summary-details .sub-value {
    font-size: 0.8rem;
    color: var(--text-secondary);
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    background: var(--surface);
    padding: 24px;
    border-radius: 12px;
    width: 100%;
    max-width: 500px;
    max-height: 80vh;
    overflow-y: auto;
}

.product-item {
    padding: 12px;
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.product-item:hover {
    background: var(--background);
}
</style>
