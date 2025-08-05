<template>
  <main class="container">
    <div>
      <h1>Lista de Productos</h1>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <div class="controls">
        <input type="file" accept=".json" @change="loadFiles" class="file-input" :disabled="cargando" />

        <button @click="mostrarFormulario = true" class="add-button" open-modal="test">Agregar Producto</button>

        <button @click="exportToJSON" class="export-button">Exportar a JSON</button>

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


<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted, inject, type Ref } from 'vue'
import boxyModal from '@js/boxy-modal.esm';

import {
  collection,
  doc,
  addDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
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
const isOnline = ref<boolean>(false)
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

const checkInternetConnection = async () => {
  const isOnline = ref(false);

  // Lista de endpoints para verificar (puedes agregar más)
  const testUrls = [
    'https://www.google.com/favicon.ico', // Pequeño y rápido de cargar
    'https://www.cloudflare.com/favicon.ico',
    'https://www.gstatic.com/favicon.ico'
  ];

  // Opciones para fetch (no-cache y timeout)
  const fetchOptions = {
    cache: 'no-store',
    mode: 'no-cors', // Solo necesitamos saber si la petición se completa
    method: 'HEAD' // Solo solicitamos las cabeceras (más rápido)
  };

  // Primero verificamos navigator.onLine (aunque no es confiable por sí solo)
  if (!navigator.onLine) {
    isOnline.value = false;
    return false;
  }

  // Intentamos con varios endpoints en paralelo
  try {
    // Creamos un timeout para evitar esperas prolongadas
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 3000)
    );

    // Probamos con todas las URLs en paralelo
    const fetchPromises = testUrls.map(url =>
      fetch(url, fetchOptions)
    );

    // Esperamos a que al menos una petición tenga éxito o que todas fallen
    await Promise.any([...fetchPromises, timeoutPromise]);
    isOnline.value = true;
    return true;
  } catch (error) {
    console.log('Sin conexión a internet:', error);
    isOnline.value = false;
    return false;
  }
};
// Configurar listener en tiempo real
onMounted(() => {

  const updateConnectionStatus = async () => {
    const online = await checkInternetConnection();
    isOnline.value = online
    return online;
  };

  updateConnectionStatus()

  // Verificar periódicamente (opcional)
  // setInterval(updateConnectionStatus, 30000); // Cada 30 segundos

  // Verificacion si esta online
  // fetch("https://google.com", { cache: 'no-store' }).then(() => {
  isOnline.value = true;
  // }).catch(() => {
  //   isOnline.value = false;
  // })
  // 1. Cargar datos locales primero para una respuesta rápida
  loadProductsFromLocal();

  // 2. Cargar datos de Firebase y sincronizar
  cargarDatosIniciales().then(() => {
    if (onFireStore && isOnline.value) {
      // Sincronizar cualquier cambio pendiente
      syncPendingProducts();
    }

  });

  // 3. Configurar sincronización periódica
  const intervalo = setInterval(() => {
    if (navigator.onLine && onFireStore && isOnline.value) {
      // syncPendingProducts();
    }
  }, 30000); // Cada 30 segundos

  // Limpiar intervalo al desmontar
  onUnmounted(() => clearInterval(intervalo));


  //Configurar listener para productos
  // const productsQuery = query(collection(db, PRODUCTOS_COLLECTION), orderBy('createdAt', 'desc'))
  // const unsubscribeProductos = onSnapshot(productsQuery, (snapshot) => {
  //   products.value = snapshot.docs.map(doc => ({
  //     id: doc.id,
  //     ...doc.data()
  //   })) as Product[]
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
    if (onFireStore && isOnline.value) {
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
      // orderBy('fecha', 'desc')
    );
    const productosSnapshot = await getDocs(productsQuery);

    // 2. Mapear y validar los datos
    const loadedProducts = productosSnapshot.docs.map(doc => {
      return {
        id: doc.id,
        ...(doc.data() as Omit<Product, 'id'>),
      } as Product;
    });



    // function arraysAreEqual(a: Product[], b: Product[]): boolean {
    //   if (a.length !== b.length) return false;

    //   const normalize = (obj: Product) =>
    //     JSON.stringify(obj, Object.keys(obj).sort());

    //   const setA = new Set(a.map(normalize));
    //   const setB = new Set(b.map(normalize));

    //   return a.every(item => setB.has(normalize(item))) &&
    //     b.every(item => setA.has(normalize(item)));
    // }

    // console.log(products.value)
    // console.log('¿Son iguales?', arraysAreEqual(loadedProducts, products.value));
    // // Validar que los productos sean iguales
    // if (arraysAreEqual(loadedProducts, products.value) || !isOnline.value) {
    //   console.log('No hay cambios en los productos de Firestore');
    //   return;
    // }

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
function loadFiles(event: Event) {
  const input = event.target as HTMLInputElement
  const archivo = input.files?.[0]

  if (!archivo) return

  const lector = new FileReader()
  lector.onload = (e) => {
    try {
      const resultado = e.target?.result as string
      const datos = JSON.parse(resultado)

      if (datos.productos && Array.isArray(datos.productos)) {
        products.value = datos.productos.map((p: Product) => ({
          ...p,
          id: p.id || generarId(),
        }))

        const fechaImportada = new Date(datos.dolarBCV.fechaActualizacion);
        const fechaActual = new Date(dolarBCV.value?.fechaActualizacion || 0);

        if (datos.dolarBCV) {
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
    if (onFireStore && navigator.onLine && isOnline.value) {
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
    if (onFireStore && navigator.onLine && isOnline.value) {
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

    const productsToDelete = products.value
      .filter(p => p.marked_to_delete && p.id)
      .map(p => p.id);
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
    for (const id of productsToDelete) {
      if (id) {
        try {
          const docRef = doc(db, PRODUCTOS_COLLECTION, id);
          const docSnap = await getDoc(docRef);

          const productId = await getProductByData(id, 'id');

          if (docSnap.exists()) {
            console.log(`Eliminando producto ${id} de Firebase...`);
            await deleteDoc(docRef);

            // Eliminar completamente del estado local
            products.value = products.value.filter(p => p.id !== id);
            pendingCount += 1;
          }
          else if (productId) {

            console.log("entra aqui")
            const docRef2 = doc(db, PRODUCTOS_COLLECTION, productId);

            const docSnap2 = await getDoc(docRef2);

            if (docSnap2.exists()) {
              console.log(`Eliminando producto ${id} de Firebase...`);
              await deleteDoc(docRef2);
            }

            // Eliminar completamente del estado local
            products.value = products.value.filter(p => p.id !== id);
            pendingCount += 1;
          }
          else {
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

// async function createProductInFireStore(product: Product) {

//   const productToCreate: Product = {
//     name: product.name.trim(),
//     price: product.price || 0,
//     weight: product.weight || '',
//     created_at: product.created_at || new Date().toISOString().split('T')[0],
//     updated_at: product.updated_at || new Date().toISOString().split('T')[0]
//   }
//   const docRef = await addDoc(collection(db, PRODUCTOS_COLLECTION), productToCreate);

//   // Actualizar el estado local con el ID real de Firebase
//   const index = products.value.findIndex(p => p.id === product.id);
//   if (index !== -1) {
//     products.value[index].id = docRef.id;
//     products.value[index].marked_to_create = false; // Marcar como no pendiente de creación
//   }

//   return docRef.id;
// }



async function createProductInFireStore(product: Product) {

  // 1. DEFINE TU ID PERSONALIZADO
  const customId = 'product-' + Date.now();

  const productToCreate = {
    id: customId,
    name: product.name.trim(),
    price: product.price || 0,
    weight: product.weight || '',
    created_at: product.created_at || new Date().toISOString().split('T')[0],
    updated_at: new Date().toISOString().split('T')[0] // Siempre actualiza en la creación/modificación
  };

  // 2. CREA LA REFERENCIA AL DOCUMENTO CON TU ID
  const docRef = doc(db, PRODUCTOS_COLLECTION, customId);

  // 3. USA setDoc PARA GUARDAR EL DOCUMENTO
  // setDoc no devuelve una referencia como addDoc, es una promesa que se resuelve cuando la escritura finaliza.
  await setDoc(docRef, productToCreate);

  // El resto de tu lógica para actualizar el estado local puede simplificarse
  // ya que ahora conoces el ID desde el principio.
  const index = products.value.findIndex(p => p.id === product.id); // Busca por el ID temporal
  if (index !== -1) {
    products.value[index].id = customId; // Actualiza con el ID personalizado final
    products.value[index].marked_to_create = false;
  }

  // Devuelves el ID que tú mismo creaste.
  return customId;
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

function exportToJSON() {
  const datos = {
    productos: products.value,
    dolarBCV: {
      promedio: dolarBCV.value?.promedio,
      fechaActualizacion: dolarBCV.value?.fechaActualizacion,
    }
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

async function getProductByData(value: string, field: string): Promise<string | null> {
  try {
    // 1. Crear una consulta que filtre por el campo buscado' en Firestore
    const productsQuery = query(
      collection(db, PRODUCTOS_COLLECTION),
      where(field, '==', value)
    );

    const productSnapshot = await getDocs(productsQuery);

    // 2. Verificar si se encontraron documentos
    if (productSnapshot.empty) {
      return null;
    }

    // 3. Asumimos que el valor es único, por lo que tomamos el primer resultado
    const docSnapshot = productSnapshot.docs[0];

    // const product = {
    //   id: docSnapshot.id,
    //   ...docSnapshot.data(),
    // } as Product;

    return docSnapshot.id;
  } catch (error) {
    console.error(`Error al obtener el producto con campo ${field} = ${value}:`, error);
    return null;
  }
}

</script>
