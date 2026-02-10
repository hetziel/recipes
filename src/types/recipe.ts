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

export interface RecipeScenario {
  name: string // "Nombre del paquete/escenario"
  mode: 'weight' | 'unit'
  value: number // weight per unit (if mode=weight) or total units (if mode=unit)
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

  // Saved production scenarios (Now called scenarios/paquetes)
  scenarios: RecipeScenario[]

  created_at: string
  updated_at?: string
}
