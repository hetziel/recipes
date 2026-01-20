export interface Product {
  id?: string
  name: string
  category_id: string
  brand_id: string | null
  measurement_id: string
  measurement_value: number
  currency_type: string
  price: number
  created_at?: string
  updated_at?: string | null
  marked_to_create?: boolean
  marked_to_delete?: boolean
  marked_to_update?: boolean
}

export interface ExtendedProduct extends Product {
  tempPrice?: number
}

export interface Category {
  id: string
  name: string
}

export interface Brand {
  id: string
  name: string
}

// Nueva interfaz para medidas
export interface Measurement {
  id: string
  type: string
}

export interface DolarData {
  fuente: string
  nombre: string
  compra: number | null
  venta: number | null
  promedio: number
  fechaActualizacion: string
}

export interface DolarBCV {
  promedio: number
  fechaAnterior: string | null
  fechaActualizacion: string | null
  origen: 'api' | 'local' | 'importado'
}

// Interfaces para búsqueda dinámica
export interface SearchableItem {
  id: string
  name: string
  isNew?: boolean
}

export interface SearchState {
  query: string
  items: SearchableItem[]
  selectedItem: SearchableItem | null
  showDropdown: boolean
  isLoading: boolean
}
