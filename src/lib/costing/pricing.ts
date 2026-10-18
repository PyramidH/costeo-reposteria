import type { Cents } from './types';
import { roundCents } from './money';

/**
 * Margen vs. markup — la confusión clásica:
 * - margen  = (precio − costo) / precio   → "del precio, qué % es ganancia"
 * - markup  = (precio − costo) / costo    → "sobre el costo, qué % le subo"
 * La app trabaja con MARGEN y lo explica en la UI.
 */

export function priceFromMargin(costCents: Cents, marginPct: number): Cents {
	if (marginPct >= 100) throw new RangeError('El margen debe ser menor a 100%.');
	if (marginPct < 0) throw new RangeError('El margen no puede ser negativo.');
	return roundCents(costCents / (1 - marginPct / 100));
}

export function priceFromMarkup(costCents: Cents, markupPct: number): Cents {
	return roundCents(costCents * (1 + markupPct / 100));
}

export function marginPct(costCents: Cents, priceCents: Cents): number {
	if (priceCents === 0) return costCents === 0 ? 0 : -Infinity;
	return ((priceCents - costCents) / priceCents) * 100;
}

export function markupPct(costCents: Cents, priceCents: Cents): number {
	if (costCents === 0) return priceCents === 0 ? 0 : Infinity;
	return ((priceCents - costCents) / costCents) * 100;
}

/**
 * Redondeo psicológico de precios para que la cotización no diga Q37.43.
 * - < Q10: al 0.50
 * - < Q100: al Q1
 * - >= Q100: al Q5
 */
export function roundPrice(cents: Cents): Cents {
	if (cents < 1000) return Math.ceil(cents / 50) * 50;
	if (cents < 10000) return Math.ceil(cents / 100) * 100;
	return Math.ceil(cents / 500) * 500;
}

export interface ReverseQuote {
	units: number;
	offeredTotalCents: Cents;
	offeredPerUnitCents: Cents;
	costTotalCents: Cents;
	profitCents: Cents;
	marginPct: number;
	/** Precio que debería cobrar al margen deseado, para comparar. */
	targetTotalCents: Cents;
	verdict: 'loss' | 'below_target' | 'ok';
}

/**
 * Calculadora inversa: "me ofrecen Q250 por 20 unidades, ¿me conviene?"
 */
export function reverseQuote(
	perUnitCostCents: Cents,
	units: number,
	offeredTotalCents: Cents,
	targetMarginPct: number
): ReverseQuote {
	if (units <= 0) throw new RangeError('Las unidades deben ser mayores a 0.');
	const costTotalCents = roundCents(perUnitCostCents * units);
	const profitCents = offeredTotalCents - costTotalCents;
	const m = marginPct(costTotalCents, offeredTotalCents);
	const targetTotalCents = priceFromMargin(costTotalCents, targetMarginPct);
	return {
		units,
		offeredTotalCents,
		offeredPerUnitCents: roundCents(offeredTotalCents / units),
		costTotalCents,
		profitCents,
		marginPct: m,
		targetTotalCents,
		verdict: profitCents < 0 ? 'loss' : m < targetMarginPct - 0.5 ? 'below_target' : 'ok'
	};
}

export interface VolumeTier {
	minQty: number;
	/** Margen aplicado en este escalón. */
	marginPct: number;
}

export interface TierPrice extends VolumeTier {
	perUnitCents: Cents;
	rounded: Cents;
}

/**
 * Precios por volumen. El costo unitario de ingredientes no baja con el
 * volumen (es lineal), así que el descuento sale solo de aceptar menos margen
 * en pedidos grandes — y eso se ve explícito, no "a ojo".
 */
export function tierPrices(perUnitCostCents: Cents, tiers: VolumeTier[]): TierPrice[] {
	return [...tiers]
		.sort((a, b) => a.minQty - b.minQty)
		.map((t) => {
			const perUnitCents = priceFromMargin(perUnitCostCents, t.marginPct);
			return { ...t, perUnitCents, rounded: roundPrice(perUnitCents) };
		});
}

/** Escalones sugeridos por defecto a partir del margen base. */
export function defaultTiers(baseMarginPct: number): VolumeTier[] {
	const step = (d: number) => Math.max(10, baseMarginPct - d);
	return [
		{ minQty: 1, marginPct: baseMarginPct },
		{ minQty: 12, marginPct: step(5) },
		{ minQty: 25, marginPct: step(8) },
		{ minQty: 50, marginPct: step(12) },
		{ minQty: 100, marginPct: step(15) }
	];
}

export function tierFor(qty: number, tiers: TierPrice[]): TierPrice {
	const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
	let match = sorted[0];
	for (const t of sorted) if (qty >= t.minQty) match = t;
	return match;
}
