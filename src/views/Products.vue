<script setup lang="ts">
import { ref, onMounted, onUnmounted, inject, type Ref } from 'vue'
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
  serverTimestamp,
  getDoc
} from 'firebase/firestore'
import { db } from '../firebase.config'

// Interfaces y tipos
import type { Producto, DolarBCV } from '../types/producto'

// Datos de configuración
const onTesting = true;
const onFireStore = true;

const STORAGE_KEY = 'productos-app-data'
const PRODUCTOS_COLLECTION = 'productos' // Nombre de la colección en Firestore

const { dolarBCV: dolarBCV, actualizarDolarBCV } = inject<{
  dolarBCV: Ref<DolarBCV | null>;
  actualizarDolarBCV: (nuevoValor: DolarBCV) => void;
}>('dolarBCV')!; // El ! asume que siempre estará disponible

const productos = ref<Producto[]>([])
const tasaDolar = ref<number>(0)
const origenTasa = ref<'api' | 'local' | null>(null)
const error = ref<string | null>(null)
const cargando = ref<boolean>(false)
const nuevoProducto = ref<Producto>({
  nombre: '',
  precio: undefined,
  peso: '',
  fecha: new Date().toISOString().split('T')[0],
})
const mostrarFormulario = ref<boolean>(false)
const tasaLocal = ref<number | null>(null)
const tasaApi = ref<number | null>(null)

// Configurar listener en tiempo real
onMounted(() => {
  // 1. Cargar datos locales primero para una respuesta rápida
  cargarProductosDesdeLocal();

  // 2. Cargar datos de Firebase y sincronizar
  cargarDatosIniciales().then(() => {
    if (onFireStore) {
      // Sincronizar cualquier cambio pendiente
      sincronizarProductosPendientes();
    }

  });

  // 3. Configurar sincronización periódica
  const intervalo = setInterval(() => {
    if (navigator.onLine) {
      // sincronizarProductosPendientes();
    }
  }, 30000); // Cada 30 segundos

  // Limpiar intervalo al desmontar
  onUnmounted(() => clearInterval(intervalo));

  // Cargar datos iniciales
  // cargarDatosIniciales()

  // Configurar listener para productos
  // const productosQuery = query(collection(db, PRODUCTOS_COLLECTION), orderBy('createdAt', 'desc'))
  // const unsubscribeProductos = onSnapshot(productosQuery, (snapshot) => {
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
function cargarProductosDesdeLocal() {
  const localData = localStorage.getItem(STORAGE_KEY)
  if (localData) {
    try {
      const datos = JSON.parse(localData)
      const productosLocal: Producto[] = datos || []

      // Cargar productos
      productos.value = productosLocal

      console.log('Productos cargados desde LocalStorage:', productos.value.length)
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
      await cargarProductosDesdeFirestore()
    }

  } catch (err) {
    console.error('Error al cargar datos iniciales:', err)
    error.value = 'Error al cargar datos. Intente nuevamente.'
  } finally {
    cargando.value = false
  }
}

// Función específica para cargar productos
async function cargarProductosDesdeFirestore(): Promise<void> {

  try {
    // 1. Obtener productos de Firestore
    const productosQuery = query(
      collection(db, PRODUCTOS_COLLECTION),
      orderBy('fecha', 'desc')
    );
    const productosSnapshot = await getDocs(productosQuery);

    // 2. Mapear y validar los datos
    const productosFirestore = productosSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        nombre: data.nombre?.trim() ?? 'Sin nombre',
        precio: data.precio ?? 0,
        peso: data.peso ?? '',
        fecha: data.fecha || new Date().toISOString().split('T')[0],
        sincronizado: true
      } as Producto;
    });

    // 3. Actualizar el estado reactivo
    productos.value = productosFirestore;

    // 4. Guardar en LocalStorage
    const datosAGuardar: Producto[] = productosFirestore;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(datosAGuardar));
    console.log('Productos guardados en LocalStorage');

    // 5. Opcional: Verificar si hay cambios desde la última carga
    // const datosAnteriores = localStorage.getItem(STORAGE_KEY);
    // if (datosAnteriores) {
    //   const parsedData: LocalStorageData = JSON.parse(datosAnteriores);
    //   if (parsedData.productos.length !== productosFirestore.length) {
    //     console.log(`Se actualizaron ${productosFirestore.length - parsedData.productos.length} productos`);
    //   }
    // }

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

          guardarProductosEnLocal()
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
async function agregarProducto() {
  if (!nuevoProducto.value.nombre) {
    error.value = 'El nombre del producto es requerido';
    return;
  }

  const producto: Producto = {
    id: 'temp_' + Date.now(), // ID temporal
    nombre: nuevoProducto.value.nombre.trim(),
    precio: nuevoProducto.value.precio || 0,
    peso: nuevoProducto.value.peso || '',
    fecha: nuevoProducto.value.fecha || new Date().toISOString().split('T')[0],
    sincronizado: false,
  };

  console.log('Producto para agregar:', producto);

  try {
    // 1. Agregar localmente

    productos.value.unshift(producto);
    guardarProductosEnLocal();

    // 2. Intentar sincronización inmediata si hay conexión
    if (onFireStore && navigator.onLine) {
      await sincronizarProductosPendientes();
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
  nuevoProducto.value = {
    nombre: '',
    precio: undefined,
    peso: '',
    fecha: new Date().toISOString().split('T')[0],
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
//     guardarProductosEnLocal()
//   }
// }

// Guardar datos en LocalStorage
function guardarProductosEnLocal() {
  const productosLocal: Producto[] = productos.value;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(productosLocal));
  console.log('Productos guardados en LocalStorage:', productosLocal.length);
}

// Determinar la mejor tasa disponible
// function determinarMejorTasa(apiData: DolarData | null) {
//   if (apiData) {
//     // Priorizar API si está disponible
//     tasaDolar.value = apiData.promedio
//     origenTasa.value = 'api'
//     fechaActualizacion.value = apiData.fechaActualizacion
//     guardarProductosEnLocal()
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
//       guardarProductosEnLocal();
//     }

//     console.log('Producto sincronizado con Firebase:', docRef.id);
//   } catch (error) {
//     console.error('Error al sincronizar producto con Firebase:', error);
//     // Podrías agregar lógica de reintento aquí
//   }
// }

async function eliminarProducto(id: string) {

  if (onTesting) {
    console.log('Eliminando producto con ID:', id);
  }

  if (!id) return;

  try {
    const index = productos.value.findIndex(p => {
      if (onTesting) {
        console.log('Producto actual:', p.id);
        console.log('ID a buscar:', id);
      }

      console.log(String(p.id) === id, 'Comparando:', String(p.id), 'con', id);
      return String(p.id) === id;
    });

    if (onTesting) {
      console.log('Índice del producto encontrado:', index);
    }
    if (index === -1) {
      console.log('Producto no encontrado:', id);
      console.log('Productos actuales:', productos.value);
      return;
    }

    // Si ya está sincronizado, marcar para eliminación
    if (productos.value[index].sincronizado) {
      if (onTesting) {
        console.log('Si ya está sincronizado, marcar para eliminación:', productos.value[index].sincronizado);
      }
      productos.value[index].marcadoParaEliminar = true;
    } else {
      // Si no está sincronizado, eliminar directamente
      productos.value.splice(index, 1);
    }

    guardarProductosEnLocal();

    // Intentar sincronización inmediata si hay conexión
    if (onFireStore && navigator.onLine) {
      await sincronizarProductosPendientes();
    }
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

async function sincronizarProductosPendientes() {
  try {
    if (!navigator.onLine) {
      console.log('Sin conexión, omitiendo sincronización');
      return;
    }

    console.log('Iniciando sincronización de productos pendientes...');

    // Sincronizar productos nuevos o modificados
    const productosPendientes = productos.value.filter(
      p => !p.sincronizado && (String(p.id).startsWith('temp_'))
    );

    for (const producto of productosPendientes) {
      try {
        // Verificar si el producto ya existe en Firebase
        if (producto.id) {
          const docRef = doc(db, PRODUCTOS_COLLECTION, producto.id);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            console.log(`Producto ${producto.id} ya existe en Firebase.`);

          } else {
            console.log(`Producto ${producto.id} no existe en Firebase, creando nuevo...`);
            await crearProductoEnFirebase(producto);
          }
        } else {
          await crearProductoEnFirebase(producto);
        }
      } catch (error) {
        console.error(`Error al sincronizar producto ${producto.id}:`, error);
      }
    }

    // Sincronizar eliminaciones
    const productosParaEliminar = productos.value
      .filter(p => p.marcadoParaEliminar && p.id)
      .map(p => p.id);

    for (const id of productosParaEliminar) {
      if (id) {
        try {
          const docRef = doc(db, PRODUCTOS_COLLECTION, id);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            console.log(`Eliminando producto ${id} de Firebase...`);
            await deleteDoc(docRef);

            // Eliminar completamente del estado local
            productos.value = productos.value.filter(p => p.id !== id);
          } else {
            console.log(`Producto ${id} no existe en Firebase, eliminando localmente...`);
            // Solo eliminar localmente si no existe en Firebase
            productos.value = productos.value.filter(p => p.id !== id);
          }
        } catch (error) {
          console.error(`Error al eliminar producto ${id}:`, error);
        }
      }
    }

    // Actualizar localStorage después de la sincronización
    guardarProductosEnLocal();
    console.log('Sincronización completa');
  } catch (error) {
    console.error('Error en la sincronización global:', error);
  }
}

async function crearProductoEnFirebase(producto: Producto) {
  const docRef = await addDoc(collection(db, PRODUCTOS_COLLECTION), producto);

  // Actualizar el estado local con el ID real de Firebase
  const index = productos.value.findIndex(p => p.id === producto.id);
  if (index !== -1) {
    productos.value[index] = {
      ...productos.value[index],
      id: docRef.id,
      sincronizado: true,
      marcadoParaEliminar: false
    };
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
        <div class="b-modal" persistent modal="test" skin="fade" fx="in-out" :class="{ opened: mostrarFormulario }">
          <div bx-content>
            <button maximize-modal>max</button>
            <button close-modal>close</button>
            <button onclick="closePopupScreen('test')">close new</button>
            <div class="form-container" v-if="mostrarFormulario">
              <h2>Agregar Nuevo Producto</h2>
              <form @submit.prevent="agregarProducto">
                <div class="form-group">
                  <label>Nombre:</label>
                  <input v-model="nuevoProducto.nombre" required />
                </div>

                <div class="form-group">
                  <label>Precio ($):</label>
                  <input v-model.number="nuevoProducto.precio" type="number" step="0.01" />
                </div>

                <div class="form-group">
                  <label>Peso:</label>
                  <input v-model="nuevoProducto.peso" />
                </div>

                <div class="form-group">
                  <label>Fecha:</label>
                  <input v-model="nuevoProducto.fecha" type="date" />
                </div>

                <div class="form-actions">
                  <button type="submit">Guardar</button>
                  <button type="button" @click="resetearFormulario" close-modal>Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        </div>


        <table v-if="productos.length" class="product-table">
          <thead>
            <tr>
              <th>Sincronizado</th>
              <th>Nombre</th>
              <th>Precio ($)</th>
              <th>Precio (Bs)</th>
              <th>Peso</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="producto in productos" :key="producto.id">
              <td>{{ producto.sincronizado ? 'Sí' : 'No' }}</td>
              <td>{{ producto.nombre }}</td>
              <td>{{ producto.precio?.toFixed(2) || '-' }}</td>
              <td>{{ (producto.precio && dolarBCV?.promedio) ? (producto.precio * dolarBCV.promedio).toFixed(2) : '-' }}
              </td>
              <td>{{ producto.peso || '-' }}</td>
              <td>{{ producto.fecha || '-' }}</td>
              <td>
                <button @click="eliminarProducto(String(producto.id))" class="delete-button" title="Eliminar">
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
