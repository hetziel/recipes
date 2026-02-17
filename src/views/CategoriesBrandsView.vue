<template>
    <div class="settings-view">
        <div class="page-header">
            <h1 class="page-title">
                <Icon name="cog-outline" class="mr-2" />
                Configuración de Productos
            </h1>
            <p class="page-subtitle">Administra las categorías y marcas disponibles para tus productos.</p>
        </div>

        <!-- Tabs Navigation -->
        <div class="tabs-container">
            <button @click="activeTab = 'categories'" :class="['tab-btn', { active: activeTab === 'categories' }]">
                <Icon name="shape-outline" />
                Categorías
            </button>
            <button @click="activeTab = 'brands'" :class="['tab-btn', { active: activeTab === 'brands' }]">
                <Icon name="tag-outline" />
                Marcas
            </button>
        </div>

        <!-- Error/Loading -->
        <div v-if="errorCategories || errorBrands" class="alert alert-error mb-4">
            <Icon name="alert-circle" />
            {{ errorCategories || errorBrands }}
        </div>

        <div v-if="isLoadingCategories || isLoadingBrands" class="loading-state">
            <div class="spinner"></div>
            <p>Cargando datos...</p>
        </div>

        <!-- Content Sections -->
        <div v-else class="tab-content">
            <!-- Categories Tab -->
            <section v-if="activeTab === 'categories'" class="management-section">
                <div class="section-header">
                    <div class="search-wrapper">
                        <Icon name="magnify" class="search-icon" />
                        <input v-model="categorySearch" type="text" placeholder="Buscar categoría..."
                            class="search-input" />
                    </div>
                    <button @click="openModal('category')" class="btn btn-primary">
                        <Icon name="plus" />
                        Nueva Categoría
                    </button>
                </div>

                <div class="grid-container">
                    <div v-for="cat in filteredCategories" :key="cat.id" class="item-card">
                        <div class="item-visual" :style="{ backgroundColor: getCategoryColor(cat.id) }">
                            <Icon :name="cat.icon || 'shape-outline'" />
                        </div>
                        <div class="item-info">
                            <h3 class="item-name">{{ cat.name }}</h3>
                            <p class="item-meta">ID: {{ cat.id }}</p>
                        </div>
                        <div class="item-actions">
                            <button @click="openModal('category', cat)" class="btn-icon">
                                <Icon name="pencil" />
                            </button>
                            <button @click="confirmDelete('category', cat)" class="btn-icon text-danger">
                                <Icon name="trash-can-outline" />
                            </button>
                        </div>
                    </div>
                </div>
                <div v-if="filteredCategories.length === 0" class="empty-state">
                    <Icon name="shape-off-outline" size="xl" />
                    <p>No se encontraron categorías.</p>
                </div>
            </section>

            <!-- Brands Tab -->
            <section v-if="activeTab === 'brands'" class="management-section">
                <div class="section-header">
                    <div class="search-wrapper">
                        <Icon name="magnify" class="search-icon" />
                        <input v-model="brandSearchQuery" type="text" placeholder="Buscar marca..."
                            class="search-input" />
                    </div>
                    <button @click="openModal('brand')" class="btn btn-primary">
                        <Icon name="plus" />
                        Nueva Marca
                    </button>
                </div>

                <div class="grid-container">
                    <div v-for="brand in filteredBrands" :key="brand.id" class="item-card brand-card">
                        <div class="item-visual brand-visual">
                            <Icon name="tag-outline" />
                        </div>
                        <div class="item-info">
                            <h3 class="item-name">{{ brand.name }}</h3>
                            <p class="item-meta">ID: {{ brand.id }}</p>
                        </div>
                        <div class="item-actions">
                            <button @click="openModal('brand', brand)" class="btn-icon">
                                <Icon name="pencil" />
                            </button>
                            <button @click="confirmDelete('brand', brand)" class="btn-icon text-danger">
                                <Icon name="trash-can-outline" />
                            </button>
                        </div>
                    </div>
                </div>
                <div v-if="filteredBrands.length === 0" class="empty-state">
                    <Icon name="tag-off-outline" size="xl" />
                    <p>No se encontraron marcas.</p>
                </div>
            </section>
        </div>

        <!-- Modals -->
        <!-- Form Modal -->
        <div v-if="showFormModal" class="modal-overlay" @click.self="closeModal">
            <div class="modal-content b-modal-content">
                <div class="modal-header">
                    <h2>{{ isEditing ? 'Editar' : 'Nueva' }} {{ modalType === 'category' ? 'Categoría' : 'Marca' }}</h2>
                    <button @click="closeModal" class="close-btn">&times;</button>
                </div>
                <form @submit.prevent="handleSave" class="form-container">
                    <div class="form-group">
                        <label class="form-label">Nombre</label>
                        <input v-model="form.name" required class="form-input"
                            :placeholder="'Nombre de la ' + (modalType === 'category' ? 'categoría' : 'marca')" />
                    </div>

                    <div v-if="modalType === 'category'" class="form-group">
                        <label class="form-label">Icono (MDI)</label>
                        <div class="icon-input-group">
                            <input v-model="form.icon" class="form-input" placeholder="Ej: apple, food-variant" />
                            <div class="icon-preview" v-if="form.icon">
                                <Icon :name="form.icon" />
                            </div>
                        </div>
                        <p class="form-help">Usa nombres de Material Design Icons.</p>
                    </div>

                    <div class="modal-footer">
                        <button type="button" @click="closeModal" class="btn btn-secondary">Cancelar</button>
                        <button type="submit" class="btn btn-primary" :disabled="isSaving">
                            <Icon :name="isSaving ? 'loading' : 'check'" />
                            {{ isSaving ? 'Guardando...' : 'Guardar' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Delete Modal -->
        <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
            <div class="modal-content b-modal-content delete-modal">
                <div class="modal-header">
                    <h2>Confirmar Eliminación</h2>
                </div>
                <div class="modal-body">
                    <div class="warning-icon">
                        <Icon name="alert-outline" size="xl" />
                    </div>
                    <p>¿Estás seguro de eliminar <strong>{{ itemToDelete?.name }}</strong>?</p>
                    <p class="text-sm text-muted">Esta acción puede afectar a los productos que utilicen este elemento.
                    </p>
                </div>
                <div class="modal-footer">
                    <button @click="showDeleteModal = false" class="btn btn-secondary">Cancelar</button>
                    <button @click="handleDelete" class="btn btn-danger" :disabled="isDeleting">
                        {{ isDeleting ? 'Eliminando...' : 'Eliminar' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useCategories } from '../composables/useCategories'
import { useBrands } from '../composables/useBrands'
import type { Category, Brand } from '../types/producto'
import Icon from '@/components/ui/Icon.vue'

const {
    categories,
    isLoading: isLoadingCategories,
    error: errorCategories,
    createNewCategory,
    updateCategory,
    deleteCategory
} = useCategories()

const {
    allBrands,
    isLoading: isLoadingBrands,
    error: errorBrands,
    createNewBrand,
    updateBrand,
    deleteBrand
} = useBrands()

// Tabs state
const activeTab = ref<'categories' | 'brands'>('categories')

// Search states
const categorySearch = ref('')
const brandSearchQuery = ref('')

// Modal state
const showFormModal = ref(false)
const showDeleteModal = ref(false)
const modalType = ref<'category' | 'brand'>('category')
const isEditing = ref(false)
const isSaving = ref(false)
const isDeleting = ref(false)
const itemToDelete = ref<Category | Brand | null>(null)

const form = reactive({
    id: '',
    name: '',
    icon: ''
})

// Filtered data
const filteredCategories = computed(() => {
    if (!categorySearch.value) return categories.value
    const q = categorySearch.value.toLowerCase()
    return categories.value.filter(c => c.name.toLowerCase().includes(q))
})

const filteredBrands = computed(() => {
    if (!brandSearchQuery.value) return allBrands.value
    const q = brandSearchQuery.value.toLowerCase()
    return allBrands.value.filter(b => b.name.toLowerCase().includes(q))
})

// UI Helpers
const getCategoryColor = (id: string): string => {
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316']
    const index = Math.abs(id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colors.length
    return colors[index]
}

// Modal logic
function openModal(type: 'category' | 'brand', item?: Category | Brand) {
    modalType.value = type
    if (item) {
        isEditing.value = true
        form.id = item.id
        form.name = item.name
        form.icon = (type === 'category' && 'icon' in item) ? (item as Category).icon || '' : ''
    } else {
        isEditing.value = false
        form.id = ''
        form.name = ''
        form.icon = ''
    }
    showFormModal.value = true
}

function closeModal() {
    showFormModal.value = false
    form.id = ''
    form.name = ''
    form.icon = ''
}

async function handleSave() {
    if (!form.name) return
    isSaving.value = true

    try {
        if (modalType.value === 'category') {
            if (isEditing.value) {
                await updateCategory(form.id, { name: form.name, icon: form.icon })
            } else {
                await createNewCategory(form.name, form.icon)
            }
        } else {
            if (isEditing.value) {
                await updateBrand(form.id, { name: form.name })
            } else {
                await createNewBrand(form.name)
            }
        }
        closeModal()
    } catch (e) {
        console.error(e)
    } finally {
        isSaving.value = false
    }
}

function confirmDelete(type: 'category' | 'brand', item: Category | Brand) {
    modalType.value = type
    itemToDelete.value = item
    showDeleteModal.value = true
}

async function handleDelete() {
    if (!itemToDelete.value) return
    isDeleting.value = true

    try {
        if (modalType.value === 'category') {
            await deleteCategory(itemToDelete.value.id)
        } else {
            await deleteBrand(itemToDelete.value.id)
        }
        showDeleteModal.value = false
        itemToDelete.value = null
    } catch (e) {
        console.error(e)
    } finally {
        isDeleting.value = false
    }
}
</script>

<style scoped>
.settings-view {
    padding: 24px;
}

.page-header {
    margin-bottom: 32px;
}

.page-title {
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 4px;
    display: flex;
    align-items: center;
}

.page-subtitle {
    color: var(--text-secondary);
    font-size: 1rem;
}

/* Tabs */
.tabs-container {
    display: flex;
    gap: 8px;
    background: var(--surface);
    padding: 6px;
    border-radius: var(--radius-lg);
    margin-bottom: 24px;
    border: 1px solid var(--border);
    width: fit-content;
}

.tab-btn {
    padding: 10px 20px;
    border-radius: var(--radius-md);
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s ease;
}

.tab-btn:hover {
    background: var(--background);
    color: var(--primary);
}

.tab-btn.active {
    background: var(--primary);
    color: white;
    box-shadow: var(--shadow-sm);
}

/* Section Layout */
.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    gap: 16px;
    flex-wrap: wrap;
}

.search-wrapper {
    position: relative;
    flex: 1;
    min-width: 250px;
}

.search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-secondary);
}

.search-input {
    width: 100%;
    padding: 10px 12px 10px 40px;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--surface);
    color: var(--text-primary);
}

/* Grid Container */
.grid-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
}

.item-card {
    background: var(--surface);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border);
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 16px;
    transition: all 0.2s ease;
}

.item-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow);
    border-color: var(--primary);
}

.item-visual {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1.5rem;
}

.brand-visual {
    background: var(--background);
    color: var(--text-secondary);
    border: 1px solid var(--border);
}

.item-info {
    flex: 1;
}

.item-name {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0;
}

.item-meta {
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin: 2px 0 0;
}

.item-actions {
    display: flex;
    gap: 4px;
}

/* Modals */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
}

.b-modal-content {
    background: var(--surface);
    width: 100%;
    max-width: 450px;
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    overflow: hidden;
    animation: modalIn 0.3s ease-out;
}

@keyframes modalIn {
    from {
        opacity: 0;
        transform: scale(0.95) translateY(20px);
    }

    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}

.modal-header {
    padding: 20px 24px;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--background);
}

.modal-header h2 {
    margin: 0;
    font-size: 1.25rem;
}

.close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--text-secondary);
}

.form-container {
    padding: 24px;
}

.icon-input-group {
    display: flex;
    gap: 12px;
    align-items: center;
}

.icon-preview {
    width: 42px;
    height: 42px;
    background: var(--background);
    border: 1px solid var(--border);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    color: var(--primary);
}

.modal-footer {
    margin-top: 32px;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
}

/* Delete Modal */
.delete-modal {
    text-align: center;
}

.warning-icon {
    width: 64px;
    height: 64px;
    background: var(--danger-light, #fee2e2);
    color: var(--danger);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
}

/* Common UI */
.form-help {
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin-top: 4px;
}

.empty-state {
    text-align: center;
    padding: 48px;
    color: var(--text-secondary);
}

.loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 64px;
    gap: 16px;
}

@media (max-width: 768px) {
    .settings-view {
        padding: 16px;
    }

    .page-title {
        font-size: 1.5rem;
    }

    .tabs-container {
        width: 100%;
    }

    .tab-btn {
        flex: 1;
        justify-content: center;
    }
}
</style>
