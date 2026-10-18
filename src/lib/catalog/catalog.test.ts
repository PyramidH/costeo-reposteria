import { describe, expect, it } from 'vitest';
import { GT_CATALOG, normalize, searchCatalog } from './gt';
import { makeUnits, convertToIngredientBase, UNIT_CODES } from '#lib/costing';

describe('catálogo GT', () => {
	it('globalIds únicos y en kebab-case', () => {
		const ids = GT_CATALOG.map((e) => e.globalId);
		expect(new Set(ids).size).toBe(ids.length);
		for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
	});

	it('toda compra es convertible a la dimensión base del ingrediente', () => {
		const units = makeUnits();
		for (const e of GT_CATALOG) {
			expect(UNIT_CODES).toContain(e.purchase.unit);
			expect(e.purchase.priceCents).toBeGreaterThan(0);
			expect(e.purchase.quantity).toBeGreaterThan(0);
			expect(() => convertToIngredientBase(e.purchase.quantity, e.purchase.unit, e, units)).not.toThrow();
		}
	});

	it('ingredientes por pieza que se usan por peso tienen massPerPieceG', () => {
		for (const id of ['huevo', 'clara', 'yema', 'manzana', 'leche-condensada']) {
			const e = GT_CATALOG.find((x) => x.globalId === id)!;
			expect(e.baseDimension).toBe('piece');
			expect(e.massPerPieceG).toBeGreaterThan(0);
		}
	});

	it('cubre los insumos de las recetas del curso', () => {
		const need = ['harina-dura', 'harina-hojaldre', 'vitina-hojaldre', 'manteca-vegetal', 'levadura-fresca', 'margarina-industrial', 'leche-polvo', 'maicena', 'azucar-glass', 'chispas-chocolate', 'guindas', 'queso-crema', 'leche-condensada', 'cremor-tartaro', 'ajonjoli', 'pasas', 'jugo-naranja', 'molde-pie-desechable'];
		const ids = new Set(GT_CATALOG.map((e) => e.globalId));
		for (const n of need) expect(ids.has(n), n).toBe(true);
	});

	it('normaliza tildes y mayúsculas', () => {
		expect(normalize('Azúcar  Glass')).toBe('azucar glass');
		expect(normalize('MANÍ')).toBe('mani');
	});

	it('búsqueda por nombre, alias y prefijo de palabra', () => {
		expect(searchCatalog('harina du')[0].globalId).toBe('harina-dura');
		expect(searchCatalog('philadelphia')[0].globalId).toBe('queso-crema');
		expect(searchCatalog('capullo')[0].globalId).toBe('vitina-hojaldre');
		expect(searchCatalog('glass')[0].globalId).toBe('azucar-glass');
		expect(searchCatalog('lechera')[0].globalId).toBe('leche-condensada');
		expect(searchCatalog('')).toEqual([]);
		expect(searchCatalog('xyzzy')).toEqual([]);
	});

	it('la búsqueda exacta gana al prefijo', () => {
		expect(searchCatalog('huevo')[0].globalId).toBe('huevo');
		expect(searchCatalog('sal')[0].globalId).toBe('sal');
	});
});
