<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted, inject, type Ref } from 'vue'
import boxyModal from '@js/boxy-modal.esm';

import {
  collection,
  doc,
  addDoc,
  getDocs,
  // setDoc,
  deleteDoc,
  // onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp,
  getDoc
} from 'firebase/firestore'
import { db } from '../firebase.config'

// Interfaces y tipos
import type { Product, DolarBCV } from '../types/producto'

// Datos de configuración
const onTesting = true;
const onFireStore = true;

const STORAGE_KEY = 'productos-app-data'
const PRODUCTOS_COLLECTION = 'productos' // Nombre de la colección en Firestore

const { dolarBCV: dolarBCV, actualizarDolarBCV } = inject<{
  dolarBCV: Ref<DolarBCV | null>;
  actualizarDolarBCV: (nuevoValor: DolarBCV) => void;
}>('dolarBCV')!; // El ! asume que siempre estará disponible

const products = ref<Product[]>([])
const tasaDolar = ref<number>(0)
const origenTasa = ref<'api' | 'local' | null>(null)
const error = ref<string | null>(null)
const cargando = ref<boolean>(false)
const newProduct = ref<Product>({
  name: '',
  price: 0,
  weight: '',
  created_at: new Date().toISOString().split('T')[0],
  updated_at: new Date().toISOString().split('T')[0],
  marked_to_create: true,
})
const mostrarFormulario = ref<boolean>(false)
const tasaLocal = ref<number | null>(null)
const tasaApi = ref<number | null>(null)

// Configurar listener en tiempo real
onMounted(() => {
  // 1. Cargar datos locales primero para una respuesta rápida
  loadProductsFromLocal();

  // 2. Cargar datos de Firebase y sincronizar
  cargarDatosIniciales().then(() => {
    if (onFireStore) {
      // Sincronizar cualquier cambio pendiente
      // syncPendingProducts();
    }

  });

  // 3. Configurar sincronización periódica
  const intervalo = setInterval(() => {
    if (navigator.onLine) {
      // syncPendingProducts();
    }
  }, 30000); // Cada 30 segundos

  // Limpiar intervalo al desmontar
  onUnmounted(() => clearInterval(intervalo));

  // Cargar datos iniciales
  // cargarDatosIniciales()

  // Configurar listener para productos
  // const productsQuery = query(collection(db, PRODUCTOS_COLLECTION), orderBy('createdAt', 'desc'))
  // const unsubscribeProductos = onSnapshot(productsQuery, (snapshot) => {
  //   productos.value = snapshot.docs.map(doc => ({
  //     id: doc.id,
  //     ...doc.data()
  //   })) as Producto[]
  // })

  // Cargar datos iniciales
  // cargarTasaDolar()

  // Limpiar listeners al desmontar el componente
  onUnmounted(() => {
    // unsubscribeProductos()
  })
})

// Cargar datos del LocalStorage al iniciar
function loadProductsFromLocal() {
  const localData = localStorage.getItem(STORAGE_KEY)
  if (localData) {
    try {
      const data = JSON.parse(localData)
      const localProducts: Product[] = data || []

      products.value = localProducts

      console.log('Productos cargados desde LocalStorage:', localProducts.length)
    } catch (err) {
      console.error('Error al cargar datos del LocalStorage:', err)
    }
  }
}

// Función principal para cargar datos iniciales
async function cargarDatosIniciales() {
  cargando.value = true

  try {
    // Cargar productos
    if (onFireStore) {
      await loadProductsFromFireStore()
    }

  } catch (err) {
    console.error('Error al cargar datos iniciales:', err)
    error.value = 'Error al cargar datos. Intente nuevamente.'
  } finally {
    cargando.value = false
  }
}

// Función específica para cargar productos
async function loadProductsFromFireStore(): Promise<void> {

  try {
    // 1. Obtener productos de FireStore
    const productsQuery = query(
      collection(db, PRODUCTOS_COLLECTION),
      orderBy('fecha', 'desc')
    );
    const productosSnapshot = await getDocs(productsQuery);

    // 2. Mapear y validar los datos
    const loadedProducts = productosSnapshot.docs.map(doc => {
      return {
        id: doc.id,
        ...(doc.data() as Omit<Product, 'id'>),
      } as Product;
    });

    // Validar que los productos sean iguales
    if (JSON.stringify(loadedProducts) == JSON.stringify(products.value)) {
      console.log('No hay cambios en los productos de Firestore');
      return;
    }

    // 3. Actualizar el estado reactivo
    products.value = loadedProducts;

    // 4. Guardar en LocalStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loadedProducts));
    console.log('Productos guardados en LocalStorage', loadedProducts.length);

  } catch (err) {
    // Update:
    // Notificación que se están usando los productos locales
    console.info('Error al cargar productos de la nube, usando datos locales si existen', err);
  }
}
// Cargar productos desde Archivo JSON externo
function cargarArchivo(event: Event) {
  const input = event.target as HTMLInputElement
  const archivo = input.files?.[0]

  if (!archivo) return

  const lector = new FileReader()
  lector.onload = (e) => {
    try {
      const resultado = e.target?.result as string
      const datos = JSON.parse(resultado)

      if (datos.productos && Array.isArray(datos.productos)) {
        productos.value = datos.productos.map((p: Producto) => ({
          ...p,
          id: p.id || generarId(),
        }))

        const fechaImportada = new Date(datos.dolarBCV.fechaActualizacion);
        const fechaActual = new Date(dolarBCV.value?.fechaActualizacion || 0);

        if (datos.dolarBCV) {
          console.log(fechaImportada >= fechaActual, dolarBCV.value?.origen == 'local')
          if (fechaImportada >= fechaActual && dolarBCV.value?.origen == 'local') {
            const fechaAnterior = dolarBCV.value?.fechaActualizacion || null

            // Actualizar tasa de dólar
            const nuevoDolarBCV: DolarBCV = {
              promedio: datos.dolarBCV.promedio,
              fechaAnterior: fechaAnterior,
              fechaActualizacion: datos.dolarBCV.fechaActualizacion,
              origen: 'importado',
            };

            actualizarDolarBCV(nuevoDolarBCV);
          }

          saveProductsInLocal()
        }

      } else {
        throw new Error('El archivo JSON no tiene el formato correcto.')
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error al leer el archivo'
    }
  }

  lector.onerror = () => {
    error.value = 'Error al leer el archivo'
  }

  lector.readAsText(archivo)
}

// Modificar las funciones existentes para usar Firestore
async function addProduct() {
  if (!newProduct.value.name) {
    error.value = 'El nombre del producto es requerido';
    return;
  }

  const product: Product = {
    id: 'temp_' + Date.now(), // ID temporal
    name: newProduct.value.name.trim(),
    price: newProduct.value.price || 0,
    weight: newProduct.value.weight || '',
    created_at: newProduct.value.created_at || new Date().toISOString().split('T')[0],
    marked_to_create: true,
  };

  console.log('Producto para agregar:', product);

  try {
    // 1. Agregar localmente
    products.value.unshift(product);
    saveProductsInLocal();

    // 2. Intentar sincronización inmediata si hay conexión
    if (onFireStore && navigator.onLine) {
      await syncPendingProducts();
    }

    // 3. Limpiar formulario
    resetearFormulario();
  } catch (err) {
    error.value = 'Error al agregar el producto';
    console.error(err);
  }
}

// Helpers
function generarId() {
  return productos.value.length > 0 ? Math.max(...productos.value.map((p) => Number(p.id) || 0)) + 1 : 1
}

async function resetearFormulario() {
  newProduct.value = {
    name: '',
    price: 0,
    weight: '',
    updated_at: new Date().toISOString().split('T')[0],
  }


  const close = await boxyModal.closePopupScreen("test");


  mostrarFormulario.value = close ?? false
  error.value = null

  // let modal = document.querySelector('.b-modal[modal="test"]');


  // if (!modal) return;
  //  modal.classList.add("closed");
  //   setTimeout(() => {
  //       modal.classList.remove("opened");
  //       modal.classList.remove("closed");
  //   }, 400);
}

// Guardar productos en FiresStore
// async function guardarProductos() {
//   try {
//     // Primero borramos todos los productos existentes (esto es simplificado)
//     const querySnapshot = await getDocs(collection(db, PRODUCTOS_COLLECTION))
//     querySnapshot.forEach(async (document) => {
//       await deleteDoc(doc(db, PRODUCTOS_COLLECTION, document.id))
//     })

//     // Luego guardamos los nuevos
//     const batch = writeBatch(db)
//     productos.value.forEach(producto => {
//       const docRef = doc(collection(db, PRODUCTOS_COLLECTION))
//       batch.set(docRef, {
//         nombre: producto.nombre,
//         precio: producto.precio,
//         precioBs: producto.precioBs,
//         peso: producto.peso,
//         fecha: producto.fecha,
//         createdAt: serverTimestamp()
//       })
//     })
//     await batch.commit()
//   } catch (err) {
//     console.error('Error al guardar productos:', err)
//     // Fallback a localStorage
//     saveProductsInLocal()
//   }
// }

// Guardar datos en LocalStorage
function saveProductsInLocal() {
  const productsToLocal: Product[] = products.value;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(productsToLocal));
  console.log('Productos guardados en LocalStorage:', productsToLocal.length);
}

// Determinar la mejor tasa disponible
// function determinarMejorTasa(apiData: DolarData | null) {
//   if (apiData) {
//     // Priorizar API si está disponible
//     tasaDolar.value = apiData.promedio
//     origenTasa.value = 'api'
//     fechaActualizacion.value = apiData.fechaActualizacion
//     saveProductsInLocal()
//   } else if (tasaLocal.value) {
//     // Usar tasa local si no hay datos de API
//     tasaDolar.value = tasaLocal.value
//     origenTasa.value = 'local'
//   } else {
//     // No hay tasas disponibles
//     tasaDolar.value = 0
//     origenTasa.value = null
//   }
// }


// async function sincronizarProductoConFirebase(producto: Producto) {
//   try {
//     // Eliminar el ID temporal y la marca de sincronización
//     const { id, sincronizado, ...productoSinId } = producto;

//     // Agregar a Firebase
//     const docRef = await addDoc(collection(db, PRODUCTOS_COLLECTION), {
//       ...productoSinId,
//       createdAt: serverTimestamp()
//     });

//     // Actualizar el producto local con el ID real de Firebase
//     const index = productos.value.findIndex(p => p.id === producto.id);
//     if (index !== -1) {
//       productos.value[index] = {
//         ...productos.value[index],
//         id: docRef.id,
//         sincronizado: true
//       };
//       saveProductsInLocal();
//     }

//     console.log('Producto sincronizado con Firebase:', docRef.id);
//   } catch (error) {
//     console.error('Error al sincronizar producto con Firebase:', error);
//     // Podrías agregar lógica de reintento aquí
//   }
// }

async function deleteProduct(id: string) {

  if (onTesting) {
    console.log('Eliminando producto con ID:', id);
  }

  if (!id) return;

  try {
    const index = products.value.findIndex(p => {
      return String(p.id) === id;
    });

    if (index === -1) {
      console.log('Producto no encontrado:', id);
      return;
    }

    // Si existe el producto, se le agrega la marca de eliminación
    products.value[index].marked_to_delete = true;

    // Si está sincronizado, eliminar de Firestore
    if (onFireStore && navigator.onLine) {
      await syncPendingProducts();

    } else {
      saveProductsInLocal();
    }



    // Intentar sincronización inmediata si hay conexión

  } catch (err) {
    error.value = 'Error al eliminar el producto';
    console.error(err);
  }
}

// async function eliminarProductoDeFirebase(id: string) {
//   try {
//     await deleteDoc(doc(db, PRODUCTOS_COLLECTION, id));
//     console.log('Producto eliminado de Firebase:', id);
//   } catch (error) {
//     console.error('Error al eliminar producto de Firebase:', error);
//     // Podrías agregar lógica de reintento aquí
//   }
// }

async function syncPendingProducts() {
  let pendingCount = 0;
  try {
    if (!navigator.onLine) {
      console.log('Sin conexión, omitiendo sincronización');
      return;
    }

    console.log('Iniciando sincronización de productos pendientes...');

    // Sincronizar productos nuevos o modificados
    const newProducts = products.value.filter(
      p => p.marked_to_create
    );
    console.log('Productos pendientes para sincronizar:', newProducts.length);

    for (const newProduct of newProducts) {
      console.log("Creando producto", newProduct, " en FireStore")
      try {
        // Verificar si el producto ya existe en Firebase
        if (newProduct.id) {
          const docRef = doc(db, PRODUCTOS_COLLECTION, newProduct.id);
          const docSnap = await getDoc(docRef);

          // console.log(docRef);
          if (docSnap.exists()) {
            console.log(`Producto ${newProduct.id} ya existe en Firebase.`);

          } else {
            console.log(`Producto ${newProduct.id} no existe en Firebase, creando nuevo...`);
            await createProductInFireStore(newProduct);
            pendingCount += 1;
          }
        } else {
          await createProductInFireStore(newProduct);
        }
      } catch (error) {
        console.error(`Error al sincronizar producto ${newProduct.id}:`, error);
      }
    }

    // Sincronizar eliminaciones
    const productsToDelete = products.value
      .filter(p => p.marked_to_delete && p.id)
      .map(p => p.id);
    //  -------------------------
  

    // console.log('Productos en firebase', loadedProducts)
    
    // -----------------
    for (const id of productsToDelete) {
      if (id) {
        try {
          const docRef = doc(db, PRODUCTOS_COLLECTION, id);
          const docSnap = await getDoc(docRef);

          console.log("Test", await getProductByName(id));

          if (docSnap.exists()) {
            console.log(`Eliminando producto ${id} de Firebase...`);
            await deleteDoc(docRef);

            // Eliminar completamente del estado local
            products.value = products.value.filter(p => p.id !== id);
            pendingCount += 1;
          } else {
            console.log(`Producto ${id} no existe en Firebase, eliminando localmente...`);
            // Solo eliminar localmente si no existe en Firebase
            products.value = products.value.filter(p => p.id !== id);
          }
        } catch (error) {
          console.error(`Error al eliminar producto ${id}:`, error);
        }
      }
    }

    // Actualizar localStorage después de la sincronización
    saveProductsInLocal();
    console.log(`Sincronización completa. Productos pendientes sincronizados: ${pendingCount}`);
  } catch (error) {
    console.error('Error en la sincronización global:', error);
  }
}

async function createProductInFireStore(product: Product) {

  const productToCreate: Product = {
    id: product.id,
    name: product.name.trim(),
    price: product.price || 0,
    weight: product.weight || '',
    created_at: product.created_at || new Date().toISOString().split('T')[0],
    updated_at: product.updated_at || new Date().toISOString().split('T')[0]
  }
  const docRef = await addDoc(collection(db, PRODUCTOS_COLLECTION), productToCreate);

  // Actualizar el estado local con el ID real de Firebase
  const index = products.value.findIndex(p => p.id === product.id);
  if (index !== -1) {
    products.value[index].id = docRef.id;
    products.value[index].marked_to_create = false; // Marcar como no pendiente de creación
  }

  return docRef.id;
}

// async function actualizarProductoEnFirebase(producto: Producto) {
//   if (!producto.id) return;

//   const { id, sincronizado, ...productoSinId } = producto;
//   await setDoc(doc(db, PRODUCTOS_COLLECTION, id), {
//     ...productoSinId,
//     updatedAt: serverTimestamp()
//   }, { merge: true });

//   // Marcar como sincronizado en el estado local
//   const index = productos.value.findIndex(p => p.id === producto.id);
//   if (index !== -1) {
//     productos.value[index] = {
//       ...productos.value[index],
//       sincronizado: true,
//       marcadoParaEliminar: false
//     };
//   }
// }

function exportarAJSON() {
  const datos = {
    productos: productos.value,
    tasaDolar: tasaDolar.value,
    origenTasa: origenTasa.value,
    fechaExportacion: new Date().toISOString(),
    tasaLocal: tasaLocal.value,
    tasaApi: tasaApi.value,
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
    cargarDatosIniciales().then(() => {
      console.log('Datos recargados correctamente');
    }).catch(err => {
      console.error('Error al recargar datos:', err);
    });
  }
}
// Definir filteredProducts como un computed que filtra el array reactivo
const filteredProducts = computed(() => {
  return products.value.filter(p => !p.marked_to_delete)
})


// function getAllProducts (){
//     const productsQuery = query(
//       collection(db, PRODUCTOS_COLLECTION),
//       orderBy('fecha', 'desc')
//     );
//     const productosSnapshot = await getDocs(productsQuery);


//     // console.log('Productos en firebase', productosSnapshot.docs)
//     // 2. Mapear y validar los datos
//     const loadedProducts = productosSnapshot.docs.map(doc => {
//       return {
//         id: doc.id,
//         ...(doc.data() as Omit<Product, 'id'>),
//       } as Product;
//     });

//     return loadedProducts;
// }

export async function getProductByName(id: string): Promise<Product | null> {
  try {
    // 1. Crear una consulta que filtre por el campo 'name' en Firestore
    const productsQuery = query(
      collection(db, PRODUCTOS_COLLECTION),
      where('name', '==', id)
    );

    const productSnapshot = await getDocs(productsQuery);

    // 2. Verificar si se encontraron documentos
    if (productSnapshot.empty) {
      console.log(`No se encontró ningún producto con el nombre: ${name}`);
      return null;
    }

    // 3. Asumimos que el nombre es único, por lo que tomamos el primer resultado
    const docSnapshot = productSnapshot.docs[0];
    const product = {
      id: docSnapshot.id,
      ...docSnapshot.data(),
    } as Product;

    return product;
  } catch (error) {
    console.error(`Error al obtener el producto con nombre ${name}:`, error);
    return null;
  }
}
</script>

<template>
  <main class="container">
    <div>
      <h1>Lista de Productos</h1>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <div class="controls">
        <input type="file" accept=".json" @change="cargarArchivo" class="file-input" :disabled="cargando" />

        <button @click="mostrarFormulario = true" class="add-button" open-modal="test">Agregar Producto</button>

        <button @click="exportarAJSON" class="export-button">Exportar a JSON</button>

        <button @click="limpiarLocalStorage" class="clear-button">Limpiar Datos</button>

        <button @click="recargarDatosIniciales" class="reload-button">Recargar Datos</button>
      </div>

      <div v-if="cargando" class="loading">Cargando datos...</div>

      <div v-else>

        <!-- Formulario para agregar nuevo producto -->
        <div class="b-modal" persistent modal="test" fx="in-out" :class="{ opened: mostrarFormulario }">
          <div bx-content>
            <button maximize-modal>max</button>
            <button close-modal>close</button>
            <button onclick="closePopupScreen('test')">close new</button>
            <div class="form-container" v-if="mostrarFormulario">
              <h2>Agregar Nuevo Producto</h2>
              <form @submit.prevent="addProduct">
                <div class="form-group">
                  <label>Nombre:</label>
                  <input v-model="newProduct.name" required />
                </div>

                <div class="form-group">
                  <label>Precio ($):</label>
                  <input v-model.number="newProduct.price" type="number" step="0.01" />
                </div>

                <div class="form-group">
                  <label>Peso:</label>
                  <input v-model="newProduct.weight" />
                </div>

                <div class="form-group">
                  <label>Fecha:</label>
                  <input v-model="newProduct.updated_at" type="date" />
                </div>

                <div class="form-actions">
                  <button type="submit">Guardar</button>
                  <button type="button" @click="resetearFormulario" close-modal>Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        </div>


        <table v-if="products.length" class="product-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Precio ($)</th>
              <th>Precio (Bs)</th>
              <th>Peso</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="product in filteredProducts" :key="product.id">
              <td>{{ product.id }}</td>
              <td>{{ product.name }}</td>
              <td>{{ product.price?.toFixed(2) || '-' }}</td>
              <td>{{ (product.price && dolarBCV?.promedio) ? (product.price * dolarBCV.promedio).toFixed(2) : '-' }}
              </td>
              <td>{{ product.weight || '-' }}</td>
              <td>{{ product.created_at || '-' }}</td>
              <td>
                <button @click="deleteProduct(String(product.id))" class="delete-button" title="Eliminar">
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
