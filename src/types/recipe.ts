export interface RecipeIngredient {
  product_id: string
  name: string
  // Snapshot data to preserve recipe history if product changes
  cost: number // Cost of the product package (Efectivo)
  package_weight: number // Weight of the product package (Peso)
  usage_weight: number // Amount used in recipe (Utilizado)
  // Calculated:
  // cost_used = (cost / package_weight) * usage_weight
}

export interface RecipeUtility {
  id?: string
  name: string
  cost: number // Price of the utility package
  quantity: number // Total quantity in package
  usage_quantity: number // Amount used
}

export interface ProductionFormat {
  weight_per_unit: number // e.g. 20g
  // output is calculated dynamically
}

export interface Recipe {
  id?: string
  name: string
  ingredients: RecipeIngredient[]
  utilities: RecipeUtility[]

  // Production Totals
  total_weight: number // Sum of usage_weight of ingredients
  total_cost: number // Sum of ingredients cost + utilities cost

  // Financials
  profit_margin_percent: number // Global profit margin (e.g. 200%)

  // Saved production scenarios (optional, or just re-calculate on view)
  production_formats?: ProductionFormat[]

  created_at: string
  updated_at?: string
}
