

export interface ProductPrice {
  establishment_id: string
  price: number
  currency: 'USD' | 'Bs'
  updated_at?: string
}

export interface UiProductPrice extends ProductPrice {
  ui_currency: 'USD' | 'Bs'
}

export interface Product {
  id?: string
  name: string
  category_id: string
  brand_id: string | null
  measurement_id: string
  measurement_value: number
  currency_type: string
  price: number
  prices?: ProductPrice[]
  average_price?: number
  is_utility?: boolean
  created_at?: string
  updated_at?: string | null
  marked_to_create?: boolean
  marked_to_delete?: boolean
  marked_to_update?: boolean
  is_recipe_product?: boolean  // Flag to identify products created from recipes
  recipe_id?: string           // Reference to source recipe
  final_weight_grams?: number  // Final cooked weight of the recipe product
  production_units?: number    // Total production units if recipe has fixed units
}

export interface ExtendedProduct extends Product {
  tempPrice?: number
}

export interface Category {
  id: string
  name: string
  icon?: string // Add this line
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
  fecha: string | null
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
