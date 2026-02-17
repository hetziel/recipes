import { ref, readonly } from 'vue'
import {
    collection,
    onSnapshot,
    query
} from 'firebase/firestore'
import type { Unsubscribe } from 'firebase/firestore'
import { db } from '../firebase.config'
import type { Product } from '../types/producto'

// Global state
const products = ref<Product[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
let unsubscribe: Unsubscribe | null = null

const PRODUCTOS_COLLECTION = 'productos'

export function useProducts() {

    function subscribeToProducts() {
        if (unsubscribe) return // Already subscribed

        isLoading.value = true
        error.value = null

        try {
            const q = query(collection(db, PRODUCTOS_COLLECTION)/*, orderBy('name')*/) // Add orderBy if needed, but client-side sort might be better for flexibility

            unsubscribe = onSnapshot(q, (snapshot) => {
                products.value = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Product))
                isLoading.value = false
            }, (err) => {
                console.error('Error in products snapshot:', err)
                error.value = 'Error al cargar productos en tiempo real'
                isLoading.value = false
            })
        } catch (e: any) {
            console.error('Error setting up products subscription:', e)
            error.value = e.message
            isLoading.value = false
        }
    }

    function unsubscribeFromProducts() {
        if (unsubscribe) {
            unsubscribe()
            unsubscribe = null
        }
    }

    // Initialize immediately if not already done?
    // Or let the component call it?
    // Usually better to let the first component trigger it or call it in App.vue
    // For now, we'll let components call it, but check if it's already active.
    if (!unsubscribe) {
        subscribeToProducts()
    }

    return {
        products: readonly(products),
        isLoading: readonly(isLoading),
        error: readonly(error),
        subscribeToProducts,
        unsubscribeFromProducts
    }
}
