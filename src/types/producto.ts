export interface Product {
  id?: string
  name: string
  price?: number
  weight?: number | string
  quantity?: number | null
  created_at?: string
  updated_at?: string | null
  marked_to_create?: boolean
  marked_to_update?: boolean
  marked_to_delete?: boolean
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
