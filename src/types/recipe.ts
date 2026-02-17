export interface RecipeIngredient {
  product_id: string
  usage_weight: number // in grams or units depending on product measurement
  establishment_id?: string // Specific establishment selected for this ingredient
  selected_price?: number // The price chosen for this ingredient (e.g., product.price for recipe products)
  price_type?: 'average' | 'unit_price' // 'average' if using product average/establishment price, 'unit_price' if using product.price directly
  ideal_weight?: number // Target weight for the input (kg)
}

export interface RecipeUtility {
  id?: string
  product_id?: string // Optional link to a real product
  name: string // Name of the utility
  cost?: number // Price if not linked to product, or snapshot
  quantity?: number // Yield quantity for the cost (e.g., 100 units pack)
  usage_quantity: number // How many utilized per scenario unit/batch
  profit_margin?: number // Profit margin for this specific utility (%)
  establishment_id?: string // Specific establishment selected for this utility
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

export interface ChickenData {
  initial_quantity: number
  live_weight_price_kg: number
  current_avg_weight_g: number
  target_weight_g: number
  current_feed_id?: string
  starter_feed_per_chicken_g: number
  fattening_feed_per_chicken_g: number
  batch_product_id?: string // The "pollo" product selected
  entry_date?: string // Batch entry date
}

export interface Recipe {
  id?: string
  name: string
  ingredients: RecipeIngredient[]
  is_chicken_batch?: boolean
  chicken_data?: ChickenData
  // Base utilities removed as per user request (moved to scenarios)
  scenarios?: RecipeScenario[] // LEGACY: To be migrated

  // Production Totals
  total_weight: number // Sum of usage_weight of ingredients (Raw weight)
  weight_loss: number // weight lost during cooking (Merma)
  total_cost_ingredients: number // Cost of ingredients only
  has_production_units: boolean // Toggle for unit-based yield
  total_production_units?: number // Yield in units (e.g. 120 cookies)

  // Financials
  profit_margin_percent: number // Global profit margin (e.g. 200%)

  // Recipe as Product
  save_as_product?: boolean    // Checkbox state
  product_id?: string          // Reference to created product in my_products

  created_at: string
  updated_at?: string
  status?: 'active' | 'finished' | 'cancelled'
}
