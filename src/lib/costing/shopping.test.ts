import { describe, expect, it } from 'vitest';
import { shoppingList } from './shopping';
import { DEFAULT_SETTINGS, type CostingContext, type Ingredient, type Purchase, type Recipe } from './types';

const ings: Ingredient[] = [
	{ id: 'harina', name: 'Harina', baseDimension: 'mass', category: 'harinas' },
	{ id: 'huevo', name: 'Huevo', baseDimension: 'piece', massPerPieceG: 57.5, category: 'huevos' },
	{ id: 'leche', name: 'Leche', baseDimension: 'volume', densityGPerMl: 1.03, category: 'lacteos' }
];
const purchases: Purchase[] = [
	{ id: 'p1', ingredientId: 'harina', quantity: 1, unit: 'lb', priceCents: 460, date: '2026-01-01', active: true },
	{ id: 'p2', ingredientId: 'huevo', quantity: 30, unit: 'pza', priceCents: 4500, date: '2026-01-01', active: true },
	{ id: 'p3', ingredientId: 'leche', quantity: 1, unit: 'l', priceCents: 1200, date: '2026-01-01', active: true }
];
const crema: Recipe = {
	id: 'crema', name: 'Crema', kind: 'base', yieldQty: 1000, yieldUnit: 'g', laborMinutes: 0, extras: [],
	lines: [
		{ kind: 'ingredient', id: 'a', ingredientId: 'leche', quantity: 1, unit: 'l' },
		{ kind: 'ingredient', id: 'b', ingredientId: 'huevo', quantity: 2, unit: 'pza' }
	]
};
const cup: Recipe = {
	id: 'cup', name: 'Cupcakes', kind: 'product', yieldQty: 12, yieldUnit: 'cupcakes', laborMinutes: 0, extras: [],
	lines: [
		{ kind: 'ingredient', id: 'c', ingredientId: 'harina', quantity: 1, unit: 'lb' },
		{ kind: 'ingredient', id: 'd', ingredientId: 'huevo', quantity: 3, unit: 'pza' },
		{ kind: 'subrecipe', id: 'e', recipeId: 'crema', quantity: 500, unit: 'g' },
		{ kind: 'estimate', id: 'f', label: 'Vainilla', costCents: 100 }
	]
};
const ctx: CostingContext = {
	ingredients: new Map(ings.map((i) => [i.id, i])),
	purchases: new Map(purchases.map((p) => [p.ingredientId, p])),
	recipes: new Map([['crema', crema], ['cup', cup]]),
	settings: DEFAULT_SETTINGS
};

describe('shoppingList', () => {
	it('escala por unidades a producir y expande sub-recetas', () => {
		// 24 cupcakes = 2 recetas: 2 lb harina, 6 huevos + media crema ×2 (= 1 crema: 1 L leche, 2 huevos)
		const l = shoppingList([{ recipeId: 'cup', units: 24 }], ctx);
		const by = Object.fromEntries(l.items.map((i) => [i.ingredientId, i]));
		expect(by.harina.neededLabel).toBe('2 lb');
		expect(by.harina.estimatedCents).toBe(920);
		expect(by.huevo.neededLabel).toBe('8 pzas');
		expect(by.huevo.estimatedCents).toBe(1200);
		expect(by.leche.neededLabel).toBe('1 L');
		expect(l.estimates).toEqual([{ label: 'Vainilla (Cupcakes)', costCents: 200 }]);
		expect(l.totalCents).toBe(920 + 1200 + 1200 + 200);
		expect(by.huevo.usedIn).toEqual(['Cupcakes']);
	});

	it('suma varias recetas y redondea piezas hacia arriba', () => {
		const l = shoppingList([{ recipeId: 'cup', units: 6 }, { recipeId: 'crema', units: 250 }], ctx);
		const huevo = l.items.find((i) => i.ingredientId === 'huevo')!;
		// 6 cupcakes = 0.5 receta: 1.5 huevos + 0.25 crema×2 huevos = 0.5 → 2 huevos; + crema 250 g = 0.5 huevo → 2.5 → 3
		expect(huevo.neededLabel).toBe('3 pzas');
		expect(huevo.usedIn.sort()).toEqual(['Crema', 'Cupcakes']);
	});

	it('ignora cantidades cero y recetas sin rendimiento', () => {
		expect(shoppingList([{ recipeId: 'cup', units: 0 }], ctx).items).toEqual([]);
	});
});
