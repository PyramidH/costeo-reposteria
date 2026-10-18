import type {
	Cents,
	CostBreakdown,
	CostingContext,
	Ingredient,
	LineCost,
	Purchase,
	Recipe,
	UnitCode
} from './types';
import { convertToIngredientBase, formatQty, isUnitCode, makeUnits, toBase, UnitError } from './units';
import { roundCents } from './money';

export class CostingError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'CostingError';
	}
}

/** Costo por unidad base (centavos por g / ml / pza) de la compra activa. */
export function unitCostCents(purchase: Purchase, ingredient: Ingredient, ctx: CostingContext): number {
	const units = makeUnits(ctx.settings.lbGrams);
	const baseQty = convertToIngredientBase(purchase.quantity, purchase.unit, ingredient, units);
	if (baseQty <= 0) throw new CostingError(`La compra de "${ingredient.name}" tiene cantidad cero.`);
	return purchase.priceCents / baseQty;
}

/**
 * Detecta ciclos de sub-recetas. Devuelve la ruta del ciclo (nombres) o null.
 * Debe correrse al guardar una receta; el motor de costeo también lo verifica.
 */
export function findCycle(recipeId: string, recipes: Map<string, Recipe>): string[] | null {
	const stack: string[] = [];
	const onStack = new Set<string>();
	const visited = new Set<string>();

	const dfs = (id: string): string[] | null => {
		if (onStack.has(id)) {
			const start = stack.indexOf(id);
			return [...stack.slice(start), id];
		}
		if (visited.has(id)) return null;
		visited.add(id);
		onStack.add(id);
		stack.push(id);
		const r = recipes.get(id);
		if (r) {
			for (const line of r.lines) {
				if (line.kind === 'subrecipe') {
					const c = dfs(line.recipeId);
					if (c) return c;
				}
			}
		}
		stack.pop();
		onStack.delete(id);
		return null;
	};

	const cycle = dfs(recipeId);
	return cycle ? cycle.map((id) => recipes.get(id)?.name ?? id) : null;
}

/**
 * Costea una receta completa, resolviendo sub-recetas recursivamente.
 *
 * - Ingredientes: cantidad × costo unitario × (1 + merma) si la merma está activa.
 * - "Al gusto": costo fijo estimado.
 * - Sub-recetas: costo TOTAL de la sub-receta (incluyendo su mano de obra e
 *   indirectos si están activos) prorrateado por la fracción usada.
 * - Extras: por lote, o por unidad × rendimiento.
 * - Mano de obra: minutos × tarifa/hora.
 * - Indirectos: minutos × (fijos mensuales / minutos de producción al mes).
 */
export function costRecipe(recipeId: string, ctx: CostingContext): CostBreakdown {
	const cycle = findCycle(recipeId, ctx.recipes);
	if (cycle) throw new CostingError(`Ciclo de sub-recetas: ${cycle.join(' → ')}`);
	return costRecipeInner(recipeId, ctx, new Map());
}

function costRecipeInner(
	recipeId: string,
	ctx: CostingContext,
	memo: Map<string, CostBreakdown>
): CostBreakdown {
	const cached = memo.get(recipeId);
	if (cached) return cached;

	const recipe = ctx.recipes.get(recipeId);
	if (!recipe) throw new CostingError(`Receta no encontrada: ${recipeId}`);
	if (!(recipe.yieldQty > 0)) throw new CostingError(`"${recipe.name}" no tiene rendimiento definido.`);

	const units = makeUnits(ctx.settings.lbGrams);
	const { settings } = ctx;
	const lines: LineCost[] = [];
	const warnings: string[] = [];
	let ingredientsCents = 0;

	for (const line of recipe.lines) {
		if (line.kind === 'estimate') {
			lines.push({
				lineId: line.id,
				label: line.label,
				costCents: line.costCents,
				detail: 'al gusto (estimado)'
			});
			ingredientsCents += line.costCents;
			continue;
		}

		if (line.kind === 'ingredient') {
			const ing = ctx.ingredients.get(line.ingredientId);
			if (!ing) throw new CostingError(`Ingrediente no encontrado: ${line.ingredientId}`);
			const purchase = ctx.purchases.get(ing.id);
			if (!purchase) {
				warnings.push(`"${ing.name}" no tiene precio de compra; se costea en 0.`);
				lines.push({ lineId: line.id, label: ing.name, costCents: 0, detail: 'sin precio' });
				continue;
			}
			let baseQty: number;
			try {
				baseQty = convertToIngredientBase(line.quantity, line.unit, ing, units);
			} catch (e) {
				if (e instanceof UnitError) throw new CostingError(e.message);
				throw e;
			}
			const wastePct = settings.includeWaste ? (line.wastePct ?? ing.defaultWastePct ?? 0) : 0;
			const unitCost = unitCostCents(purchase, ing, ctx);
			const raw = baseQty * unitCost * (1 + wastePct / 100);
			const cents = roundCents(raw);
			ingredientsCents += cents;
			const qtyLabel = formatQty(baseQty, ing.baseDimension, units);
			lines.push({
				lineId: line.id,
				label: ing.name,
				costCents: cents,
				detail: wastePct ? `${qtyLabel} + ${wastePct}% merma` : qtyLabel
			});
			continue;
		}

		// subrecipe
		const sub = ctx.recipes.get(line.recipeId);
		if (!sub) throw new CostingError(`Sub-receta no encontrada: ${line.recipeId}`);
		const subCost = costRecipeInner(sub.id, ctx, memo);
		warnings.push(...subCost.warnings.map((w) => `${sub.name}: ${w}`));

		let fraction: number;
		if (line.unit === 'yield') {
			fraction = line.quantity;
		} else {
			if (!isUnitCode(sub.yieldUnit)) {
				throw new CostingError(
					`"${sub.name}" rinde en "${sub.yieldUnit}"; solo se puede usar por fracción de receta.`
				);
			}
			const subDim = units[sub.yieldUnit].dimension;
			const lineDim = units[line.unit].dimension;
			if (subDim !== lineDim) {
				throw new CostingError(
					`"${sub.name}" rinde en ${sub.yieldUnit} pero se pidió en ${line.unit}.`
				);
			}
			const subYieldBase = toBase(sub.yieldQty, sub.yieldUnit as UnitCode, units);
			const lineBase = toBase(line.quantity, line.unit, units);
			fraction = lineBase / subYieldBase;
		}
		const cents = roundCents(subCost.totalCents * fraction);
		ingredientsCents += cents;
		lines.push({
			lineId: line.id,
			label: sub.name,
			costCents: cents,
			detail:
				line.unit === 'yield'
					? `${Math.round(fraction * 100)}% de la receta`
					: `${line.quantity} ${line.unit} (${Math.round(fraction * 100)}% de la receta)`
		});
	}

	let extrasCents = 0;
	for (const x of recipe.extras) {
		const cents = x.perUnit ? roundCents(x.costCents * recipe.yieldQty) : x.costCents;
		extrasCents += cents;
		lines.push({
			lineId: x.id,
			label: x.label,
			costCents: cents,
			detail: x.perUnit ? `${recipe.yieldQty} × por unidad` : 'por lote'
		});
	}

	const laborCents: Cents = settings.includeLabor
		? roundCents((recipe.laborMinutes / 60) * settings.hourlyRateCents)
		: 0;

	let overheadCents: Cents = 0;
	if (settings.includeOverhead) {
		if (settings.overheadMode === 'percent') {
			overheadCents = roundCents(ingredientsCents * (settings.overheadPct / 100));
		} else if (settings.monthlyFixedCents > 0) {
			if (settings.monthlyProductionMinutes <= 0) {
				warnings.push('Minutos de producción al mes en 0; no se prorratean gastos fijos.');
			} else {
				overheadCents = roundCents(
					recipe.laborMinutes * (settings.monthlyFixedCents / settings.monthlyProductionMinutes)
				);
			}
		}
	}

	const totalCents = ingredientsCents + extrasCents + laborCents + overheadCents;
	const result: CostBreakdown = {
		recipeId: recipe.id,
		ingredientsCents,
		extrasCents,
		laborCents,
		overheadCents,
		totalCents,
		yieldQty: recipe.yieldQty,
		perUnitCents: roundCents(totalCents / recipe.yieldQty),
		lines,
		warnings
	};
	memo.set(recipeId, result);
	return result;
}

/** Recetas que usan (directa o indirectamente) un ingrediente: para alertas de precio. */
export function recipesUsingIngredient(ingredientId: string, recipes: Map<string, Recipe>): Recipe[] {
	const direct = new Set<string>();
	for (const r of recipes.values()) {
		if (r.lines.some((l) => l.kind === 'ingredient' && l.ingredientId === ingredientId)) direct.add(r.id);
	}
	// Propagar hacia arriba por sub-recetas hasta punto fijo.
	let changed = true;
	while (changed) {
		changed = false;
		for (const r of recipes.values()) {
			if (direct.has(r.id)) continue;
			if (r.lines.some((l) => l.kind === 'subrecipe' && direct.has(l.recipeId))) {
				direct.add(r.id);
				changed = true;
			}
		}
	}
	return [...direct].map((id) => recipes.get(id)!).filter(Boolean);
}
