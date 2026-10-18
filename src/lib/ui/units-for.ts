import type { Ingredient, UnitCode } from '#lib/costing';

const MASS: UnitCode[] = ['oz', 'lb', 'g', 'kg'];
const VOLUME: UnitCode[] = ['ml', 'l', 'taza', 'cda', 'cdta'];
const PIECE: UnitCode[] = ['pza'];

/** Unidades en las que se puede medir un ingrediente, la más habitual primero. */
export function unitsFor(i: Pick<Ingredient, 'baseDimension' | 'massPerPieceG' | 'densityGPerMl'>): UnitCode[] {
	const out: UnitCode[] = [];
	if (i.baseDimension === 'mass') {
		out.push(...MASS);
		if (i.massPerPieceG) out.push(...PIECE);
		if (i.densityGPerMl) out.push(...VOLUME);
	} else if (i.baseDimension === 'piece') {
		out.push(...PIECE);
		if (i.massPerPieceG) out.push(...MASS);
	} else {
		out.push(...VOLUME);
		if (i.densityGPerMl) out.push(...MASS);
	}
	return out;
}

export const UNIT_LABELS: Record<UnitCode, string> = {
	g: 'g',
	kg: 'kg',
	oz: 'oz',
	lb: 'lb',
	ml: 'ml',
	l: 'L',
	taza: 'taza',
	cda: 'cda',
	cdta: 'cdta',
	pza: 'pza'
};
