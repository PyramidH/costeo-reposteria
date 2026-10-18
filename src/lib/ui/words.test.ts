import { describe, expect, it } from 'vitest';
import { singular, joinY } from './words';

describe('singular', () => {
	it.each([
		['porciones', 'porción'],
		['vasos', 'vaso'],
		['cupcakes', 'cupcake'],
		['galletas', 'galleta'],
		['trenzas', 'trenza'],
		['panes', 'pan'],
		['unidades', 'unidad'],
		['piezas', 'pieza'],
		['strudel', 'strudel'],
		['', 'pieza']
	])('%s → %s', (a, b) => expect(singular(a)).toBe(b));
});

describe('joinY', () => {
	it('une con comas y "y"', () => {
		expect(joinY(['a'])).toBe('a');
		expect(joinY(['a', 'b'])).toBe('a y b');
		expect(joinY(['a', 'b', 'c'])).toBe('a, b y c');
	});
});
