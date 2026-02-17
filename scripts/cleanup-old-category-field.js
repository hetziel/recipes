/**
 * Script de Limpieza: Eliminar campo category_id antiguo
 *
 * Este script elimina el campo category_id de todos los productos
 * después de verificar que la migración a category_ids funciona correctamente.
 *
 * ⚠️ ADVERTENCIA: Solo ejecutar después de confirmar que:
 *    1. La migración se completó exitosamente
 *    2. La aplicación funciona correctamente con category_ids
 *    3. Has probado todas las funcionalidades críticas
 *
 * Uso:
 * node cleanup-old-category-field.js
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, updateDoc, deleteField } from 'firebase/firestore'

// Configuración de Firebase
const firebaseConfig = {
    // Copia la configuración de tu firebase.config.ts aquí
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function cleanupOldCategoryField() {
    console.log('🧹 Iniciando limpieza del campo category_id...\n')

    // Confirmación de seguridad
    console.log('⚠️  ADVERTENCIA: Este script eliminará el campo category_id de TODOS los productos.')
    console.log('   Asegúrate de haber verificado que category_ids funciona correctamente.\n')

    // En un entorno de producción, podrías agregar una confirmación interactiva aquí

    try {
        const productsRef = collection(db, 'productos')
        const snapshot = await getDocs(productsRef)

        console.log(`📦 Total de productos a procesar: ${snapshot.size}\n`)

        let cleaned = 0
        let skipped = 0
        let errors = 0

        for (const docSnapshot of snapshot.docs) {
            const productId = docSnapshot.id
            const data = docSnapshot.data()

            try {
                // Verificar que tiene category_ids antes de eliminar category_id
                if (!data.category_ids || !Array.isArray(data.category_ids)) {
                    console.log(`⚠️  Producto "${data.name}" (${productId}) no tiene category_ids, omitiendo`)
                    skipped++
                    continue
                }

                // Verificar si aún tiene category_id
                if (!data.category_id) {
                    console.log(`⏭️  Producto "${data.name}" ya limpiado`)
                    skipped++
                    continue
                }

                // Eliminar el campo category_id
                await updateDoc(doc(db, 'productos', productId), {
                    category_id: deleteField()
                })

                console.log(`✅ Limpiado "${data.name}" (${productId})`)
                cleaned++

            } catch (error) {
                console.error(`❌ Error limpiando producto ${productId}:`, error)
                errors++
            }
        }

        console.log('\n' + '='.repeat(50))
        console.log('📊 RESUMEN DE LIMPIEZA')
        console.log('='.repeat(50))
        console.log(`✅ Productos limpiados: ${cleaned}`)
        console.log(`⏭️  Productos omitidos: ${skipped}`)
        console.log(`❌ Errores: ${errors}`)
        console.log(`📦 Total procesados: ${snapshot.size}`)
        console.log('='.repeat(50))

        if (errors === 0) {
            console.log('\n🎉 ¡Limpieza completada exitosamente!')
            console.log('   El campo category_id ha sido eliminado de todos los productos.')
        } else {
            console.log('\n⚠️  La limpieza se completó con errores. Revisa los logs.')
        }

    } catch (error) {
        console.error('❌ Error fatal durante la limpieza:', error)
        process.exit(1)
    }
}

cleanupOldCategoryField()
    .then(() => {
        console.log('\n✨ Script finalizado')
        process.exit(0)
    })
    .catch((error) => {
        console.error('💥 Error inesperado:', error)
        process.exit(1)
    })
