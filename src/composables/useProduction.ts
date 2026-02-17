import type { Ref } from 'vue'
import type { Recipe, RecipeIngredient } from '../types/recipe'
import type { Product } from '../types/producto'

export function useProduction(availableProducts: Ref<Product[]>, dolarRate: Ref<number>) {

    function getProductById(id: string): Product | undefined {
        return availableProducts.value.find(p => p.id === id)
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
        if (!recipe.is_chicken_batch || !recipe.chicken_data) return null

        const d = recipe.chicken_data
        const qty = d.initial_quantity || 0
        const totalIngredientsCost = calculateBaseCost(recipe)

        // 1. Inversión Alimento
        const feedInvestment = recipe.ingredients.reduce((sum, ing) => {
            const prod = getProductById(ing.product_id)
            if (prod?.type === 'alimento') {
                return sum + calculateIngredientCost(ing)
            }
            return sum
        }, 0)

        // 2. Costo por Pollo
        const costPerChicken = qty > 0 ? totalIngredientsCost / qty : 0

        // 3. Alimento necesario
        const totalStarterNeeded = (d.starter_feed_per_chicken_g * qty) / 1000 // kg
        const totalFatteningNeeded = (d.fattening_feed_per_chicken_g * qty) / 1000 // kg

        // 4. Proyección de ganancia al peso objetivo
        const totalTargetWeightKg = (d.target_weight_g * qty) / 1000
        const projectedIncome = totalTargetWeightKg * d.live_weight_price_kg
        const projectedProfit = projectedIncome - totalIngredientsCost

        return {
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
        getProductById
    }
}
