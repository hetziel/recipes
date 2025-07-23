<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
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
  serverTimestamp,
  getDoc
} from 'firebase/firestore'
import { db } from '../firebase.config'

// Interfaces y tipos
import type { Producto, DolarData, LocalStorageData } from '../types/producto'

const STORAGE_KEY = 'productos-app-data'
const PRODUCTOS_COLLECTION = 'productos' // Nombre de la colección en Firestore
const TASA_DOLAR_DOC = 'tasa_dolar' // Documento para guardar la tasa

const productos = ref<Producto[]>([])
let dolarBCV = ref<{ promedio: number, fechaActualizacion: string, origen: string } | null>(null)
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
const fechaActualizacion = ref<string | null>(null)

// Función principal para cargar datos iniciales
async function cargarDatosIniciales() {
  cargando.value = true

  console.log('Cargando datos iniciales...')

  try {
    // 1. Cargar productos
    await cargarProductosDesdeFirestore()

    // 2. Cargar tasa de dólar
    // await cargarTasaDolarInicial()

    // 3. Si hay productos, actualizar precios en Bs
    if (productos.value.length && tasaDolar.value) {
      // actualizarPreciosBs()
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
  console.log('Cargando productos desde Firestore...');

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
        precioBs: data.precioBs ?? '0.00',
        peso: data.peso ?? '',
        fecha: data.fecha || new Date().toISOString().split('T')[0]
      } as Producto;
    });

    // 3. Actualizar el estado reactivo
    productos.value = productosFirestore;

    // 4. Guardar en LocalStorage
    const datosAGuardar: LocalStorageData = {
      productos: productosFirestore,
      tasaDolar: tasaDolar.value,
      fechaGuardado: new Date().toISOString()
    };

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
    // console.error('Error al cargar productos desde Firestore:', err);

    // Intenta cargar desde LocalStorage como fallback
    try {
      console.log('Intentando cargar desde LocalStorage...');
      cargarDesdeLocalStorage();
    } catch (localStorageError) {
      console.error('Error al cargar desde LocalStorage:', localStorageError);
      error.value = 'No se pudieron cargar los productos';
      productos.value = []; // Asegurar estado vacío en caso de error
    }
  }
}

// Función específica para cargar tasa inicial
async function cargarTasaDolarInicial() {
  try {
    // Primero intentamos con la API
    await cargarTasaDolar()

    // Si falla la API, cargamos de Firestore
    if (!origenTasa.value) {
      const docSnap = await getDoc(doc(db, 'config', TASA_DOLAR_DOC))
      if (docSnap.exists()) {
        const data = docSnap.data()
        tasaDolar.value = data.valor
        origenTasa.value = 'local'
        fechaActualizacion.value = data.fechaActualizacion
      }
    }
  } catch (error) {
    console.error('Error al cargar tasa:', error)
    throw error
  }
}


// Guardar productos en Firestore
async function guardarProductos() {
  try {
    // Primero borramos todos los productos existentes (esto es simplificado)
    const querySnapshot = await getDocs(collection(db, PRODUCTOS_COLLECTION))
    querySnapshot.forEach(async (document) => {
      await deleteDoc(doc(db, PRODUCTOS_COLLECTION, document.id))
    })

    // Luego guardamos los nuevos
    const batch = writeBatch(db)
    productos.value.forEach(producto => {
      const docRef = doc(collection(db, PRODUCTOS_COLLECTION))
      batch.set(docRef, {
        nombre: producto.nombre,
        precio: producto.precio,
        precioBs: producto.precioBs,
        peso: producto.peso,
        fecha: producto.fecha,
        createdAt: serverTimestamp()
      })
    })
    await batch.commit()
  } catch (err) {
    console.error('Error al guardar productos:', err)
    // Fallback a localStorage
    guardarEnLocalStorage()
  }
}

// Guardar tasa en Firestore
async function guardarTasaDolar(tasaApiData?: DolarData) {
  try {
    if (tasaApiData) {
      await setDoc(doc(db, 'config', TASA_DOLAR_DOC), {
        valor: tasaApiData.promedio,
        fechaActualizacion: tasaApiData.fechaActualizacion,
        updatedAt: serverTimestamp()
      })
    } else {
      await setDoc(doc(db, 'config', TASA_DOLAR_DOC), {
        valor: tasaDolar.value,
        fechaActualizacion: new Date().toISOString(),
        updatedAt: serverTimestamp()
      })
    }
  } catch (err) {
    console.error('Error al guardar tasa:', err)
  }
}

// Cargar datos del LocalStorage al iniciar
function cargarDesdeLocalStorage() {
  const datosGuardados = localStorage.getItem(STORAGE_KEY)
  if (datosGuardados) {
    try {
      const datos: LocalStorageData = JSON.parse(datosGuardados)
      tasaLocal.value = datos.tasaDolar || null
      fechaActualizacion.value = datos.fechaGuardado || null

      if (datos.tasaApi) {
        tasaApi.value = datos.tasaApi.valor
        fechaActualizacion.value = datos.tasaApi.fechaActualizacion
      }

      productos.value = datos.productos || []
    } catch (err) {
      console.error('Error al cargar datos del LocalStorage:', err)
    }
  }
}

// Guardar datos en LocalStorage
function guardarEnLocalStorage(tasaApiData?: DolarData) {
  const datosAGuardar: LocalStorageData = {
    productos: productos.value.map(p => ({
      ...p,
      // No necesitamos guardar el estado de sincronización en localStorage
      sincronizado: undefined
    })),
    tasaDolar: tasaDolar.value,
    fechaGuardado: new Date().toISOString(),
    ultimaSincronizacion: new Date().toISOString()
  };

  if (tasaApiData) {
    datosAGuardar.tasaApi = {
      valor: tasaApiData.promedio,
      fechaActualizacion: tasaApiData.fechaActualizacion,
    };
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(datosAGuardar));
}

// Determinar la mejor tasa disponible
function determinarMejorTasa(apiData: DolarData | null) {
  if (apiData) {
    // Priorizar API si está disponible
    tasaDolar.value = apiData.promedio
    origenTasa.value = 'api'
    fechaActualizacion.value = apiData.fechaActualizacion
    guardarEnLocalStorage(apiData)
  } else if (tasaLocal.value) {
    // Usar tasa local si no hay datos de API
    tasaDolar.value = tasaLocal.value
    origenTasa.value = 'local'
  } else {
    // No hay tasas disponibles
    tasaDolar.value = 0
    origenTasa.value = null
  }
}

async function cargarTasaDolar() {
  cargando.value = true
  error.value = null

  try {
    const response = await fetch('https://ve.dolarapi.com/v1/dolares')
    if (!response.ok) throw new Error('Error al obtener datos del dólar')

    const data: DolarData[] = await response.json()
    determinarMejorTasa(data[0])

    if (productos.value.length) {
      actualizarPreciosBs()
    }
  } catch (err) {
    console.error('Error al cargar el precio del dólar:', err)

    // Si falla la API, usar datos locales si existen
    if (tasaLocal.value) {
      tasaDolar.value = tasaLocal.value
      origenTasa.value = 'local'
      error.value = 'Error al actualizar tasa. Usando valor local.'
    } else {
      error.value = err instanceof Error ? err.message : 'Error desconocido al cargar tasa'
    }
  } finally {
    cargando.value = false
  }
}

function actualizarPreciosBs() {
  productos.value.forEach((producto) => {
    if (producto.precio && tasaDolar.value) {
      producto.precioBs = (producto.precio * tasaDolar.value).toFixed(2)
    }
  })
  guardarEnLocalStorage()
}

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

        if (datos.tasaDolar) {
          tasaLocal.value = datos.tasaDolar
          fechaActualizacion.value = new Date().toISOString()
          guardarEnLocalStorage()
        }

        if (tasaDolar.value) {
          actualizarPreciosBs()
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
    createdAt: new Date().toISOString()
  };

  if (producto.precio && tasaDolar.value) {
    producto.precioBs = (producto.precio * tasaDolar.value).toFixed(2);
  }

  try {
    // 1. Agregar localmente
    productos.value.unshift(producto);
    guardarEnLocalStorage();

    // 2. Intentar sincronización inmediata si hay conexión
    if (navigator.onLine) {
      await sincronizarProductosPendientes();
    }

    resetearFormulario();
  } catch (err) {
    error.value = 'Error al agregar el producto';
    console.error(err);
  }
}

async function sincronizarProductoConFirebase(producto: Producto) {
  try {
    // Eliminar el ID temporal y la marca de sincronización
    const { id, sincronizado, ...productoSinId } = producto;

    // Agregar a Firebase
    const docRef = await addDoc(collection(db, PRODUCTOS_COLLECTION), {
      ...productoSinId,
      createdAt: serverTimestamp()
    });

    // Actualizar el producto local con el ID real de Firebase
    const index = productos.value.findIndex(p => p.id === producto.id);
    if (index !== -1) {
      productos.value[index] = {
        ...productos.value[index],
        id: docRef.id,
        sincronizado: true
      };
      guardarEnLocalStorage();
    }

    console.log('Producto sincronizado con Firebase:', docRef.id);
  } catch (error) {
    console.error('Error al sincronizar producto con Firebase:', error);
    // Podrías agregar lógica de reintento aquí
  }
}

function generarId() {
  return productos.value.length > 0 ? Math.max(...productos.value.map((p) => p.id || 0)) + 1 : 1
}

function resetearFormulario() {
  nuevoProducto.value = {
    nombre: '',
    precio: undefined,
    peso: '',
    fecha: new Date().toISOString().split('T')[0],
  }
  mostrarFormulario.value = false
  error.value = null
}

async function eliminarProducto(id: string) {
  if (!id) return;

  try {
    const index = productos.value.findIndex(p => p.id === id);
    if (index === -1) return;

    // Si ya está sincronizado, marcar para eliminación
    if (productos.value[index].sincronizado) {
      productos.value[index].marcadoParaEliminar = true;
    } else {
      // Si no está sincronizado, eliminar directamente
      productos.value.splice(index, 1);
    }

    guardarEnLocalStorage();

    // Intentar sincronización inmediata si hay conexión
    if (navigator.onLine) {
      await sincronizarProductosPendientes();
    }
  } catch (err) {
    error.value = 'Error al eliminar el producto';
    console.error(err);
  }
}

async function eliminarProductoDeFirebase(id: string) {
  try {
    await deleteDoc(doc(db, PRODUCTOS_COLLECTION, id));
    console.log('Producto eliminado de Firebase:', id);
  } catch (error) {
    console.error('Error al eliminar producto de Firebase:', error);
    // Podrías agregar lógica de reintento aquí
  }
}

async function sincronizarProductosPendientes() {
  try {
    if (!navigator.onLine) {
      console.log('Sin conexión, omitiendo sincronización');
      return;
    }

    console.log('Iniciando sincronización de productos pendientes...');

    // Sincronizar productos nuevos o modificados
    const productosPendientes = productos.value.filter(
      p => !p.sincronizado && !p.id?.startsWith('temp_')
    );

    for (const producto of productosPendientes) {
      try {
        // Verificar si el producto ya existe en Firebase
        if (producto.id) {
          const docRef = doc(db, PRODUCTOS_COLLECTION, producto.id);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            console.log(`Producto ${producto.id} ya existe en Firebase.`);
            // await actualizarProductoEnFirebase(producto);
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
      .filter(p => p.marcadoParaEliminar && p.sincronizado && p.id)
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
    guardarEnLocalStorage();
    console.log('Sincronización completa');
  } catch (error) {
    console.error('Error en la sincronización global:', error);
  }
}

async function crearProductoEnFirebase(producto: Producto) {
  const { id, sincronizado, ...productoSinId } = producto;
  const docRef = await addDoc(collection(db, PRODUCTOS_COLLECTION), {
    ...productoSinId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

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

async function actualizarProductoEnFirebase(producto: Producto) {
  if (!producto.id) return;

  const { id, sincronizado, ...productoSinId } = producto;
  await setDoc(doc(db, PRODUCTOS_COLLECTION, id), {
    ...productoSinId,
    updatedAt: serverTimestamp()
  }, { merge: true });

  // Marcar como sincronizado en el estado local
  const index = productos.value.findIndex(p => p.id === producto.id);
  if (index !== -1) {
    productos.value[index] = {
      ...productos.value[index],
      sincronizado: true,
      marcadoParaEliminar: false
    };
  }
}

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

function limpiarLocalStorage() {
  if (confirm('¿Estás seguro de que quieres borrar todos los datos guardados?')) {
    localStorage.removeItem(STORAGE_KEY)
    productos.value = []
  }
}

function formatearFecha(fecha: string | null) {
  if (!fecha) return 'N/A'
  return new Date(fecha).toLocaleString()
}

// Configurar listener en tiempo real
onMounted(() => {
  // 1. Cargar datos locales primero para una respuesta rápida
  cargarDesdeLocalStorage();

  // 2. Cargar datos de Firebase y sincronizar
  cargarDatosIniciales().then(() => {
    // Sincronizar cualquier cambio pendiente
    sincronizarProductosPendientes();
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

  // Configurar listener para tasa de dólar
  // const unsubscribeTasa = onSnapshot(doc(db, 'config', TASA_DOLAR_DOC), (doc) => {
  //   if (doc.exists()) {
  //     const data = doc.data()
  //     tasaLocal.value = data.valor
  //     fechaActualizacionLocal.value = data.fechaActualizacion

  //     if (origenTasa.value === 'local') {
  //       tasaDolar.value = data.valor
  //       // actualizarPreciosBs()
  //     }
  //   }
  // })

  // Cargar datos iniciales
  // cargarTasaDolar()

  // Limpiar listeners al desmontar el componente
  onUnmounted(() => {
    unsubscribeProductos()
    unsubscribeTasa()
  })
})
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

        <button @click="cargarTasaDolar" :disabled="cargando">
          {{ cargando ? 'Actualizando...' : 'Actualizar tasa' }}
        </button>

        <button @click="mostrarFormulario = true" class="add-button">Agregar Producto</button>

        <button @click="exportarAJSON" class="export-button">Exportar a JSON</button>

        <button @click="limpiarLocalStorage" class="clear-button">Limpiar Datos</button>
      </div>

      <div v-if="cargando" class="loading">Cargando datos...</div>

      <div v-else>
        <!-- Formulario para agregar nuevo producto -->
        <div v-if="mostrarFormulario" class="form-container">
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
              <button type="button" @click="resetearFormulario">Cancelar</button>
            </div>
          </form>
        </div>

        <table v-if="productos.length" class="product-table">
          <thead>
            <tr>
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
              <td>{{ producto.nombre }}</td>
              <td>{{ producto.precio?.toFixed(2) || '-' }}</td>
              <td>{{ producto.precioBs || '-' }}</td>
              <td>{{ producto.peso || '-' }}</td>
              <td>{{ producto.fecha || '-' }}</td>
              <td>
                <button @click="eliminarProducto(producto.id!)" class="delete-button" title="Eliminar">
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
