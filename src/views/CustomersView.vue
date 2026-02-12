<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase.config'
import Icon from '@/components/ui/Icon.vue'
import type { Customer, Sale } from '../types/sales'

// STATE
const customers = ref<Customer[]>([])
const allSales = ref<Sale[]>([])
const isLoading = ref(false)
const showCustomerModal = ref(false)
const searchQuery = ref('')

// FORM STATE
const customerForm = ref({
    name: '',
    phone: '',
})
const editingCustomerId = ref<string | null>(null)
const isEditing = ref(false)

// COMPUTED
const filteredCustomers = computed(() => {
    if (!searchQuery.value) return customers.value
    const q = searchQuery.value.toLowerCase()
    return customers.value.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q)
    )
})

// METHODS
async function loadData() {
    isLoading.value = true
    try {
        const custSnap = await getDocs(query(collection(db, 'customers'), orderBy('name')))
        customers.value = custSnap.docs.map(d => ({ id: d.id, ...d.data() } as Customer))

        const salesSnap = await getDocs(collection(db, 'sales'))
        allSales.value = salesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Sale))
    } catch (error) {
        console.error('Error loading customers:', error)
    } finally {
        isLoading.value = false
    }
}

function openAddModal() {
    isEditing.value = false
    editingCustomerId.value = null
    customerForm.value = { name: '', phone: '' }
    showCustomerModal.value = true
}

function openEditModal(customer: Customer) {
    isEditing.value = true
    editingCustomerId.value = customer.id!
    customerForm.value = {
        name: customer.name,
        phone: customer.phone
    }
    showCustomerModal.value = true
}

async function saveCustomer() {
    if (!customerForm.value.name) return

    try {
        if (isEditing.value && editingCustomerId.value) {
            await updateDoc(doc(db, 'customers', editingCustomerId.value), {
                name: customerForm.value.name,
                phone: customerForm.value.phone
            })
        } else {
            await addDoc(collection(db, 'customers'), {
                ...customerForm.value,
                created_at: new Date().toISOString()
            })
        }
        showCustomerModal.value = false
        await loadData()
    } catch (error) {
        console.error('Error saving customer:', error)
        alert('Error al guardar cliente')
    }
}

async function deleteCustomer(id: string) {
    const hasSales = allSales.value.some(s => s.customer_id === id)
    if (hasSales) {
        alert('No se puede eliminar un cliente con ventas registradas.')
        return
    }

    if (confirm('¿Estás seguro de eliminar este cliente?')) {
        try {
            await deleteDoc(doc(db, 'customers', id))
            await loadData()
        } catch (error) {
            console.error('Error deleting customer:', error)
            alert('Error al eliminar cliente')
        }
    }
}

function getSalesCount(customerId: string) {
    return allSales.value.filter(s => s.customer_id === customerId).length
}

onMounted(loadData)
</script>

<template>
    <div class="customers-view">
        <header class="view-header">
            <div class="header-content">
                <h1>
                    <Icon name="account-group" /> Gestión de Clientes
                </h1>
                <p>Administra tu base de datos de clientes y contactos.</p>
            </div>
            <button @click="openAddModal" class="btn btn-primary">
                <Icon name="plus" /> Nuevo Cliente
            </button>
        </header>

        <div class="search-bar mt-4">
            <div class="search-input-wrapper">
                <Icon name="magnify" class="search-icon" />
                <input v-model="searchQuery" type="text" placeholder="Buscar por nombre o teléfono..."
                    class="form-input search-input" />
            </div>
        </div>

        <div v-if="isLoading" class="loading-state mt-8">
            <div class="spinner"></div>
            <p>Cargando clientes...</p>
        </div>

        <div v-else-if="filteredCustomers.length === 0" class="empty-state mt-8">
            <Icon name="account-search-outline" class="empty-icon" />
            <h3>No se encontraron clientes</h3>
            <p>Intenta con otra búsqueda o agrega un nuevo cliente.</p>
        </div>

        <div v-else class="customers-grid mt-6">
            <div v-for="customer in filteredCustomers" :key="customer.id" class="customer-card">
                <div class="customer-info">
                    <div class="customer-avatar">
                        {{ customer.name.charAt(0).toUpperCase() }}
                    </div>
                    <div class="customer-details">
                        <h3>{{ customer.name }}</h3>
                        <p class="phone">
                            <Icon name="phone" /> {{ customer.phone || 'Sin teléfono' }}
                        </p>
                        <p class="sales-count">
                            <Icon name="cart-check" /> {{ getSalesCount(customer.id!) }} ventas
                        </p>
                    </div>
                </div>
                <div class="customer-actions">
                    <button @click="openEditModal(customer)" class="btn-icon" title="Editar">
                        <Icon name="pencil" />
                    </button>
                    <button @click="deleteCustomer(customer.id!)" class="btn-icon text-danger" title="Eliminar">
                        <Icon name="delete" />
                    </button>
                </div>
            </div>
        </div>

        <!-- CUSTOMER MODAL -->
        <div v-if="showCustomerModal" class="modal-overlay">
            <div class="modal-content">
                <header class="modal-header">
                    <h3>
                        <Icon name="account" /> {{ isEditing ? 'Editar Cliente' : 'Nuevo Cliente' }}
                    </h3>
                    <button @click="showCustomerModal = false" class="btn-icon">
                        <Icon name="close" />
                    </button>
                </header>

                <div class="modal-body">
                    <div class="form-group">
                        <label>Nombre Completo</label>
                        <input v-model="customerForm.name" type="text" class="form-input"
                            placeholder="Ej: Juan Pérez" />
                    </div>
                    <div class="form-group mt-4">
                        <label>Teléfono / Contacto</label>
                        <input v-model="customerForm.phone" type="text" class="form-input"
                            placeholder="Ej: 0412-1234567" />
                    </div>
                </div>

                <div class="modal-actions mt-6">
                    <button @click="showCustomerModal = false" class="btn btn-outline">Cancelar</button>
                    <button @click="saveCustomer" class="btn btn-primary" :disabled="!customerForm.name">
                        {{ isEditing ? 'Actualizar' : 'Crear' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.customers-view {
    animation: fadeIn 0.5s ease;
}

.view-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
}

.header-content h1 {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 0.5rem;
    color: var(--text-primary);
}

.header-content p {
    color: var(--text-secondary);
}

.search-input-wrapper {
    position: relative;
    max-width: 500px;
}

.search-icon {
    position: absolute;
    left: 12px;
    top: 12px;
    color: var(--text-secondary);
}

.search-input {
    padding-left: 40px;
}

.customers-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
}

.customer-card {
    background: var(--surface);
    border-radius: var(--radius-lg);
    padding: 20px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid var(--border);
}

.customer-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    border-color: var(--primary);
}

.customer-info {
    display: flex;
    gap: 16px;
}

.customer-avatar {
    width: 50px;
    height: 50px;
    background: var(--primary-gradient);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: 800;
    flex-shrink: 0;
}

.customer-details h3 {
    margin: 0;
    font-size: 1.1rem;
    color: var(--text-primary);
}

.customer-details p {
    margin: 4px 0 0;
    font-size: 0.85rem;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 6px;
}

.customer-actions {
    display: flex;
    gap: 8px;
}

.loading-state,
.empty-state {
    text-align: center;
    padding: 3rem;
    background: var(--surface);
    border-radius: var(--radius-lg);
    border: 2px dashed var(--border);
}

.empty-icon {
    font-size: 4rem;
    color: var(--text-secondary);
    opacity: 0.5;
    margin-bottom: 1rem;
}

/* Animations */
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@media (max-width: 768px) {
    .view-header {
        flex-direction: column;
        gap: 1rem;
    }

    .customers-grid {
        grid-template-columns: 1fr;
    }
}
</style>
