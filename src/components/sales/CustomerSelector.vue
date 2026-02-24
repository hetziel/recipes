<template>
    <div class="customer-selector relative">
        <div class="searchable-input">
            <input v-model="searchQuery" @input="onInput" @focus="onFocus" type="text" class="form-input"
                :class="inputClass" :placeholder="placeholder" />
            <div v-if="showSuggestions && (matchingCustomers.length > 0 || isNew)" class="suggestions shadow-lg">
                <div v-for="c in matchingCustomers" :key="c.id" @click="selectCustomer(c)" class="suggestion-item">
                    {{ c.name }} <span v-if="c.phone" class="text-xs text-muted">({{ c.phone }})</span>
                </div>
                <div v-if="isNew && searchQuery.length >= 2" @click="createNewCustomer"
                    class="suggestion-item text-primary font-bold">
                    <Icon name="plus-circle-outline" class="mr-1" style="vertical-align: middle;" /> Crear "{{
                    searchQuery }}"
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { Customer } from '@/types/sales'
import Icon from '@/components/ui/Icon.vue'
import { addDoc, collection } from 'firebase/firestore'
import { db } from '@/firebase.config'

const props = withDefaults(defineProps<{
    modelValue?: string | undefined
    customers: Customer[]
    placeholder?: string
    returnType?: 'id' | 'name'
    inputClass?: string
}>(), {
    placeholder: 'Buscar o escribir nombre...',
    returnType: 'name',
    inputClass: ''
})

const emit = defineEmits(['update:modelValue', 'select', 'customer-created'])

const searchQuery = ref('')
const showSuggestions = ref(false)

watch(() => props.modelValue, (newVal) => {
    if (newVal) {
        if (props.returnType === 'id') {
            const c = props.customers.find(cx => cx.id === newVal)
            if (c && c.name !== searchQuery.value) {
                searchQuery.value = c.name
            }
        } else {
            if (searchQuery.value !== newVal) {
                searchQuery.value = newVal
            }
        }
    } else {
        searchQuery.value = ''
    }
}, { immediate: true })

const matchingCustomers = computed(() => {
    if (searchQuery.value.length < 2) return props.customers.slice(0, 5)
    const q = searchQuery.value.toLowerCase()
    return props.customers.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q))
    ).slice(0, 5)
})

const isNew = computed(() => {
    if (searchQuery.value.length < 2) return false
    return !props.customers.some(c => c.name.toLowerCase() === searchQuery.value.toLowerCase())
})

function onFocus() {
    showSuggestions.value = true
}

function onInput() {
    showSuggestions.value = true
    if (props.returnType === 'name') {
        emit('update:modelValue', searchQuery.value)
    } else {
        // If we only return ID, and user is typing something not selected yet
        if (!searchQuery.value) {
            emit('update:modelValue', undefined)
        }
    }
}

function selectCustomer(c: Customer) {
    searchQuery.value = c.name
    showSuggestions.value = false
    if (props.returnType === 'id') {
        emit('update:modelValue', c.id)
    } else {
        emit('update:modelValue', c.name)
    }
    emit('select', c)
}

async function createNewCustomer() {
    const name = searchQuery.value
    try {
        const newCustRef = await addDoc(collection(db, 'customers'), {
            name: name,
            phone: '',
            created_at: new Date().toISOString()
        })
        const newCustomer: Customer = { id: newCustRef.id, name, phone: '', created_at: new Date().toISOString() }

        showSuggestions.value = false
        emit('customer-created', newCustomer)

        if (props.returnType === 'id') {
            emit('update:modelValue', newCustomer.id)
        } else {
            emit('update:modelValue', newCustomer.name)
        }
        emit('select', newCustomer)
    } catch (error) {
        console.error('Error creating customer:', error)
        alert('Error al crear cliente')
    }
}

function closeSuggestions(e: Event) {
    const target = e.target as HTMLElement
    if (!target.closest('.customer-selector')) {
        showSuggestions.value = false
    }
}

onMounted(() => {
    document.addEventListener('click', closeSuggestions)
})
onUnmounted(() => {
    document.removeEventListener('click', closeSuggestions)
})
</script>

<style scoped>
.relative {
    position: relative;
}

.searchable-input {
    position: relative;
    width: 100%;
}

.form-input {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid var(--border, #e2e8f0);
    border-radius: 6px;
    background: var(--background, #fff);
    color: var(--text-primary, #1e293b);
    font-size: 0.85rem;
}

.suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    width: 100%;
    background: white;
    border: 1px solid var(--border, #e2e8f0);
    border-radius: 8px;
    z-index: 50;
    max-height: 200px;
    overflow-y: auto;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    margin-top: 4px;
}

.suggestion-item {
    padding: 10px 12px;
    cursor: pointer;
    border-bottom: 1px solid #f1f5f9;
    font-size: 0.9rem;
    color: #334155;
}

.suggestion-item:last-child {
    border-bottom: none;
}

.suggestion-item:hover {
    background: #f8fafc;
}

.text-primary {
    color: #3b82f6;
}

.text-muted {
    color: #94a3b8;
}

.text-xs {
    font-size: 0.75rem;
}

.font-bold {
    font-weight: 700;
}

.mr-1 {
    margin-right: 4px;
}

.shadow-lg {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}
</style>
