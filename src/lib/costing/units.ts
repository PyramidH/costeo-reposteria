import type { Dimension, Ingredient, UnitCode, UnitDef } from './types';

export class UnitError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'UnitError';
	}
}

/** Mililitros por taza/cucharada/cucharadita (medidas de cocina US, las usuales aquí). */
const ML_PER_TAZA = 240;
const ML_PER_CDA = 15;
const ML_PER_CDTA = 5;

/**
 * Registro de unidades parametrizado por el peso de la libra, porque en
 * Guatemala la libra de mercado es 460 g y no 453.6 g.
 */
export function makeUnits(lbGrams = 460): Record<UnitCode, UnitDef> {
	return {
		g: { code: 'g', dimension: 'mass', toBase: 1, label: 'g', plural: 'g' },
		kg: { code: 'kg', dimension: 'mass', toBase: 1000, label: 'kg', plural: 'kg' },
		oz: { code: 'oz', dimension: 'mass', toBase: lbGrams / 16, label: 'oz', plural: 'oz' },
		lb: { code: 'lb', dimension: 'mass', toBase: lbGrams, label: 'lb', plural: 'lb' },
		ml: { code: 'ml', dimension: 'volume', toBase: 1, label: 'ml', plural: 'ml' },
		l: { code: 'l', dimension: 'volume', toBase: 1000, label: 'L', plural: 'L' },
		taza: { code: 'taza', dimension: 'volume', toBase: ML_PER_TAZA, label: 'taza', plural: 'tazas' },
		cda: { code: 'cda', dimension: 'volume', toBase: ML_PER_CDA, label: 'cda', plural: 'cdas' },
		cdta: { code: 'cdta', dimension: 'volume', toBase: ML_PER_CDTA, label: 'cdta', plural: 'cdtas' },
		pza: { code: 'pza', dimension: 'piece', toBase: 1, label: 'pza', plural: 'pzas' }
	};
}

export const UNIT_CODES: UnitCode[] = ['g', 'kg', 'oz', 'lb', 'ml', 'l', 'taza', 'cda', 'cdta', 'pza'];

export function isUnitCode(x: string): x is UnitCode {
	return (UNIT_CODES as string[]).includes(x);
}

export function baseUnitOf(d: Dimension): UnitCode {
	return d === 'mass' ? 'g' : d === 'volume' ? 'ml' : 'pza';
}

/** Convierte una cantidad a la unidad base de su propia dimensión. */
export function toBase(qty: number, unit: UnitCode, units: Record<UnitCode, UnitDef>): number {
	return qty * units[unit].toBase;
}

/**
 * Convierte una cantidad en `unit` a la unidad base de `target`, usando
 * los datos del ingrediente cuando hay cambio de dimensión:
 * - pieza ↔ masa: requiere `massPerPieceG`
 * - volumen ↔ masa: requiere `densityGPerMl`
 * - pieza ↔ volumen: vía masa, requiere ambos
 */
export function convertToIngredientBase(
	qty: number,
	unit: UnitCode,
	ingredient: Pick<Ingredient, 'name' | 'baseDimension' | 'massPerPieceG' | 'densityGPerMl'>,
	units: Record<UnitCode, UnitDef>
): number {
	const from = units[unit].dimension;
	const to = ingredient.baseDimension;
	const inBase = toBase(qty, unit, units);
	if (from === to) return inBase;

	// Pasamos todo por gramos como pivote.
	const grams = (() => {
		if (from === 'mass') return inBase;
		if (from === 'piece') {
			if (!ingredient.massPerPieceG)
				throw new UnitError(`"${ingredient.name}" no tiene peso por pieza; no se puede usar en piezas.`);
			return inBase * ingredient.massPerPieceG;
		}
		// volume
		if (!ingredient.densityGPerMl)
			throw new UnitError(`"${ingredient.name}" no tiene densidad; no se puede medir en volumen.`);
		return inBase * ingredient.densityGPerMl;
	})();

	if (to === 'mass') return grams;
	if (to === 'piece') {
		if (!ingredient.massPerPieceG)
			throw new UnitError(`"${ingredient.name}" no tiene peso por pieza; no se puede convertir a piezas.`);
		return grams / ingredient.massPerPieceG;
	}
	if (!ingredient.densityGPerMl)
		throw new UnitError(`"${ingredient.name}" no tiene densidad; no se puede convertir a volumen.`);
	return grams / ingredient.densityGPerMl;
}

/** Formatea una cantidad en unidad base a algo legible (g→oz/lb si conviene). */
export function formatQty(
	qtyBase: number,
	dimension: Dimension,
	units: Record<UnitCode, UnitDef>,
	prefer: 'imperial' | 'metric' = 'imperial'
): string {
	const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(n < 10 ? 2 : 1).replace(/\.?0+$/, ''));
	if (dimension === 'piece') return `${fmt(qtyBase)} ${qtyBase === 1 ? 'pza' : 'pzas'}`;
	if (dimension === 'volume') {
		return qtyBase >= 1000 ? `${fmt(qtyBase / 1000)} L` : `${fmt(qtyBase)} ml`;
	}
	if (prefer === 'metric') return qtyBase >= 1000 ? `${fmt(qtyBase / 1000)} kg` : `${fmt(qtyBase)} g`;
	const oz = qtyBase / units.oz.toBase;
	if (oz >= 16) return `${fmt(oz / 16)} lb`;
	if (oz < 0.25) return `${fmt(qtyBase)} g`;
	return `${fmt(oz)} oz`;
}
