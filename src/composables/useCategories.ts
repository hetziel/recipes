import { ref, readonly } from 'vue'
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  setDoc,
  doc
} from 'firebase/firestore'
import type { Unsubscribe } from 'firebase/firestore'
import { db } from '../firebase.config'
import type { Category } from '../types/producto'
import type { SearchableItem } from '../types/search'

// Global state
const categories = ref<Category[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
let unsubscribe: Unsubscribe | null = null

const CATEGORIAS_COLLECTION = 'categorias'

export function useCategories() {

  function subscribeToCategories() {
    if (unsubscribe) return

    isLoading.value = true
    error.value = null

    try {
      const q = query(collection(db, CATEGORIAS_COLLECTION), orderBy('name'))

      unsubscribe = onSnapshot(q, (snapshot) => {
        categories.value = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          icon: doc.data().icon
        } as Category))
        isLoading.value = false
      }, (err) => {
        console.error('Error in categories snapshot:', err)
        error.value = 'Error al cargar categorías'
        isLoading.value = false
      })
    } catch (e: unknown) {
      console.error('Error setting up categories subscription:', e)
      error.value = e instanceof Error ? e.message : 'Error desconocido'
      isLoading.value = false
    }
  }

  function getCategoryName(id: string): string {
    const cat = categories.value.find(c => c.id === id)
    return cat ? cat.name : id
  }

  function getCategoryInfo(id: string): Category | undefined {
    return categories.value.find(c => c.id === id)
  }

  // Helper to convert to SearchableItems if needed
  function getSearchableCategories(): SearchableItem[] {
    return categories.value.map(c => ({
      id: c.id,
      name: c.name,
      icon: c.icon
    }))
  }

  async function createNewCategory(name: string, icon?: string): Promise<Category | null> {
    try {
      const newCategoryRef = doc(collection(db, CATEGORIAS_COLLECTION))
      const newCategory = {
        id: newCategoryRef.id,
        name: name,
        icon: icon || undefined,
        created_at: new Date().toISOString().split('T')[0],
      }

      await setDoc(newCategoryRef, newCategory)
      return newCategory as Category
    } catch (err: unknown) {
      console.error('Error creating category:', err)
      error.value = err instanceof Error ? err.message : 'Error desconocido'
      return null
    }
  }

  // Auto-start
  if (!unsubscribe) {
    subscribeToCategories()
  }

  return {
    categories: readonly(categories),
    isLoading: readonly(isLoading),
    error: readonly(error),
    subscribeToCategories,
    getCategoryName,
    getCategoryInfo,
    getSearchableCategories,
    createNewCategory,
  }
}
