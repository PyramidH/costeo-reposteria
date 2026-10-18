import type { Cents } from './types';

/** Redondeo "comercial" (half away from zero), no el banker's rounding de toFixed. */
export function roundCents(x: number): Cents {
	return Math.sign(x) * Math.round(Math.abs(x));
}

export function centsToNumber(c: Cents): number {
	return c / 100;
}

/** Parsea "12.50", "12,5", "Q 12.50" a centavos. `null` si no es válido. */
export function parseMoney(input: string): Cents | null {
	const s = input.replace(/[^\d.,-]/g, '').replace(',', '.');
	if (!s || !/^-?\d*\.?\d*$/.test(s) || s === '.' || s === '-') return null;
	const n = parseFloat(s);
	if (!Number.isFinite(n)) return null;
	return roundCents(n * 100);
}

export interface CurrencyFormat {
	code: string;
	symbol: string;
	/** Decimales a mostrar. */
	decimals: number;
}

export const CURRENCIES: Record<string, CurrencyFormat> = {
	GTQ: { code: 'GTQ', symbol: 'Q', decimals: 2 },
	USD: { code: 'USD', symbol: '$', decimals: 2 },
	MXN: { code: 'MXN', symbol: '$', decimals: 2 },
	HNL: { code: 'HNL', symbol: 'L', decimals: 2 },
	NIO: { code: 'NIO', symbol: 'C$', decimals: 2 },
	CRC: { code: 'CRC', symbol: '₡', decimals: 0 },
	COP: { code: 'COP', symbol: '$', decimals: 0 },
	PEN: { code: 'PEN', symbol: 'S/', decimals: 2 }
};

export function formatMoney(c: Cents, currency: CurrencyFormat = CURRENCIES.GTQ): string {
	const n = c / 100;
	const abs = Math.abs(n).toLocaleString('es-GT', {
		minimumFractionDigits: currency.decimals,
		maximumFractionDigits: currency.decimals
	});
	return `${n < 0 ? '-' : ''}${currency.symbol}${abs}`;
}
