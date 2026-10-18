import { describe, expect, it } from 'vitest';
import {
	costRecipe,
	CostingError,
	DEFAULT_SETTINGS,
	defaultTiers,
	findCycle,
	formatMoney,
	marginPct,
	markupPct,
	parseMoney,
	parseQty,
	priceFromMargin,
	recipesUsingIngredient,
	reverseQuote,
	roundPrice,
	tierFor,
	tierPrices,
	unitCostCents,
	type CostingContext,
	type Ingredient,
	type Purchase,
	type Recipe
} from './index';
import { convertToIngredientBase, makeUnits } from './units';
import { formatQty as formatFraction } from './fractions';

// ---------- Fixture: ingredientes guatemaltecos con precios de referencia ----------

const ing = (i: Ingredient) => i;
const ingredients: Ingredient[] = [
	ing({ id: 'harina', name: 'Harina dura', baseDimension: 'mass' }),
	ing({ id: 'azucar', name: 'Azúcar', baseDimension: 'mass' }),
	ing({ id: 'sal', name: 'Sal', baseDimension: 'mass' }),
	ing({ id: 'levadura', name: 'Levadura fresca', baseDimension: 'mass' }),
	ing({ id: 'mantequilla', name: 'Mantequilla con sal', baseDimension: 'mass' }),
	ing({ id: 'manteca', name: 'Manteca vegetal', baseDimension: 'mass' }),
	ing({ id: 'lechepolvo', name: 'Leche en polvo', baseDimension: 'mass' }),
	ing({ id: 'huevo', name: 'Huevo', baseDimension: 'piece', massPerPieceG: 57.5, defaultWastePct: 3 }),
	ing({ id: 'yema', name: 'Yema de huevo', baseDimension: 'piece', massPerPieceG: 18 }),
	ing({ id: 'leche', name: 'Leche líquida', baseDimension: 'volume', densityGPerMl: 1.03 }),
	ing({ id: 'maicena', name: 'Maicena', baseDimension: 'mass' }),
	ing({ id: 'margarina', name: 'Margarina', baseDimension: 'mass' }),
	ing({ id: 'chispas', name: 'Chispas de chocolate', baseDimension: 'mass' }),
	ing({ id: 'agua', name: 'Agua', baseDimension: 'volume', densityGPerMl: 1 }),
	ing({ id: 'vaso', name: 'Vaso 9 oz con tapa', baseDimension: 'piece' })
];

const p = (ingredientId: string, quantity: number, unit: Purchase['unit'], priceQ: number): Purchase => ({
	id: `p-${ingredientId}`,
	ingredientId,
	quantity,
	unit,
	priceCents: Math.round(priceQ * 100),
	date: '2026-10-17',
	active: true
});
const purchases: Purchase[] = [
	p('harina', 1, 'lb', 5.5),
	p('azucar', 1, 'lb', 4.25),
	p('sal', 1, 'lb', 2),
	p('levadura', 1, 'lb', 28),
	p('mantequilla', 1, 'lb', 32),
	p('manteca', 1, 'lb', 14),
	p('lechepolvo', 1, 'lb', 48),
	p('huevo', 30, 'pza', 45), // cartón
	p('yema', 1, 'pza', 1.5),
	p('leche', 1, 'l', 12),
	p('maicena', 1, 'lb', 9),
	p('margarina', 1, 'lb', 18),
	p('chispas', 1, 'lb', 42),
	p('agua', 1, 'l', 0.1),
	p('vaso', 50, 'pza', 60)
];

// Crema pastelera (del PDF de la trenza): rinde ~1500 g
const cremaPastelera: Recipe = {
	id: 'crema',
	name: 'Crema pastelera',
	kind: 'base',
	yieldQty: 1500,
	yieldUnit: 'g',
	laborMinutes: 20,
	extras: [],
	lines: [
		{ kind: 'ingredient', id: 'c1', ingredientId: 'leche', quantity: 1, unit: 'l' },
		{ kind: 'ingredient', id: 'c2', ingredientId: 'azucar', quantity: 11, unit: 'oz' },
		{ kind: 'ingredient', id: 'c3', ingredientId: 'maicena', quantity: 4, unit: 'oz' },
		{ kind: 'ingredient', id: 'c4', ingredientId: 'margarina', quantity: 4, unit: 'oz' },
		{ kind: 'ingredient', id: 'c5', ingredientId: 'yema', quantity: 4, unit: 'pza' },
		{ kind: 'estimate', id: 'c6', label: 'Vainilla y ralladura de limón', costCents: 300 }
	]
};

// Trenza dulce (PDF): 4 lb harina, huevo "6 oz (3 unidades)", rinde 6 trenzas
const trenza: Recipe = {
	id: 'trenza',
	name: 'Trenza dulce con chispas',
	kind: 'product',
	yieldQty: 6,
	yieldUnit: 'trenza',
	laborMinutes: 90,
	extras: [{ id: 'x1', label: 'Caja de cartón', costCents: 350, perUnit: true }],
	lines: [
		{ kind: 'ingredient', id: 't1', ingredientId: 'harina', quantity: 4, unit: 'lb' },
		{ kind: 'ingredient', id: 't2', ingredientId: 'azucar', quantity: 9, unit: 'oz' },
		{ kind: 'ingredient', id: 't3', ingredientId: 'sal', quantity: 1.5, unit: 'oz' },
		{ kind: 'ingredient', id: 't4', ingredientId: 'levadura', quantity: 2.5, unit: 'oz' },
		{ kind: 'ingredient', id: 't5', ingredientId: 'mantequilla', quantity: 4, unit: 'oz' },
		{ kind: 'ingredient', id: 't6', ingredientId: 'manteca', quantity: 3, unit: 'oz' },
		{ kind: 'ingredient', id: 't7', ingredientId: 'agua', quantity: 1, unit: 'lb' }, // 1 lb 9 oz -> simplificado
		{ kind: 'ingredient', id: 't8', ingredientId: 'huevo', quantity: 6, unit: 'oz' }, // = 3 unidades
		{ kind: 'ingredient', id: 't9', ingredientId: 'lechepolvo', quantity: 2, unit: 'oz' },
		{ kind: 'estimate', id: 't10', label: 'Canela', costCents: 50 },
		{ kind: 'ingredient', id: 't11', ingredientId: 'chispas', quantity: 8, unit: 'oz' },
		{ kind: 'subrecipe', id: 't12', recipeId: 'crema', quantity: 500, unit: 'g' }
	]
};

// Vaso de postre: usa media receta de crema por fracción + vaso por unidad
const vasoPostre: Recipe = {
	id: 'vaso',
	name: 'Vaso de postre',
	kind: 'product',
	yieldQty: 10,
	yieldUnit: 'vaso',
	laborMinutes: 30,
	extras: [],
	lines: [
		{ kind: 'subrecipe', id: 'v1', recipeId: 'crema', quantity: 0.5, unit: 'yield' },
		{ kind: 'ingredient', id: 'v2', ingredientId: 'vaso', quantity: 10, unit: 'pza' }
	]
};

function makeCtx(overrides: Partial<CostingContext['settings']> = {}, recipes = [cremaPastelera, trenza, vasoPostre]): CostingContext {
	return {
		ingredients: new Map(ingredients.map((i) => [i.id, i])),
		purchases: new Map(purchases.map((x) => [x.ingredientId, x])),
		recipes: new Map(recipes.map((r) => [r.id, r])),
		settings: { ...DEFAULT_SETTINGS, ...overrides }
	};
}

// ---------- Unidades ----------

describe('unidades', () => {
	it('libra guatemalteca de 460 g por defecto, configurable', () => {
		expect(makeUnits().lb.toBase).toBe(460);
		expect(makeUnits().oz.toBase).toBeCloseTo(28.75);
		expect(makeUnits(453.592).oz.toBase).toBeCloseTo(28.3495);
	});

	it('convierte huevo entre onzas y piezas con massPerPieceG', () => {
		const huevo = ingredients.find((i) => i.id === 'huevo')!;
		const u = makeUnits();
		// 6 oz = 172.5 g → 3 huevos de 57.5 g
		expect(convertToIngredientBase(6, 'oz', huevo, u)).toBeCloseTo(3);
		expect(convertToIngredientBase(3, 'pza', huevo, u)).toBe(3);
	});

	it('convierte volumen a masa con densidad', () => {
		const leche = ingredients.find((i) => i.id === 'leche')!;
		const u = makeUnits();
		// leche se costea en volumen; 1 taza = 240 ml
		expect(convertToIngredientBase(1, 'taza', leche, u)).toBe(240);
	});

	it('falla claro cuando falta el dato para cambiar de dimensión', () => {
		const harina = ingredients.find((i) => i.id === 'harina')!;
		expect(() => convertToIngredientBase(1, 'taza', harina, makeUnits())).toThrow(/densidad/);
		expect(() => convertToIngredientBase(1, 'pza', harina, makeUnits())).toThrow(/peso por pieza/);
	});
});

// ---------- Fracciones y dinero ----------

describe('parseQty', () => {
	it.each([
		['2', 2],
		['2.5', 2.5],
		['2,5', 2.5],
		['1/2', 0.5],
		['1 1/2', 1.5],
		['1½', 1.5],
		['½', 0.5],
		['¼', 0.25],
		[' 3 / 4 ', 0.75],
		['.5', 0.5]
	])('%s → %d', (input, expected) => {
		expect(parseQty(input)).toBeCloseTo(expected);
	});
	it('rechaza basura y ceros', () => {
		expect(parseQty('')).toBeNull();
		expect(parseQty('abc')).toBeNull();
		expect(parseQty('0')).toBeNull();
		expect(parseQty('1/0')).toBeNull();
	});
	it('formatea fracciones comunes', () => {
		expect(formatFraction(1.5)).toBe('1½');
		expect(formatFraction(0.25)).toBe('¼');
		expect(formatFraction(2)).toBe('2');
		expect(formatFraction(2.37)).toBe('2⅜'); // cerca de 2.375
		expect(formatFraction(2.43)).toBe('2.43');
	});
});

describe('dinero', () => {
	it('parsea y formatea quetzales', () => {
		expect(parseMoney('Q 12.50')).toBe(1250);
		expect(parseMoney('12,5')).toBe(1250);
		expect(parseMoney('abc')).toBeNull();
		expect(formatMoney(1250)).toBe('Q12.50');
		expect(formatMoney(123456)).toBe('Q1,234.56');
		expect(formatMoney(-500)).toBe('-Q5.00');
	});
});

// ---------- Costeo ----------

describe('costo unitario de compra', () => {
	it('cartón de 30 huevos a Q45 → Q1.50 por huevo', () => {
		const ctx = makeCtx();
		const huevo = ctx.ingredients.get('huevo')!;
		expect(unitCostCents(ctx.purchases.get('huevo')!, huevo, ctx)).toBeCloseTo(150);
	});
	it('libra de harina a Q5.50 → 1.1957 centavos por gramo', () => {
		const ctx = makeCtx();
		expect(unitCostCents(ctx.purchases.get('harina')!, ctx.ingredients.get('harina')!, ctx)).toBeCloseTo(550 / 460);
	});
});

describe('costRecipe', () => {
	it('costea la crema pastelera (receta base) sin mano de obra por defecto', () => {
		const r = costRecipe('crema', makeCtx());
		// leche 1 L = Q12; azúcar 11 oz = 11/16 × 4.25 = 2.92; maicena 4 oz = 2.25;
		// margarina 4 oz = 4.50; yemas 4 × 1.5 = 6; estimado 3
		expect(r.ingredientsCents).toBe(1200 + 292 + 225 + 450 + 600 + 300);
		expect(r.laborCents).toBe(0);
		expect(r.overheadCents).toBe(0);
		expect(r.totalCents).toBe(r.ingredientsCents);
		expect(r.perUnitCents).toBe(Math.round(r.totalCents / 1500));
		expect(r.warnings).toEqual([]);
	});

	it('huevo en onzas se costea como piezas', () => {
		const r = costRecipe('trenza', makeCtx());
		const huevo = r.lines.find((l) => l.lineId === 't8')!;
		expect(huevo.costCents).toBe(450); // 3 huevos × Q1.50
		expect(huevo.detail).toBe('3 pzas');
	});

	it('sub-receta por cantidad (500 g de 1500 g de crema) prorratea un tercio del costo', () => {
		const ctx = makeCtx();
		const crema = costRecipe('crema', ctx);
		const trenzaCost = costRecipe('trenza', ctx);
		const sub = trenzaCost.lines.find((l) => l.lineId === 't12')!;
		expect(sub.costCents).toBe(Math.round(crema.totalCents / 3));
		expect(sub.detail).toContain('33%');
	});

	it('sub-receta por fracción de rendimiento', () => {
		const ctx = makeCtx();
		const crema = costRecipe('crema', ctx);
		const vaso = costRecipe('vaso', ctx);
		const sub = vaso.lines.find((l) => l.lineId === 'v1')!;
		expect(sub.costCents).toBe(Math.round(crema.totalCents / 2));
		// 10 vasos a Q1.20 c/u
		expect(vaso.lines.find((l) => l.lineId === 'v2')!.costCents).toBe(1200);
		expect(vaso.perUnitCents).toBe(Math.round(vaso.totalCents / 10));
	});

	it('extras por unidad se multiplican por el rendimiento', () => {
		const r = costRecipe('trenza', makeCtx());
		expect(r.extrasCents).toBe(350 * 6);
	});

	it('mano de obra: minutos × tarifa, incluida también en la sub-receta', () => {
		const ctx = makeCtx({ includeLabor: true, hourlyRateCents: 2000 });
		const crema = costRecipe('crema', ctx);
		expect(crema.laborCents).toBe(Math.round((20 / 60) * 2000)); // 667
		const vaso = costRecipe('vaso', ctx);
		expect(vaso.laborCents).toBe(1000); // 30 min
		// La fracción de crema trae su propia mano de obra
		const sub = vaso.lines.find((l) => l.lineId === 'v1')!;
		expect(sub.costCents).toBe(Math.round(crema.totalCents / 2));
		expect(crema.totalCents).toBe(crema.ingredientsCents + 667);
	});

	it('indirectos: prorratea gastos fijos por minuto de producción', () => {
		// Q800/mes de gas+luz, 80 h de producción → Q0.1667/min → 90 min = Q15
		const ctx = makeCtx({ includeOverhead: true, monthlyFixedCents: 80000, monthlyProductionMinutes: 4800 });
		const r = costRecipe('trenza', ctx);
		expect(r.overheadCents).toBe(1500);
	});

	it('merma: solo si está activa, usa la de la línea o la del ingrediente', () => {
		const sin = costRecipe('trenza', makeCtx());
		const con = costRecipe('trenza', makeCtx({ includeWaste: true }));
		const h0 = sin.lines.find((l) => l.lineId === 't8')!.costCents;
		const h1 = con.lines.find((l) => l.lineId === 't8')!.costCents;
		expect(h1).toBe(Math.round(h0 * 1.03));
		expect(con.lines.find((l) => l.lineId === 't8')!.detail).toContain('3% merma');
	});

	it('ingrediente sin precio: advierte y costea en 0, no revienta', () => {
		const ctx = makeCtx();
		ctx.purchases.delete('chispas');
		const r = costRecipe('trenza', ctx);
		expect(r.warnings).toEqual(['"Chispas de chocolate" no tiene precio de compra; se costea en 0.']);
		expect(r.lines.find((l) => l.lineId === 't11')!.costCents).toBe(0);
	});

	it('sub-receta con rendimiento en etiqueta libre no se puede pedir por unidad física', () => {
		const ctx = makeCtx();
		const mal: Recipe = {
			...vasoPostre,
			id: 'mal',
			lines: [{ kind: 'subrecipe', id: 'm1', recipeId: 'trenza', quantity: 100, unit: 'g' }]
		};
		ctx.recipes.set('mal', mal);
		expect(() => costRecipe('mal', ctx)).toThrow(/solo se puede usar por fracción/);
	});

	it('rendimiento cero es error explícito', () => {
		const ctx = makeCtx();
		ctx.recipes.set('crema', { ...cremaPastelera, yieldQty: 0 });
		expect(() => costRecipe('crema', ctx)).toThrow(/rendimiento/);
	});
});

describe('ciclos', () => {
	it('detecta A → B → A', () => {
		const a: Recipe = { ...cremaPastelera, id: 'a', name: 'A', lines: [{ kind: 'subrecipe', id: '1', recipeId: 'b', quantity: 1, unit: 'yield' }] };
		const b: Recipe = { ...cremaPastelera, id: 'b', name: 'B', lines: [{ kind: 'subrecipe', id: '2', recipeId: 'a', quantity: 1, unit: 'yield' }] };
		const recipes = new Map([
			['a', a],
			['b', b]
		]);
		expect(findCycle('a', recipes)).toEqual(['A', 'B', 'A']);
		const ctx = makeCtx({}, [a, b]);
		expect(() => costRecipe('a', ctx)).toThrow(CostingError);
	});
	it('no hay ciclo en el fixture', () => {
		expect(findCycle('trenza', makeCtx().recipes)).toBeNull();
	});
});

describe('recipesUsingIngredient', () => {
	it('propaga por sub-recetas: la leche afecta crema, trenza y vaso', () => {
		const ids = recipesUsingIngredient('leche', makeCtx().recipes).map((r) => r.id).sort();
		expect(ids).toEqual(['crema', 'trenza', 'vaso']);
	});
});

// ---------- Precios ----------

describe('pricing', () => {
	it('margen vs markup', () => {
		expect(priceFromMargin(6000, 40)).toBe(10000);
		expect(marginPct(6000, 10000)).toBeCloseTo(40);
		expect(markupPct(6000, 10000)).toBeCloseTo(66.67, 1);
		expect(() => priceFromMargin(100, 100)).toThrow(RangeError);
	});

	it('redondeo psicológico', () => {
		expect(roundPrice(232)).toBe(250);
		expect(roundPrice(482)).toBe(500);
		expect(roundPrice(743)).toBe(750);
		expect(roundPrice(1510)).toBe(1550);
		expect(roundPrice(3743)).toBe(3800);
		expect(roundPrice(12343)).toBe(12500);
	});

	it('calculadora inversa: pérdida, bajo objetivo y ok', () => {
		const costo = 1000; // Q10 por unidad
		expect(reverseQuote(costo, 20, 15000, 40).verdict).toBe('loss');
		const bajo = reverseQuote(costo, 20, 25000, 40);
		expect(bajo.verdict).toBe('below_target');
		expect(bajo.profitCents).toBe(5000);
		expect(bajo.marginPct).toBeCloseTo(20);
		expect(bajo.targetTotalCents).toBe(Math.round(20000 / 0.6));
		expect(reverseQuote(costo, 20, 34000, 40).verdict).toBe('ok');
	});

	it('escalones por volumen bajan el margen, no inventan descuentos', () => {
		const tiers = tierPrices(1000, defaultTiers(40));
		expect(tiers[0]).toMatchObject({ minQty: 1, marginPct: 40, perUnitCents: 1667, rounded: 1700 });
		expect(tiers.at(-1)).toMatchObject({ minQty: 100, marginPct: 25 });
		expect(tierFor(30, tiers).minQty).toBe(25);
		expect(tierFor(5, tiers).minQty).toBe(1);
		expect(tierFor(500, tiers).minQty).toBe(100);
	});
});
