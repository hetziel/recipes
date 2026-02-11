export interface Customer {
    id?: string
    name: string
    phone: string
    created_at: string
}

export type SaleStatus = 'pendiente' | 'pagado' | 'por pagar' | 'cancelado'

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
    customer_id: string
    customer_name: string // Denormalized for quick access
    items: SaleItem[]
    total_amount: number // USD
    status: SaleStatus
    payment_due_date: string
    created_at: string
    updated_at?: string
}
