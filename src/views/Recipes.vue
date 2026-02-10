<template>
    <div class="recipes-container">
        <header class="page-header">
            <h1>Recetas</h1>
            <button @click="$router.push('/recipes/create')" class="btn btn-primary">
                <Icon name="plus" /> Nueva Receta
            </button>
        </header>

        <div class="card">
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Peso Total</th>
                            <th>Inversión Total</th>
                            <th>Formatos de Venta</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="recipe in recipes" :key="recipe.id">
                            <td>
                                <router-link :to="`/recipes/${recipe.id}/edit`" class="recipe-link">
                                    {{ recipe.name }}
                                </router-link>
                                <div class="text-xs text-muted">{{ formatDate(recipe.updated_at) }}</div>
                            </td>
                            <td>{{ recipe.total_weight.toFixed(2) }}</td>
                            <td>
                                <div>${{ recipe.total_cost.toFixed(2) }}</div>
                                <div class="text-xs text-muted">Bs {{ (recipe.total_cost * dolarRate).toFixed(2) }}
                                </div>
                            </td>
                            <td>
                                <div class="tags">
                                    <span v-for="(fmt, idx) in recipe.production_formats" :key="idx" class="tag">
                                        {{ fmt.weight_per_unit }}g
                                    </span>
                                </div>
                            </td>
                            <td>
                                <div class="actions">
                                    <button @click="$router.push(`/recipes/${recipe.id}/edit`)" class="btn-icon">
                                        <Icon name="pencil" />
                                    </button>
                                    <button @click="confirmDelete(recipe)" class="btn-icon text-danger">
                                        <Icon name="delete" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                        <tr v-if="recipes.length === 0">
                            <td colspan="5" class="text-center py-8">
                                <Icon name="chef-hat" size="xl" class="mb-2" />
                                <p>No hay recetas creadas aún.</p>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, inject, computed, type Ref } from 'vue'
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../firebase.config'
import Icon from '@/components/ui/Icon.vue'
import type { Recipe } from '../types/recipe'
import type { DolarBCV } from '../types/producto'

const recipes = ref<Recipe[]>([])
const loading = ref(false)

const { dolarBCV } = inject<{ dolarBCV: Ref<DolarBCV | null> }>('dolarBCV')!
const dolarRate = computed(() => dolarBCV.value?.promedio || 0)

async function loadRecipes() {
    loading.value = true
    try {
        const snap = await getDocs(collection(db, 'recipes'))
        recipes.value = snap.docs.map(d => ({ id: d.id, ...d.data() } as Recipe))
    } catch (e) {
        console.error(e)
    } finally {
        loading.value = false
    }
}

async function confirmDelete(recipe: Recipe) {
    if (confirm(`¿Eliminar la receta "${recipe.name}"?`)) {
        if (!recipe.id) return
        await deleteDoc(doc(db, 'recipes', recipe.id))
        await loadRecipes()
    }
}

function formatDate(dateStr?: string) {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString()
}

onMounted(() => {
    loadRecipes()
})
</script>

<style scoped>
.recipes-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px;
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
}

.card {
    background: var(--surface);
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
}

.data-table {
    width: 100%;
    border-collapse: collapse;
}

.data-table th,
.data-table td {
    padding: 16px;
    text-align: left;
    border-bottom: 1px solid var(--border);
}

.recipe-link {
    font-weight: 600;
    color: var(--primary);
    text-decoration: none;
}

.recipe-link:hover {
    text-decoration: underline;
}

.text-muted {
    color: var(--text-secondary);
}

.text-xs {
    font-size: 0.75rem;
}

.py-8 {
    padding-top: 32px;
    padding-bottom: 32px;
}

.mb-2 {
    margin-bottom: 8px;
}

.tags {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
}

.tag {
    background: var(--background);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.8rem;
    border: 1px solid var(--border);
}

.actions {
    display: flex;
    gap: 8px;
}

.btn-icon {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
}

.btn-icon:hover {
    background: rgba(0, 0, 0, 0.05);
}

.text-danger {
    color: #ef4444;
}
</style>
