import { ref, reactive, onMounted } from 'vue'
import {
  collection,
  doc,
  getDocs,
  setDoc,
} from 'firebase/firestore'
import { db } from '../firebase.config' // Assuming firebase.config is in parent directory
import type { Brand } from '../types/producto' // Use Brand interface from producto.ts
import type { SearchableItem, SearchState } from '../types/search' // Use new SearchableItem/SearchState

const MARCAS_COLLECTION = 'marcas'
const onFireStore = true // Hardcoded for now, as it's a const in Products.vue

export function useBrands() {
  const brandSearch = reactive<SearchState>({
    query: '',
    items: [],
    selectedItem: null,
    showDropdown: false,
    isLoading: false,
  })

  const allBrands = ref<Brand[]>([]) // To store all loaded brands

  async function loadBrands() {
    try {
      if (onFireStore) {
        const querySnapshot = await getDocs(collection(db, MARCAS_COLLECTION))
        const loadedBrands = querySnapshot.docs.map(
          (d) =>
            ({
              id: d.id,
              name: d.data().name,
            }) as Brand, // Cast to Brand interface
        )
        allBrands.value = loadedBrands // Update allBrands
        brandSearch.items = loadedBrands.map(b => ({ id: b.id, name: b.name })) // Also update search items
      }
    } catch (err) {
      console.error('Error cargando marcas:', err)
    }
  }

  async function searchBrands() {
    const queryText = brandSearch.query.trim().toLowerCase()

    if (queryText.length === 0) {
      brandSearch.items = allBrands.value.map(b => ({ id: b.id, name: b.name })) // Show all if query is empty
      return
    }

    try {
      brandSearch.isLoading = true

      // Search in allBrands data
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
        // created_at: new Date().toISOString().split('T')[0], // Product interface from types/producto.ts does not have created_at directly
      }

      await setDoc(newBrandRef, newBrand)

      // Reload brands to include the new one
      await loadBrands()

      return newBrand
    } catch (err) {
      console.error('Error creando marca:', err)
      // error.value = 'Error al crear la marca' // Composables should not set global errors
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
    brandSearch.items = allBrands.value.map(b => ({ id: b.id, name: b.name })) // Reset to all brands
  }

  // Initial load of brands
  onMounted(() => {
    loadBrands()
  })

  return {
    brandSearch,
    allBrands,
    loadBrands,
    searchBrands,
    createNewBrand,
    getBrandName,
    clearBrandSearch,
  }
}
