import { ref, readonly } from 'vue'
import {
    collection,
    onSnapshot,
    query
} from 'firebase/firestore'
import type { Unsubscribe } from 'firebase/firestore'
import { db } from '../firebase.config'
import type { Recipe, RecipeScenario } from '../types/recipe'

// Global state
const recipes = ref<Recipe[]>([])
const scenarios = ref<RecipeScenario[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

let unsubscribeRecipes: Unsubscribe | null = null
let unsubscribeScenarios: Unsubscribe | null = null

const RECIPES_COLLECTION = 'recipes'
const SCENARIOS_COLLECTION = 'scenarios'

export function useRecipes() {

    function subscribeToRecipes() {
        if (unsubscribeRecipes && unsubscribeScenarios) return

        isLoading.value = true
        error.value = null

        try {
            // Recipes Subscription
            const qRecipes = query(collection(db, RECIPES_COLLECTION))
            unsubscribeRecipes = onSnapshot(qRecipes, (snapshot) => {
                recipes.value = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Recipe))
                checkLoading()
            }, (err) => {
                console.error('Error in recipes snapshot:', err)
                error.value = 'Error al cargar recetas'
            })

            // Scenarios Subscription
            const qScenarios = query(collection(db, SCENARIOS_COLLECTION))
            unsubscribeScenarios = onSnapshot(qScenarios, (snapshot) => {
                scenarios.value = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as RecipeScenario))
                checkLoading()
            }, (err) => {
                console.error('Error in scenarios snapshot:', err)
                error.value = 'Error al cargar escenarios'
            })

        } catch (e: any) {
            console.error('Error setting up recipes subscription:', e)
            error.value = e.message
            isLoading.value = false
        }
    }

    function checkLoading() {
        // Simple logic: if we have some data or at least initiated, we might consider not loading?
        // Or we wait for both first emits?
        // Firestore onSnapshot emits immediately with cached or empty.
        // We can just set isLoading to false after the first emit of either or both.
        // Ideally we wait for both, but for now:
        isLoading.value = false
    }

    function unsubscribeFromRecipes() {
        if (unsubscribeRecipes) {
            unsubscribeRecipes()
            unsubscribeRecipes = null
        }
        if (unsubscribeScenarios) {
            unsubscribeScenarios()
            unsubscribeScenarios = null
        }
    }

    // Auto-start
    if (!unsubscribeRecipes || !unsubscribeScenarios) {
        subscribeToRecipes()
    }

    return {
        recipes: readonly(recipes),
        scenarios: readonly(scenarios),
        isLoading: readonly(isLoading),
        error: readonly(error),
        subscribeToRecipes,
        unsubscribeFromRecipes
    }
}
