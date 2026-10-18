/**
 * Las recetas de repostería usan fracciones: "1 1/2", "½", "1½", "¼".
 * Este módulo convierte esa entrada humana a número y de vuelta.
 */

const VULGAR: Record<string, number> = {
	'¼': 0.25,
	'½': 0.5,
	'¾': 0.75,
	'⅓': 1 / 3,
	'⅔': 2 / 3,
	'⅛': 0.125,
	'⅜': 0.375,
	'⅝': 0.625,
	'⅞': 0.875
};

/**
 * Acepta: "2", "2.5", "2,5", "1/2", "1 1/2", "1½", "½", " 3 / 4 ".
 * Devuelve `null` si no se puede interpretar o el resultado no es positivo.
 */
export function parseQty(input: string): number | null {
	let s = input.trim().replace(',', '.');
	if (!s) return null;

	let total = 0;
	// Fracción vulgar pegada o separada: "1½", "1 ½", "½"
	for (const [sym, val] of Object.entries(VULGAR)) {
		if (s.includes(sym)) {
			const rest = s.replace(sym, '').trim();
			if (rest && !/^\d+$/.test(rest)) return null;
			total = (rest ? parseInt(rest, 10) : 0) + val;
			return total > 0 ? total : null;
		}
	}

	// "1 1/2" o "1/2"
	const m = s.match(/^(\d+)?\s*(?:(\d+)\s*\/\s*(\d+))?$/);
	if (m && (m[1] !== undefined || m[2] !== undefined)) {
		const whole = m[1] ? parseInt(m[1], 10) : 0;
		if (m[2] !== undefined) {
			const num = parseInt(m[2], 10);
			const den = parseInt(m[3], 10);
			if (den === 0) return null;
			total = whole + num / den;
		} else {
			total = whole;
		}
		return total > 0 ? total : null;
	}

	// Decimal
	if (/^\d*\.?\d+$/.test(s)) {
		const n = parseFloat(s);
		return n > 0 ? n : null;
	}
	return null;
}

/**
 * Formatea un número como fracción amigable cuando está cerca de una
 * fracción común (hasta octavos); si no, con hasta 2 decimales.
 */
export function formatQty(n: number): string {
	if (Number.isInteger(n)) return String(n);
	const whole = Math.floor(n);
	const frac = n - whole;
	const candidates: [number, string][] = [
		[0.25, '¼'],
		[0.5, '½'],
		[0.75, '¾'],
		[1 / 3, '⅓'],
		[2 / 3, '⅔'],
		[0.125, '⅛'],
		[0.375, '⅜'],
		[0.625, '⅝'],
		[0.875, '⅞']
	];
	for (const [v, sym] of candidates) {
		if (Math.abs(frac - v) < 0.005) return whole ? `${whole}${sym}` : sym;
	}
	return n.toFixed(2).replace(/\.?0+$/, '');
}
