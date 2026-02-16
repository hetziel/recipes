import { ref, reactive } from 'vue'
import {
    collection,
    doc,
    getDocs,
    setDoc,
    query,
    where,
    orderBy,
    limit
} from 'firebase/firestore'
import { db } from '../firebase.config'
import type { Establishment } from '../types/establishment'
import type { SearchableItem, SearchState } from '../types/search'

const ESTABLISHMENTS_COLLECTION = 'establishments'

export function useEstablishments() {
    const establishments = ref<Establishment[]>([])
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    // Search state similar to brands/categories
    const establishmentSearch = reactive<SearchState>({
        query: '',
        items: [],
        selectedItem: null,
        showDropdown: false,
        isLoading: false,
    })

    // Load all establishments (for caching/initial load)
    async function loadEstablishments() {
        isLoading.value = true
        try {
            const q = query(collection(db, ESTABLISHMENTS_COLLECTION), orderBy('name'))
            const snapshot = await getDocs(q)
            establishments.value = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Establishment))
        } catch (err) {
            console.error('Error loading establishments:', err)
            error.value = 'Error al cargar establecimientos'
        } finally {
            isLoading.value = false
        }
    }

    // Search establishments by name
    async function searchEstablishments() {
        const queryText = establishmentSearch.query.trim().toLowerCase()

        if (queryText.length === 0) {
            establishmentSearch.items = []
            return
        }

        try {
            establishmentSearch.isLoading = true

            // Client-side filtering if we have them loaded (optimization)
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

            // Fallback to Firestore if local list empty (though we try to load all)
            const q = query(
                collection(db, ESTABLISHMENTS_COLLECTION),
                where('name', '>=', queryText),
                where('name', '<=', queryText + '\uf8ff'),
                limit(10)
            )

            const snapshot = await getDocs(q)
            const found = snapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name
            } as SearchableItem))

            const exactMatch = found.some(
                item => item.name.toLowerCase() === queryText
            )

            if (!exactMatch) {
                found.unshift({
                    id: 'new_' + Date.now(),
                    name: establishmentSearch.query,
                    isNew: true
                })
            }

            establishmentSearch.items = found
            establishmentSearch.showDropdown = true

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

            // Add to local list
            establishments.value.push(newEstablishment)

            return newEstablishment
        } catch (err) {
            console.error('Error creating establishment:', err)
            error.value = 'Error al crear establecimiento'
            return null
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

    return {
        establishments,
        establishmentSearch,
        isLoading,
        error,
        loadEstablishments,
        searchEstablishments,
        createEstablishment,
        getEstablishmentName,
        clearEstablishmentSearch
    }
}
