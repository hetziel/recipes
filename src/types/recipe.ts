export interface RecipeIngredient {
  product_id: string
  usage_weight: number // Amount used in recipe (Utilizado)
}

export interface RecipeUtility {
  id?: string
  product_id?: string // Reference to product if applicable
  name?: string
  cost?: number // Price if not linked to product, or snapshot
  quantity?: number // Total quantity in package
  usage_quantity: number // Amount used
  profit_margin?: number // Profit margin for this specific utility (%)
}

export interface RecipeScenario {
  id?: string
  recipe_id: string // Reference to parent recipe
  name: string // "Nombre del paquete/escenario"
  mode: 'weight' | 'unit'
  value: number // weight per unit (if mode=weight) or total units (if mode=unit)
  fixed_sale_price?: number // Manual override for sale price
  fixed_sale_price_currency?: 'USD' | 'Bs'
  utilities: RecipeUtility[] // Scenario-specific utilities
}

export interface Recipe {
  id?: string
  name: string
  ingredients: RecipeIngredient[]
  // Base utilities removed as per user request (moved to scenarios)

  // Production Totals
  total_weight: number // Sum of usage_weight of ingredients (Raw weight)
  weight_loss: number // weight lost during cooking (Merma)
  total_cost_ingredients: number // Cost of ingredients only
  has_production_units: boolean // Toggle for unit-based yield
  total_production_units?: number // Yield in units (e.g. 120 cookies)

  // Financials
  profit_margin_percent: number // Global profit margin (e.g. 200%)

  created_at: string
  updated_at?: string
}
