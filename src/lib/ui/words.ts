/** Singular aproximado en español para la unidad de rendimiento ("porciones" → "porción"). */
const IRREGULAR: Record<string, string> = {
	porciones: 'porción',
	raciones: 'ración',
	unidades: 'unidad',
	panes: 'pan',
	flanes: 'flan',
	pasteles: 'pastel',
	cupcakes: 'cupcake',
	muffins: 'muffin',
	brownies: 'brownie',
	cookies: 'cookie',
	donas: 'dona',
	pies: 'pie',
	croissants: 'croissant',
	strudels: 'strudel'
};

export function singular(word: string): string {
	const w = word.trim().toLowerCase();
	if (!w) return 'pieza';
	if (IRREGULAR[w]) return IRREGULAR[w];
	if (w.endsWith('ciones')) return w.slice(0, -5) + 'ción';
	if (w.endsWith('es') && /[dlrnzj]$/.test(w.slice(0, -2))) return w.slice(0, -2);
	if (w.endsWith('s') && w.length > 3) return w.slice(0, -1);
	return w;
}

/** "a, b y c" */
export function joinY(items: string[]): string {
	if (items.length <= 1) return items.join('');
	return items.slice(0, -1).join(', ') + ' y ' + items.at(-1);
}

export function fmtTime(m: number): string {
	if (m <= 0) return '0 min';
	if (m < 60) return `${m} min`;
	const h = Math.floor(m / 60);
	const r = m % 60;
	return r ? `${h} h ${r} min` : `${h} h`;
}
