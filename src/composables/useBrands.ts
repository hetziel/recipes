import { ref, reactive, readonly } from 'vue'
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  setDoc
} from 'firebase/firestore'
import type { Unsubscribe } from 'firebase/firestore'
import { db } from '../firebase.config'
import type { Brand } from '../types/producto'
import type { SearchableItem, SearchState } from '../types/search'

const MARCAS_COLLECTION = 'marcas'

// Global State
const allBrands = ref<Brand[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
let unsubscribe: Unsubscribe | null = null

export function useBrands() {
  const brandSearch = reactive<SearchState>({
    query: '',
    items: [],
    selectedItem: null,
    showDropdown: false,
    isLoading: false,
  })

  function subscribeToBrands() {
    if (unsubscribe) return

    isLoading.value = true
    error.value = null

    try {
      // Ordering by name might require an index, but for small collections it's fine.
      // If it fails due to missing index, remove orderBy or create index.
      // For now, let's just get the collection and sort client-side if needed to be safe without index.
      const q = query(collection(db, MARCAS_COLLECTION), orderBy('name'))

      unsubscribe = onSnapshot(q, (snapshot) => {
        const brands = snapshot.docs.map(
          (d) =>
            ({
              id: d.id,
              name: d.data().name,
            }) as Brand
        )
        allBrands.value = brands

        // Update search items if they were initialized
        // brandSearch.items = brands.map(b => ({ id: b.id, name: b.name }))
        // Better to let the search logic handle filtering on demand or re-init

        isLoading.value = false
      }, (err) => {
        console.error('Error in brands snapshot:', err)
        error.value = 'Error al cargar marcas'
        isLoading.value = false
      })

    } catch (e: unknown) {
      console.error('Error setting up brands subscription:', e)
      error.value = e instanceof Error ? e.message : 'Error desconocido'
      isLoading.value = false
    }
  }

  // Alias for backward compatibility if needed, or just use subscribe
  const loadBrands = subscribeToBrands

  async function searchBrands() {
    const queryText = brandSearch.query.trim().toLowerCase()

    if (queryText.length === 0) {
      brandSearch.items = allBrands.value.map(b => ({ id: b.id, name: b.name }))
      return
    }

    try {
      brandSearch.isLoading = true

      // Search in local allBrands data (which is kept up to date by onSnapshot)
      const foundBrands: SearchableItem[] = allBrands.value.filter(
        (brand) => brand.name.toLowerCase().includes(queryText)
      ).map(b => ({ id: b.id, name: b.name }))

      // Add option to create new brand if not exact match
      const exactMatch = foundBrands.some(
        (brand) => brand.name.toLowerCase() === queryText.toLowerCase(),
      )

      if (!exactMatch && queryText.length > 0) {
        foundBrands.push({
          id: 'new_' + Date.now(),
          name: brandSearch.query,
          isNew: true,
        })
      }

      brandSearch.items = foundBrands
      brandSearch.showDropdown = true
    } catch (err) {
      console.error('Error buscando marcas:', err)
      brandSearch.items = []
    } finally {
      brandSearch.isLoading = false
    }
  }

  async function createNewBrand(name: string): Promise<Brand | null> {
    try {
      const newBrandRef = doc(collection(db, MARCAS_COLLECTION))
      const newBrand: Brand = {
        id: newBrandRef.id,
        name: name,
      }

      await setDoc(newBrandRef, newBrand)
      // No need to reload, onSnapshot will catch it
      return newBrand
    } catch (err) {
      console.error('Error creando marca:', err)
      return null
    }
  }

  function getBrandName(brandId: string | null | undefined): string {
    if (!brandId) return ''
    const brand = allBrands.value.find((b) => b.id === brandId)
    return brand ? brand.name : ''
  }

  function clearBrandSearch() {
    brandSearch.selectedItem = null
    brandSearch.query = ''
    brandSearch.items = allBrands.value.map(b => ({ id: b.id, name: b.name }))
  }

  // Auto-start subscription
  if (!unsubscribe) {
    subscribeToBrands()
  }

  return {
    brandSearch,
    allBrands: readonly(allBrands),
    loadBrands,
    searchBrands,
    createNewBrand,
    getBrandName,
    clearBrandSearch,
  }
}
