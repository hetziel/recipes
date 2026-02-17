/**
 * Script de Migración: Categoría Única a Múltiples Categorías
 *
 * Este script migra los productos existentes en Firestore de usar
 * category_id (string) a category_ids (array de strings).
 *
 * IMPORTANTE: Ejecutar este script UNA SOLA VEZ después de desplegar
 * los cambios de código.
 *
 * Uso:
 * 1. Asegúrate de tener las credenciales de Firebase configuradas
 * 2. Ejecuta: node migrate-categories.js
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore'


// Configuración de Firebase (reemplaza con tus credenciales)
const firebaseConfig = {
  apiKey: "AIzaSyBBirZrK5TJAOHJgE7WFvTFd4YPfhSXHPU",
  authDomain: "hetzmyshops.firebaseapp.com",
  projectId: "hetzmyshops",
  storageBucket: "hetzmyshops.appspot.com",
  messagingSenderId: "139023693070",
  appId: "1:139023693070:web:6ecd482d3e4917eba4135f",
  measurementId: "G-1YPRHCPFRK"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function migrateProducts() {
  console.log('🚀 Iniciando migración de productos...\n')

  try {
    // Obtener todos los productos
    const productsRef = collection(db, 'productos')
    const snapshot = await getDocs(productsRef)

    console.log(`📦 Total de productos encontrados: ${snapshot.size}\n`)

    let migrated = 0
    let skipped = 0
    let errors = 0

    // Procesar cada producto
    for (const docSnapshot of snapshot.docs) {
      const productId = docSnapshot.id
      const data = docSnapshot.data()

      try {
        // Verificar si ya tiene category_ids (ya migrado)
        if (data.category_ids && Array.isArray(data.category_ids)) {
          console.log(`⏭️  Producto "${data.name}" (${productId}) ya migrado`)
          skipped++
          continue
        }

        // Crear el array de categorías
        let categoryIds = []

        if (data.category_id && typeof data.category_id === 'string') {
          // Si tiene category_id, agregarlo al array
          categoryIds = [data.category_id]
          console.log(`✅ Migrando "${data.name}": "${data.category_id}" → ["${data.category_id}"]`)
        } else {
          // Si no tiene categoría, dejar array vacío
          console.log(`⚠️  Producto "${data.name}" sin categoría, asignando array vacío`)
        }

        // Actualizar el documento
        await updateDoc(doc(db, 'productos', productId), {
          category_ids: categoryIds
          // Nota: NO eliminamos category_id por si necesitamos hacer rollback
        })

        migrated++

      } catch (error) {
        console.error(`❌ Error migrando producto ${productId}:`, error)
        errors++
      }
    }

    console.log('\n' + '='.repeat(50))
    console.log('📊 RESUMEN DE MIGRACIÓN')
    console.log('='.repeat(50))
    console.log(`✅ Productos migrados: ${migrated}`)
    console.log(`⏭️  Productos omitidos (ya migrados): ${skipped}`)
    console.log(`❌ Errores: ${errors}`)
    console.log(`📦 Total procesados: ${snapshot.size}`)
    console.log('='.repeat(50))

    if (errors === 0) {
      console.log('\n🎉 ¡Migración completada exitosamente!')
      console.log('\n💡 Próximos pasos:')
      console.log('   1. Verifica que la aplicación funcione correctamente')
      console.log('   2. Después de confirmar, puedes eliminar el campo category_id')
      console.log('   3. Ejecuta cleanup-old-category-field.js para limpiar')
    } else {
      console.log('\n⚠️  La migración se completó con errores. Revisa los logs.')
    }

  } catch (error) {
    console.error('❌ Error fatal durante la migración:', error)
    process.exit(1)
  }
}

// Ejecutar migración
migrateProducts()
  .then(() => {
    console.log('\n✨ Script finalizado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Error inesperado:', error)
    process.exit(1)
  })
