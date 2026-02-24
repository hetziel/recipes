export interface Customer {
    id?: string
    name: string
    phone: string
    created_at: string
}

export type SaleStatus = 'pendiente' | 'pagado' | 'por pagar' | 'cancelado'
export type DeliveryStatus = 'por_entregar' | 'entregado' | 'cancelado'

export interface SaleItem {
    scenario_id: string
    scenario_name: string
    recipe_name: string
    quantity: number
    unit_price: number // USD
    total_price: number // USD
}

export interface Sale {
    id?: string
    invoice_number?: string
    customer_id: string
    customer_name: string // Denormalized for quick access
    customer_phone?: string
    items: SaleItem[]
    total_amount: number // USD
    status: SaleStatus
    status_updated_at?: string
    purchase_date?: string
    payment_due_date: string
    is_chicken_sale?: boolean
    delivery_status?: DeliveryStatus
    created_at: string
    updated_at?: string
}
