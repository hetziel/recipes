<template>
  <div class="recipe-form-container">
    <header class="page-header">
      <div class="header-left">
        <button @click="$router.push('/production')" class="btn-back">
          <Icon name="arrow-left" />
        </button>
        <h1>{{ isEditing ? 'Editar Receta' : 'Nueva Receta' }}</h1>
      </div>
      <div class="header-actions">
        <button @click="saveRecipe" class="btn btn-primary" :disabled="isSaving">
          <Icon name="content-save" />
          {{ isSaving ? 'Guardando...' : 'Guardar Receta' }}
        </button>
        <button v-if="hasLegacyScenarios" @click="migrateScenarios" class="btn btn-warning" :disabled="isMigrating">
          <Icon name="database-sync" />
          {{ isMigrating ? 'Migrando...' : 'Migrar Paquetes' }}
        </button>
        <button v-if="canCleanUtilities" @click="cleanUtilitiesData" class="btn btn-outline" :disabled="isCleaning">
          <Icon name="broom" />
          {{ isCleaning ? 'Limpiando...' : 'Limpiar Datos Utilería' }}
        </button>
      </div>
    </header>

    <div class="form-content">
      <!-- DETALLES BÁSICOS -->
      <section class="card basic-info">
        <div class="form-group">
          <label>Nombre de la Receta</label>
          <input v-model="recipe.name" type="text" class="form-input" placeholder="Ej: Torta de Chocolate" />
        </div>

        <div class="form-group checkbox-group mt-4">
          <label class="checkbox-container">
            <input type="checkbox" v-model="recipe.save_as_product" />
            <span class="checkmark"></span>
            <Icon name="package-variant" />
            Guardar como Producto (para usar en otras producciones)
          </label>
        </div>
      </section>

      <!-- SECCIÓN 1: PRODUCTOS / INGREDIENTES -->
      <section class="card ingredients-section">
        <div class="section-header">
          <h2>
            <Icon name="basket" /> Productos
          </h2>
          <div class="section-actions-group">
            <button @click="openProductModal" class="btn btn-sm btn-outline">
              <Icon name="plus" /> Agregar Producto
            </button>
            <button @click="openMyProductModal" class="btn btn-sm btn-outline">
              <Icon name="chef-hat" /> Agregar Mis Productos
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
                <td>
                  <div class="price-display-cell">
                    <span class="text-xs text-muted" v-if="ing.price_type === 'unit_price'">Precio Fijo</span>
                    <span class="text-xs text-muted" v-else-if="!ing.establishment_id">Promedio</span>
                    ${{ getIngredientPackagePrice(ing).toFixed(2) }}
                  </div>
                </td>
                <td>
                  <select v-if="ing.price_type !== 'unit_price'" v-model="ing.establishment_id" class="input-xs">
                    <option :value="undefined">Promedio ({{ getProductById(ing.product_id)?.prices?.length || 0 }} est.)
                    </option>
                    <option v-for="price in getProductById(ing.product_id)?.prices" :key="price.establishment_id"
                      :value="price.establishment_id">
                      {{ getEstablishmentName(price.establishment_id) }} - ${{ price.currency === 'USD' ?
                        price.price.toFixed(2) : (price.price / (dolarRate || 1)).toFixed(2) }}
                    </option>
                  </select>
                  <div v-else class="text-center text-muted">-</div>
                </td>
                <td>{{ getProductById(ing.product_id)?.measurement_value || 0 }}</td>
                <td>
                  <input v-model.number="ing.usage_weight" type="number" class="input-sm" min="0" />
                </td>
                <td>${{ calculateIngredientCost(ing).toFixed(2) }}</td>
                <td class="flex gap-1 justify-center">
                  <button @click="openSwapProductModal(index)" class="btn-icon swap-btn-regular"
                    title="Cambiar por Producto">
                    <Icon name="swap-horizontal" />
                  </button>
                  <button @click="openSwapMyProductModal(index)" class="btn-icon swap-btn-recipe"
                    title="Cambiar por Mi Producto">
                    <Icon name="chef-hat" />
                  </button>
                  <button @click="removeIngredient(index)" class="btn-icon text-danger">
                    <Icon name="delete" />
                  </button>
                </td>
              </tr>
              <tr v-if="recipe.ingredients.length === 0">
                <td colspan="8" class="text-center text-muted">No hay ingredientes agregados</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="table-summary">
                <td colspan="4" class="text-right"><strong>Totales:</strong></td>
                <td>
                  <strong>{{ totalWeight }}</strong>
                </td>
                <td>
                  <strong>${{ totalIngredientsCost.toFixed(2) }}</strong>
                </td>
                <td colspan="2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <!-- SECCIÓN 3: PRODUCCIÓN Y GANANCIA -->
      <section class="card production-section">
        <div class="section-header">
          <h2>
            <Icon name="cash-multiple" /> Producción y Ganancias
          </h2>
        </div>

        <div class="production-summary-header">
          <div class="form-group checkbox-group">
            <label class="checkbox-container">
              <input type="checkbox" v-model="recipe.has_production_units" />
              ¿Esta receta produce unidades fijas? (ej. Galletas)
            </label>
          </div>
        </div>

        <div class="summary-grid">
          <div class="summary-item">
            <label>Peso Crudo (Mezcla)</label>
            <div class="value">{{ totalWeight.toFixed(2) }}g</div>
          </div>
          <div class="summary-item">
            <label>Merma (Pérdida)</label>
            <input v-model.number="recipe.weight_loss" type="number" class="input-sm large-input" min="0" />
            <span class="unit">g</span>
          </div>
          <div class="summary-item highlight">
            <label>Peso Final Cocido</label>
            <div class="value">{{ totalFinalWeight.toFixed(2) }}g</div>
          </div>
          <div v-if="recipe.has_production_units" class="summary-item success-border">
            <label>Unidades por Lote</label>
            <input v-model.number="recipe.total_production_units" type="number" class="input-sm large-input" min="1" />
            <span class="unit">und</span>
          </div>
          <div class="summary-item">
            <label>Inversión Base (Ingredientes)</label>
            <div class="value brand-color">${{ totalIngredientsCost.toFixed(2) }}</div>
            <div class="sub-value">Bs {{ (totalIngredientsCost * dolarRate).toFixed(2) }}</div>
          </div>
        </div>

        <div class="scenario-calculator">
          <div class="scenario-header-main">
            <h3>Escenarios de Venta / Paquetes</h3>
            <div class="header-actions-group">
              <button v-if="scenarios.length > 0" @click="showBatchSummaryModal = true" class="btn btn-sm btn-outline">
                <Icon name="chart-bar" /> Ver Totales de Producción
              </button>
            </div>
          </div>

          <div v-if="!recipe.id" class="alert alert-info mb-4">
            <Icon name="information" />
            Debe guardar la receta primero para poder gestionar los paquetes.
          </div>

          <div v-else class="scenarios-list">
            <div v-for="(scenario, sIndex) in scenarios" :key="sIndex" class="scenario-card card"
              :class="{ 'is-editing': editingScenarioIndex === sIndex }">

              <!-- MODO RESUMEN -->
              <div v-if="editingScenarioIndex !== sIndex" class="scenario-summary-item">
                <div class="sc-main-info">
                  <div class="sc-title">
                    <Icon name="package-variant" />
                    <strong>{{ scenario.name }}</strong>
                  </div>
                  <div class="sc-meta">
                    {{ scenario.mode === 'weight' ? scenario.value + 'g por unidad' : scenario.value + ' unidades' }}
                  </div>
                </div>

                <div class="sc-values">
                  <div class="sc-value-item">
                    <label>Inversión</label>
                    <div class="price-stack">
                      <span class="price-usd">${{ calculateScenarioUnitCost(scenario).toFixed(2) }}</span>
                      <span class="price-bs">Bs {{ (calculateScenarioUnitCost(scenario) * dolarRate).toFixed(2)
                        }}</span>
                    </div>
                  </div>
                  <div class="sc-value-item highlight-success">
                    <label>Precio Venta</label>
                    <div class="price-stack">
                      <span class="price-usd">${{ calculateScenarioSalePrice(scenario).toFixed(2) }}</span>
                      <span class="price-bs">Bs {{ (calculateScenarioSalePrice(scenario) * dolarRate).toFixed(2)
                        }}</span>
                    </div>
                  </div>
                  <div class="sc-value-item highlight-profit">
                    <label>Ganancia</label>
                    <div class="price-stack">
                      <span class="price-usd font-bold">
                        ${{ (calculateScenarioSalePrice(scenario) - calculateScenarioUnitCost(scenario)).toFixed(2) }}
                        <span class="text-xs ml-1">({{ calculateScenarioRealMargin(scenario).toFixed(1) }}%)</span>
                      </span>
                      <span class="price-bs">Bs {{ ((calculateScenarioSalePrice(scenario) -
                        calculateScenarioUnitCost(scenario)) * dolarRate).toFixed(2) }}</span>
                    </div>
                  </div>
                </div>

                <div class="sc-actions">
                  <button @click="editingScenarioIndex = sIndex" class="btn-icon" title="Editar Escenario">
                    <Icon name="pencil" />
                  </button>
                  <button @click="deleteScenario(scenario.id || '', sIndex)" class="btn-icon text-danger"
                    title="Eliminar">
                    <Icon name="delete" />
                  </button>
                </div>
              </div>

              <!-- MODO EDICIÓN (FORMULARIO) -->
              <div v-else class="scenario-form-container">
                <div class="scenario-header">
                  <div class="form-group">
                    <label>Nombre del Paquete</label>
                    <input v-model="scenario.name" type="text" class="form-input" placeholder="Ej: Pack Familiar" />
                  </div>
                  <div class="header-right">
                    <button @click="saveScenario(scenario)" class="btn btn-sm btn-success" :disabled="isSavingScenario">
                      <Icon name="check" /> {{ isSavingScenario ? 'Guardando...' : 'Listo' }}
                    </button>
                    <button @click="deleteScenario(scenario.id!, sIndex)" class="btn-icon text-danger">
                      <Icon name="delete" />
                    </button>
                  </div>
                </div>

                <div class="scenario-config">
                  <div class="form-group">
                    <label>Modo</label>
                    <select v-model="scenario.mode" class="form-select">
                      <option value="weight">Por Peso Unitario</option>
                      <option value="unit">Por Cantidad Fija</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>{{ scenario.mode === 'weight' ? 'Peso por Unidad (g)' : (recipe.has_production_units ?
                      'Unidades por Paquete' : 'Cantidad de Unidades') }}</label>
                    <input v-model.number="scenario.value" type="number" class="form-input" min="1" />
                  </div>
                  <div class="form-group">
                    <label>% Ganancia Sugerida</label>
                    <input v-model.number="recipe.profit_margin_percent" type="number" class="form-input" />
                  </div>
                  <div class="form-group">
                    <label>Precio de Venta Fijo</label>
                    <div class="input-with-toggle">
                      <input v-model.number="scenario.fixed_sale_price" type="number" class="form-input"
                        placeholder="Ej: 5.00 (Opcional)" />
                      <div class="currency-toggle">
                        <button :class="{ active: scenario.fixed_sale_price_currency === 'USD' }"
                          @click.prevent="scenario.fixed_sale_price_currency = 'USD'">$</button>
                        <button :class="{ active: scenario.fixed_sale_price_currency === 'Bs' }"
                          @click.prevent="scenario.fixed_sale_price_currency = 'Bs'">Bs</button>
                      </div>
                    </div>
                    <div v-if="scenario.fixed_sale_price && scenario.fixed_sale_price > 0" class="real-margin-info"
                      :class="{ 'text-success': calculateScenarioRealMargin(scenario) >= 30, 'text-warning': calculateScenarioRealMargin(scenario) < 30 }">
                      <Icon name="trending-up" />
                      Margen Real: <strong>{{ calculateScenarioRealMargin(scenario).toFixed(1) }}%</strong>
                    </div>
                  </div>
                </div>

                <!-- UTILIDADES DEL ESCENARIO (PAQUETES) -->
                <div class="packaging-section">
                  <header class="sub-header">
                    <h4>
                      <Icon name="package-variant" /> Empaque / Utilidades del Paquete
                    </h4>
                    <button @click="addUtilityToScenario(sIndex)" class="btn btn-xs btn-outline">
                      <Icon name="plus" /> Agregar Insumo
                    </button>
                  </header>
                  <div class="table-responsive" v-if="scenario.utilities && scenario.utilities.length > 0">
                    <table class="mini-table">
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>Precio Pkg</th>
                          <th>Establecimiento</th>
                          <th>Cant. Pkg</th>
                          <th>Uso</th>
                          <th>Ganancia %</th>
                          <th>Costo</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(util, uIndex) in scenario.utilities" :key="uIndex">
                          <td>
                            <input v-if="!util.product_id" v-model="util.name" class="input-xs-wide" />
                            <div v-else>
                              <span>{{ getProductById(util.product_id)?.name || util.name }}</span>
                              <div class="text-xs text-muted" v-if="getProductById(util.product_id)?.brand_id">
                                ({{ getBrandName(getProductById(util.product_id)?.brand_id) }})
                              </div>
                            </div>
                          </td>
                          <td>
                            <input v-if="!util.product_id" v-model.number="util.cost" type="number" class="input-xs" />
                            <div v-else class="price-display-cell">
                              <span class="text-xs text-muted" v-if="!util.establishment_id">Promedio</span>
                              ${{ (calculateScenarioUtilityCost(util) / (util.usage_quantity || 1) *
                                (getProductById(util.product_id)?.measurement_value || 1)).toFixed(2) }}
                            </div>
                          </td>
                          <td>
                            <div v-if="util.product_id">
                              <select v-model="util.establishment_id" class="input-xs">
                                <option :value="undefined">Promedio</option>
                                <option v-for="price in getProductById(util.product_id)?.prices"
                                  :key="price.establishment_id" :value="price.establishment_id">
                                  {{ getEstablishmentName(price.establishment_id) }} - ${{ price.currency === 'USD' ?
                                    price.price.toFixed(2) : (price.price / (dolarRate || 1)).toFixed(2) }}
                                </option>
                              </select>
                            </div>
                            <div v-else class="text-center text-muted">-</div>
                          </td>
                          <td>
                            <input v-if="!util.product_id" v-model.number="util.quantity" type="number"
                              class="input-xs" />
                            <span v-else>{{ getProductById(util.product_id)?.measurement_value }}</span>
                          </td>
                          <td>
                            <input v-model.number="util.usage_quantity" type="number" class="input-xs" />
                          </td>
                          <td>
                            <input v-model.number="util.profit_margin" type="number" class="input-xs" min="0" />
                          </td>
                          <td>${{ (calculateScenarioUtilityCost(util) * (1 + (util.profit_margin || 0) /
                            100)).toFixed(2) }}</td>
                          <td>
                            <button @click="removeUtilityFromScenario(sIndex, uIndex)"
                              class="btn-icon text-danger btn-xs">
                              <Icon name="close" />
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div class="scenario-results">
                  <div class="result-badge">
                    <span class="label">Unidades:</span>
                    <span class="value">{{ calculateEstimatedUnits(scenario).toFixed(1) }}</span>
                  </div>
                  <div class="result-badge">
                    <div class="badge-content">
                      <span class="label">Inversión:</span>
                      <span class="value">${{ calculateScenarioUnitCost(scenario).toFixed(2) }} / Bs {{
                        (calculateScenarioUnitCost(scenario) * dolarRate).toFixed(2) }}</span>
                    </div>
                  </div>
                  <div class="result-badge primary">
                    <div class="badge-content">
                      <span class="label">Venta:</span>
                      <span class="value">${{ calculateScenarioSalePrice(scenario).toFixed(2) }} / Bs {{
                        (calculateScenarioSalePrice(scenario) * dolarRate).toFixed(2) }}</span>
                    </div>
                  </div>
                  <div class="result-badge success">
                    <div class="badge-content">
                      <span class="label">Ganancia:</span>
                      <span class="value">
                        ${{ (calculateScenarioSalePrice(scenario) - calculateScenarioUnitCost(scenario)).toFixed(2) }}
                        <span class="text-xs ml-1">({{ calculateScenarioRealMargin(scenario).toFixed(1) }}%)</span>
                        <div class="text-xs text-muted">
                          / Bs {{ ((calculateScenarioSalePrice(scenario) - calculateScenarioUnitCost(scenario)) *
                            dolarRate).toFixed(2) }}
                        </div>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <button @click="addScenario" class="btn btn-secondary mt-2">
              <Icon name="plus-circle" /> Crear Nuevo Paquete / Escenario
            </button>
          </div>
        </div>
      </section>
    </div>

    <!-- PRODUCT SELECTOR MODAL -->
    <div v-if="showProductModal" class="modal-overlay">
      <div class="modal-content">
        <h3>Seleccionar Producto</h3>
        <input v-model="productSearch" placeholder="Buscar producto..." class="form-input mb-4" />
        <div class="product-list">
          <div v-for="prod in filteredProducts" :key="prod.id" class="product-item" @click="selectProduct(prod)">
            <div class="product-info-mini">
              <span class="product-name-mini">{{ prod.name }}</span>
              <span v-if="prod.brand_id" class="product-brand-mini">{{ getBrandName(prod.brand_id) }}</span>
            </div>
            <span>${{ prod.price }} ({{ prod.measurement_value }}
              {{ getMeasurementLabel(prod.measurement_id) }})</span>
          </div>
        </div>
        <button @click="showProductModal = false" class="btn btn-secondary mt-4">Cancelar</button>
      </div>
    </div>

    <!-- MY PRODUCT SELECTOR MODAL -->
    <div v-if="showMyProductModal" class="modal-overlay">
      <div class="modal-content">
        <h3>Seleccionar Producto de Receta</h3>
        <input v-model="productSearch" placeholder="Buscar mi producto..." class="form-input mb-4" />
        <div class="product-list">
          <div v-for="prod in filteredMyProducts" :key="prod.id" class="product-item" @click="selectMyProduct(prod)">
            <div class="product-info-mini">
              <span class="product-name-mini">{{ prod.name }}</span>
              <span v-if="prod.brand_id" class="product-brand-mini">{{ getBrandName(prod.brand_id) }}</span>
            </div>
            <span>${{ prod.price }} ({{ prod.measurement_value }}
              {{ getMeasurementLabel(prod.measurement_id) }})</span>
          </div>
          <div v-if="filteredMyProducts.length === 0" class="text-center p-4 text-muted">
            No tienes productos de receta disponibles.
          </div>
        </div>
        <button @click="showMyProductModal = false" class="btn btn-secondary mt-4">Cancelar</button>
      </div>
    </div>

    <div v-if="showUtilityModal" class="modal-overlay">
      <div v-if="showUtilityModal" class="modal-overlay">
        <div class="modal-content">
          <h3>Seleccionar Insumo / Utilería</h3>
          <input v-model="utilitySearch" placeholder="Buscar insumo..." class="form-input mb-4" />
          <div class="product-list">
            <div v-for="prod in filteredUtilities" :key="prod.id" class="product-item" @click="selectUtility(prod)">
              <div class="product-info-mini">
                <span class="product-name-mini">{{ prod.name }}</span>
                <span v-if="prod.brand_id" class="product-brand-mini">{{ getBrandName(prod.brand_id) }}</span>
              </div>
              <span class="price-tag">${{ prod.price }} ({{ prod.measurement_value }}
                {{ getMeasurementLabel(prod.measurement_id) }})</span>
            </div>
            <div v-if="filteredUtilities.length === 0" class="text-center p-4 text-muted">
              No hay insumos marcados como utilería.
            </div>
          </div>
          <button @click="showUtilityModal = false" class="btn btn-secondary mt-4">Cancelar</button>
        </div>
      </div>

      <!-- BATCH SUMMARY MODAL -->
      <div v-if="showBatchSummaryModal" class="modal-overlay">
        <div class="modal-content large-modal">
          <header class="modal-header">
            <h3>
              <Icon name="chart-pie" /> Resumen de Producción Total (Batch)
            </h3>
            <button @click="showBatchSummaryModal = false" class="btn-icon">
              <Icon name="close" />
            </button>
          </header>

          <p class="modal-desc">
            Este resumen muestra cuánto ganarías si vendieras <strong>toda la producción</strong> del lote bajo cada
            escenario.
          </p>

          <div class="table-responsive">
            <table class="data-table summary-table">
              <thead>
                <tr>
                  <th>Escenario</th>
                  <th>Inversión Total</th>
                  <th>Venta Total</th>
                  <th>Ganancia Bruta</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(sc, idx) in scenarios" :key="idx">
                  <td>
                    <strong>{{ sc.name }}</strong>
                    <div class="text-xs text-muted">{{ calculateEstimatedUnits(sc).toFixed(1) }} unidades</div>
                  </td>
                  <td>
                    <div class="val-usd">${{ calculateBatchTotalInvestment(sc).toFixed(2) }}</div>
                    <div class="val-bs text-xs">Bs {{ (calculateBatchTotalInvestment(sc) * dolarRate).toFixed(2) }}
                    </div>
                  </td>
                  <td>
                    <div class="val-usd text-success">${{ calculateBatchTotalIncome(sc).toFixed(2) }}</div>
                    <div class="val-bs text-xs">Bs {{ (calculateBatchTotalIncome(sc) * dolarRate).toFixed(2) }}</div>
                  </td>
                  <td>
                    <div class="val-usd brand-color">${{ calculateBatchTotalProfit(sc).toFixed(2) }}</div>
                    <div class="val-bs text-xs">Bs {{ (calculateBatchTotalProfit(sc) * dolarRate).toFixed(2) }}</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="modal-footer mt-6">
            <button @click="showBatchSummaryModal = false" class="btn btn-primary btn-block">Entendido</button>
          </div>
        </div>
      </div>

      <!-- DELETE CONFIRMATION MODAL -->
      <div v-if="showDeleteConfirmModal" class="modal-overlay">
        <div class="modal-content">
          <h3>¿Eliminar Paquete?</h3>
          <p>¿Estás seguro de que deseas eliminar este paquete? Esta acción no se puede deshacer.</p>
          <div class="modal-actions mt-6">
            <button @click="showDeleteConfirmModal = false" class="btn btn-outline">Cancelar</button>
            <button @click="confirmDeleteScenario" class="btn btn-danger">Eliminar</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject, watch, type Ref } from 'vue'
import { useRoute } from 'vue-router'
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase.config'
import Icon from '@/components/ui/Icon.vue' // Assuming global Icon component
import type { Recipe, RecipeIngredient, RecipeUtility, RecipeScenario } from '../types/recipe'
import type { Product, DolarBCV } from '../types/producto'
import { useBrands } from '../composables/useBrands'
import { useEstablishments } from '../composables/useEstablishments'
import { useProduction } from '../composables/useProduction'

const route = useRoute()
const { getBrandName } = useBrands()
const { loadEstablishments, getEstablishmentName } = useEstablishments()
const availableProducts = ref<Product[]>([])
const recipeProducts = ref<Product[]>([])

const allAvailableProducts = computed(() => {
  return [...availableProducts.value, ...recipeProducts.value]
})

const { dolarBCV } = inject<{ dolarBCV: Ref<DolarBCV | null> }>('dolarBCV')!
const dolarRate = computed(() => dolarBCV.value?.promedio || 0)

const {
  calculateIngredientCost
} = useProduction(allAvailableProducts, dolarRate)

onMounted(() => {
  loadEstablishments()
})

// STATE
const isEditing = ref(false)
const isSaving = ref(false)
const showProductModal = ref(false)
const showUtilityModal = ref(false)
const showMyProductModal = ref(false)
const productSearch = ref('')
const utilitySearch = ref('')
const activeScenarioIndex = ref<number | null>(null)
const editingScenarioIndex = ref<number | null>(null)
const showBatchSummaryModal = ref(false)
const scenarios = ref<RecipeScenario[]>([])
const isSavingScenario = ref(false)
const isMigrating = ref(false)
const isCleaning = ref(false)
const hasLegacyScenarios = ref(false)
const showDeleteConfirmModal = ref(false)
const scenarioToDelete = ref<{ id: string, index: number } | null>(null)
const swappingIndex = ref<number | null>(null)

const recipe = ref<Recipe>({
  name: '',
  ingredients: [],
  total_weight: 0,
  weight_loss: 0,
  total_cost_ingredients: 0,
  has_production_units: false,
  profit_margin_percent: 30, // Default 30%
  created_at: new Date().toISOString().split('T')[0],
})

// HELPERS
function getProductById(id: string): Product | undefined {
  return availableProducts.value.find(p => p.id === id) || recipeProducts.value.find(p => p.id === id)
}

// COMPUTED
const totalWeight = computed(() => {
  return recipe.value.ingredients.reduce((sum, ing) => sum + (ing.usage_weight || 0), 0)
})

const totalFinalWeight = computed(() => {
  return Math.max(0, totalWeight.value - (recipe.value.weight_loss || 0))
})

const totalIngredientsCost = computed(() => {
  return recipe.value.ingredients.reduce((sum, ing) => sum + calculateIngredientCost(ing), 0)
})

const filteredProducts = computed(() => {
  if (!productSearch.value) return availableProducts.value.filter(p => !p.is_recipe_product)
  const q = productSearch.value.toLowerCase()
  return availableProducts.value.filter((p) => p.name.toLowerCase().includes(q) && !p.is_recipe_product)
})

// Revisado
const filteredMyProducts = computed(() => {
  if (!productSearch.value) return recipeProducts.value
  const q = productSearch.value.toLowerCase()
  return recipeProducts.value.filter((p) => p.name.toLowerCase().includes(q))
})
//

const filteredUtilities = computed(() => {
  const utilities = availableProducts.value.filter(p => p.is_utility)
  if (!utilitySearch.value) return utilities
  const q = utilitySearch.value.toLowerCase()
  return utilities.filter((p) => p.name.toLowerCase().includes(q))
})

const canCleanUtilities = computed(() => {
  return scenarios.value.some(sc =>
    sc.utilities.some(util =>
      util.product_id && (util.name !== undefined || util.cost !== undefined || util.quantity !== undefined)
    )
  )
})

// METHODS
function getIngredientPackagePrice(ing: RecipeIngredient): number {
  const prod = getProductById(ing.product_id);
  if (!prod) return 0;

  if (ing.price_type === 'unit_price' && ing.selected_price !== undefined) {
    return ing.selected_price;
  }

  // Determine the base price from the product itself
  let basePrice: number = 0; // Initialize with 0
  if (prod.average_price !== undefined) {
    basePrice = prod.average_price;
  } else if (prod.price !== undefined) {
    basePrice = prod.price;
  }


  let finalPrice = basePrice; // Start with the base product price

  // If a specific establishment is selected, try to find that price
  if (ing.establishment_id) {
    const specificPriceEntry = prod.prices?.find(p => p.establishment_id === ing.establishment_id);
    if (specificPriceEntry) {
      finalPrice = specificPriceEntry.currency === 'USD' ? specificPriceEntry.price : specificPriceEntry.price / (dolarRate.value || 1);
    }
    // If specificPriceEntry is not found, finalPrice remains basePrice. This is the desired behavior.
  }

  return finalPrice;
}

function calculateEstimatedUnits(scenario: RecipeScenario): number {
  if (scenario.mode === 'unit') {
    if (recipe.value.has_production_units && recipe.value.total_production_units) {
      // If fixed yield is set, scenario.value represents "units per pack"
      return recipe.value.total_production_units / (scenario.value || 1)
    }
    return scenario.value || 1
  } else {
    if (totalFinalWeight.value === 0) return 0
    return totalFinalWeight.value / (scenario.value || 1)
  }
}

function calculateScenarioUtilityCost(util: RecipeUtility): number {
  if (util.product_id) {
    const prod = getProductById(util.product_id)
    if (!prod || !prod.measurement_value || prod.measurement_value === 0) return 0

    let finalPrice = prod.average_price || prod.price
    if (util.establishment_id) {
      const specificPrice = prod.prices?.find(p => p.establishment_id === util.establishment_id)
      if (specificPrice) {
        finalPrice = specificPrice.currency === 'USD' ? specificPrice.price : specificPrice.price / (dolarRate.value || 1)
      }
    }

    return (finalPrice / prod.measurement_value) * (util.usage_quantity || 0)
  }
  const cost = util.cost || 0
  const qty = util.quantity || 0
  if (qty === 0) return 0
  return (cost / qty) * (util.usage_quantity || 0)
}

function calculateScenarioUtilitiesCost(scenario: RecipeScenario): number {
  return scenario.utilities.reduce(
    (sum, u) => sum + calculateScenarioUtilityCost(u),
    0,
  )
}

function calculateScenarioUnitCost(scenario: RecipeScenario): number {
  const units = calculateEstimatedUnits(scenario)
  if (units <= 0) return 0
  // (Total Ingredients / Total Units) + Utilities per Unit
  return (totalIngredientsCost.value / units) + calculateScenarioUtilitiesCost(scenario)
}

function getScenarioFixedPriceInUSD(scenario: RecipeScenario): number {
  if (!scenario.fixed_sale_price) return 0
  if (scenario.fixed_sale_price_currency === 'Bs') {
    return scenario.fixed_sale_price / (dolarRate.value || 1)
  }
  return scenario.fixed_sale_price
}

function calculateScenarioSalePrice(scenario: RecipeScenario): number {
  const fixedPrice = getScenarioFixedPriceInUSD(scenario)
  if (fixedPrice > 0) return fixedPrice

  const units = calculateEstimatedUnits(scenario)
  if (units <= 0) return 0

  const ingredientCostPerUnit = totalIngredientsCost.value / units
  const marginGen = 1 + (recipe.value.profit_margin_percent / 100)

  // Calulate utility cost WITH margin for each utility
  const utilitySaleTotalPerPack = scenario.utilities.reduce((sum, util) => {
    const cost = calculateScenarioUtilityCost(util)
    const margin = 1 + ((util.profit_margin ?? 50) / 100)
    return sum + (cost * margin)
  }, 0)

  return (ingredientCostPerUnit * marginGen) + utilitySaleTotalPerPack
}

function calculateScenarioRealMargin(scenario: RecipeScenario): number {
  const salePrice = calculateScenarioSalePrice(scenario)
  const unitCost = calculateScenarioUnitCost(scenario)
  if (unitCost <= 0) return 0
  return ((salePrice / unitCost) - 1) * 100
}

function calculateBatchTotalInvestment(scenario: RecipeScenario): number {
  const units = calculateEstimatedUnits(scenario)
  return totalIngredientsCost.value + (calculateScenarioUtilitiesCost(scenario) * units)
}

function calculateBatchTotalIncome(scenario: RecipeScenario): number {
  const units = calculateEstimatedUnits(scenario)
  return calculateScenarioSalePrice(scenario) * units
}

function calculateBatchTotalProfit(scenario: RecipeScenario): number {
  return calculateBatchTotalIncome(scenario) - calculateBatchTotalInvestment(scenario)
}

// FORMAT HELPERS
function getMeasurementLabel(id: string) {
  // Simplified. Ideally fetch from types or store
  return id === 'g' ? 'g' : id === 'kg' ? 'kg' : 'units'
}

// ACTIONS
function removeIngredient(index: number) {
  recipe.value.ingredients.splice(index, 1)
}

function addScenario() {
  if (!recipe.value.id) return

  const newScenario: RecipeScenario = {
    recipe_id: recipe.value.id,
    name: 'Nuevo Paquete',
    mode: 'weight',
    value: 100,
    fixed_sale_price_currency: 'USD',
    utilities: [],
  }

  scenarios.value.push(newScenario)
  editingScenarioIndex.value = scenarios.value.length - 1
}

async function saveScenario(scenario: RecipeScenario) {
  if (!recipe.value.id) return
  isSavingScenario.value = true

  function sanitizeForFirestore(obj: any): any {
    if (obj === undefined) return undefined
    if (obj === null) return null
    if (Array.isArray(obj)) {
      return obj
        .map((v) => sanitizeForFirestore(v))
        .filter((v) => v !== undefined)
    }
    if (typeof obj === 'object') {
      const out: any = {}
      for (const k of Object.keys(obj)) {
        const v = obj[k]
        if (v === undefined) continue
        const sv = sanitizeForFirestore(v)
        if (sv !== undefined) out[k] = sv
      }
      return out
    }
    return obj
  }

  try {
    if (scenario.id) {
      const payload = sanitizeForFirestore({ ...scenario })
      await updateDoc(doc(db, 'scenarios', scenario.id), payload)
    } else {
      const newRef = doc(collection(db, 'scenarios'))
      scenario.id = newRef.id
      const payload = sanitizeForFirestore({ ...scenario, id: newRef.id })
      await setDoc(newRef, payload)
    }
    editingScenarioIndex.value = null
  } catch (e) {
    console.error('Error al guardar escenario:', e)
  } finally {
    isSavingScenario.value = false
  }
}

async function deleteScenario(id: string, index: number) {
  if (!id) {
    scenarios.value.splice(index, 1)
    editingScenarioIndex.value = null
    return
  }

  scenarioToDelete.value = { id, index }
  showDeleteConfirmModal.value = true
}

async function confirmDeleteScenario() {
  if (!scenarioToDelete.value) return
  const { id, index } = scenarioToDelete.value

  try {
    await deleteDoc(doc(db, 'scenarios', id))
    scenarios.value.splice(index, 1)
    editingScenarioIndex.value = null
    showDeleteConfirmModal.value = false
    scenarioToDelete.value = null
  } catch (e) {
    console.error('Error al eliminar escenario:', e)
    alert('Error al eliminar paquete')
  }
}

async function migrateScenarios() {
  if (!recipe.value.id || !hasLegacyScenarios.value) return
  isMigrating.value = true

  try {
    const legacyScenarios = recipe.value.scenarios || []
    for (const sc of legacyScenarios) {
      const newRef = doc(collection(db, 'scenarios'))
      await setDoc(newRef, {
        ...sc,
        id: newRef.id,
        recipe_id: recipe.value.id
      })
    }

    // Remove from recipe and update
    await updateDoc(doc(db, 'recipes', recipe.value.id), { scenarios: null })

    hasLegacyScenarios.value = false
    if (recipe.value.id) {
      await loadScenarios(recipe.value.id)
    }
    alert('Migración completada con éxito')
  } catch (e) {
    console.error('Error en migración:', e)
    alert('Error al migrar')
  } finally {
    isMigrating.value = false
  }
}

async function cleanUtilitiesData() {
  if (!scenarios.value.length) return
  isCleaning.value = true

  try {
    let totalsUpdated = 0
    for (const sc of scenarios.value) {
      if (!sc.id) continue

      let changed = false
      const newUtilities = sc.utilities.map(util => {
        if (util.product_id) {
          // Check if it has static data to remove
          if (util.name !== undefined || util.cost !== undefined || util.quantity !== undefined) {
            changed = true
            const { name, cost, quantity, ...cleanUtil } = util
            // Explicitly ignore unused to fix lint
            void name; void cost; void quantity;
            return cleanUtil
          }
        }
        return util
      })

      if (changed) {
        await updateDoc(doc(db, 'scenarios', sc.id), { utilities: newUtilities })
        totalsUpdated++
      }
    }

    if (recipe.value.id) {
      await loadScenarios(recipe.value.id)
    }
    alert(`Limpieza completada: ${totalsUpdated} paquetes actualizados.`)
  } catch (e) {
    console.error('Error en limpieza:', e)
    alert('Error al limpiar datos')
  } finally {
    isCleaning.value = false
  }
}



function addUtilityToScenario(scenarioIndex: number) {
  showUtilityModal.value = true
  activeScenarioIndex.value = scenarioIndex
}

function selectUtility(product: Product) {
  if (activeScenarioIndex.value === null) return

  const util: RecipeUtility = {
    name: product.name, // Initialize name
    product_id: product.id,
    usage_quantity: 1,
    profit_margin: 50,
    establishment_id: undefined // Default to average
  }

  scenarios.value[activeScenarioIndex.value].utilities.push(util)
  showUtilityModal.value = false
  activeScenarioIndex.value = null
}

function removeUtilityFromScenario(sIndex: number, uIndex: number) {
  scenarios.value[sIndex].utilities.splice(uIndex, 1)
}

// DATA LOADING
async function loadScenarios(recipeId: string) {
  const q = query(collection(db, 'scenarios'), where('recipe_id', '==', recipeId))
  const snap = await getDocs(q)
  scenarios.value = snap.docs.map(d => ({ ...d.data() } as RecipeScenario))
}
async function loadProducts() {
  // Load recipe products
  const myProductsSnap = await getDocs(collection(db, 'my_products'))
  recipeProducts.value = myProductsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product)

  // Load regular products
  const snap = await getDocs(collection(db, 'productos'))
  const regularProducts = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product)

  availableProducts.value = regularProducts
}

async function loadRecipe(id: string) {
  const docRef = doc(db, 'recipes', id)
  const snap = await getDoc(docRef)
  if (snap.exists()) {
    const data = snap.data()
    recipe.value = { id: snap.id, ...data } as Recipe

    // Check for legacy scenarios inside the recipe document
    if (data.scenarios && data.scenarios.length > 0) {
      hasLegacyScenarios.value = true
    }

    loadScenarios(snap.id)
  }
}

function openProductModal() {
  productSearch.value = ''
  swappingIndex.value = null
  showProductModal.value = true
}

function openSwapProductModal(index: number) {
  productSearch.value = ''
  swappingIndex.value = index
  showProductModal.value = true
}

function selectProduct(prod: Product) {
  if (swappingIndex.value !== null) {
    const ing = recipe.value.ingredients[swappingIndex.value]
    ing.product_id = prod.id || ''
    // Clear price selections to force re-evaluation
    delete ing.establishment_id
    delete ing.selected_price
    delete ing.price_type
  } else {
    recipe.value.ingredients.push({
      product_id: prod.id || '',
      usage_weight: 0,
    })
  }
  showProductModal.value = false
  swappingIndex.value = null
}

function openMyProductModal() {
  productSearch.value = ''
  swappingIndex.value = null
  showMyProductModal.value = true
}

function openSwapMyProductModal(index: number) {
  productSearch.value = ''
  swappingIndex.value = index
  showMyProductModal.value = true
}

function selectMyProduct(prod: Product) {
  if (swappingIndex.value !== null) {
    const ing = recipe.value.ingredients[swappingIndex.value]
    ing.product_id = prod.id || ''
    ing.selected_price = prod.price
    ing.price_type = 'unit_price'
    delete ing.establishment_id
  } else {
    recipe.value.ingredients.push({
      product_id: prod.id || '',
      usage_weight: 0,
      selected_price: prod.price, // Store the specific price
      price_type: 'unit_price'    // Indicate that it's a unit price, not an average
    })
  }
  showMyProductModal.value = false
  swappingIndex.value = null
}

async function saveRecipe() {
  if (!recipe.value.name) return
  isSaving.value = true

  try {
    const dataToSave = {
      ...recipe.value,
      total_weight: totalWeight.value,
      total_cost_ingredients: totalIngredientsCost.value,
      updated_at: new Date().toISOString().split('T')[0],
    }

    if (isEditing.value && recipe.value.id) {
      await updateDoc(doc(db, 'recipes', recipe.value.id), dataToSave)
    } else {
      const newRef = doc(collection(db, 'recipes'))
      dataToSave.id = newRef.id
      recipe.value.id = newRef.id
      await setDoc(newRef, dataToSave)
      isEditing.value = true
    }

    // Sync recipe as product if checkbox is enabled
    await syncRecipeAsProduct()
  } catch (e) {
    console.error(e)
  } finally {
    isSaving.value = false
  }
}

// Helper function to calculate average recipe price
function calculateAverageRecipePrice(): number {
  if (scenarios.value.length === 0) {
    return totalIngredientsCost.value
  }
  const totalCost = scenarios.value.reduce((sum, sc) =>
    sum + calculateScenarioUnitCost(sc), 0
  )
  return totalCost / scenarios.value.length
}

// Sync recipe as product in my_products collection
async function syncRecipeAsProduct() {
  if (!recipe.value.save_as_product || !recipe.value.id) return

  // Calculate final price (average of all scenarios or base cost)
  const avgPrice = calculateAverageRecipePrice()

  const productData = {
    name: recipe.value.name,
    price: avgPrice,
    average_price: avgPrice,
    category_ids: ['recipe_products'],  // Special category
    brand_id: null,
    measurement_id: recipe.value.has_production_units ? 'unit' : 'g', // 'unit' if production units, 'g' if weight based
    measurement_value: recipe.value.has_production_units ? (recipe.value.total_production_units || 1) : totalFinalWeight.value,
    currency_type: 'USD',
    is_recipe_product: true,
    recipe_id: recipe.value.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    final_weight_grams: totalFinalWeight.value, // Add final weight
    production_units: recipe.value.total_production_units, // Add production units
  }

  if (recipe.value.product_id) {
    // Update existing
    await updateDoc(doc(db, 'my_products', recipe.value.product_id), productData)
  } else {
    // Create new
    const ref = doc(collection(db, 'my_products'))
    await setDoc(ref, { ...productData, id: ref.id })
    recipe.value.product_id = ref.id
    await updateDoc(doc(db, 'recipes', recipe.value.id), { product_id: ref.id })
  }
}

// Watch for checkbox changes to delete product when unchecked
watch(() => recipe.value.save_as_product, async (newVal, oldVal) => {
  if (oldVal && !newVal && recipe.value.product_id) {
    // Delete product from my_products
    try {
      await deleteDoc(doc(db, 'my_products', recipe.value.product_id))
      recipe.value.product_id = ''
      if (recipe.value.id) {
        await updateDoc(doc(db, 'recipes', recipe.value.id), { product_id: null })
      }
    } catch (e) {
      console.error('Error deleting product:', e)
    }
  }
})

onMounted(() => {
  loadProducts()
  if (route.params.id) {
    isEditing.value = true
    loadRecipe(route.params.id as string)
  }
})
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

.btn-back {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-primary);
}

.card {
  background: var(--surface);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
  /* Allow items to wrap on smaller screens */
  gap: 10px;
  /* Space between items when wrapped */
}

.section-actions-group {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.section-header h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.2rem;
  margin: 0;
}

.table-responsive {
  overflow: auto;
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
  font-weight: 600;
  color: var(--text-secondary);
}

.input-sm {
  width: 80px;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.summary-item label {
  display: block;
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 4px;
}

.summary-item .value {
  font-size: 1.5rem;
  font-weight: 700;
}

.brand-color {
  color: var(--primary);
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

.text-danger {
  color: #ef4444;
}

.text-success {
  color: #10b981;
}

.swap-btn-regular {
  color: #4f46e5;
  /* Indigo 600 */
}

.swap-btn-recipe {
  color: #d97706;
  /* Amber 600 */
}

.large-input {
  width: 100px;
}

.select-sm {
  padding: 6px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
}

.summary-item.highlight {
  border: 2px solid var(--primary);
  background: rgba(79, 70, 229, 0.05);
  padding: 8px;
  border-radius: 8px;
}

.unit {
  margin-left: 4px;
  color: var(--text-secondary);
}

.scenarios-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.scenario-card {
  border-left: 4px solid var(--primary);
  transition: all 0.2s ease;
}

.scenario-card.is-editing {
  border: 2px solid var(--primary);
  border-left-width: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.scenario-summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.sc-main-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sc-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
}

.sc-meta {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-left: 28px;
}

.sc-values {
  display: flex;
  gap: 32px;
  margin-left: auto;
  margin-right: 32px;
}

.sc-value-item {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.sc-value-item label {
  font-size: 0.65rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.sc-value-item span {
  font-weight: 700;
  font-size: 0.95rem;
}

.highlight-success span.price-usd {
  color: #10b981;
}

.highlight-profit span.price-usd {
  color: var(--primary);
}

.price-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.price-bs {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-weight: 600;
  margin-top: -2px;
}

.sc-actions {
  display: flex;
  gap: 8px;
}

.scenario-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.scenario-config {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.packaging-section {
  background: var(--background);
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 20px;
}

.sub-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.sub-header h4 {
  margin: 0;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 6px;
}

.mini-table {
  width: 100%;
  font-size: 0.85rem;
}

.mini-table th {
  text-align: left;
  padding: 4px;
  color: var(--text-secondary);
}

.mini-table td {
  padding: 4px;
}

.input-xs {
  width: 60px;
  padding: 2px 4px;
  border: 1px solid var(--border);
  border-radius: 3px;
}

.input-xs-wide {
  width: 120px;
  padding: 2px 4px;
  border: 1px solid var(--border);
  border-radius: 3px;
}

.btn-xs {
  padding: 2px 6px;
  font-size: 0.75rem;
}

.scenario-results {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.result-badge {
  background: var(--background);
  padding: 8px 16px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.9rem;
}

.badge-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.result-badge.primary {
  background: var(--primary-light);
  color: var(--primary);
}

.result-badge.success {
  background: #e8f5e9;
  color: #1b5e20;
}

.result-badge .label {
  font-weight: 500;
}

.result-badge .value {
  font-weight: 700;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.modal-content {
  background: var(--surface);
  padding: 24px;
  border-radius: 8px;
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
}

.product-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.product-item {
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
}

.product-item:hover {
  background: var(--background);
}

.modal-content.large-modal {
  max-width: 800px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.modal-header h3 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
}

.modal-desc {
  color: var(--text-secondary);
  margin-bottom: 24px;
}

.summary-table th {
  background: var(--background);
  font-size: 0.8rem;
  text-transform: uppercase;
}

.val-usd {
  font-weight: 700;
}

.val-bs {
  color: var(--text-secondary);
}

.scenario-header-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.btn-block {
  width: 100%;
}

.price-tag {
  background: var(--primary-light, #e0e7ff);
  color: var(--primary, #4f46e5);
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.product-info-mini {
  display: flex;
  flex-direction: column;
}

.product-name-mini {
  font-weight: 600;
}

.product-brand-mini {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.production-summary-header {
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px dashed var(--border);
}

.checkbox-group {
  margin-bottom: 0;
}

.checkbox-container {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-weight: 600;
  color: var(--text-primary);
}

.checkbox-container input {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.summary-item.success-border {
  border: 2px solid #10b981;
  background: rgba(16, 185, 129, 0.05);
  padding: 8px;
  border-radius: 8px;
}

.input-with-toggle {
  display: flex;
  gap: 0;
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
}

.input-with-toggle .form-input {
  border: none !important;
  flex: 1;
}

.currency-toggle {
  display: flex;
  background: var(--background);
  border-left: 1px solid var(--border);
}

.currency-toggle button {
  padding: 0 12px;
  border: none;
  background: none;
  cursor: pointer;
  font-weight: 700;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.currency-toggle button.active {
  background: var(--primary);
  color: white;
}

.btn-danger {
  background-color: var(--danger);
  color: white;
}

.btn-danger:hover {
  background-color: #dc2626;
  filter: brightness(1.1);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.real-margin-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  margin-top: 6px;
  font-weight: 500;
}

@media (max-width: 768px) {
  .recipe-form-container {
    padding: 12px;
  }

  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .header-left {
    justify-content: flex-start;
  }

  .header-actions {
    display: flex;
    justify-content: stretch;
  }

  .header-actions .btn {
    flex: 1;
    justify-content: center;
  }

  .summary-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .scenario-config {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .scenario-summary-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .sc-values {
    width: 100%;
    margin: 0;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 0;
    border-top: 1px dashed var(--border);
    border-bottom: 1px dashed var(--border);
  }

  .sc-meta {
    margin-left: 0;
    font-size: 0.8rem;
  }

  .sc-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .scenario-results {
    flex-direction: column;
    gap: 8px;
  }

  .result-badge {
    width: 100%;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 10px 16px;
  }

  .badge-content {
    flex-direction: row;
    gap: 8px;
  }

  .scenario-header-main {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .scenario-header-main .btn {
    width: 100%;
  }

  .sub-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .sub-header .btn {
    width: 100%;
  }

  .modal-content {
    width: 95%;
    max-height: 90vh;
    padding: 16px;
  }

  .summary-item.highlight,
  .summary-item.success-border {
    padding: 12px;
  }

  .value {
    font-size: 1.25rem;
  }

  .large-input {
    width: 100%;
  }
}

.utility-margin-group {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface);
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--border);
}

.utility-margin-group label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.toggle-group {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.full-width {
  grid-column: 1 / -1;
}

.animate-in {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
