export interface Producto {
  id?: string
  nombre: string
  precio?: number
  peso?: number | string
  fecha?: string
  [key: string]: any
  sincronizado?: boolean
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
