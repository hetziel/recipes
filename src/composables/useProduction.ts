import type { Ref } from 'vue'
import type { Recipe, RecipeIngredient } from '../types/recipe'
import type { Product } from '../types/producto'

export function useProduction(availableProducts: Ref<Product[]>, dolarRate: Ref<number>) {

    function getProductById(id: string | undefined): Product | undefined {
        if (!id) return undefined
        const targetId = String(id).trim()
        return availableProducts.value.find(p => String(p.id).trim() === targetId)
    }

    function getProductPrice(prod: Product): number {
        // Favor average_price if available and not zero, otherwise use base price
        return prod.average_price && prod.average_price > 0 ? prod.average_price : (prod.price || 0)
    }

    function calculateIngredientCost(ing: RecipeIngredient): number {
        const prod = getProductById(ing.product_id)
        if (!prod || !prod.measurement_value || prod.measurement_value === 0) return 0

        let finalPrice: number
        if (ing.price_type === 'unit_price' && ing.selected_price !== undefined) {
            finalPrice = ing.selected_price
        } else if (ing.establishment_id) {
            const specificPrice = prod.prices?.find(p => p.establishment_id === ing.establishment_id)
            if (specificPrice) {
                finalPrice = specificPrice.currency === 'USD' ? specificPrice.price : specificPrice.price / (dolarRate.value || 1)
            } else {
                finalPrice = prod.average_price || prod.price
            }
        } else {
            finalPrice = prod.average_price || prod.price
        }

        return (finalPrice / prod.measurement_value) * (ing.usage_weight || 0)
    }

    function calculateBaseCost(recipe: Recipe): number {
        return recipe.ingredients.reduce((sum, ing) => sum + calculateIngredientCost(ing), 0)
    }

    function calculateChickenCalculations(recipe: Recipe) {
        // Force batch mode if we are in this context, or trust the flag
        if (!recipe.chicken_data) return null

        const d = recipe.chicken_data
        const qty = Number(d.initial_quantity) || 0

        // 0. Inversión inicial en pollos
        let chickenInvestment = 0
        if (d.batch_product_id) {
            const prod = getProductById(d.batch_product_id)
            if (prod) {
                chickenInvestment = getProductPrice(prod) * qty
            }
        }

        const ingredientsCost = calculateBaseCost(recipe)
        const totalIngredientsCost = ingredientsCost + chickenInvestment

        // 1. Inversión Alimento (filtered by type)
        const feedInvestment = recipe.ingredients.reduce((sum, ing) => {
            const prod = getProductById(ing.product_id)
            if (prod?.type === 'alimento') {
                return sum + calculateIngredientCost(ing)
            }
            return sum
        }, 0)

        // 2. Costo por Pollo
        const costPerChicken = qty > 0 ? totalIngredientsCost / qty : 0

        // 3. Alimento necesario (starter/fattening projection)
        const totalStarterNeeded = ((Number(d.starter_feed_per_chicken_g) || 0) * qty) / 1000 // kg
        const totalFatteningNeeded = ((Number(d.fattening_feed_per_chicken_g) || 0) * qty) / 1000 // kg

        // 4. Proyección de ganancia al peso objetivo
        const totalTargetWeightKg = ((Number(d.target_weight_g) || 0) * qty) / 1000
        const projectedIncome = totalTargetWeightKg * (Number(d.live_weight_price_kg) || 0)
        const projectedProfit = projectedIncome - totalIngredientsCost

        return {
            chickenInvestment,
            feedInvestment,
            costPerChicken,
            totalStarterNeeded,
            totalFatteningNeeded,
            projectedIncome,
            projectedProfit,
            totalTargetWeightKg,
            totalIngredientsCost
        }
    }

    return {
        calculateIngredientCost,
        calculateBaseCost,
        calculateChickenCalculations,
        getProductById,
        getProductPrice
    }
}
