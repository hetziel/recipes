<template>
    <div class="establishments-view">
        <div class="page-header">
            <h1>
                <Icon name="store" class="mr-2" />
                Establecimientos
            </h1>
            <button @click="openModal()" class="btn btn-primary">
                <Icon name="plus" />
                Nuevo Establecimiento
            </button>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="alert alert-error mb-4">
            <Icon name="alert-circle" />
            {{ error }}
            <button @click="error = null" class="close-btn">&times;</button>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="loading-container">
            <div class="spinner"></div>
            <p>Cargando establecimientos...</p>
        </div>

        <!-- List -->
        <div v-else class="establishments-list">
            <div v-if="establishments.length === 0" class="empty-state">
                <Icon name="store-off" size="xl" class="text-muted" />
                <p>No hay establecimientos registrados</p>
            </div>

            <div v-else class="grid-container">
                <div v-for="est in establishments" :key="est.id" class="est-card">
                    <div class="est-info">
                        <h3>{{ est.name }}</h3>
                        <p v-if="est.address" class="text-muted text-sm">
                            <Icon name="map-marker" size="xs" /> {{ est.address }}
                        </p>
                    </div>
                    <div class="est-actions">
                        <button @click="openModal(est)" class="btn-icon" title="Editar">
                            <Icon name="pencil" />
                        </button>
                        <button @click="confirmDelete(est)" class="btn-icon text-danger" title="Eliminar">
                            <Icon name="trash-can-outline" />
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal Form -->
        <div v-if="showFormModal" class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>{{ isEditing ? 'Editar Establecimiento' : 'Nuevo Establecimiento' }}</h2>
                    <button @click="closeModal" class="btn-icon">
                        <Icon name="close" />
                    </button>
                </div>
                <form @submit.prevent="handleSave">
                    <div class="form-group">
                        <label>Nombre</label>
                        <input v-model="form.name" required class="form-input"
                            placeholder="Nombre del establecimiento" />
                    </div>
                    <div class="form-group">
                        <label>Dirección (Opcional)</label>
                        <input v-model="form.address" class="form-input" placeholder="Ubicación" />
                    </div>
                    <div class="modal-actions">
                        <button type="button" @click="closeModal" class="btn btn-secondary">Cancelar</button>
                        <button type="submit" class="btn btn-primary" :disabled="isSaving">
                            {{ isSaving ? 'Guardando...' : 'Guardar' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Delete Confirmation -->
        <div v-if="showDeleteModal" class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Confirmar Eliminación</h2>
                </div>
                <div class="modal-body">
                    <p>¿Estás seguro de eliminar <strong>{{ selectedEst?.name }}</strong>?</p>
                    <p class="text-sm text-warning">Esta acción no se puede deshacer.</p>
                </div>
                <div class="modal-actions">
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
import { ref, reactive, onMounted } from 'vue'
import { useEstablishments } from '../composables/useEstablishments'
import type { Establishment } from '../types/establishment'
import Icon from '@/components/ui/Icon.vue'

const {
    establishments,
    isLoading,
    error,
    loadEstablishments,
    createEstablishment,
    updateEstablishment,
    deleteEstablishment
} = useEstablishments()

// State
const showFormModal = ref(false)
const showDeleteModal = ref(false)
const isEditing = ref(false)
const isSaving = ref(false)
const isDeleting = ref(false)
const selectedEst = ref<Establishment | null>(null)

const form = reactive({
    id: '',
    name: '',
    address: ''
})

onMounted(() => {
    loadEstablishments()
})

function openModal(est?: Establishment) {
    if (est) {
        isEditing.value = true
        form.id = est.id
        form.name = est.name
        form.address = est.address || ''
    } else {
        isEditing.value = false
        form.id = ''
        form.name = ''
        form.address = ''
    }
    showFormModal.value = true
}

function closeModal() {
    showFormModal.value = false
    selectedEst.value = null
}

async function handleSave() {
    if (!form.name) return
    isSaving.value = true

    try {
        if (isEditing.value && form.id) {
            await updateEstablishment(form.id, {
                name: form.name,
                address: form.address
            })
        } else {
            await createEstablishment(form.name, form.address)
        }
        closeModal()
    } catch (e) {
        console.error(e)
    } finally {
        isSaving.value = false
    }
}

function confirmDelete(est: Establishment) {
    selectedEst.value = est
    showDeleteModal.value = true
}

async function handleDelete() {
    if (!selectedEst.value) return
    isDeleting.value = true
    try {
        await deleteEstablishment(selectedEst.value.id)
        showDeleteModal.value = false
        selectedEst.value = null
    } catch (e) {
        console.error(e)
    } finally {
        isDeleting.value = false
    }
}
</script>

<style scoped>
.establishments-view {
    padding: 20px;
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
}

.grid-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
}

.est-card {
    background: var(--surface);
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: 1px solid var(--border);
}

.est-info h3 {
    margin: 0 0 4px 0;
    font-size: 1.1rem;
}

.est-actions {
    display: flex;
    gap: 8px;
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal-content {
    background: var(--surface);
    padding: 24px;
    border-radius: 8px;
    width: 100%;
    max-width: 500px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 24px;
}

.form-group {
    margin-bottom: 16px;
}

.form-group label {
    display: block;
    margin-bottom: 6px;
    font-weight: 500;
}

.form-input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--background);
    color: var(--text-primary);
}
</style>
