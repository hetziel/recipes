import { ref, readonly } from 'vue'
import {
    collection,
    onSnapshot,
    query
} from 'firebase/firestore'
import type { Unsubscribe } from 'firebase/firestore'
import { db } from '../firebase.config'
import type { Recipe } from '../types/recipe'

// Global state
const chickenBatches = ref<Recipe[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

let unsubscribeBatches: Unsubscribe | null = null

const BATCHES_COLLECTION = 'chicken_batches'

export function useChickenBatches() {

    function subscribeToBatches() {
        if (unsubscribeBatches) return

        isLoading.value = true
        error.value = null

        try {
            const qBatches = query(collection(db, BATCHES_COLLECTION))
            unsubscribeBatches = onSnapshot(qBatches, (snapshot) => {
                chickenBatches.value = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Recipe))
                isLoading.value = false
            }, (err) => {
                console.error('Error in chicken batches snapshot:', err)
                error.value = 'Error al cargar lotes de pollos'
                isLoading.value = false
            })

        } catch (e: unknown) {
            const err = e as Error
            console.error('Error setting up chicken batches subscription:', err)
            error.value = err.message
            isLoading.value = false
        }
    }

    function unsubscribeFromBatches() {
        if (unsubscribeBatches) {
            unsubscribeBatches()
            unsubscribeBatches = null
        }
    }

    // Auto-start
    if (!unsubscribeBatches) {
        subscribeToBatches()
    }

    return {
        chickenBatches: readonly(chickenBatches),
        isLoading: readonly(isLoading),
        error: readonly(error),
        subscribeToBatches,
        unsubscribeFromBatches
    }
}
