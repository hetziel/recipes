export interface Recipe {
  name: string
  items: RecipeItems[]
  created_at?: string
  updated_at?: string | null
  sale_percent: number
}
export interface RecipeItems {
  product_id: string
  quantity: number
}
