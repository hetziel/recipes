# Migración de category_id a category_ids (Múltiples Categorías)

## Resumen

Este documento describe los cambios necesarios para permitir que un producto tenga múltiples categorías en lugar de una sola.

## Cambios en Types (✅ Completado)

### src/types/producto.ts

```typescript
export interface Product {
  // ... otros campos
  category_ids: string[] // Cambiado de category_id: string
  // ... resto de campos
}
```

## Cambios en Products.vue

### 1. Template - Actualizar UI de selección de categorías

**Antes:**

- Un solo chip mostrando la categoría seleccionada
- Campo de icono de categoría editable

**Después:**

- Múltiples chips mostrando todas las categorías seleccionadas
- Cada chip con botón para remover
- Sin campo de icono (se maneja en la configuración de categorías)

### 2. Script - Estado y Lógica

#### Agregar nuevo estado:

```typescript
const selectedCategories = ref<Category[]>([])
```

#### Actualizar handleProduct:

```typescript
const handleProduct = ref<MutableProduct>({
  // ... otros campos
  category_ids: [], // Cambiado de category_id: ''
  // ... resto de campos
})
```

#### Actualizar funciones:

**selectCategory** - Agregar categoría al array en lugar de reemplazar:

```typescript
async function selectCategory(item: SearchableItem) {
  if (item.isNew) {
    const newCat = await createNewCategory(item.name, item.icon)
    if (newCat) {
      selectedCategories.value.push(newCat)
      handleProduct.value.category_ids.push(newCat.id)
    }
  } else {
    // Verificar que no esté ya agregada
    if (!selectedCategories.value.find((c) => c.id === item.id)) {
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
```

**Nueva función removeCategory**:

```typescript
function removeCategory(categoryId: string) {
  selectedCategories.value = selectedCategories.value.filter((c) => c.id !== categoryId)
  handleProduct.value.category_ids = handleProduct.value.category_ids.filter(
    (id) => id !== categoryId,
  )
}
```

**clearCategory** - Limpiar todas las categorías:

```typescript
function clearCategory() {
  categorySearch.selectedItem = null
  categorySearch.query = ''
  selectedCategories.value = []
  handleProduct.value.category_ids = []
}
```

**resetearFormulario**:

```typescript
async function resetearFormulario() {
  handleProduct.value = {
    // ... otros campos
    category_ids: [], // Cambiado de category_id: ''
    // ... resto de campos
  }
  selectedCategories.value = []
  // ... resto del código
}
```

**loadEditProduct** - Cargar categorías existentes:

```typescript
async function loadEditProduct(id: string) {
  // ... código existente

  // Cargar categorías
  if (product.category_ids && product.category_ids.length > 0) {
    selectedCategories.value = product.category_ids
      .map((catId) => getCategoryInfo(catId))
      .filter((cat) => cat !== undefined) as Category[]
  }

  handleProduct.value = {
    ...cloned,
    category_ids: cloned.category_ids || [],
  }
  // ... resto del código
}
```

**addProduct y editProduct** - Guardar con category_ids:

```typescript
const product: Product = {
  // ... otros campos
  category_ids: handleProduct.value.category_ids, // Cambiado de category_id
  // ... resto de campos
}
```

### 3. Template - Mostrar categorías en la lista

**Antes:**

```vue
<div class="product-badge" :style="{ backgroundColor: getCategoryColor(product.category_id) }">
  <Icon :name="getCategoryInfo(product.category_id)?.icon ?? ''" />
</div>
<div class="product-category">
  <span class="category-tag">
    {{ getCategoryInfo(product.category_id)?.name }}
  </span>
</div>
```

**Después:**

```vue
<!-- Mostrar primera categoría en el badge -->
<div v-if="product.category_ids && product.category_ids.length > 0"
     class="product-badge"
     :style="{ backgroundColor: getCategoryColor(product.category_ids[0]) }">
  <Icon :name="getCategoryInfo(product.category_ids[0])?.icon ?? 'shape-outline'" />
</div>

<!-- Mostrar todas las categorías como chips -->
<div class="product-category">
  <div class="category-tags">
    <span v-for="catId in product.category_ids"
          :key="catId"
          class="category-tag">
      <Icon :name="getCategoryInfo(catId)?.icon ?? 'shape-outline'" />
      {{ getCategoryInfo(catId)?.name }}
    </span>
  </div>
</div>
```

### 4. Filtrado de productos

**Antes:**

```typescript
if (selectedCategoryFilter.value) {
  result = result.filter((p) => p.category_id === selectedCategoryFilter.value)
}
```

**Después:**

```typescript
if (selectedCategoryFilter.value) {
  result = result.filter(
    (p) => p.category_ids && p.category_ids.includes(selectedCategoryFilter.value!),
  )
}
```

**Búsqueda:**

```typescript
// Buscar en nombres de categorías
if (product.category_ids && product.category_ids.length > 0) {
  const hasMatchingCategory = product.category_ids.some((catId) => {
    const categoryInfo = getCategoryInfo(catId)
    return categoryInfo && categoryInfo.name.toLowerCase().includes(queryText)
  })
  if (hasMatchingCategory) return true
}
```

### 5. Estilos CSS

Agregar estilos para los chips de categorías:

```css
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
```

## Cambios en CategoriesBrandsView.vue

```typescript
function isCategoryUsed(categoryId: string) {
  return products.value.some((p) => p.category_ids && p.category_ids.includes(categoryId))
}
```

## Cambios en otros archivos

### ChickenForm.vue

```typescript
// Filtrar por categorías seleccionadas
if (selectedCategoryIds.value.length > 0) {
  prods = prods.filter(
    (p) =>
      p.category_ids && p.category_ids.some((catId) => selectedCategoryIds.value.includes(catId)),
  )
}
```

### RecipeForm.vue

```typescript
const productToCreate: Product = {
  // ... otros campos
  category_ids: ['recipe_products'], // Cambiado de category_id
  // ... resto de campos
}
```

### BuysView.vue

```typescript
const nuevoProducto = ref({
  // ... otros campos
  category_ids: [], // Cambiado de category_id: ''
  // ... resto de campos
})

// Al crear producto
const newProduct: Product = {
  // ... otros campos
  category_ids: nuevoProducto.value.category_ids,
  // ... resto de campos
}
```

## Migración de datos existentes

Para migrar productos existentes en Firestore:

```typescript
// Script de migración (ejecutar una sola vez)
async function migrateProductCategories() {
  const productsRef = collection(db, 'productos')
  const snapshot = await getDocs(productsRef)

  const batch = writeBatch(db)

  snapshot.docs.forEach((doc) => {
    const data = doc.data()
    if (data.category_id && !data.category_ids) {
      batch.update(doc.ref, {
        category_ids: [data.category_id],
        // Opcionalmente eliminar el campo antiguo
        // category_id: deleteField()
      })
    }
  })

  await batch.commit()
  console.log('Migración completada')
}
```

## Orden de implementación recomendado

1. ✅ Actualizar types/producto.ts
2. Actualizar Products.vue:
   - Estado y refs
   - Funciones de manejo de categorías
   - Template (UI)
   - Estilos CSS
3. Actualizar CategoriesBrandsView.vue
4. Actualizar ChickenForm.vue
5. Actualizar RecipeForm.vue
6. Actualizar BuysView.vue
7. Ejecutar script de migración de datos
8. Probar exhaustivamente

## Notas importantes

- Mantener retrocompatibilidad durante la transición
- Validar que category_ids siempre sea un array (nunca null/undefined)
- Considerar agregar validación: al menos una categoría requerida
- Actualizar cualquier índice de Firestore si es necesario
