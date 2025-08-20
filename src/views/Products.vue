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
              <h2>{{ typeAction === 'edit' ? 'Editar Producto' : 'Agregar Nuevo Producto' }}</h2>
              <form @submit.prevent="handleAction">
                <div class="form-group">
                  <label>Nombre:</label>
                  <input v-model="handleProduct.name" required />
                </div>

                <div class="form-group">
                  <label>Precio ($):</label>
                  <input v-model.number="handleProduct.price" type="number" step="0.01" />
                </div>

                <div class="form-group">
                  <label>Peso:</label>
                  <input v-model="handleProduct.weight" />
                </div>

                <div class="form-group" v-if="typeAction === 'edit'">
                  <label>Fecha creación:</label>
                  <input disabled v-model="handleProduct.created_at" type="date" />
                </div>
                <div class="form-group">
                  <label>{{ typeAction === 'edit' ? 'Ultima actualización:' : 'Fecha:' }}</label>
                  <input :disabled="typeAction === 'edit'" v-model="handleProduct.updated_at" type="date" />
                </div>

                <div class="form-actions">
                  <button type="submit">{{ typeAction === 'edit' ? 'Actualizar' : 'Guardar' }}</button>
                  <button type="button" @click="resetearFormulario" close-modal>Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        </div>


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
                <div><span>{{ product.name }}</span><span v-if="product.weight"> - {{ product.weight }}</span>
                </div>
                <div><span>$ {{ product.price?.toFixed(2) || '-' }}</span> / <span>Bs. {{ (product.price &&
                  dolarBCV?.promedio) ? (product.price *
                    dolarBCV.promedio).toLocaleString('es-VE',
                      { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-' }}</span></div>

              </td>
              <td>{{ product.created_at || '-' }}</td>
              <td>
                <button @click="loadEditProduct(String(product.id))" class="edit-button" open-modal="test"
                  title="Editar">
                  ⚙
                </button>
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
defineOptions({ name: 'ProductsView' });

import { ref, onMounted, computed, onUnmounted, inject, type Ref } from 'vue'
import boxyModal from '@js/boxy-modal.esm';

import {
  collection,
  doc,
  // addDoc,
  getDocs,
  setDoc,
  deleteDoc,
  // onSnapshot,
  query,
  // orderBy,
  where,
  // serverTimestamp,
  updateDoc,
  getDoc
} from 'firebase/firestore'
import { db } from '../firebase.config'

// Interfaces y tipos
import type { Product, DolarBCV } from '../types/producto'

// Datos de configuración
const onTesting = true;
const onFireStore = true;
const typeAction = ref<'create' | 'edit'>('create');

const STORAGE_KEY = 'productos-app-data'
const PRODUCTOS_COLLECTION = 'productos' // Nombre de la colección en Firestore

const { dolarBCV: dolarBCV, actualizarDolarBCV } = inject<{
  dolarBCV: Ref<DolarBCV | null>;
  actualizarDolarBCV: (nuevoValor: DolarBCV) => void;
}>('dolarBCV')!; // El ! asume que siempre estará disponible

const products = ref<Product[]>([])
const error = ref<string | null>(null)
const cargando = ref<boolean>(false)
const isOnline = ref<boolean>(true)
const handleProduct = ref<Product>({
  name: '',
  price: 0,
  weight: '',
  created_at: new Date().toISOString().split('T')[0],
  updated_at: new Date().toISOString().split('T')[0],
  marked_to_create: true,
})
const mostrarFormulario = ref<boolean>(false)


// Configurar listener en tiempo real
onMounted(() => {
  // 1. Cargar datos locales primero para una respuesta rápida
  loadProductsFromLocal();

  // 2. Cargar datos de Firebase y sincronizar
  cargarDatosIniciales().then(() => {
    if (onFireStore && navigator.onLine) {
      // Sincronizar cualquier cambio pendiente
      syncPendingProducts();
    }

  });

  // 3. Configurar sincronización periódica
  const intervalo = setInterval(() => {
    if (navigator.onLine && onFireStore) {
      loadProductsFromFireStore();
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
  console.log("loadProductsFromFireStore")
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
async function loadFiles(event: Event) {
  const input = event.target as HTMLInputElement
  const archivo = input.files?.[0]
  input.value = '';

  if (!archivo) return

  const lector = new FileReader()
  lector.onload = async (e) => {
    // try {
    cargando.value = true;
    const resultado = e.target?.result as string
    const datos = JSON.parse(resultado)

    if (datos.productos && Array.isArray(datos.productos)) {
      const invalidProducts: Product[] = [];

      datos.productos.forEach(async (p: Product) => {
        console.log(p)
        // Verificar campos obligatorios
        if (!p.name || !p.price) {
          invalidProducts.push(p); // Almacenar producto inválido
        }

        if (p.id) {
          const docRef = doc(db, PRODUCTOS_COLLECTION, String(p.id));
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            console.log(`Producto ${p.id} ya existe en Firebase.`);

            const firebaseProduct = docSnap.data();

            // Convertimos las fechas a objetos Date para comparación
            const localCreatedAt = new Date(p.created_at || '');
            const firebaseCreatedAt = new Date(firebaseProduct.created_at || '');

            const localUpdatedAt = new Date(p.updated_at || '');
            const firebaseUpdatedAt = new Date(firebaseProduct.updated_at || '');

            // Primero comparamos created_at
            if (localCreatedAt.getTime() !== firebaseCreatedAt.getTime()) {
              // Si las fechas de creación son diferentes
              if (localCreatedAt > firebaseCreatedAt) {
                console.log(`Producto ${p.id} tiene fecha de creación más reciente. Actualizando...`);
                await updateDoc(docRef, { ...p });
              } else {
                console.log(`Producto ${p.id} en Firebase tiene fecha de creación más reciente. No se actualiza.`);
              }
            } else {
              // Si las fechas de creación son iguales, comparamos updated_at
              console.log('Fechas de creación iguales, comparando updated_at...');
              if (localUpdatedAt > firebaseUpdatedAt) {
                console.log(`Producto ${p.id} tiene actualización más reciente. Actualizando...`);
                await updateDoc(docRef, { ...p });
              } else {
                console.log(`Producto ${p.id} en Firebase ya está actualizado.`);
              }
            }
          } else {
            console.log(`Producto ${p.id} no existe en Firebase, creando nuevo...`);

            const product: Product = {
              id: String(p.id),
              name: p.name.trim(),
              price: Number(p.price),
              weight: p.weight || '',
              quantity: p.quantity || null,
              created_at: p.created_at || new Date().toISOString().split('T')[0],
              updated_at: p.updated_at || null,
            };

            products.value.unshift(await createProductInFireStore(product));

            // //Guardar en local
            // saveProductsInLocal();

            // // 2. Intentar sincronización inmediata si hay conexión
            // if (onFireStore && navigator.onLine && isOnline.value) {
            //   await syncPendingProducts();
            // }
          }
        }
        else {
          console.log("Producto sin ID")

          const product = {
            name: p.name.trim(),
            price: Number(p.price),
            weight: p.weight || '',
            quantity: p.quantity || null,
            created_at: p.created_at || new Date().toISOString().split('T')[0],
            updated_at: p.updated_at || null,
          };

          products.value.unshift(await createProductInFireStore(product));
        }
      });

      // Opcional: Mostrar advertencia si hay productos inválidos
      if (invalidProducts.length > 0) {
        console.warn('Productos inválidos encontrados:', invalidProducts);
        // También puedes emitir un evento o mostrar una notificación al usuario
      }

      console.log(products.value)
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
      cargando.value = false;
    } else {
      throw new Error('El archivo JSON no tiene el formato correcto.')
    }
    // } catch (err) {
    //   error.value = err instanceof Error ? err.message : 'Error al leer el archivo'
    // }
  }

  lector.onerror = () => {
    error.value = 'Error al leer el archivo'
  }

  lector.readAsText(archivo)
}

// Modificar las funciones existentes para usar Firestore
async function addProduct() {
  if (!handleProduct.value.name) {
    error.value = 'El nombre del producto es requerido';
    return;
  }

  const product: Product = {
    id: 'temp_' + Date.now(), // ID temporal
    name: handleProduct.value.name.trim(),
    price: handleProduct.value.price || 0,
    weight: handleProduct.value.weight || '',
    created_at: handleProduct.value.created_at || new Date().toISOString().split('T')[0],
    marked_to_create: true,
  };

  console.log('Producto para agregar:', product);

  try {
    // 1. Agregar localmente
    products.value.unshift(product);
    saveProductsInLocal();

    // 3. Limpiar formulario
    resetearFormulario();

    // 2. Intentar sincronización inmediata si hay conexión
    if (onFireStore && navigator.onLine) {
      await syncPendingProducts();
    }
  } catch (err) {
    error.value = 'Error al agregar el producto';
    console.error(err);
  }
}

async function handleAction() {
  if (typeAction.value === 'create') {
    await addProduct();
  } else if (typeAction.value === 'edit') {
    if (typeof handleProduct.value.id === 'string') {
      await editProduct(handleProduct.value.id);
    } else {
      error.value = 'ID de producto inválido para editar.';
    }
  }
}
async function resetearFormulario() {
  handleProduct.value = {
    name: '',
    price: 0,
    weight: '',
    updated_at: new Date().toISOString().split('T')[0],
  }

  const close = await boxyModal.closePopupScreen("test");
  mostrarFormulario.value = close ?? false

  typeAction.value = 'create';

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

async function loadEditProduct(id: string) {
  typeAction.value = 'edit';
  if (onTesting) {
    console.log('Editando producto con ID:', id);
  }

  if (!id) return;


  const product = products.value.find(p => String(p.id) === id);
  if (!product) {
    error.value = 'Producto no encontrado';
    return;
  }

  // Mostrar el formulario con los datos del producto
  handleProduct.value = { ...product };
  mostrarFormulario.value = true;
  console.log(mostrarFormulario.value);
  // Aquí podrías agregar lógica para abrir un modal o formulario de edición
}

async function editProduct(id: string) {
  console.log('Editado producto con ID:', id);
  if (!id) return;

  products.value = products.value.map(p => {
    if (String(p.id) === id) {
      return {
        ...p,
        name: handleProduct.value.name.trim(),
        price: handleProduct.value.price || 0,
        weight: handleProduct.value.weight || '',
        updated_at: new Date().toISOString().split('T')[0],
        marked_to_update: true, // Marcar como pendiente de actualización
      };
    }
    return p;
  });

  resetearFormulario();

  if (onFireStore && navigator.onLine && isOnline.value) {
    await syncPendingProducts();
  }
}

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

    // Sincronizar productos nuevos
    const newProducts = products.value.filter(
      p => p.marked_to_create
    );
    // Sincronizar productos editados
    const editProducts = products.value.filter(
      p => p.marked_to_update
    );

    // Sincronizar productos eliminados
    const productsToDelete = products.value
      .filter(p => p.marked_to_delete && p.id)
      .map(p => p.id);
    console.log('Productos pendientes para sincronizar:', newProducts.length);

    // Recorrido para crear nuevos productos
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

    //Sincronizar Actualizaciones
    for (const editProduct of editProducts) {
      if (editProduct) {

        console.log(editProduct)
        try {
          if (!editProduct.id) {
            console.error('editProduct.id is undefined');
            continue;
          }
          const docRef = doc(db, PRODUCTOS_COLLECTION, String(editProduct.id));
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            console.log(`Actualizando producto ${editProduct.id} en Firebase...`);
            await updateDoc(docRef, {
              updated_at: new Date().toISOString().split('T')[0],
              name: editProduct.name,
              weight: editProduct.weight,
            });
            pendingCount += 1;
          }
        } catch (error) {
          console.error(`Error al actualizar producto ${editProduct.id}:`, error);
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
    id: (product.id && !product.id.startsWith("temp_")) ? product.id : customId,
    name: product.name.trim(),
    price: product.price || 0,
    weight: product.weight || '',
    created_at: product.created_at || new Date().toISOString().split('T')[0],
    updated_at: new Date().toISOString().split('T')[0] // Siempre actualiza en la creación/modificación
  };

  // 2. CREA LA REFERENCIA AL DOCUMENTO CON TU ID
  const docRef = doc(db, PRODUCTOS_COLLECTION, productToCreate.id);

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
  return productToCreate;
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
