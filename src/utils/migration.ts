/**
 * Utilidades de Migración: Categoría Única → Múltiples Categorías
 *
 * Funciones para migrar productos de category_id a category_ids
 */

import { collection, getDocs, doc, updateDoc, deleteField } from 'firebase/firestore'
import { db } from '../firebase.config'

export interface MigrationResult {
    total: number
    migrated: number
    skipped: number
    errors: number
    errorDetails: Array<{ productId: string; productName: string; error: string }>
}

/**
 * Migra todos los productos de category_id a category_ids
 */
export async function migrateProductCategories(): Promise<MigrationResult> {
    const result: MigrationResult = {
        total: 0,
        migrated: 0,
        skipped: 0,
        errors: 0,
        errorDetails: []
    }

    try {
        const productsRef = collection(db, 'productos')
        const snapshot = await getDocs(productsRef)

        result.total = snapshot.size

        for (const docSnapshot of snapshot.docs) {
            const productId = docSnapshot.id
            const data = docSnapshot.data()

            try {
                // Verificar si ya tiene category_ids (ya migrado)
                if (data.category_ids && Array.isArray(data.category_ids)) {
                    console.log(`⏭️  Producto "${data.name}" ya migrado`)
                    result.skipped++
                    continue
                }

                // Crear el array de categorías
                let categoryIds: string[] = []

                if (data.category_id && typeof data.category_id === 'string') {
                    categoryIds = [data.category_id]
                    console.log(`✅ Migrando "${data.name}": "${data.category_id}" → ["${data.category_id}"]`)
                } else {
                    console.log(`⚠️  Producto "${data.name}" sin categoría, asignando array vacío`)
                }

                // Actualizar el documento
                await updateDoc(doc(db, 'productos', productId), {
                    category_ids: categoryIds
                })

                result.migrated++

            } catch (error) {
                console.error(`❌ Error migrando producto ${productId}:`, error)
                result.errors++
                result.errorDetails.push({
                    productId,
                    productName: data.name || 'Sin nombre',
                    error: error instanceof Error ? error.message : String(error)
                })
            }
        }

    } catch (error) {
        console.error('❌ Error fatal durante la migración:', error)
        throw error
    }

    return result
}

/**
 * Elimina el campo category_id de todos los productos
 * SOLO ejecutar después de verificar que category_ids funciona
 */
export async function cleanupOldCategoryField(): Promise<MigrationResult> {
    const result: MigrationResult = {
        total: 0,
        migrated: 0,
        skipped: 0,
        errors: 0,
        errorDetails: []
    }

    try {
        const productsRef = collection(db, 'productos')
        const snapshot = await getDocs(productsRef)

        result.total = snapshot.size

        for (const docSnapshot of snapshot.docs) {
            const productId = docSnapshot.id
            const data = docSnapshot.data()

            try {
                // Verificar que tiene category_ids antes de eliminar category_id
                if (!data.category_ids || !Array.isArray(data.category_ids)) {
                    console.log(`⚠️  Producto "${data.name}" no tiene category_ids, omitiendo`)
                    result.skipped++
                    continue
                }

                // Verificar si aún tiene category_id
                if (!data.category_id) {
                    console.log(`⏭️  Producto "${data.name}" ya limpiado`)
                    result.skipped++
                    continue
                }

                // Eliminar el campo category_id
                await updateDoc(doc(db, 'productos', productId), {
                    category_id: deleteField()
                })

                console.log(`✅ Limpiado "${data.name}"`)
                result.migrated++

            } catch (error) {
                console.error(`❌ Error limpiando producto ${productId}:`, error)
                result.errors++
                result.errorDetails.push({
                    productId,
                    productName: data.name || 'Sin nombre',
                    error: error instanceof Error ? error.message : String(error)
                })
            }
        }

    } catch (error) {
        console.error('❌ Error fatal durante la limpieza:', error)
        throw error
    }

    return result
}
