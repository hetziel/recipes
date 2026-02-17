import { ref, reactive, readonly } from 'vue'
import {
    collection,
    doc,
    setDoc,
    query,
    orderBy,
    updateDoc,
    deleteDoc,
    onSnapshot
} from 'firebase/firestore'
import type { Unsubscribe } from 'firebase/firestore'
import { db } from '../firebase.config'
import type { Establishment } from '../types/establishment'
import type { SearchableItem, SearchState } from '../types/search'

const ESTABLISHMENTS_COLLECTION = 'establishments'

// Global State
const establishments = ref<Establishment[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
let unsubscribe: Unsubscribe | null = null

export function useEstablishments() {

    const establishmentSearch = reactive<SearchState>({
        query: '',
        items: [],
        selectedItem: null,
        showDropdown: false,
        isLoading: false,
    })

    function subscribeToEstablishments() {
        if (unsubscribe) return

        isLoading.value = true
        error.value = null

        try {
            const q = query(collection(db, ESTABLISHMENTS_COLLECTION), orderBy('name'))

            unsubscribe = onSnapshot(q, (snapshot) => {
                establishments.value = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Establishment))
                isLoading.value = false
            }, (err) => {
                console.error('Error in establishments snapshot:', err)
                error.value = 'Error al cargar establecimientos'
                isLoading.value = false
            })

        } catch (err: any) {
            console.error('Error setting up establishments subscription:', err)
            error.value = err.message
            isLoading.value = false
        }
    }

    const loadEstablishments = subscribeToEstablishments

    // Search establishments by name
    async function searchEstablishments() {
        const queryText = establishmentSearch.query.trim().toLowerCase()

        if (queryText.length === 0) {
            establishmentSearch.items = []
            return
        }

        try {
            establishmentSearch.isLoading = true

            // Client-side filtering (since we have the full list via onSnapshot)
            if (establishments.value.length > 0) {
                let results = establishments.value
                    .filter(est => est.name.toLowerCase().includes(queryText))
                    .map(est => ({
                        id: est.id,
                        name: est.name
                    } as SearchableItem))

                // Add "Create new" option
                const exactMatch = results.some(
                    item => item.name.toLowerCase() === queryText
                )

                if (!exactMatch) {
                    results = [{
                        id: 'new_' + Date.now(),
                        name: establishmentSearch.query,
                        isNew: true
                    }, ...results]
                }

                establishmentSearch.items = results
                establishmentSearch.showDropdown = true
                return
            }

            // Fallback if empty (shouldn't happen if subscribed)
            establishmentSearch.items = []

        } catch (err) {
            console.error('Error searching establishments:', err)
        } finally {
            establishmentSearch.isLoading = false
        }
    }

    // Create a new establishment
    async function createEstablishment(name: string, address?: string): Promise<Establishment | null> {
        try {
            const newRef = doc(collection(db, ESTABLISHMENTS_COLLECTION))
            const newEstablishment: Establishment = {
                id: newRef.id,
                name: name.trim(),
                address: address || '',
                created_at: new Date().toISOString()
            }

            await setDoc(newRef, newEstablishment)
            // No manual push needed
            return newEstablishment
        } catch (err) {
            console.error('Error creating establishment:', err)
            error.value = 'Error al crear establecimiento'
            return null
        }
    }

    // Update establishment
    async function updateEstablishment(id: string, updates: Partial<Establishment>): Promise<boolean> {
        try {
            const estRef = doc(db, ESTABLISHMENTS_COLLECTION, id)
            await updateDoc(estRef, {
                ...updates,
                updated_at: new Date().toISOString()
            })
            return true
        } catch (err) {
            console.error('Error updating establishment:', err)
            error.value = 'Error al actualizar establecimiento'
            return false
        }
    }

    // Delete establishment
    async function deleteEstablishment(id: string): Promise<boolean> {
        try {
            await deleteDoc(doc(db, ESTABLISHMENTS_COLLECTION, id))
            return true
        } catch (err) {
            console.error('Error deleting establishment:', err)
            error.value = 'Error al eliminar establecimiento'
            return false
        }
    }

    function getEstablishmentName(id: string): string {
        const est = establishments.value.find(e => e.id === id)
        return est ? est.name : 'Desconocido'
    }

    // Helpers for search UI
    function clearEstablishmentSearch() {
        establishmentSearch.query = ''
        establishmentSearch.selectedItem = null
        establishmentSearch.items = []
    }

    // Auto-start
    if (!unsubscribe) {
        subscribeToEstablishments()
    }

    return {
        establishments: readonly(establishments),
        establishmentSearch,
        isLoading: readonly(isLoading),
        error: readonly(error),
        loadEstablishments,
        searchEstablishments,
        createEstablishment,
        getEstablishmentName,
        clearEstablishmentSearch,
        updateEstablishment,
        deleteEstablishment
    }
}
