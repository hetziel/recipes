import type { Ref } from 'vue'
import type { Recipe, RecipeIngredient, RecipeScenario, RecipeUtility } from '../types/recipe'
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

    function calculateIngredientCost(ing: RecipeIngredient, isChickenBatch: boolean = false): number {
        const prod = getProductById(ing.product_id)
        if (!prod || !prod.measurement_value || prod.measurement_value === 0) return 0

        let finalPrice = getProductPrice(prod)

        if (ing.selected_price !== undefined) {
            finalPrice = ing.selected_price
        } else if (ing.establishment_id) {
            const specificPrice = prod.prices?.find(p => p.establishment_id === ing.establishment_id)
            if (specificPrice) {
                finalPrice = specificPrice.currency === 'USD' ? specificPrice.price : specificPrice.price / (dolarRate.value || 1)
            }
        }

        // If it's a chicken batch, usage_weight is in KG.
        if (isChickenBatch) {
            let pkgWeightInKg = prod.measurement_value
            if (prod.measurement_id === 'mea2') { // grams (g)
                pkgWeightInKg = prod.measurement_value / 1000
            } else if (prod.measurement_id === 'mea5') { // units
                pkgWeightInKg = prod.measurement_value // Treat 1 unit as 1 mass unit for simplicity
            }
            const pricePerKg = finalPrice / (pkgWeightInKg || 1)
            return pricePerKg * (ing.usage_weight || 0)
        }

        // Determine the measurement value based on the chosen measurement unit for recipe products
        let effectiveMeasurementValue = prod.measurement_value
        if (ing.measurement_id === 'g' && prod.final_weight_grams) {
            effectiveMeasurementValue = prod.final_weight_grams
        }

        const pricePerUnit = finalPrice / (effectiveMeasurementValue || 1)
        return pricePerUnit * (ing.usage_weight || 0)
    }

    function calculateBaseCost(recipe: Recipe): number {
        return recipe.ingredients.reduce((sum, ing) => sum + calculateIngredientCost(ing, !!recipe.is_chicken_batch), 0)
    }

    // ---------- SCENARIO CALCULATIONS ----------

    function calculateScenarioUtilityCost(util: RecipeUtility): number {
        if (util.product_id) {
            const prod = getProductById(util.product_id)
            if (!prod || !prod.measurement_value || prod.measurement_value === 0) return 0

            let finalPrice = prod.average_price && prod.average_price > 0 ? prod.average_price : (prod.price || 0)
            if (util.establishment_id) {
                const specificPrice = prod.prices?.find(p => p.establishment_id === util.establishment_id)
                if (specificPrice) {
                    finalPrice = specificPrice.currency === 'USD' ? specificPrice.price : specificPrice.price / (dolarRate.value || 1)
                }
            }
            return (finalPrice / prod.measurement_value) * (util.usage_quantity || 0)
        }
        const cost = util.cost || 0
        const qty = util.quantity || 0
        if (qty === 0) return 0
        return (cost / qty) * (util.usage_quantity || 0)
    }

    function calculateScenarioUtilitiesCost(scenario: RecipeScenario): number {
        return (scenario.utilities || []).reduce((sum, u) => sum + calculateScenarioUtilityCost(u), 0)
    }

    function calculateEstimatedUnitsForRecipe(recipe: Recipe, scenario: RecipeScenario): number {
        const totalFinalWeight = Math.max(0, (recipe.total_weight || 0) - (recipe.weight_loss || 0))
        if (scenario.mode === 'unit') {
            if (recipe.has_production_units && recipe.total_production_units) {
                return recipe.total_production_units / (scenario.value || 1)
            }
            return scenario.value || 1
        } else {
            if (totalFinalWeight === 0) return 0
            return totalFinalWeight / (scenario.value || 1)
        }
    }

    /**
     * Investment cost per unit = (base ingredient cost / units) + utility cost per pack
     */
    function calculateScenarioUnitCost(recipe: Recipe, scenario: RecipeScenario): number {
        const units = calculateEstimatedUnitsForRecipe(recipe, scenario)
        if (units <= 0) return 0
        const baseCost = calculateBaseCost(recipe)
        return (baseCost / units) + calculateScenarioUtilitiesCost(scenario)
    }

    /**
     * Sale price per unit.
     * - Fixed price takes priority.
     * - Otherwise: applies recipe profit_margin ONLY to ingredient cost,
     *   then adds each utility cost with its own individual profit_margin.
     */
    function calculateScenarioSalePrice(recipe: Recipe, scenario: RecipeScenario): number {
        // Fixed price takes priority
        if (scenario.fixed_sale_price && scenario.fixed_sale_price > 0) {
            if (scenario.fixed_sale_price_currency === 'Bs') {
                return scenario.fixed_sale_price / (dolarRate.value || 1)
            }
            return scenario.fixed_sale_price
        }

        const units = calculateEstimatedUnitsForRecipe(recipe, scenario)
        if (units <= 0) return 0

        const baseCost = calculateBaseCost(recipe)
        const ingredientCostPerUnit = baseCost / units
        const marginGen = 1 + ((recipe.profit_margin_percent || 0) / 100)

        // Utility cost with each utility's own profit_margin
        const utilitySaleTotalPerPack = (scenario.utilities || []).reduce((sum, util) => {
            const cost = calculateScenarioUtilityCost(util)
            const margin = 1 + ((util.profit_margin ?? 50) / 100)
            return sum + (cost * margin)
        }, 0)

        return (ingredientCostPerUnit * marginGen) + utilitySaleTotalPerPack
    }

    function calculateScenarioRealMargin(recipe: Recipe, scenario: RecipeScenario): number {
        const salePrice = calculateScenarioSalePrice(recipe, scenario)
        const unitCost = calculateScenarioUnitCost(recipe, scenario)
        if (unitCost <= 0) return 0
        return ((salePrice / unitCost) - 1) * 100
    }

    // ---------- CHICKEN BATCH ----------

    function calculateChickenCalculations(recipe: Recipe) {
        if (!recipe.chicken_data) return null

        const d = recipe.chicken_data
        const qty = Number(d.initial_quantity) || 0

        // 0. Inversión inicial en pollos
        let chickenInvestment = 0
        if (d.batch_product_id) {
            const prod = getProductById(d.batch_product_id)
            const basePrice = d.batch_product_price !== undefined ? d.batch_product_price : (prod ? getProductPrice(prod) : 0)
            chickenInvestment = basePrice * qty
        }

        const ingredientsCost = calculateBaseCost(recipe)
        const totalIngredientsCost = ingredientsCost + chickenInvestment
        const feedInvestment = ingredientsCost
        const costPerChicken = qty > 0 ? totalIngredientsCost / qty : 0

        const totalStarterNeeded = ((Number(d.starter_feed_per_chicken_g) || 0) * qty) / 1000
        const totalFatteningNeeded = ((Number(d.fattening_feed_per_chicken_g) || 0) * qty) / 1000

        const totalTargetWeightKg = ((Number(d.target_weight_g) || 0) * qty) / 1000
        const projectedIncome = totalTargetWeightKg * (Number(d.live_weight_price_kg) || 0)
        const projectedProfit = projectedIncome - totalIngredientsCost

        const totalCurrentWeightKg = ((Number(d.current_avg_weight_g) || 0) * qty) / 1000
        const currentIncome = totalCurrentWeightKg * (Number(d.live_weight_price_kg) || 0)
        const currentProfit = currentIncome - totalIngredientsCost

        let totalSoldQuantity = 0
        let totalSoldWeight = 0
        let totalSoldIncome = 0

        if (d.sales && d.sales.length > 0) {
            d.sales.forEach(s => {
                totalSoldQuantity += Number(s.quantity) || 0
                totalSoldWeight += Number(s.total_weight_kg) || 0
                totalSoldIncome += (Number(s.total_weight_kg) || 0) * (Number(s.price_per_kg) || 0)
            })
        }

        const avgWeightSold = totalSoldQuantity > 0 ? totalSoldWeight / totalSoldQuantity : 0
        const avgPriceSold = totalSoldWeight > 0 ? totalSoldIncome / totalSoldWeight : 0
        const realProfit = totalSoldIncome - totalIngredientsCost
        const remainingQuantity = qty - totalSoldQuantity

        return {
            chickenInvestment,
            feedInvestment,
            costPerChicken,
            totalStarterNeeded,
            totalFatteningNeeded,
            projectedIncome,
            projectedProfit,
            totalTargetWeightKg,
            totalIngredientsCost,
            currentIncome,
            currentProfit,
            totalCurrentWeightKg,
            totalSoldQuantity,
            totalSoldWeight,
            totalSoldIncome,
            avgWeightSold,
            avgPriceSold,
            realProfit,
            remainingQuantity
        }
    }

    return {
        calculateIngredientCost,
        calculateBaseCost,
        calculateChickenCalculations,
        getProductById,
        getProductPrice,
        calculateScenarioUtilityCost,
        calculateScenarioUtilitiesCost,
        calculateEstimatedUnitsForRecipe,
        calculateScenarioUnitCost,
        calculateScenarioSalePrice,
        calculateScenarioRealMargin,
    }
}
