import type { CostingContext, Dimension, Ingredient, Recipe, UnitCode } from './types';
import { convertToIngredientBase, makeUnits, formatQty, toBase } from './units';
import { isUnitCode } from './units';
import { findCycle, unitCostCents } from './cost';
import { roundCents } from './money';

export interface ShoppingRequest {
	recipeId: string;
	/** Cuántas unidades del rendimiento se van a hacer (24 cupcakes → 24). */
	units: number;
}

export interface ShoppingItem {
	ingredientId: string;
	name: string;
	category?: string;
	dimension: Dimension;
	/** Cantidad necesaria en unidad base (g, ml, pza). */
	neededBase: number;
	/** Texto legible de la cantidad en la unidad de compra habitual. */
	neededLabel: string;
	/** Cuántas presentaciones de compra equivale (2.3 lb, 1 cartón…). */
	purchaseQty: number | null;
	purchaseUnit: UnitCode | null;
	purchaseDescription?: string;
	estimatedCents: number | null;
	/** Recetas que lo piden (para "¿para qué era esto?"). */
	usedIn: string[];
}

export interface ShoppingList {
	items: ShoppingItem[];
	estimates: { label: string; costCents: number }[];
	totalCents: number;
	warnings: string[];
}

/**
 * Agrega los ingredientes de varias recetas (expandiendo sub-recetas) en una
 * sola lista de compras con cantidades y costo estimado.
 */
export function shoppingList(reqs: ShoppingRequest[], ctx: CostingContext): ShoppingList {
	const units = makeUnits(ctx.settings.lbGrams);
	const need = new Map<string, { base: number; usedIn: Set<string> }>();
	const estimates: { label: string; costCents: number }[] = [];
	const warnings: string[] = [];

	const walk = (recipe: Recipe, factor: number, rootName: string) => {
		for (const l of recipe.lines) {
			if (l.kind === 'estimate') {
				estimates.push({ label: `${l.label} (${rootName})`, costCents: roundCents(l.costCents * factor) });
				continue;
			}
			if (l.kind === 'ingredient') {
				const ing = ctx.ingredients.get(l.ingredientId);
				if (!ing) continue;
				let base: number;
				try {
					base = convertToIngredientBase(l.quantity, l.unit, ing, units) * factor;
				} catch (e) {
					warnings.push(e instanceof Error ? e.message : String(e));
					continue;
				}
				const cur = need.get(ing.id) ?? { base: 0, usedIn: new Set<string>() };
				cur.base += base;
				cur.usedIn.add(rootName);
				need.set(ing.id, cur);
				continue;
			}
			const sub = ctx.recipes.get(l.recipeId);
			if (!sub || !(sub.yieldQty > 0)) continue;
			let fraction: number;
			if (l.unit === 'yield') fraction = l.quantity;
			else if (isUnitCode(sub.yieldUnit) && units[sub.yieldUnit].dimension === units[l.unit].dimension) {
				fraction = toBase(l.quantity, l.unit, units) / toBase(sub.yieldQty, sub.yieldUnit, units);
			} else continue;
			walk(sub, factor * fraction, rootName);
		}
	};

	for (const r of reqs) {
		const recipe = ctx.recipes.get(r.recipeId);
		if (!recipe || !(recipe.yieldQty > 0) || !(r.units > 0)) continue;
		if (findCycle(recipe.id, ctx.recipes)) {
			warnings.push(`"${recipe.name}" tiene un ciclo de sub-recetas.`);
			continue;
		}
		walk(recipe, r.units / recipe.yieldQty, recipe.name);
	}

	const items: ShoppingItem[] = [];
	for (const [id, n] of need) {
		const ing = ctx.ingredients.get(id)!;
		const p = ctx.purchases.get(id);
		let purchaseQty: number | null = null;
		let purchaseUnit: UnitCode | null = null;
		let estimatedCents: number | null = null;
		if (p) {
			const pBase = convertToIngredientBase(p.quantity, p.unit, ing, units);
			purchaseQty = Math.round((n.base / pBase) * 100) / 100;
			purchaseUnit = p.unit;
			estimatedCents = roundCents(n.base * unitCostCents(p, ing, ctx));
		}
		items.push({
			ingredientId: id,
			name: ing.name,
			category: ing.category,
			dimension: ing.baseDimension,
			neededBase: n.base,
			neededLabel: neededLabel(n.base, ing, p?.unit, units),
			purchaseQty,
			purchaseUnit,
			purchaseDescription: p?.description,
			estimatedCents,
			usedIn: [...n.usedIn]
		});
	}
	items.sort((a, b) => (a.category ?? 'zz').localeCompare(b.category ?? 'zz') || a.name.localeCompare(b.name, 'es'));
	const totalCents = items.reduce((s, i) => s + (i.estimatedCents ?? 0), 0) + estimates.reduce((s, e) => s + e.costCents, 0);
	return { items, estimates, totalCents, warnings };
}

/** "2.3 lb", "7 pzas", "1.5 L" — en la unidad en que se compra si se conoce. */
function neededLabel(base: number, ing: Ingredient, purchaseUnit: UnitCode | undefined, units: ReturnType<typeof makeUnits>): string {
	if (ing.baseDimension === 'piece') {
		const n = Math.ceil(base - 1e-9);
		return `${n} ${n === 1 ? 'pza' : 'pzas'}`;
	}
	if (purchaseUnit && units[purchaseUnit].dimension === ing.baseDimension) {
		const q = base / units[purchaseUnit].toBase;
		const r = q < 10 ? Math.round(q * 100) / 100 : Math.round(q * 10) / 10;
		return `${r} ${units[purchaseUnit].label}`;
	}
	return formatQty(base, ing.baseDimension, units);
}
