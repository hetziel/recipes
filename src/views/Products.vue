<template>
  <!-- Formulario para agregar nuevo producto -->
  <div class="b-modal" persistent modal="formProductModal" fx="in-out">
    <form bx-content @submit.prevent="handleAction" class="product-form">
      <div bx-head class="modal-header">
        <h2 bx-title class="modal-title">
          <Icon :name="typeAction === 'edit' ? 'pencil' : 'plus'" />
          {{ typeAction === 'edit' ? 'Editar Producto' : 'Agregar Nuevo Producto' }}
        </h2>
        <button @click="boxyModal.close('formProductModal')" class="close-btn">
          <Icon name="close" />
        </button>
      </div>

      <div bx-body class="modal-body">
        <div class="form-container" v-if="mostrarFormulario">
          <div class="form-grid">
            <!-- Nombre -->
            <div class="form-group">
              <label class="form-label">
                <Icon name="package-variant" />
                Nombre del producto
              </label>
              <div class="input-with-icon">
                <input v-model="handleProduct.name" required class="form-input" placeholder="Ej: Arroz Premium" />
                <Icon name="asterisk" class="input-icon" size="xs" />
              </div>
            </div>

            <!-- Categorías (Múltiples) -->
            <div class="form-group">
              <label class="form-label">
                <Icon name="shape-outline" />
                Categorías
              </label>
              <div class="searchable-select">
                <div class="input-with-icon">
                  <input v-model="categorySearch.query" @input="searchCategories"
                    @focus="() => { categorySearch.showDropdown = true; searchCategories(); }" @blur="onCategoryBlur"
                    placeholder="Buscar o crear categoría..." class="form-input search-input" />
                  <Icon name="magnify" class="input-icon" />
                </div>
                <div v-if="categorySearch.showDropdown && categorySearch.items.length" class="dropdown">
                  <div v-for="item in categorySearch.items" :key="item.id" @mousedown="selectCategory(item)"
                    class="dropdown-item" :class="{ 'new-item': item.isNew }">
                    <Icon v-if="item.icon" :name="item.icon" class="category-icon-display" />
                    {{ item.isNew ? `Crear: "${item.name}"` : item.name }}
                  </div>
                </div>
                <!-- Selected Categories Chips -->
                <div v-if="selectedCategories.length > 0" class="selected-categories-chips">
                  <div v-for="cat in selectedCategories" :key="cat.id" class="category-chip">
                    <Icon v-if="cat.icon" :name="cat.icon" class="chip-icon" />
                    <span>{{ cat.name }}</span>
                    <button type="button" @click="removeCategory(cat.id)" class="chip-remove">&times;</button>
                  </div>
                </div>
                <div v-if="categorySearch.isLoading" class="loading-spinner">
                  <div class="spinner"></div>
                  Buscando...
                </div>
              </div>
            </div>

            <!-- Marca -->
            <div class="form-group">
              <label class="form-label">
                <Icon name="tag-outline" />
                Marca
              </label>
              <div class="searchable-select">
                <div class="input-with-icon">
                  <input v-model="brandSearch.query" @input="searchBrands"
                    @focus="() => { brandSearch.showDropdown = true; searchBrands(); }" @blur="onBrandBlur"
                    placeholder="Buscar o crear marca..." class="form-input search-input" />
                  <Icon name="magnify" class="input-icon" />
                </div>
                <div v-if="brandSearch.showDropdown && brandSearch.items.length" class="dropdown">
                  <div v-for="item in brandSearch.items" :key="item.id" @mousedown="selectBrandItem(item)"
                    class="dropdown-item" :class="{ 'new-item': item.isNew }">
                    <Icon :name="item.isNew ? 'plus' : 'tag-outline'" />
                    {{ item.isNew ? `Crear: "${item.name}"` : item.name }}
                  </div>
                </div>
                <div v-if="brandSearch.selectedItem" class="selected-item chip">
                  <Icon name="check" />
                  {{ brandSearch.selectedItem.name }}
                  <button type="button" @click="clearBrandSearch" class="clear-btn">&times;</button>
                </div>
                <div v-if="brandSearch.isLoading" class="loading-spinner">
                  <div class="spinner"></div>
                  Buscando...
                </div>
              </div>
            </div>

            <!-- Tipo de Producto -->
            <div class="form-group">
              <label class="form-label">
                <Icon name="tag-multiple" />
                Tipo de Producto
              </label>
              <div class="select-wrapper">
                <select v-model="handleProduct.type" class="form-select">
                  <option value="standard">📦 Estándar / General</option>
                  <option value="alimento">🌾 Alimento / Insumo</option>
                  <option value="pollo">🐥 Lote de Pollos (Materia Prima)</option>
                </select>
                <i class="select-arrow"></i>
              </div>
            </div>

            <!-- Medida y Valor -->
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">
                  <Icon name="ruler" />
                  Medida
                </label>
                <div class="select-wrapper">
                  <select v-model="handleProduct.measurement_id" class="form-select">
                    <option v-for="m in measurements" :key="m.id" :value="m.id">
                      {{ m.type }}
                    </option>
                  </select>
                  <i class="select-arrow"></i>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Valor</label>
                <input v-model.number="handleProduct.measurement_value" type="number" min="0" step="0.01"
                  class="form-input" placeholder="0.00" />
              </div>
            </div>

            <!-- PRECIOS Y ESTABLECIMIENTOS -->
            <div class="form-section-title">
              <h3>Precios por Establecimiento</h3>
            </div>

            <div class="prices-manager mb-4">
              <!-- Lista de precios existentes -->
              <div v-if="handleProduct.prices && handleProduct.prices.length > 0" class="prices-list mb-3">
                <div v-for="(priceItem, idx) in handleProduct.prices" :key="idx" class="price-item-row">
                  <div class="price-est-name">
                    <Icon name="store" size="sm" />
                    {{ getEstablishmentName(priceItem.establishment_id) }}
                  </div>
                  <div class="price-val">
                    <strong>{{ priceItem.currency === 'USD' ? '$' : 'Bs' }} {{ priceItem.price.toFixed(2) }}</strong>
                  </div>
                  <button type="button" @click="removePrice(idx)" class="btn-icon text-danger">
                    <Icon name="close" />
                  </button>
                </div>
              </div>
              <div v-else class="empty-prices text-muted text-sm mb-3">
                No hay precios registrados. Se usará el precio base.
              </div>

              <!-- Agregar nuevo precio -->
              <div class="add-price-form p-3 bg-light rounded">
                <label class="form-label text-xs mb-1">Agregar Precio / Establecimiento</label>
                <div class="form-row narrow-gap align-end">
                  <!-- Buscador de Establecimiento -->
                  <div class="form-group flex-grow-1 mb-0">
                    <div class="searchable-select">
                      <div class="input-with-icon">
                        <input v-model="establishmentSearch.query" @input="searchEstablishments"
                          @focus="() => { establishmentSearch.showDropdown = true; searchEstablishments(); }"
                          @blur="onEstablishmentBlur" placeholder="Buscar establecimiento..."
                          class="form-input search-input" />
                        <Icon name="magnify" class="input-icon" />
                      </div>
                      <div v-if="establishmentSearch.showDropdown && establishmentSearch.items.length" class="dropdown">
                        <div v-for="item in establishmentSearch.items" :key="item.id"
                          @mousedown="selectEstablishment(item)" class="dropdown-item"
                          :class="{ 'new-item': item.isNew }">
                          <Icon :name="item.isNew ? 'plus' : 'store'" />
                          {{ item.isNew ? `Crear: "${item.name}"` : item.name }}
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Input Precio -->
                  <div class="form-group mb-0" style="width: 120px;">
                    <div class="price-input">
                      <span class="price-prefix">{{ newPriceEntry.currency === 'USD' ? '$' : 'Bs' }}</span>
                      <input v-model.number="newPriceEntry.price" type="number" min="0" step="0.01" class="form-input"
                        placeholder="0.00" />
                    </div>
                  </div>

                  <!-- Toggle Moneda -->
                  <div class="form-group mb-0">
                    <div class="currency-selector small">
                      <button type="button" @click="newPriceEntry.currency = 'USD'"
                        :class="['currency-btn', { active: newPriceEntry.currency === 'USD' }]">$</button>
                      <button type="button" @click="newPriceEntry.currency = 'Bs'"
                        :class="['currency-btn', { active: newPriceEntry.currency === 'Bs' }]">Bs</button>
                    </div>
                  </div>

                  <!-- Botón Agregar -->
                  <div class="form-group mb-0">
                    <button type="button" @click="addPriceToProduct" class="btn btn-primary btn-icon"
                      :disabled="!establishmentSearch.selectedItem || newPriceEntry.price <= 0">
                      <Icon name="plus" />
                    </button>
                  </div>
                </div>
                <!-- Selección actual -->
                <div v-if="establishmentSearch.selectedItem" class="selected-establishment mt-2">
                  <span class="chip">
                    <Icon name="store" /> {{ establishmentSearch.selectedItem.name }}
                    <button type="button" @click="clearEstablishmentSelection" class="clear-btn">&times;</button>
                  </span>
                </div>
              </div>
            </div>

            <!-- Precio General / Promedio (Read only calculation) -->
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">
                  <Icon name="calculator" />
                  Precio Promedio Calculado
                </label>
                <div class="price-display-large">
                  ${{ calculateAveragePrice(handleProduct.prices).toFixed(2) }}
                  <span class="text-xs text-muted">Bs {{ (calculateAveragePrice(handleProduct.prices) *
                    (dolarBCV?.promedio || 0)).toFixed(2) }}</span>
                </div>
              </div>
            </div>

            <!-- OLD PRICE SECTION HIDDEN OR MIGRATED -->
            <!-- We keep the old price input as a "Base Price" fallback or for quick editing if no establishments are used -->
            <div class="form-row border-top pt-3 mt-2">
              <div class="form-group full-width">
                <label class="form-label text-muted text-sm">Configuración Manual (Precio Base / Fallback)</label>
              </div>
              <div class="form-group">
                <label class="form-label">
                  <Icon name="currency-usd" />
                  Moneda Base
                </label>
                <div class="currency-selector">
                  <button type="button" @click="handleProduct.currency_type = 'USD'"
                    :class="['currency-btn', { active: handleProduct.currency_type === 'USD' }]">
                    <span class="currency-symbol">$</span> USD
                  </button>
                  <button type="button" @click="handleProduct.currency_type = 'BS'"
                    :class="['currency-btn', { active: handleProduct.currency_type === 'BS' }]">
                    <span class="currency-symbol">Bs</span> BS
                  </button>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">
                  <Icon name="cash" />
                  Precio Base
                </label>
                <div class="price-input">
                  <span class="price-prefix">{{
                    handleProduct.currency_type === 'USD' ? '$' : 'Bs'
                  }}</span>
                  <input v-model.number="handleProduct.tempPrice" type="number" min="0" step="0.01" class="form-input"
                    placeholder="0.00" />
                </div>
              </div>
            </div>

            <!-- Categoría -->
            <div class="form-group">
              <label class="form-label">
                <Icon name="swap-horizontal" />
                {{ handleProduct.currency_type === 'USD' ? 'Precio en Bs' : 'Precio en $' }}
              </label>
              <div class="converted-price">
                <div class="converted-value">
                  {{ handleProduct.currency_type === 'USD' ? 'Bs' : '$' }}
                  {{ precioConvertido }}
                </div>
                <div class="conversion-info">
                  <Icon name="information-outline" />
                  Tipo de cambio: {{ dolarBCV?.promedio?.toFixed(2) || 'Cargando...' }}
                </div>
              </div>
            </div>

            <!-- Insumo/Utilería -->
            <div class="form-group checkbox-group">
              <label class="checkbox-container">
                <input type="checkbox" v-model="handleProduct.is_utility" />
                <span class="checkmark"></span>
                <Icon name="package-variant" />
                Es Insumo / Utilería
              </label>
              <p class="form-help">Marca esto si el producto es un envase, etiqueta o bolsa para recetas.</p>
            </div>

            <!-- Fechas -->
            <div class="form-row">
              <div class="form-group" v-if="typeAction === 'edit'">
                <label class="form-label">
                  <Icon name="calendar" />
                  Fecha creación
                </label>
                <input disabled v-model="handleProduct.created_at" type="date" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">
                  <Icon name="history" />
                  {{ typeAction === 'edit' ? 'Última actualización' : 'Fecha' }}
                </label>
                <input :disabled="typeAction === 'edit'" v-model="handleProduct.updated_at" type="date"
                  class="form-input" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div bx-footer class="modal-footer">
        <div class="form-actions">
          <button type="button" @click="resetearFormulario" class="btn btn-secondary" close-modal>
            <Icon name="cancel" />
            Cancelar
          </button>
          <button type="submit" class="btn btn-primary">
            <Icon :name="typeAction === 'edit' ? 'content-save' : 'check'" />
            {{ typeAction === 'edit' ? 'Actualizar' : 'Guardar Producto' }}
          </button>
        </div>
      </div>
    </form>
  </div>

  <!-- Modal de confirmación -->
  <div class="b-modal" modal="actionProductModal" fx="in-out">
    <div bx-content class="confirm-modal">
      <div bx-head class="modal-header">
        <h2 bx-title class="modal-title">
          <Icon name="alert-outline" />
          Confirmar Eliminación
        </h2>
        <button @click="boxyModal.close('actionProductModal')" class="close-btn">
          <Icon name="close" />
        </button>
      </div>
      <div bx-body class="modal-body">
        <div class="confirm-content">
          <Icon name="trash-can-outline" class="confirm-icon" size="xl" />
          <h3>¿Estás seguro de eliminar este producto?</h3>
          <p>Esta acción no se puede deshacer.</p>
        </div>
      </div>
      <div bx-footer class="modal-footer">
        <div class="form-actions">
          <button @click="cancelDeleteProduct" class="btn btn-secondary">
            <Icon name="cancel" />
            Cancelar
          </button>
          <button @click="confirmDeleteProduct" class="btn btn-danger">
            <Icon name="trash-can-outline" />
            Sí, eliminar
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal de Precios -->
  <div class="b-modal" modal="pricesModal" fx="in-out">
    <div bx-content class="prices-modal">
      <div bx-head class="modal-header">
        <h2 bx-title class="modal-title">
          <Icon name="tag-multiple" />
          Precios: {{ selectedProductForPrices?.name }}
        </h2>
        <div class="header-actions flex items-center">
          <button @click="closePricesModal" class="close-btn">
            <Icon name="close" />
          </button>
        </div>
      </div>
      <div bx-body class="modal-body">
        <div v-if="selectedProductForPrices?.prices?.length" class="prices-list-view">
          <div v-for="(price, idx) in selectedProductForPrices.prices" :key="idx" class="price-row-item">
            <div class="est-name">
              <Icon name="store" size="sm" class="mr-2" />
              {{ getEstablishmentName(price.establishment_id) }}
            </div>
            <div class="est-price-container flex-grow-1 flex items-center justify-end gap-2">
              <!-- Display Mode -->
              <div v-if="!(price as any).isEditing" class="price-display-dual text-right">
                <div>
                  <div class="main-price font-bold">
                    {{ (price as any).ui_currency === 'USD' ? '$' : 'Bs' }}
                    {{ (price as any).ui_currency === 'USD' ? price.price.toFixed(2) : (price.price *
                      (dolarBCV?.promedio || 0)).toFixed(2) }}
                  </div>
                  <div class="sub-price text-xs text-muted">
                    {{ (price as any).ui_currency === 'USD' ? 'Bs' : '$' }}
                    {{ (price as any).ui_currency === 'USD' ? (price.price * (dolarBCV?.promedio || 0)).toFixed(2) :
                      price.price.toFixed(2) }}
                  </div>
                </div>
              </div>

              <!-- Edit Mode -->
              <div v-else class="est-price-edit-container flex items-center gap-2">
                <div class="currency-switch-mini">
                  <button type="button" @click="(price as any).ui_currency = 'USD'"
                    :class="['btn-xxs', (price as any).ui_currency === 'USD' ? 'btn-primary' : 'btn-outline']">$</button>
                  <button type="button" @click="(price as any).ui_currency = 'Bs'"
                    :class="['btn-xxs', (price as any).ui_currency === 'Bs' ? 'btn-primary' : 'btn-outline']">Bs</button>
                </div>
                <div class="price-input-group">
                  <input v-if="(price as any).ui_currency === 'USD'" v-model.number="price.price" type="number" min="0"
                    step="0.01" class="form-input text-right" style="width: 90px" />
                  <input v-else :value="(price.price * (dolarBCV?.promedio || 1)).toFixed(2)"
                    @input="(e) => updatePriceInBs(price, Number((e.target as HTMLInputElement).value))" type="number"
                    min="0" step="0.01" class="form-input text-right" style="width: 110px" />
                  <span class="converted-price-label text-xs text-muted ml-2">
                    {{ (price as any).ui_currency === 'USD'
                      ? `Bs ${(price.price * (dolarBCV?.promedio || 0)).toFixed(2)}`
                      : `$${price.price.toFixed(2)}`
                    }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Per-row Edit/Save Button -->
            <div class="row-actions ml-2">
              <button v-if="!(price as any).isEditing" @click="toggleRowEdit(price, true)"
                class="btn-icon btn-sm btn-edit" title="Editar">
                <Icon name="pencil" size="sm" />
              </button>
              <button v-else @click="saveRowPrice(price)" class="btn-icon btn-sm btn-success" title="Guardar"
                :disabled="isSavingPrices">
                <Icon name="content-save" size="sm" />
              </button>
            </div>
          </div>
          <div class="average-row mt-3 pt-3 border-t">
            <div class="est-name font-bold">Promedio</div>
            <div class="average-prices-inline text-right">
              <span class="font-bold text-primary">${{ (selectedProductForPrices.average_price || 0).toFixed(2)
              }}</span>
              <span class="text-muted mx-2">|</span>
              <span class="text-muted">Bs {{ ((selectedProductForPrices.average_price || 0) * (dolarBCV?.promedio ||
                0)).toFixed(2) }}</span>
            </div>
          </div>
        </div>
        <div v-else class="empty-prices text-center py-4">
          <Icon name="tag-off" size="xl" class="text-muted mb-2" />
          <p class="text-muted">Este producto no tiene precios por establecimiento registrados.</p>
          <div class="mt-2">
            <span class="text-sm font-bold">Precio Base: ${{ (selectedProductForPrices?.price || 0).toFixed(2) }}</span>
          </div>
        </div>
      </div>
      <div bx-footer class="modal-footer">
        <button @click="closePricesModal" class="btn btn-secondary">
          <Icon name="close" />
          Cerrar
        </button>
      </div>
    </div>
  </div>

  <!-- Main Content -->
  <main class="container">
    <div class="products-dashboard">
      <!-- Header -->
      <div class="dashboard-header">
        <div class="header-top">
          <div class="search-input-wrapper">
            <input v-model="searchQuery" type="text" placeholder="Buscar productos..." class="search-input" />
            <span class="search-icon">🔍</span>
          </div>
          <button @click="showModal(true)" class="btn btn-primary btn-add" open-modal="formProductModal">
            <Icon name="plus" />
            <span class="btn-text">Nuevo Producto</span>
          </button>
        </div>

        <div class="header-filters">
          <!-- Filtro de Establecimiento -->
          <div class="establishment-filter-wrapper">
            <div class="searchable-select">
              <div class="input-with-icon">
                <input v-model="establishmentFilter.query" @input="searchEstablishmentFilter"
                  @focus="() => { establishmentFilter.showDropdown = true; searchEstablishmentFilter(); }"
                  @blur="onEstablishmentFilterBlur" placeholder="Filtrar establecimiento..."
                  class="form-input search-input filter-est-input" />
                <Icon name="store" class="input-icon" />
              </div>
              <div v-if="establishmentFilter.showDropdown && establishmentFilter.items.length" class="dropdown">
                <div v-for="item in establishmentFilter.items" :key="item.id"
                  @mousedown="selectEstablishmentFilter(item)" class="dropdown-item">
                  <Icon name="store" />
                  {{ item.name }}
                </div>
              </div>
            </div>
            <button v-if="establishmentFilter.selectedItem" @click="clearEstablishmentFilter" class="btn-clear-filter"
              title="Limpiar filtro">
              <Icon name="close" size="xs" />
            </button>
          </div>
        </div>
      </div>

      <!-- Category Filters Bar -->
      <div class="category-filters-container" v-if="categories.length">
        <div class="filters-scroll">
          <button @click="selectedCategoryFilter = null" :class="['filter-chip', { active: !selectedCategoryFilter }]">
            Todos
          </button>
          <button v-for="cat in categories" :key="cat.id" @click="toggleCategoryFilter(cat.id)"
            :class="['filter-chip', { active: selectedCategoryFilter === cat.id }]"
            :style="selectedCategoryFilter === cat.id ? { '--chip-color': getCategoryColor(cat.id) } : {}">
            <Icon v-if="cat.icon" :name="cat.icon" size="sm" />
            {{ cat.name }}
          </button>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="alert alert-error">
        <Icon name="close-circle-outline" />
        <div class="alert-content"><strong>Error:</strong> {{ error }}</div>
        <button @click="error = null" class="alert-close">&times;</button>
      </div>

      <!-- Loading -->
      <div v-if="cargando" class="loading-container">
        <div class="loading-spinner large">
          <div class="spinner"></div>
          <p>Cargando productos...</p>
        </div>
      </div>

      <!-- Products List -->
      <div v-else>
        <div v-if="products.length" class="products-container">
          <!-- List Header -->
          <div class="products-header">
            <div class="header-cell product-info">Producto</div>
            <div class="header-cell product-category">Categoría</div>
            <div class="header-cell product-price">Precio</div>
            <div class="header-cell product-actions">Acciones</div>
          </div>

          <!-- Product Items -->
          <div v-for="product in filteredProducts" :key="product.id" class="product-card">
            <div class="product-main">
              <div class="product-info">
                <div v-if="product.category_ids && product.category_ids.length > 0" class="product-badge"
                  :style="{ backgroundColor: getCategoryColor(product.category_ids[0]) }">
                  <Icon v-if="getCategoryInfo(product.category_ids[0])?.icon"
                    :name="getCategoryInfo(product.category_ids[0])?.icon ?? 'shape-outline'"
                    class="category-list-icon" />
                  <span v-else>P</span>
                </div>
                <div v-else class="product-badge" style="background-color: #6b7280">
                  <span>{{
                    getMeasurementType(product.measurement_id)?.charAt(0) || 'P'
                  }}</span>
                </div>
                <div class="product-details">
                  <h3 class="product-name">
                    {{ product.name }}
                    <Icon v-if="product.type === 'alimento'" name="grain" class="type-icon food" title="Alimento" />
                    <Icon v-if="product.type === 'pollo'" name="bird" class="type-icon chicken"
                      title="Pollo de Engorde" />
                  </h3>
                  <div class="product-meta">
                    <span class="product-measurement" v-if="product.measurement_value">
                      <Icon name="ruler" size="sm" />
                      {{ product.measurement_value }}
                      {{ getMeasurementType(product.measurement_id) }}
                    </span>
                    <span class="product-brand" v-if="product.brand_id">
                      <Icon name="tag-outline" size="sm" />
                      {{ getBrandName(product.brand_id) }}
                    </span>
                    <span v-if="product.is_utility" class="utility-badge" title="Producto marcado como Insumo/Utilería">
                      <Icon name="package-variant" size="sm" />
                      Insumo
                    </span>
                  </div>
                </div>
              </div>
              <div class="product-category" v-if="product.category_ids && product.category_ids.length > 0">
                <div class="category-tags">
                  <span v-for="catId in product.category_ids" :key="catId" class="category-tag">
                    <Icon v-if="getCategoryInfo(catId)?.icon" :name="getCategoryInfo(catId)?.icon ?? 'shape-outline'"
                      class="category-tag-icon" />
                    {{ getCategoryInfo(catId)?.name }}
                  </span>
                </div>
              </div>
              <div class="product-price">
                <div class="price-display">
                  <div class="price-primary">
                    <span class="currency-symbol">$</span>
                    {{ (product.average_price || product.price || 0).toFixed(2) }}
                  </div>
                  <div class="price-secondary text-xs text-muted">
                    Bs {{ ((product.average_price || product.price || 0) * (dolarBCV?.promedio || 0)).toFixed(2) }}
                  </div>
                  <div class="price-info-sub text-xs text-muted" v-if="product.prices && product.prices.length > 1">
                    Promedio ({{ product.prices.length }} est.)
                  </div>
                </div>
              </div>
              <div class="product-actions">
                <div class="action-buttons">
                  <button @click="loadEditProduct(String(product.id))" class="btn-icon btn-edit" title="Editar">
                    <Icon name="pencil" />
                  </button>
                  <button @click="openPricesModal(product)" class="btn-icon btn-info" title="Ver Precios">
                    <Icon name="currency-usd" />
                  </button>
                  <button @click="loadDeleteProduct(String(product.id))" class="btn-icon btn-delete" title="Eliminar">
                    <Icon name="trash-can-outline" />
                  </button>
                  <button class="btn-icon btn-more" title="Más opciones">
                    <Icon name="dots-vertical" />
                  </button>
                </div>
              </div>
            </div>
            <div class="product-footer">
              <div class="product-date">
                <Icon name="calendar" size="sm" />
                Actualizado: {{ formatDate(product.updated_at) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state">
          <div class="empty-content">
            <Icon name="package-variant-closed" size="xl" />
            <h3>No hay productos</h3>
            <p>Agrega tu primer producto o importa desde un archivo JSON.</p>
            <button @click="showModal(true)" class="btn btn-primary" open-modal="formProductModal">
              <Icon name="plus" />
              Agregar Primer Producto
            </button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
defineOptions({ name: 'ProductsView' })

import { ref, onMounted, computed, watch, inject, reactive, type Ref } from 'vue'
import boxyModal from '@js/boxy-modal.esm'
import Icon from '@/components/ui/Icon.vue' // Import Icon component

import {
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase.config'

// Interfaces y tipos
// Product imports
import type { Product, ProductPrice, DolarBCV, UiProductPrice, Category } from '../types/producto'
import type { SearchableItem, SearchState } from '../types/search'

// Composables
import { useBrands } from '../composables/useBrands'
import { useMeasurements } from '../composables/useMeasurements'
import { useEstablishments } from '../composables/useEstablishments'
import { useProducts } from '../composables/useProducts'
import { useCategories } from '../composables/useCategories'

// Datos de configuración
const onTesting = true
const typeAction = ref<'create' | 'edit'>('create')

const PRODUCTOS_COLLECTION = 'productos'
// CATEGORIAS_COLLECTION removed

const { dolarBCV: dolarBCV } = inject<{
  dolarBCV: Ref<DolarBCV | null>
}>('dolarBCV')!

// Use composables
const { products, isLoading: loadingProducts } = useProducts()
const {
  categories,
  getCategoryInfo,
  createNewCategory
} = useCategories()

const { brandSearch, searchBrands, createNewBrand, clearBrandSearch, getBrandName } = useBrands()
const { measurements, getMeasurementType } = useMeasurements()
const {
  establishmentSearch,
  establishments, // Destructure establishments
  searchEstablishments,
  createEstablishment,
  clearEstablishmentSearch,
  getEstablishmentName
} = useEstablishments()

// Map loading state
const cargando = computed(() => loadingProducts.value)

const error = ref<string | null>(null)
const isSavingPrices = ref(false)
const isEditingPrices = ref(false)

const searchQuery = ref(''); // New search query ref

// Estados para búsqueda dinámica
const selectedCategoryFilter = ref<string | null>(null)

const categorySearch = reactive<SearchState>({
  query: '',
  items: [],
  selectedItem: null,
  showDropdown: false,
  isLoading: false,
})

// Estado para nuevo precio
const newPriceEntry = reactive({
  price: 0,
  currency: 'USD' as 'USD' | 'Bs',
})

// Filtro de establecimiento en el encabezado
const establishmentFilter = reactive<SearchState>({
  query: '',
  items: [],
  selectedItem: null,
  showDropdown: false,
  isLoading: false,
})

async function searchEstablishmentFilter() {
  const queryText = establishmentFilter.query.trim().toLowerCase()

  // Mapear los establecimientos cargados a formato SearchableItem
  const allEstablishments = establishments.value.map(e => ({
    id: e.id,
    name: e.name
  }))

  if (queryText.length === 0) {
    establishmentFilter.items = allEstablishments
    establishmentFilter.showDropdown = true
    return
  }

  establishmentFilter.items = allEstablishments.filter(est =>
    est.name.toLowerCase().includes(queryText)
  )
  establishmentFilter.showDropdown = true
}

function selectEstablishmentFilter(item: SearchableItem) {
  establishmentFilter.selectedItem = item
  establishmentFilter.query = item.name
  establishmentFilter.showDropdown = false
}

function clearEstablishmentFilter() {
  establishmentFilter.selectedItem = null
  establishmentFilter.query = ''
  establishmentFilter.showDropdown = false
}

function onEstablishmentFilterBlur() {
  setTimeout(() => {
    establishmentFilter.showDropdown = false
  }, 200)
}

interface MutableProduct extends Omit<Product, 'prices'> {
  prices?: ProductPrice[];
  tempPrice?: number;
  average_price?: number;
}

// Selected categories for the form
const selectedCategories = ref<Category[]>([])

const handleProduct = ref<MutableProduct>({
  name: '',
  price: 0,
  prices: [],
  average_price: 0,
  category_ids: [],  // Changed from category_id: ''
  brand_id: null,
  type: 'standard',
  measurement_id: '',
  measurement_value: 0,
  currency_type: 'USD',
  tempPrice: 0,
  is_utility: false,
  created_at: new Date().toISOString().split('T')[0],
  updated_at: new Date().toISOString().split('T')[0],
})
const mostrarFormulario = ref<boolean>(false)
const productToDelete = ref<string | null>(null)

// Computed para precio convertido
const precioConvertido = computed(() => {
  const price = handleProduct.value.tempPrice || 0
  const rate = dolarBCV.value?.promedio || 0
  if (rate === 0) return '0.00'
  if (handleProduct.value.currency_type === 'USD') {
    return (price * rate).toFixed(2)
  } else {
    return (price / rate).toFixed(2)
  }
})

// Sincronizar tempPrice con price
watch(() => handleProduct.value.tempPrice, (newVal) => {
  handleProduct.value.price = newVal || 0
})



// Configurar listener en tiempo real
// Configurar listener en tiempo real
onMounted(() => {
  // Data loading is handled by composables
})

async function showModal(show: boolean) {
  const response = await boxyModal[show ? 'open' : 'close']('formProductModal')

  if (response) {
    mostrarFormulario.value = show
    // Pre-seleccionar establecimiento si hay un filtro activo al crear
    if (show && typeAction.value === 'create' && establishmentFilter.selectedItem) {
      selectEstablishment(establishmentFilter.selectedItem)
    }
  }
}

// FUNCIONES PARA CATEGORÍAS
// loadCategories removed (using composable)

async function searchCategories() {
  const queryText = categorySearch.query.trim().toLowerCase()

  // Si no hay texto, mostramos todas las categorías existentes
  if (queryText.length === 0) {
    // Create mutable copy
    categorySearch.items = categories.value.map(c => ({ ...c }) as SearchableItem)
    categorySearch.showDropdown = true
    return
  }

  // Filtrar localmente primero (create mutable copy)
  const foundCategories: SearchableItem[] = categories.value
    .filter(cat => cat.name.toLowerCase().includes(queryText))
    .map(c => ({ ...c }) as SearchableItem)

  // Agregar opción para crear nueva categoría si no hay coincidencia exacta
  const exactMatch = foundCategories.some(
    (cat) => cat.name.toLowerCase() === queryText,
  )

  if (!exactMatch && queryText.length > 0) {
    foundCategories.push({
      id: 'new_' + Date.now(),
      name: categorySearch.query,
      isNew: true,
      icon: 'plus'
    })
  }

  categorySearch.items = foundCategories
  categorySearch.showDropdown = true
}

async function selectCategory(item: SearchableItem) {
  if (item.isNew) {
    // Crear nueva categoría
    const newCat = await createNewCategory(item.name, item.icon)
    if (newCat) {
      selectedCategories.value.push(newCat)
      handleProduct.value.category_ids.push(newCat.id)
    }
  } else {
    // Verificar que no esté ya agregada
    if (!selectedCategories.value.find(c => c.id === item.id)) {
      const catInfo = getCategoryInfo(item.id)
      if (catInfo) {
        selectedCategories.value.push(catInfo)
        handleProduct.value.category_ids.push(item.id)
      }
    }
  }

  categorySearch.query = ''
  categorySearch.showDropdown = false
}

function removeCategory(categoryId: string) {
  selectedCategories.value = selectedCategories.value.filter(c => c.id !== categoryId)
  handleProduct.value.category_ids = handleProduct.value.category_ids.filter(id => id !== categoryId)
}

// State for Prices Modal
const selectedProductForPrices = ref<Product | null>(null)
// isEditingPrices and isSavingPrices are defined earlier

function updatePriceInBs(priceItem: ProductPrice, valueBs: number) {
  const rate = dolarBCV.value?.promedio || 1
  priceItem.price = valueBs / rate
}

async function openPricesModal(product: any) {
  // Clone to avoid direct mutation
  const cloned = JSON.parse(JSON.stringify(product)) as Product
  // Init ui_currency and isEditing for each price
  if (cloned.prices) {
    cloned.prices.forEach((p) => {
      (p as UiProductPrice).ui_currency = 'USD';
      (p as UiProductPrice & { isEditing?: boolean }).isEditing = false
    })
  }
  selectedProductForPrices.value = cloned
  isEditingPrices.value = false
  await boxyModal.open('pricesModal')
}

function closePricesModal() {
  boxyModal.close('pricesModal')
  selectedProductForPrices.value = null
  isEditingPrices.value = false
}

function toggleRowEdit(priceItem: any, editing: boolean) {
  priceItem.isEditing = editing
}

async function saveRowPrice(priceItem: any) {
  const prod = selectedProductForPrices.value
  if (!prod || !prod.id) return

  isSavingPrices.value = true
  try {
    // Recalculate average
    prod.average_price = calculateAveragePrice(prod.prices)

    // Update Firestore
    const updates: Partial<Product> = {
      prices: prod.prices,
      average_price: prod.average_price,
      updated_at: new Date().toISOString(),

    }

    await updateDoc(doc(db, 'productos', prod.id), updates)

    // Exit edit mode for this row
    priceItem.isEditing = false
  } catch (err) {
    console.error('Error updating price:', err)
    alert('Error al guardar el precio')
  } finally {
    isSavingPrices.value = false
  }
}

// function savePriceChanges removed as redundant


// Function createNewCategory removed (using composable)

function clearCategory() {
  categorySearch.selectedItem = null
  categorySearch.query = ''
  selectedCategories.value = []
  handleProduct.value.category_ids = []
}

function onCategoryBlur() {
  setTimeout(() => {
    categorySearch.showDropdown = false
  }, 200)
}

// Funciones para la interacción con el composable de marcas
async function selectBrandItem(item: SearchableItem) {
  if (item.isNew) {
    const newBrand = await createNewBrand(item.name)
    if (newBrand) {
      brandSearch.selectedItem = { id: newBrand.id!, name: newBrand.name }
      handleProduct.value.brand_id = newBrand.id!
    }
  } else {
    brandSearch.selectedItem = item
    handleProduct.value.brand_id = item.id
  }
  brandSearch.query = item.name
  brandSearch.showDropdown = false
}

function onBrandBlur() {
  setTimeout(() => {
    brandSearch.showDropdown = false
  }, 200)
}

// Cargar datos del LocalStorage al iniciar


// Cargar datos iniciales removed (using composables)
// Data loading logic removed



async function handleAction() {
  if (typeAction.value === 'create') {
    await addProduct()
  } else if (typeAction.value === 'edit') {
    if (typeof handleProduct.value.id === 'string') {
      await editProduct(handleProduct.value.id)
    } else {
      error.value = 'ID de producto inválido para editar.'
    }
  }
}

async function editProduct(id: string) {
  if (!handleProduct.value.name) {
    error.value = 'El nombre del producto es requerido'
    return
  }

  // Calculate final average if not done
  const avg = calculateAveragePrice(handleProduct.value.prices)

  // Force base price to USD
  let basePriceUSD = handleProduct.value.price || 0
  if (handleProduct.value.currency_type === 'Bs' || handleProduct.value.currency_type === 'BS') {
    const rate = dolarBCV.value?.promedio || 1
    basePriceUSD = basePriceUSD / rate
  }

  const updates: Partial<Product> = {
    name: handleProduct.value.name.trim(),
    price: basePriceUSD,
    prices: handleProduct.value.prices || [],
    average_price: avg || basePriceUSD,
    category_ids: handleProduct.value.category_ids,
    brand_id: handleProduct.value.brand_id || null,
    type: handleProduct.value.type || 'standard',
    measurement_id: handleProduct.value.measurement_id,
    measurement_value: handleProduct.value.measurement_value,
    currency_type: 'USD', // Force USD
    is_utility: handleProduct.value.is_utility || false,
    updated_at: new Date().toISOString(),
  }

  try {
    await updateDoc(doc(db, PRODUCTOS_COLLECTION, id), updates)

    resetearFormulario()

  } catch (err) {
    error.value = 'Error al actualizar el producto'
    console.error(err)
  }
}

// ESTABLISHMENT FUNCTIONS
function onEstablishmentBlur() {
  setTimeout(() => {
    establishmentSearch.showDropdown = false
  }, 200)
}

async function selectEstablishment(item: SearchableItem) {
  if (item.isNew) {
    const newEst = await createEstablishment(item.name)
    if (newEst) {
      establishmentSearch.selectedItem = { id: newEst.id!, name: newEst.name }
    }
  } else {
    establishmentSearch.selectedItem = item
  }
  establishmentSearch.query = item.name // Show name in input
  establishmentSearch.showDropdown = false
}

function clearEstablishmentSelection() {
  clearEstablishmentSearch()
  newPriceEntry.price = 0
}

function addPriceToProduct() {
  if (!establishmentSearch.selectedItem || newPriceEntry.price <= 0) return

  // Check if establishment already exists in prices
  if (!handleProduct.value.prices) handleProduct.value.prices = []

  const existingIdx = handleProduct.value.prices.findIndex(p => p.establishment_id === establishmentSearch.selectedItem!.id)

  let priceToSave = newPriceEntry.price
  if (newPriceEntry.currency === 'Bs') {
    const rate = dolarBCV.value?.promedio || 1
    priceToSave = newPriceEntry.price / rate
  }

  const newPrice: ProductPrice = {
    establishment_id: establishmentSearch.selectedItem.id,
    price: priceToSave,
    currency: 'USD',
    updated_at: new Date().toISOString()
  }

  if (existingIdx >= 0) {
    if (confirm('Este establecimiento ya tiene un precio. ¿Deseas actualizarlo?')) {
      handleProduct.value.prices[existingIdx] = newPrice
    }
  } else {
    handleProduct.value.prices.push(newPrice)
  }

  // Update average price
  handleProduct.value.average_price = calculateAveragePrice(handleProduct.value.prices)
  // If no base price set, set it to this one for compatibility
  if (!handleProduct.value.price || handleProduct.value.price === 0) {
    handleProduct.value.tempPrice = newPrice.currency === 'USD' ? newPrice.price : newPrice.price / (dolarBCV.value?.promedio || 1)
    handleProduct.value.currency_type = 'USD'
  }

  // Reset
  clearEstablishmentSelection()
}

function removePrice(index: number) {
  if (!handleProduct.value.prices) return
  handleProduct.value.prices.splice(index, 1)
  handleProduct.value.average_price = calculateAveragePrice(handleProduct.value.prices)
}

function calculateAveragePrice(prices?: ProductPrice[]): number {
  if (!prices || prices.length === 0) return 0
  let totalUSD = 0
  let count = 0

  for (const p of prices) {
    let priceUSD = p.price
    if (p.currency === 'Bs') {
      const rate = dolarBCV.value?.promedio || 1
      priceUSD = p.price / rate
    }
    totalUSD += priceUSD
    count++
  }
  return count > 0 ? totalUSD / count : 0
}


// Modify addProduct/editProduct to ensure average_price is saved
async function addProduct() {
  if (!handleProduct.value.name) {
    error.value = 'El nombre del producto es requerido'
    return
  }

  // Calculate final average if not done
  const avg = calculateAveragePrice(handleProduct.value.prices)

  // Force base price to USD
  let basePriceUSD = handleProduct.value.price || 0
  if (handleProduct.value.currency_type === 'Bs' || handleProduct.value.currency_type === 'BS') {
    const rate = dolarBCV.value?.promedio || 1
    basePriceUSD = basePriceUSD / rate
  }

  const product: Product = {
    id: 'temp_' + Date.now(),
    name: handleProduct.value.name.trim(),
    price: basePriceUSD,
    prices: handleProduct.value.prices || [],
    average_price: avg || basePriceUSD,
    category_ids: handleProduct.value.category_ids,
    brand_id: handleProduct.value.brand_id || null,
    type: handleProduct.value.type || 'standard',
    measurement_id: handleProduct.value.measurement_id,
    measurement_value: handleProduct.value.measurement_value,
    currency_type: 'USD', // Force USD
    is_utility: handleProduct.value.is_utility || false,
    created_at: handleProduct.value.created_at || new Date().toISOString().split('T')[0],

  }

  console.log('Producto para agregar:', product)

  try {
    // products.value.unshift(product) // Removed, onSnapshot handles it

    resetearFormulario()

    await createProductInFireStore(product)
  } catch (err) {
    error.value = 'Error al agregar el producto'
    console.error(err)
  }
}




async function resetearFormulario() {
  handleProduct.value = {
    name: '',
    price: 0,
    category_ids: [],
    brand_id: null,
    type: 'standard',
    measurement_id: '',
    measurement_value: 0,
    currency_type: 'USD',
    tempPrice: 0,
    is_utility: false,
    created_at: new Date().toISOString().split('T')[0],
    updated_at: new Date().toISOString().split('T')[0],

  }
  selectedCategories.value = []

  // Limpiar buscadores
  clearCategory()
  clearBrandSearch() // Use composable function

  categorySearch.query = ''

  const close = await boxyModal.close('formProductModal')
  mostrarFormulario.value = close ?? false
  typeAction.value = 'create'
}

// Guardar datos en LocalStorage


async function loadEditProduct(id: string) {
  typeAction.value = 'edit'
  if (onTesting) {
    console.log('Editando producto con ID:', id)
  }

  if (!id) return

  const product = products.value.find((p) => String(p.id) === id)
  if (!product) {
    error.value = 'Producto no encontrado'
    return
  }

  // Cargar valores de categorías si existen
  if (product.category_ids && product.category_ids.length > 0) {
    selectedCategories.value = product.category_ids
      .map(catId => getCategoryInfo(catId))
      .filter(cat => cat !== undefined) as Category[]
  }

  if (product.brand_id) {
    const brandName = getBrandName(product.brand_id)
    if (brandName) {
      brandSearch.selectedItem = {
        id: product.brand_id,
        name: brandName,
      }
      brandSearch.query = brandName
    }
  }

  // Deep clone to avoid sharing readonly references
  const cloned = JSON.parse(JSON.stringify(product)) as any
  handleProduct.value = {
    ...cloned,
    category_ids: cloned.category_ids || [],
    tempPrice: cloned.price || 0,
    prices: cloned.prices || [],
    average_price: cloned.average_price || cloned.price || 0
  }
  mostrarFormulario.value = true

  // Pre-seleccionar establecimiento si hay un filtro activo al editar
  if (establishmentFilter.selectedItem) {
    selectEstablishment(establishmentFilter.selectedItem)
  }

  console.log(mostrarFormulario.value)
  // Aquí podrías agregar lógica para abrir un modal o formulario de edición
  boxyModal.open('formProductModal')
}



async function loadDeleteProduct(id: string) {
  if (onTesting) {
    console.log('Eliminando producto con ID:', id)
  }

  if (!id) return

  productToDelete.value = id

  boxyModal.open('actionProductModal')
}

async function confirmDeleteProduct() {
  const id = productToDelete.value
  if (onTesting) {
    console.log('Eliminando producto con ID:', id)
  }

  if (!id) return

  try {
    const index = products.value.findIndex((p) => {
      return String(p.id) === id
    })

    if (index === -1) {
      console.log('Producto no encontrado:', id)
      return
    }

    // Eliminar de Firestore
    await deleteDoc(doc(db, PRODUCTOS_COLLECTION, id))

    // Manual cache update REMOVED (handled by onSnapshot)
    // products.value.splice(index, 1)

    // Intentar sincronización inmediata si hay conexión
  } catch (err) {
    error.value = 'Error al eliminar el producto'
    console.error(err)
  }
}

function cancelDeleteProduct() {
  productToDelete.value = null
  boxyModal.close('actionProductModal')
}



async function createProductInFireStore(product: Product) {
  // 1. DEFINE TU ID PERSONALIZADO
  const customId = 'product-' + Date.now()

  const productToCreate = {
    id: product.id && !product.id.startsWith('temp_') ? product.id : customId,
    name: product.name.trim(),
    price: product.price || 0,
    category_ids: product.category_ids || [],
    brand_id: product.brand_id || null,
    type: product.type || 'standard',
    measurement_id: product.measurement_id,
    measurement_value: product.measurement_value,
    currency_type: product.currency_type,
    is_utility: product.is_utility || false,
    created_at: product.created_at || new Date().toISOString().split('T')[0],
    updated_at: new Date().toISOString().split('T')[0], // Siempre actualiza en la creación/modificación
  }

  // 2. CREA LA REFERENCIA AL DOCUMENTO CON TU ID
  const docRef = doc(db, PRODUCTOS_COLLECTION, productToCreate.id)

  // 3. USA setDoc PARA GUARDAR EL DOCUMENTO
  await setDoc(docRef, productToCreate)

  // Manual update removed
  /*
  const index = products.value.findIndex((p) => p.id === product.id) // Busca por el ID temporal
  if (index !== -1) {
    products.value[index].id = customId // Actualiza con el ID personalizado final
  }
  */

  return productToCreate as Product
}

const filteredProducts = computed(() => {
  let result = [...products.value];

  // Filtrar por categoría si hay una seleccionada
  if (selectedCategoryFilter.value) {
    result = result.filter(p =>
      p.category_ids && p.category_ids.includes(selectedCategoryFilter.value!)
    );
  }

  // Filtrar por texto de búsqueda
  if (searchQuery.value) {
    const queryText = searchQuery.value.toLowerCase();
    result = result.filter(product => {
      // Search in product name
      if (product.name.toLowerCase().includes(queryText)) {
        return true;
      }
      // Search in brand name (if available)
      if (product.brand_id && getBrandName(product.brand_id).toLowerCase().includes(queryText)) {
        return true;
      }
      // Search in category names (if available)
      if (product.category_ids && product.category_ids.length > 0) {
        const hasMatchingCategory = product.category_ids.some(catId => {
          const categoryInfo = getCategoryInfo(catId);
          return categoryInfo && categoryInfo.name.toLowerCase().includes(queryText);
        });
        if (hasMatchingCategory) return true;
      }
      // Search in measurement type (if available)
      if (product.measurement_id) {
        const measurementType = getMeasurementType(product.measurement_id);
        if (measurementType && measurementType.toLowerCase().includes(queryText)) {
          return true;
        }
      }
      return false;
    });
  }

  // Ordenar por establecimiento seleccionado (los que tienen precio para ese est. primero)
  if (establishmentFilter.selectedItem) {
    const estId = establishmentFilter.selectedItem.id;
    result.sort((a, b) => {
      const hasA = a.prices?.some(p => p.establishment_id === estId) ? 1 : 0;
      const hasB = b.prices?.some(p => p.establishment_id === estId) ? 1 : 0;
      return hasB - hasA;
    });
  }

  return result;
});

function toggleCategoryFilter(categoryId: string | null) {
  if (selectedCategoryFilter.value === categoryId) {
    selectedCategoryFilter.value = null;
  } else {
    selectedCategoryFilter.value = categoryId;
  }
}

function getCategoryColor(categoryId: string): string {
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316']
  const index =
    Math.abs(categoryId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) %
    colors.length
  return colors[index]
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}


</script>

<style scoped>
.icon.small {
  margin-right: 4px;
}

.category-icon-display {
  width: 18px;
  height: 18px;
  margin-right: 8px;
  color: var(--primary);
}

.category-icon-preview {
  width: 24px;
  height: 24px;
  margin-left: 12px;
  color: var(--primary);
}

.category-list-icon {
  width: 24px;
  height: 24px;
  color: white;
}

.category-tag-icon {
  width: 16px;
  height: 16px;
  margin-right: 6px;
  color: var(--text-secondary);
}

/* Layout principal */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.products-dashboard {
  background: var(--surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.btn-add {
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Productos */
.products-container {
  padding: 24px 0;
}

.products-header {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 140px;
  gap: 20px;
  padding: 16px 20px;
  background: var(--background);
  border-radius: var(--radius-sm);
  margin-bottom: 16px;
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 14px;
}

.product-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 20px;
  margin-bottom: 16px;
  transition: all 0.3s ease;
}

.product-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow);
  border-color: var(--primary);
}

.product-main {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 140px;
  gap: 20px;
  align-items: center;
}

.product-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.product-badge {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 18px;
  flex-shrink: 0;
}

.product-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: auto;
}

.product-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.product-meta {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: var(--text-secondary);
}

.product-category {
  display: flex;
  align-items: center;
}

.category-tag {
  background: var(--background);
  color: var(--text-secondary);
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
}

.product-price {
  display: flex;
  align-items: center;
}

.price-display {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.price-primary {
  font-size: 20px;
  font-weight: 700;
  color: var(--primary);
  display: flex;
  align-items: center;
}

.currency-symbol {
  font-size: 16px;
  margin-right: 2px;
}

.price-secondary {
  font-size: 14px;
  color: var(--text-secondary);
}

.product-actions {
  display: flex;
  justify-content: flex-end;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.btn-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: var(--background);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.btn-icon:hover {
  background: var(--primary);
  color: white;
  transform: scale(1.05);
}

.btn-edit:hover {
  background: var(--primary);
}

.btn-delete:hover {
  background: var(--danger);
}

.product-footer {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
}

.product-date {
  font-size: 13px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Formularios y modales */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid var(--border);
}

.modal-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
}

.close-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: var(--background);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: var(--danger);
  color: white;
}

.modal-body {
  padding: 24px;
  max-height: 60vh;
  overflow-y: auto;
}

.form-grid {
  display: grid;
  gap: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.form-group {
  margin-bottom: 0;
}

/* Header del dashboard mejorado */
.dashboard-header {
  padding: 24px;
  background: var(--surface);
  display: flex;
  flex-direction: column;
  gap: 16px;
  border-bottom: 1px solid var(--border);
}

.header-top {
  display: flex;
  gap: 12px;
  align-items: center;
}

.header-filters {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.search-input-wrapper {
  position: relative;
  flex-grow: 1;
}

.search-input {
  width: 100%;
  padding: 12px 40px 12px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 14px;
  transition: all 0.2s ease;
  background: var(--background);
  color: var(--text-primary);
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light-alpha);
}

.search-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  pointer-events: none;
}

.establishment-filter-wrapper {
  flex: 1;
  min-width: 200px;
  position: relative;
}

.establishment-filter-wrapper .filter-est-input {
  width: 100%;
}

@media (max-width: 768px) {
  .dashboard-header {
    padding: 16px;
  }

  .header-top {
    flex-direction: column;
    align-items: stretch;
  }

  .btn-add {
    width: 100%;
  }

  .header-filters {
    flex-direction: column;
    align-items: stretch;
  }

  .establishment-filter-wrapper {
    width: 100%;
  }
}


.form-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-primary);
  display: flex;
  align-items: center;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 14px;
  transition: all 0.2s ease;
  background: var(--surface);
}

.form-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.input-with-icon {
  position: relative;
}

.input-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  pointer-events: none;
}

/* Searchable select mejorado */
.searchable-select {
  position: relative;
}

.search-input {
  padding-right: 40px;
}

.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--surface);
  border: 2px solid var(--border);
  border-radius: var(--radius-sm);
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: var(--shadow);
  margin-top: 4px;
}

.dropdown-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 14px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--border);
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover {
  background-color: var(--background);
}

.dropdown-item.new-item {
  color: var(--primary);
  font-weight: 500;
}

.selected-item.chip {
  margin-top: 8px;
  padding: 8px 12px;
  background: var(--primary);
  color: white;
  border-radius: 20px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
}

.clear-btn {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  opacity: 0.8;
}

.clear-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.2);
}

/* Currency selector */
.currency-selector {
  display: flex;
  gap: 8px;
}

.currency-btn {
  flex: 1;
  padding: 12px;
  border: 2px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
  font-weight: 500;
}

.currency-btn.active {
  border-color: var(--primary);
  background: var(--primary);
  color: white;
}

.currency-btn:hover:not(.active) {
  border-color: var(--primary);
}

/* Price input */
.price-input {
  display: flex;
  align-items: center;
}

.price-prefix {
  padding: 12px 0 12px 16px;
  background: var(--background);
  border: 2px solid var(--border);
  border-right: none;
  border-radius: var(--radius-sm) 0 0 var(--radius-sm);
  color: var(--text-secondary);
  font-weight: 500;
}

.price-input .form-input {
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  padding-left: 12px;
}

/* Converted price */
.converted-price {
  padding: 16px;
  background: var(--background);
  border-radius: var(--radius-sm);
  border: 2px solid var(--border);
}

.converted-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 8px;
}

.conversion-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.utility-badge {
  background: #fef3c7;
  color: #92400e;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  text-transform: uppercase;
}

/* Modals extra styles */
.checkbox-group {
  margin-top: 8px;
  grid-column: 1 / -1;
}

.checkbox-container {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  font-weight: 600;
  color: var(--text-primary);
  user-select: none;
}

.checkbox-container input {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.form-help {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
  margin-left: 32px;
}

/* Modal footer */
.modal-footer {
  padding: 24px;
  border-top: 1px solid var(--border);
  background: var(--background);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* Botones */
.btn {
  padding: 12px 24px;
  border-radius: var(--radius-sm);
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.btn-secondary {
  background: var(--background);
  color: var(--text-secondary);
  border: 2px solid var(--border);
}

.establishment-filter-header {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
}

.filter-est-input {
  min-width: 250px;
}

.btn-clear-filter {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: var(--background);
  border: none;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 5;
  color: var(--text-secondary);
}

.btn-clear-filter:hover {
  background: var(--danger);
  color: white;
}

.btn-secondary:hover {
  background: var(--border);
  color: var(--text-primary);
}

.btn-outline {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.btn-outline:hover {
  background: var(--background);
  border-color: var(--primary);
  color: var(--primary);
}

.btn-danger {
  background: var(--danger);
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

/* Estados */
.empty-state {
  padding: 80px 24px;
  text-align: center;
}

.empty-content {
  max-width: 400px;
  margin: 0 auto;
}

.empty-content h3 {
  font-size: 24px;
  color: var(--text-primary);
  margin: 16px 0 8px;
}

.empty-content p {
  color: var(--text-secondary);
  margin-bottom: 24px;
}

.loading-container {
  padding: 80px 24px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.loading-spinner {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-secondary);
}

.loading-spinner.large {
  flex-direction: column;
  gap: 20px;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.alert {
  padding: 16px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px 24px;
}

.alert-error {
  background: #fef2f2;
  border: 2px solid var(--danger);
  color: var(--danger);
}

.alert-content {
  flex: 1;
}

.alert-close {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.alert-close:hover {
  background: rgba(239, 68, 68, 0.1);
}

/* Confirm modal */
.confirm-modal {
  max-width: 400px;
  margin: 0 auto;
}

.confirm-content {
  text-align: center;
  padding: 40px 24px;
}

.confirm-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 20px;
  background: #fef2f2;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--danger);
}

.confirm-content h3 {
  font-size: 20px;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.confirm-content p {
  color: var(--text-secondary);
  margin: 0;
}

/* Responsive */
@media (max-width: 1024px) {
  .product-main {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .products-header {
    display: none;
  }

  .product-actions {
    justify-content: flex-start;
    padding-top: 12px;
    border-top: 1px dashed var(--border);
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .product-category,
  .product-price {
    padding-left: 56px;
    /* Align with product details (badge is 40px + 16px gap) */
  }
}

@media (max-width: 768px) {
  .container {
    padding: 12px;
  }

  .products-container {
    padding: 12px 0;
  }

  .form-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }

  .btn-migrate {
    width: 100%;
  }

  .modal-body {
    max-height: 50vh;
  }

  .category-filters-container {
    padding: 0 16px 16px;
  }
}

@media (max-width: 480px) {
  .product-badge {
    align-self: flex-start;
  }
}

/* Prices Modal Styles */
.prices-list-view {
  display: flex !important;
  flex-direction: column !important;
  gap: 12px;
}

.price-row-item {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  padding: 10px;
  background-color: var(--background-secondary, #f8f9fa);
  border-radius: 6px;
  border: 1px solid var(--border-color, #e9ecef);
}

.est-name {
  display: flex;
  align-items: center;
  font-weight: 500;
  color: var(--text-primary);
}

.est-price {
  font-family: 'Roboto Mono', monospace;
  font-weight: 600;
}

.est-price .currency {
  color: var(--text-muted);
  font-size: 0.9em;
  margin-right: 2px;
}

.average-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

@media (max-width: 480px) {
  .action-buttons {
    width: 100%;
    justify-content: flex-start;
  }
}

.currency-switch {
  display: inline-flex;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--border);
}

.currency-switch .btn-xs {
  padding: 4px 8px;
  font-size: 12px;
  font-weight: bold;
  border: none;
  border-radius: 0;
  cursor: pointer;
}

.currency-switch .btn-primary {
  background: var(--primary);
  color: white;
}

.currency-switch .btn-outline {
  background: var(--surface);
  color: var(--text-secondary);
}

.currency-switch-mini {
  display: inline-flex;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--border);
  margin-right: 8px;
}

.currency-switch-mini .btn-xxs {
  padding: 2px 6px;
  font-size: 10px;
  font-weight: bold;
  border: none;
  border-radius: 0;
  cursor: pointer;
}

.currency-switch-mini .btn-primary {
  background: var(--primary);
  color: white;
}

.currency-switch-mini .btn-outline {
  background: var(--surface);
  color: var(--text-secondary);
}

.est-price-edit-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.price-input-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.converted-price-label {
  white-space: nowrap;
  min-width: 80px;
}

.average-prices-inline {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}

.row-actions {
  display: flex;
  align-items: center;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}

.btn-success {
  background: var(--success, #28a745);
  color: white;
  border: none;
}

.btn-success:hover:not(:disabled) {
  background: var(--success-dark, #218838);
}

.btn-success:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Category Filter Bar Styles */
.category-filters-container {
  padding: 0 24px 20px;
}

.filters-scroll {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 8px;
  scrollbar-width: thin;
}

.filters-scroll::-webkit-scrollbar {
  height: 4px;
}

.filters-scroll::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 4px;
}

.filter-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.filter-chip:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.filter-chip.active {
  background: var(--chip-color, var(--primary));
  border-color: var(--chip-color, var(--primary));
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Multiple Categories Chips */
.selected-categories-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.category-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--primary);
  color: white;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
}

.chip-icon {
  width: 16px;
  height: 16px;
}

.chip-remove {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  padding: 0;
  margin-left: 4px;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.chip-remove:hover {
  opacity: 1;
}

.category-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.category-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
</style>
