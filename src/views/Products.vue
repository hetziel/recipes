<template>
  <!-- Formulario para agregar nuevo producto -->
  <div class="b-modal" persistent modal="formProductModal" fx="in-out">
    <form bx-content @submit.prevent="handleAction">
      <div bx-head>
        <h2 bx-title>{{ typeAction === 'edit' ? 'Editar Producto' : 'Agregar Nuevo Producto' }}</h2>
        <button @click="boxyModal.close('formProductModal')">close new</button>
      </div>

      <div bx-body>
        <div class="form-container" v-if="mostrarFormulario">
          <div class="form-group">
            <label>Nombre:</label>
            <input v-model="handleProduct.name" required />
          </div>

          <!-- BÚSQUEDA DINÁMICA PARA CATEGORÍA -->
          <div class="form-group">
            <label>Categoría:</label>
            <div class="searchable-select">
              <input v-model="categorySearch.query" @input="searchCategories"
                @focus="categorySearch.showDropdown = true" @blur="onCategoryBlur"
                placeholder="Buscar o crear categoría..." class="search-input" />
              <div v-if="categorySearch.showDropdown && categorySearch.items.length" class="dropdown">
                <div v-for="item in categorySearch.items" :key="item.id" @mousedown="selectCategory(item)"
                  class="dropdown-item" :class="{ 'new-item': item.isNew }">
                  {{ item.isNew ? `Crear: "${item.name}"` : item.name }}
                </div>
              </div>
              <div v-if="categorySearch.selectedItem" class="selected-item">
                {{ categorySearch.selectedItem.name }}
                <button type="button" @click="clearCategory" class="clear-btn">&times;</button>
              </div>
              <div v-if="categorySearch.isLoading" class="loading-spinner">Buscando...</div>
            </div>
          </div>

          <!-- BÚSQUEDA DINÁMICA PARA MARCA -->
          <div class="form-group">
            <label>Marca:</label>
            <div class="searchable-select">
              <input v-model="brandSearch.query" @input="searchBrands" @focus="brandSearch.showDropdown = true"
                @blur="onBrandBlur" placeholder="Buscar o crear marca..." class="search-input" />
              <div v-if="brandSearch.showDropdown && brandSearch.items.length" class="dropdown">
                <div v-for="item in brandSearch.items" :key="item.id" @mousedown="selectBrand(item)"
                  class="dropdown-item" :class="{ 'new-item': item.isNew }">
                  {{ item.isNew ? `Crear: "${item.name}"` : item.name }}
                </div>
              </div>
              <div v-if="brandSearch.selectedItem" class="selected-item">
                {{ brandSearch.selectedItem.name }}
                <button type="button" @click="clearBrand" class="clear-btn">&times;</button>
              </div>
              <div v-if="brandSearch.isLoading" class="loading-spinner">Buscando...</div>
            </div>
          </div>

          <div class="form-group">
            <label>Medida:</label>
            <select v-model="handleProduct.measurement_id">
              <option v-for="m in measurements" :key="m.id" :value="m.id">{{ m.type }}</option>
            </select>
            <input v-model.number="handleProduct.measurement_value" type="number" />
          </div>

          <div class="form-group">
            <label for="moneda">Moneda</label>
            <select id="moneda" v-model="handleProduct.currency_type" class="form-select">
              <option value="USD">Dólares (USD)</option>
              <option value="BS">Bolívares (BS)</option>
            </select>
          </div>

          <div class="form-group">
            <label for="price">Precio</label>
            <input id="price" v-model.number="handleProduct.tempPrice" type="number" min="0" step="0.01"
              class="form-input" />
          </div>

          <div class="form-group">
            <label for="precioConvertido">{{
              handleProduct.currency_type === 'USD' ? 'Precio en Bs' : 'Precio en $'
              }}</label>
            <input id="precioConvertido" :value="precioConvertido" type="text" readonly class="form-input" />
          </div>

          <div class="form-group" v-if="typeAction === 'edit'">
            <label>Fecha creación:</label>
            <input disabled v-model="handleProduct.created_at" type="date" />
          </div>
          <div class="form-group">
            <label>{{ typeAction === 'edit' ? 'Ultima actualización:' : 'Fecha:' }}</label>
            <input :disabled="typeAction === 'edit'" v-model="handleProduct.updated_at" type="date" />
          </div>
        </div>
      </div>
      <div bx-footer>
        <div class="form-actions">
          <button type="submit">{{ typeAction === 'edit' ? 'Actualizar' : 'Guardar' }}</button>
          <button type="button" @click="resetearFormulario" close-modal>Cancelar</button>
        </div>
      </div>
    </form>
  </div>

  <!-- Formulario para agregar nuevo producto -->
  <div class="b-modal" modal="actionProductModal" fx="in-out">
    <div bx-content>
      <div bx-head>
        <h2 bx-title>Desea eliminar el producto?</h2>
        <button @click="boxyModal.close('actionProductModal')">close new</button>
      </div>
      <div bx-footer>
        <div class="form-actions">
          <button @click="confirmDeleteProduct">Si</button>
          <button @click="cancelDeleteProduct">No</button>
        </div>
      </div>
    </div>
  </div>
  <main class="container">
    <div>
      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <div class="controls">
        <input type="file" accept=".json" @change="loadFiles" class="file-input" :disabled="cargando" />

        <button @click="showModal(true)" class="add-button" open-modal="formProductModal">
          Agregar Producto
        </button>

        <button @click="exportToJSON" class="export-button">Exportar a JSON</button>

        <button @click="limpiarLocalStorage" class="clear-button">Limpiar Datos</button>

        <button @click="recargarDatosIniciales" class="reload-button">Recargar Datos</button>
      </div>

      <div v-if="cargando" class="loading">Cargando datos...</div>

      <div v-else>
        <table v-if="products.length" class="product-table">
          <thead>
            <tr>
              <!-- <th>ID</th> -->
              <th>Nombre</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="product in filteredProducts" :key="product.id">
              <!-- <td>{{ product.id }}</td> -->
              <td>
                <div>
                  <span>{{ product.name }}</span>
                  <span v-if="product.measurement_value">
                    - {{ product.measurement_value }}
                    {{ getMeasurementType(product.measurement_id) }}
                  </span>
                </div>
                <div>
                  <span>$ {{ product.price?.toFixed(2) || '-' }}</span> /
                  <span>Bs.
                    {{
                      product.price && dolarBCV?.promedio
                        ? (product.price * dolarBCV.promedio).toLocaleString('es-VE', {
                          style: 'decimal',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                        : '-'
                    }}</span>
                </div>
              </td>
              <td>{{ product.created_at || '-' }}</td>
              <td>
                <button @click="loadEditProduct(String(product.id))" class="edit-button" title="Editar">
                  ⚙
                </button>
                <button @click="loadDeleteProduct(String(product.id))" class="delete-button" title="Eliminar">
                  &times;
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <p v-else class="empty-message">
          No hay productos. Agrega manualmente o carga un archivo JSON.
        </p>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
defineOptions({ name: 'ProductsView' })

import { ref, onMounted, computed, watch, onUnmounted, inject, reactive, type Ref } from 'vue'
import boxyModal from '@js/boxy-modal.esm'

import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  updateDoc,
  getDoc,
  orderBy,
} from 'firebase/firestore'
import { db } from '../firebase.config'

// Interfaces y tipos
import type { Product, DolarBCV, ExtendedProduct } from '../types/producto'

// Datos de configuración
const onTesting = true
const onFireStore = true
const typeAction = ref<'create' | 'edit'>('create')

const STORAGE_KEY = 'productos-app-data'
const PRODUCTOS_COLLECTION = 'productos'
const CATEGORIAS_COLLECTION = 'categorias'
const MARCAS_COLLECTION = 'marcas'

const { dolarBCV: dolarBCV, actualizarDolarBCV } = inject<{
  dolarBCV: Ref<DolarBCV | null>
  actualizarDolarBCV: (nuevoValor: DolarBCV) => void
}>('dolarBCV')!

const products = ref<Product[]>([])
const error = ref<string | null>(null)
const cargando = ref<boolean>(false)
const isOnline = ref<boolean>(true)

// Estados para búsqueda dinámica
interface SearchableItem {
  id: string
  name: string
  isNew?: boolean
}

interface SearchState {
  query: string
  items: SearchableItem[]
  selectedItem: SearchableItem | null
  showDropdown: boolean
  isLoading: boolean
}

const categorySearch = reactive<SearchState>({
  query: '',
  items: [],
  selectedItem: null,
  showDropdown: false,
  isLoading: false,
})

const brandSearch = reactive<SearchState>({
  query: '',
  items: [],
  selectedItem: null,
  showDropdown: false,
  isLoading: false,
})

const measurements = ref([
  { id: 'mea1', type: 'Kg' },
  { id: 'mea2', type: 'g' },
  { id: 'mea3', type: 'L' },
  { id: 'mea4', type: 'ml' },
])

const handleProduct = ref<ExtendedProduct>({
  name: '',
  price: 0,
  category_id: '',
  brand_id: '',
  measurement_id: '',
  measurement_value: 0,
  currency_type: 'USD',
  tempPrice: 0,
  created_at: new Date().toISOString().split('T')[0],
  updated_at: new Date().toISOString().split('T')[0],
  marked_to_create: true,
})
const mostrarFormulario = ref<boolean>(false)
const productToDelete = ref<string | null>(null)

// Configurar listener en tiempo real
onMounted(() => {
  // 1. Cargar datos locales primero para una respuesta rápida
  loadProductsFromLocal()

  // 2. Cargar datos de Firebase y sincronizar
  cargarDatosIniciales().then(() => {
    if (onFireStore && navigator.onLine) {
      // Sincronizar cualquier cambio pendiente
      syncPendingProducts()
    }
  })

  // 3. Configurar sincronización periódica
  const intervalo = setInterval(() => {
    if (navigator.onLine && onFireStore) {
      loadProductsFromFireStore()
    }
  }, 30000) // Cada 30 segundos

  // Limpiar intervalo al desmontar
  onUnmounted(() => clearInterval(intervalo))

  // 4. Cargar categorías y marcas iniciales
  loadCategories()
  loadBrands()
})

async function showModal(show: boolean) {
  const response = await boxyModal[show ? 'open' : 'close']('formProductModal')

  if (response) {
    mostrarFormulario.value = show
  }
}

// FUNCIONES PARA CATEGORÍAS
async function loadCategories() {
  try {
    if (onFireStore) {
      const querySnapshot = await getDocs(collection(db, CATEGORIAS_COLLECTION))
      const loadedCategories = querySnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            name: doc.data().name,
          }) as SearchableItem,
      )

      // Actualizar items en el buscador
      categorySearch.items = loadedCategories
    }
  } catch (err) {
    console.error('Error cargando categorías:', err)
  }
}

async function searchCategories() {
  const queryText = categorySearch.query.trim().toLowerCase()

  if (queryText.length === 0) {
    categorySearch.items = []
    return
  }

  try {
    categorySearch.isLoading = true

    // Buscar en Firestore
    const categoriesQuery = query(
      collection(db, CATEGORIAS_COLLECTION),
      where('name', '>=', queryText),
      where('name', '<=', queryText + '\uf8ff'),
      orderBy('name'),
    )

    const querySnapshot = await getDocs(categoriesQuery)
    const foundCategories = querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          name: doc.data().name,
        }) as SearchableItem,
    )

    // Agregar opción para crear nueva categoría si no existe
    const exactMatch = foundCategories.some(
      (cat) => cat.name.toLowerCase() === queryText.toLowerCase(),
    )

    if (!exactMatch && queryText.length > 0) {
      foundCategories.push({
        id: 'new_' + Date.now(),
        name: categorySearch.query,
        isNew: true,
      })
    }

    categorySearch.items = foundCategories
    categorySearch.showDropdown = true
  } catch (err) {
    console.error('Error buscando categorías:', err)
    categorySearch.items = []
  } finally {
    categorySearch.isLoading = false
  }
}

async function selectCategory(item: SearchableItem) {
  if (item.isNew) {
    // Crear nueva categoría
    await createNewCategory(item.name)
  } else {
    categorySearch.selectedItem = item
    handleProduct.value.category_id = item.id
  }

  categorySearch.query = item.name
  categorySearch.showDropdown = false
}

async function createNewCategory(name: string) {
  try {
    const newCategoryRef = doc(collection(db, CATEGORIAS_COLLECTION))
    const newCategory = {
      id: newCategoryRef.id,
      name: name,
      created_at: new Date().toISOString().split('T')[0],
    }

    await setDoc(newCategoryRef, newCategory)

    categorySearch.selectedItem = { id: newCategoryRef.id, name: name }
    handleProduct.value.category_id = newCategoryRef.id

    // Recargar la lista de categorías
    await loadCategories()
  } catch (err) {
    console.error('Error creando categoría:', err)
    error.value = 'Error al crear la categoría'
  }
}

function clearCategory() {
  categorySearch.selectedItem = null
  categorySearch.query = ''
  handleProduct.value.category_id = ''
}

function onCategoryBlur() {
  setTimeout(() => {
    categorySearch.showDropdown = false
  }, 200)
}

// FUNCIONES PARA MARCAS
async function loadBrands() {
  try {
    if (onFireStore) {
      const querySnapshot = await getDocs(collection(db, MARCAS_COLLECTION))
      const loadedBrands = querySnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            name: doc.data().name,
          }) as SearchableItem,
      )

      brandSearch.items = loadedBrands
    }
  } catch (err) {
    console.error('Error cargando marcas:', err)
  }
}

async function searchBrands() {
  const queryText = brandSearch.query.trim().toLowerCase()

  if (queryText.length === 0) {
    brandSearch.items = []
    return
  }

  try {
    brandSearch.isLoading = true

    const brandsQuery = query(
      collection(db, MARCAS_COLLECTION),
      where('name', '>=', queryText),
      where('name', '<=', queryText + '\uf8ff'),
      orderBy('name'),
    )

    const querySnapshot = await getDocs(brandsQuery)
    const foundBrands = querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          name: doc.data().name,
        }) as SearchableItem,
    )

    const exactMatch = foundBrands.some(
      (brand) => brand.name.toLowerCase() === queryText.toLowerCase(),
    )

    if (!exactMatch && queryText.length > 0) {
      foundBrands.push({
        id: 'new_' + Date.now(),
        name: brandSearch.query,
        isNew: true,
      })
    }

    brandSearch.items = foundBrands
    brandSearch.showDropdown = true
  } catch (err) {
    console.error('Error buscando marcas:', err)
    brandSearch.items = []
  } finally {
    brandSearch.isLoading = false
  }
}

async function selectBrand(item: SearchableItem) {
  if (item.isNew) {
    await createNewBrand(item.name)
  } else {
    brandSearch.selectedItem = item
    handleProduct.value.brand_id = item.id
  }

  brandSearch.query = item.name
  brandSearch.showDropdown = false
}

async function createNewBrand(name: string) {
  try {
    const newBrandRef = doc(collection(db, MARCAS_COLLECTION))
    const newBrand = {
      id: newBrandRef.id,
      name: name,
      created_at: new Date().toISOString().split('T')[0],
    }

    await setDoc(newBrandRef, newBrand)

    brandSearch.selectedItem = { id: newBrandRef.id, name: name }
    handleProduct.value.brand_id = newBrandRef.id

    await loadBrands()
  } catch (err) {
    console.error('Error creando marca:', err)
    error.value = 'Error al crear la marca'
  }
}

function clearBrand() {
  brandSearch.selectedItem = null
  brandSearch.query = ''
  handleProduct.value.brand_id = ''
}

function onBrandBlur() {
  setTimeout(() => {
    brandSearch.showDropdown = false
  }, 200)
}

// Cargar datos del LocalStorage al iniciar
function loadProductsFromLocal() {
  cargando.value = true
  const localData = localStorage.getItem(STORAGE_KEY)
  if (localData) {
    try {
      const data = JSON.parse(localData)
      const localProducts: Product[] = data || []

      products.value = localProducts

      console.log('Productos cargados desde LocalStorage:', localProducts.length)
    } catch (err) {
      console.error('Error al cargar datos del LocalStorage:', err)
    } finally {
      cargando.value = false
    }
  }
}

// Función principal para cargar datos iniciales
async function cargarDatosIniciales() {
  try {
    // Cargar productos
    if (onFireStore && isOnline.value) {
      await loadProductsFromFireStore()
    }
  } catch (err) {
    console.error('Error al cargar datos iniciales:', err)
    error.value = 'Error al cargar datos. Intente nuevamente.'
  }
}

// Función específica para cargar productos
async function loadProductsFromFireStore(): Promise<void> {
  console.log('loadProductsFromFireStore')
  try {
    // 1. Obtener productos de FireStore
    const productsQuery = query(
      collection(db, PRODUCTOS_COLLECTION),
      // orderBy('fecha', 'desc')
    )
    const productosSnapshot = await getDocs(productsQuery)

    // 2. Mapear y validar los datos
    const loadedProducts = productosSnapshot.docs.map((doc) => {
      return {
        id: doc.id,
        ...(doc.data() as Omit<Product, 'id'>),
      } as Product
    })

    // 3. Actualizar el estado reactivo
    products.value = loadedProducts

    // 4. Guardar en LocalStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loadedProducts))
    console.log('Productos guardados en LocalStorage', loadedProducts.length)
  } catch (err) {
    // Update:
    // Notificación que se están usando los productos locales
    console.info('Error al cargar productos de la nube, usando datos locales si existen', err)
  }
}

// Cargar productos desde Archivo JSON externo
async function loadFiles(event: Event) {
  const input = event.target as HTMLInputElement
  const archivo = input.files?.[0]
  input.value = ''

  if (!archivo) return

  const lector = new FileReader()
  lector.onload = async (e) => {
    cargando.value = true
    const resultado = e.target?.result as string
    const datos = JSON.parse(resultado)

    if (datos.productos && Array.isArray(datos.productos)) {
      const invalidProducts: Product[] = []

      datos.productos.forEach(async (p: Product) => {
        console.log(p)
        // Verificar campos obligatorios
        if (!p.name || !p.price) {
          invalidProducts.push(p) // Almacenar producto inválido
        }

        if (p.id) {
          const docRef = doc(db, PRODUCTOS_COLLECTION, String(p.id))
          const docSnap = await getDoc(docRef)

          if (docSnap.exists()) {
            console.log(`Producto ${p.id} ya existe en Firebase.`)

            const firebaseProduct = docSnap.data()

            // Convertimos las fechas a objetos Date para comparación
            const localCreatedAt = new Date(p.created_at || '')
            const firebaseCreatedAt = new Date(firebaseProduct.created_at || '')

            const localUpdatedAt = new Date(p.updated_at || '')
            const firebaseUpdatedAt = new Date(firebaseProduct.updated_at || '')

            // Primero comparamos created_at
            if (localCreatedAt.getTime() !== firebaseCreatedAt.getTime()) {
              // Si las fechas de creación son diferentes
              if (localCreatedAt > firebaseCreatedAt) {
                console.log(
                  `Producto ${p.id} tiene fecha de creación más reciente. Actualizando...`,
                )
                await updateDoc(docRef, { ...p })
              } else {
                console.log(
                  `Producto ${p.id} en Firebase tiene fecha de creación más reciente. No se actualiza.`,
                )
              }
            } else {
              // Si las fechas de creación son iguales, comparamos updated_at
              console.log('Fechas de creación iguales, comparando updated_at...')
              if (localUpdatedAt > firebaseUpdatedAt) {
                console.log(`Producto ${p.id} tiene actualización más reciente. Actualizando...`)
                await updateDoc(docRef, { ...p })
              } else {
                console.log(`Producto ${p.id} en Firebase ya está actualizado.`)
              }
            }
          } else {
            console.log(`Producto ${p.id} no existe en Firebase, creando nuevo...`)

            products.value.unshift(await createProductInFireStore(p))
          }
        } else {
          console.log('Producto sin ID')

          products.value.unshift(await createProductInFireStore(p))
        }
      })

      // Opcional: Mostrar advertencia si hay productos inválidos
      if (invalidProducts.length > 0) {
        console.warn('Productos inválidos encontrados:', invalidProducts)
        // También puedes emitir un evento o mostrar una notificación al usuario
      }

      console.log(products.value)
      const fechaImportada = new Date(datos.dolarBCV.fechaActualizacion)
      const fechaActual = new Date(dolarBCV.value?.fechaActualizacion || 0)

      if (datos.dolarBCV) {
        if (fechaImportada >= fechaActual && dolarBCV.value?.origen == 'local') {
          const fechaAnterior = dolarBCV.value?.fechaActualizacion || null

          // Actualizar tasa de dólar
          const nuevoDolarBCV: DolarBCV = {
            promedio: datos.dolarBCV.promedio,
            fechaAnterior: fechaAnterior,
            fechaActualizacion: datos.dolarBCV.fechaActualizacion,
            origen: 'importado',
          }

          actualizarDolarBCV(nuevoDolarBCV)
        }

        saveProductsInLocal()
      }
      cargando.value = false
    } else {
      throw new Error('El archivo JSON no tiene el formato correcto.')
    }
  }

  lector.onerror = () => {
    error.value = 'Error al leer el archivo'
  }

  lector.readAsText(archivo)
}

// Modificar las funciones existentes para usar Firestore
async function addProduct() {
  if (!handleProduct.value.name) {
    error.value = 'El nombre del producto es requerido'
    return
  }

  const product: Product = {
    id: 'temp_' + Date.now(), // ID temporal
    name: handleProduct.value.name.trim(),
    price: handleProduct.value.price || 0,
    category_id: handleProduct.value.category_id,
    brand_id: handleProduct.value.brand_id || null,
    measurement_id: handleProduct.value.measurement_id,
    measurement_value: handleProduct.value.measurement_value,
    currency_type: handleProduct.value.currency_type,
    created_at: handleProduct.value.created_at || new Date().toISOString().split('T')[0],
    marked_to_create: true,
  }

  console.log('Producto para agregar:', product)

  try {
    // 1. Agregar localmente
    products.value.unshift(product)
    saveProductsInLocal()

    // 3. Limpiar formulario
    resetearFormulario()

    // 2. Intentar sincronización inmediata si hay conexión
    if (onFireStore && navigator.onLine) {
      await syncPendingProducts()
    }
  } catch (err) {
    error.value = 'Error al agregar el producto'
    console.error(err)
  }
}

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

async function resetearFormulario() {
  handleProduct.value = {
    name: '',
    price: 0,
    category_id: '',
    brand_id: '',
    measurement_id: '',
    measurement_value: 0,
    currency_type: 'USD',
    tempPrice: 0,
    created_at: new Date().toISOString().split('T')[0],
    updated_at: new Date().toISOString().split('T')[0],
    marked_to_create: true,
  }

  // Limpiar buscadores
  clearCategory()
  clearBrand()

  categorySearch.query = ''
  brandSearch.query = ''

  const close = await boxyModal.close('formProductModal')
  mostrarFormulario.value = close ?? false
  typeAction.value = 'create'
}

// Guardar datos en LocalStorage
function saveProductsInLocal() {
  const productsToLocal: Product[] = products.value
  localStorage.setItem(STORAGE_KEY, JSON.stringify(productsToLocal))
  console.log('Productos guardados en LocalStorage:', productsToLocal.length)
}

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

  // Cargar valores de categoría y marca si existen
  if (product.category_id) {
    try {
      const categoryDoc = await getDoc(doc(db, CATEGORIAS_COLLECTION, product.category_id))
      if (categoryDoc.exists()) {
        categorySearch.selectedItem = {
          id: categoryDoc.id,
          name: categoryDoc.data().name,
        }
        categorySearch.query = categoryDoc.data().name
      }
    } catch (err) {
      console.error('Error cargando categoría:', err)
    }
  }

  if (product.brand_id) {
    try {
      const brandDoc = await getDoc(doc(db, MARCAS_COLLECTION, product.brand_id))
      if (brandDoc.exists()) {
        brandSearch.selectedItem = {
          id: brandDoc.id,
          name: brandDoc.data().name,
        }
        brandSearch.query = brandDoc.data().name
        handleProduct.value.brand_id = brandDoc.id
      }
    } catch (err) {
      console.error('Error cargando marca:', err)
    }
  }

  // Mostrar el formulario con los datos del producto
  handleProduct.value = { ...product, tempPrice: product.price }
  mostrarFormulario.value = true
  console.log(mostrarFormulario.value)
  // Aquí podrías agregar lógica para abrir un modal o formulario de edición
  boxyModal.open('formProductModal')
}

async function editProduct(id: string) {
  console.log('Editado producto con ID:', id)
  if (!id) return

  products.value = products.value.map((p) => {
    if (String(p.id) === id) {
      return {
        ...p,
        name: handleProduct.value.name.trim(),
        price: handleProduct.value.price || 0,
        category_id: handleProduct.value.category_id,
        brand_id: handleProduct.value.brand_id,
        measurement_id: handleProduct.value.measurement_id,
        measurement_value: handleProduct.value.measurement_value,
        currency_type: handleProduct.value.currency_type,
        updated_at: new Date().toISOString().split('T')[0],
        marked_to_update: true, // Marcar como pendiente de actualización
      }
    }
    return p
  })

  resetearFormulario()

  if (onFireStore && navigator.onLine && isOnline.value) {
    await syncPendingProducts()
  }
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

    // Si existe el producto, se le agrega la marca de eliminación
    products.value[index].marked_to_delete = true

    // Si está sincronizado, eliminar de Firestore
    if (onFireStore && navigator.onLine && isOnline.value) {
      await syncPendingProducts()
    } else {
      saveProductsInLocal()
    }

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

async function syncPendingProducts() {
  let pendingCount = 0
  try {
    if (!navigator.onLine) {
      console.log('Sin conexión, omitiendo sincronización')
      return
    }

    console.log('Iniciando sincronización de productos pendientes...')

    // Sincronizar productos nuevos
    const newProducts = products.value.filter((p) => p.marked_to_create)
    // Sincronizar productos editados
    const editProducts = products.value.filter((p) => p.marked_to_update)

    // Sincronizar productos eliminados
    const productsToDelete = products.value
      .filter((p) => p.marked_to_delete && p.id)
      .map((p) => p.id!)
    console.log('Productos pendientes para sincronizar:', newProducts.length)

    // Recorrido para crear nuevos productos
    for (const newProduct of newProducts) {
      console.log('Creando producto', newProduct, ' en FireStore')
      try {
        // Verificar si el producto ya existe en Firebase
        if (newProduct.id) {
          const docRef = doc(db, PRODUCTOS_COLLECTION, newProduct.id)
          const docSnap = await getDoc(docRef)

          // console.log(docRef);
          if (docSnap.exists()) {
            console.log(`Producto ${newProduct.id} ya existe en Firebase.`)
          } else {
            console.log(`Producto ${newProduct.id} no existe en Firebase, creando nuevo...`)
            await createProductInFireStore(newProduct)
            pendingCount += 1
          }
        } else {
          await createProductInFireStore(newProduct)
        }
      } catch (error) {
        console.error(`Error al sincronizar producto ${newProduct.id}:`, error)
      }
    }

    // Sincronizar eliminaciones
    for (const id of productsToDelete) {
      if (id) {
        try {
          const docRef = doc(db, PRODUCTOS_COLLECTION, id)
          const docSnap = await getDoc(docRef)

          const productId = await getProductByData(id, 'id')

          if (docSnap.exists()) {
            console.log(`Eliminando producto ${id} de Firebase...`)
            await deleteDoc(docRef)

            // Eliminar completamente del estado local
            products.value = products.value.filter((p) => p.id !== id)
            pendingCount += 1
          } else if (productId) {
            console.log('entra aqui')
            const docRef2 = doc(db, PRODUCTOS_COLLECTION, productId)

            const docSnap2 = await getDoc(docRef2)

            if (docSnap2.exists()) {
              console.log(`Eliminando producto ${id} de Firebase...`)
              await deleteDoc(docRef2)
            }

            // Eliminar completamente del estado local
            products.value = products.value.filter((p) => p.id !== id)
            pendingCount += 1
          } else {
            console.log(`Producto ${id} no existe en Firebase, eliminando localmente...`)
            // Solo eliminar localmente si no existe en Firebase
            products.value = products.value.filter((p) => p.id !== id)
          }
        } catch (error) {
          console.error(`Error al eliminar producto ${id}:`, error)
        }
      }
    }

    //Sincronizar Actualizaciones
    for (const editProduct of editProducts) {
      if (editProduct) {
        console.log(editProduct)
        try {
          if (!editProduct.id) {
            console.error('editProduct.id is undefined')
            continue
          }
          const docRef = doc(db, PRODUCTOS_COLLECTION, String(editProduct.id))
          const docSnap = await getDoc(docRef)

          if (docSnap.exists()) {
            console.log(`Actualizando producto ${editProduct.id} en Firebase...`)
            const { ...productToUpdate } = editProduct
            await updateDoc(docRef, {
              ...productToUpdate,
              updated_at: new Date().toISOString().split('T')[0],
            })
            pendingCount += 1
          }
        } catch (error) {
          console.error(`Error al actualizar producto ${editProduct.id}:`, error)
        }
      }
    }

    // Actualizar localStorage después de la sincronización
    saveProductsInLocal()
    console.log(`Sincronización completa. Productos pendientes sincronizados: ${pendingCount}`)
  } catch (error) {
    console.error('Error en la sincronización global:', error)
  }
}

async function createProductInFireStore(product: Product) {
  // 1. DEFINE TU ID PERSONALIZADO
  const customId = 'product-' + Date.now()

  const productToCreate = {
    id: product.id && !product.id.startsWith('temp_') ? product.id : customId,
    name: product.name.trim(),
    price: product.price || 0,
    category_id: product.category_id,
    brand_id: product.brand_id || null,
    measurement_id: product.measurement_id,
    measurement_value: product.measurement_value,
    currency_type: product.currency_type,
    created_at: product.created_at || new Date().toISOString().split('T')[0],
    updated_at: new Date().toISOString().split('T')[0], // Siempre actualiza en la creación/modificación
  }

  // 2. CREA LA REFERENCIA AL DOCUMENTO CON TU ID
  const docRef = doc(db, PRODUCTOS_COLLECTION, productToCreate.id)

  // 3. USA setDoc PARA GUARDAR EL DOCUMENTO
  await setDoc(docRef, productToCreate)

  const index = products.value.findIndex((p) => p.id === product.id) // Busca por el ID temporal
  if (index !== -1) {
    products.value[index].id = customId // Actualiza con el ID personalizado final
    products.value[index].marked_to_create = false
  }

  return productToCreate as Product
}

function exportToJSON() {
  const datos = {
    productos: products.value,
    dolarBCV: {
      promedio: dolarBCV.value?.promedio,
      fechaActualizacion: dolarBCV.value?.fechaActualizacion,
    },
  }

  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `productos-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Update: Limpiar LocalStorage
function limpiarLocalStorage() {
  if (confirm('¿Estás seguro de que quieres borrar todos los datos guardados?')) {
    // localStorage.removeItem(STORAGE_KEY)
    // productos.value = []
  }
}

function recargarDatosIniciales() {
  if (confirm('¿Estás seguro de que quieres recargar los datos iniciales?')) {
    cargarDatosIniciales()
      .then(() => {
        console.log('Datos recargados correctamente')
      })
      .catch((err) => {
        console.error('Error al recargar datos:', err)
      })
  }
}

// Definir filteredProducts como un computed que filtra el array reactivo
const filteredProducts = computed(() => {
  return products.value.filter((p) => !p.marked_to_delete)
})

async function getProductByData(value: string, field: string): Promise<string | null> {
  try {
    // 1. Crear una consulta que filtre por el campo buscado' en Firestore
    const productsQuery = query(collection(db, PRODUCTOS_COLLECTION), where(field, '==', value))

    const productSnapshot = await getDocs(productsQuery)

    // 2. Verificar si se encontraron documentos
    if (productSnapshot.empty) {
      return null
    }

    // 3. Asumimos que el valor es único, por lo que tomamos el primer resultado
    const docSnapshot = productSnapshot.docs[0]

    return docSnapshot.id
  } catch (error) {
    console.error(`Error al obtener el producto con campo ${field} = ${value}:`, error)
    return null
  }
}

// Computed puro solo para el cálculo de conversión
const precioConvertido = computed(() => {
  const { tempPrice, currency_type: moneda } = handleProduct.value
  const tasaDolar = dolarBCV.value?.promedio ?? 1

  if (!tempPrice || tempPrice <= 0) return '0.00'
  if (tasaDolar <= 0) return '0.00'

  let newPrice = 0

  if (moneda === 'USD') {
    newPrice = tempPrice * tasaDolar
  } else {
    newPrice = tempPrice / tasaDolar
  }

  return newPrice.toFixed(2)
})

// Watch para manejar las asignaciones a handleProduct.value.price
watch(
  [
    () => handleProduct.value.tempPrice,
    () => handleProduct.value.currency_type,
    () => dolarBCV.value?.promedio,
  ],
  ([tempPrice, moneda, tasaDolar]) => {
    if (!tempPrice || tempPrice <= 0) {
      handleProduct.value.price = 0
      return
    }

    const tasa = tasaDolar ?? 1
    if (tasa <= 0) {
      handleProduct.value.price = 0
      return
    }

    if (moneda === 'USD') {
      // Cuando la moneda es USD, guardamos el precio original
      handleProduct.value.price = tempPrice
    } else {
      // Cuando la moneda es local, convertimos a USD y guardamos
      const priceInUSD = tempPrice / tasa
      handleProduct.value.price = parseFloat(priceInUSD.toFixed(2))
    }
  },
  { immediate: true }, // Ejecutar inmediatamente al inicializar
)

function getMeasurementType(id: string): string {
  const measurement = measurements.value.find((m) => m.id === id)
  return measurement ? measurement.type : ''
}
</script>

<style scoped>
.searchable-select {
  position: relative;
  width: 100%;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  border-color: #2196f3;
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.1);
}

.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-top: 4px;
}

.dropdown-item {
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 14px;
  border-bottom: 1px solid #f0f0f0;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover {
  background-color: #f5f5f5;
}

.dropdown-item.new-item {
  color: #2196f3;
  font-style: italic;
  font-weight: 500;
}

.selected-item {
  margin-top: 8px;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.clear-btn {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.clear-btn:hover {
  background-color: rgba(0, 0, 0, 0.1);
  color: #f44336;
}

.loading-spinner {
  padding: 8px 12px;
  text-align: center;
  color: #666;
  font-size: 12px;
  font-style: italic;
}

/* Ajustes para el formulario */
.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-weight: 500;
  color: #333;
}

.form-group input:not(.search-input),
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.form-actions button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.form-actions button[type='submit'] {
  background-color: #2196f3;
  color: white;
}

.form-actions button[type='submit']:hover {
  background-color: #0b7dda;
}

.form-actions button[type='button'] {
  background-color: #f5f5f5;
  color: #333;
}

.form-actions button[type='button']:hover {
  background-color: #e0e0e0;
}

/* Responsive */
@media (max-width: 768px) {
  .searchable-select {
    width: 100%;
  }

  .form-actions {
    flex-direction: column;
  }

  .form-actions button {
    width: 100%;
  }
}
</style>
