export interface Producto {
  id?: string
  nombre: string
  precio?: number
  precioBs?: string
  peso?: number | string
  fecha?: string
  [key: string]: any
}

export interface DolarData {
  fuente: string
  nombre: string
  compra: number | null
  venta: number | null
  promedio: number
  fechaActualizacion: string
}

export interface LocalStorageData {
  productos: Producto[]
  tasaDolar: number
  fechaGuardado: string
  tasaApi?: {
    valor: number
    fechaActualizacion: string
  }
}

export interface dolarBCV {
  promedio: number
  fechaActualizacion: string
  origen: 'api' | 'local'
}
