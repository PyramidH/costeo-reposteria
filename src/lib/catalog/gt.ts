import type { Dimension, UnitCode } from '#lib/costing';

/**
 * Catálogo global de ingredientes — Guatemala.
 *
 * `globalId` es el identificador canónico y estable: los ingredientes locales de
 * cada negocio se enlazan a él, lo que permite más adelante agregar precios de
 * mercado de forma anónima.
 *
 * Los precios son REFERENCIAS de tienda (octubre 2026), estimadas a partir de
 * precios mayoristas publicados por el MAGA (precios.maga.gob.gt) más un margen
 * de detalle del 25–40 %, o de observación directa donde no hay dato oficial.
 * La usuaria los edita con su precio real; la app lo deja claro al importar.
 */
export interface CatalogEntry {
	globalId: string;
	name: string;
	aliases?: string[];
	category: CatalogCategory;
	baseDimension: Dimension;
	massPerPieceG?: number;
	densityGPerMl?: number;
	defaultWastePct?: number;
	/** Presentación de compra habitual. */
	purchase: { description: string; quantity: number; unit: UnitCode; priceCents: number };
	/** Nota corta para la UI (p. ej. "también en barra de 250 g"). */
	note?: string;
}

export type CatalogCategory =
	| 'harinas'
	| 'azucares'
	| 'grasas'
	| 'lacteos'
	| 'huevos'
	| 'leudantes'
	| 'chocolate'
	| 'frutas'
	| 'frutos_secos'
	| 'saborizantes'
	| 'rellenos'
	| 'decoracion'
	| 'empaque'
	| 'otros';

export const CATEGORY_LABELS: Record<CatalogCategory, string> = {
	harinas: 'Harinas y almidones',
	azucares: 'Azúcares',
	grasas: 'Grasas',
	lacteos: 'Lácteos',
	huevos: 'Huevos',
	leudantes: 'Leudantes y sal',
	chocolate: 'Chocolate y cocoa',
	frutas: 'Frutas',
	frutos_secos: 'Frutos secos y semillas',
	saborizantes: 'Saborizantes y especias',
	rellenos: 'Rellenos y coberturas',
	decoracion: 'Decoración',
	empaque: 'Empaque',
	otros: 'Otros'
};

const Q = (q: number) => Math.round(q * 100);

export const GT_CATALOG: CatalogEntry[] = [
	// ---------- Harinas y almidones ----------
	{ globalId: 'harina-dura', name: 'Harina dura', aliases: ['harina fuerte', 'harina de pan', 'Sol dura'], category: 'harinas', baseDimension: 'mass', purchase: { description: 'Libra', quantity: 1, unit: 'lb', priceCents: Q(4.75) } },
	{ globalId: 'harina-suave', name: 'Harina suave', aliases: ['harina de repostería', 'harina floja', 'Sol suave'], category: 'harinas', baseDimension: 'mass', purchase: { description: 'Libra', quantity: 1, unit: 'lb', priceCents: Q(4.5) } },
	{ globalId: 'harina-mixta', name: 'Harina mixta', aliases: ['harina todo uso', 'harina multiusos'], category: 'harinas', baseDimension: 'mass', purchase: { description: 'Libra', quantity: 1, unit: 'lb', priceCents: Q(4.6) } },
	{ globalId: 'harina-hojaldre', name: 'Harina especial de hojaldre', aliases: ['harina hojaldre'], category: 'harinas', baseDimension: 'mass', purchase: { description: 'Libra', quantity: 1, unit: 'lb', priceCents: Q(5.5) } },
	{ globalId: 'harina-integral', name: 'Harina integral', category: 'harinas', baseDimension: 'mass', purchase: { description: 'Libra', quantity: 1, unit: 'lb', priceCents: Q(6) } },
	{ globalId: 'maicena', name: 'Maicena', aliases: ['fécula de maíz', 'almidón de maíz'], category: 'harinas', baseDimension: 'mass', purchase: { description: 'Libra', quantity: 1, unit: 'lb', priceCents: Q(9) } },
	{ globalId: 'avena', name: 'Avena en hojuelas', aliases: ['mosh'], category: 'harinas', baseDimension: 'mass', purchase: { description: 'Bolsa 400 g', quantity: 400, unit: 'g', priceCents: Q(8) } },

	// ---------- Azúcares ----------
	{ globalId: 'azucar', name: 'Azúcar granulada', aliases: ['azúcar blanca', 'azúcar estándar'], category: 'azucares', baseDimension: 'mass', purchase: { description: 'Libra', quantity: 1, unit: 'lb', priceCents: Q(4.5) } },
	{ globalId: 'azucar-glass', name: 'Azúcar glass', aliases: ['azúcar glas', 'azúcar impalpable', 'azúcar 3A', 'azúcar pulverizada'], category: 'azucares', baseDimension: 'mass', purchase: { description: 'Libra', quantity: 1, unit: 'lb', priceCents: Q(8) } },
	{ globalId: 'azucar-morena', name: 'Azúcar morena', aliases: ['azúcar mascabado', 'azúcar cruda'], category: 'azucares', baseDimension: 'mass', purchase: { description: 'Libra', quantity: 1, unit: 'lb', priceCents: Q(5.5) } },
	{ globalId: 'panela', name: 'Panela', aliases: ['rapadura', 'dulce de panela'], category: 'azucares', baseDimension: 'mass', purchase: { description: 'Libra', quantity: 1, unit: 'lb', priceCents: Q(7) } },
	{ globalId: 'miel', name: 'Miel de abeja', category: 'azucares', baseDimension: 'mass', purchase: { description: 'Bote 500 g', quantity: 500, unit: 'g', priceCents: Q(45) } },
	{ globalId: 'glucosa', name: 'Glucosa', aliases: ['jarabe de glucosa', 'jarabe de maíz'], category: 'azucares', baseDimension: 'mass', purchase: { description: 'Libra', quantity: 1, unit: 'lb', priceCents: Q(18) } },

	// ---------- Grasas ----------
	{ globalId: 'mantequilla', name: 'Mantequilla', aliases: ['mantequilla con sal', 'mantequilla sin sal'], category: 'grasas', baseDimension: 'mass', purchase: { description: 'Libra', quantity: 1, unit: 'lb', priceCents: Q(32) }, note: 'También en barra de 250 g (~Q18).' },
	{ globalId: 'margarina', name: 'Margarina', aliases: ['margarina de mesa'], category: 'grasas', baseDimension: 'mass', purchase: { description: 'Libra', quantity: 1, unit: 'lb', priceCents: Q(16) } },
	{ globalId: 'margarina-industrial', name: 'Margarina industrial', aliases: ['margarina de repostería', 'margarina para batir'], category: 'grasas', baseDimension: 'mass', purchase: { description: 'Libra', quantity: 1, unit: 'lb', priceCents: Q(13) } },
	{ globalId: 'vitina-hojaldre', name: 'Vitina hojaldre', aliases: ['Capullo hojaldre', 'margarina de hojaldre', 'empaste'], category: 'grasas', baseDimension: 'mass', purchase: { description: 'Libra', quantity: 1, unit: 'lb', priceCents: Q(15) } },
	{ globalId: 'manteca-vegetal', name: 'Manteca vegetal', aliases: ['manteca', 'shortening'], category: 'grasas', baseDimension: 'mass', purchase: { description: 'Libra', quantity: 1, unit: 'lb', priceCents: Q(14) } },
	{ globalId: 'aceite', name: 'Aceite vegetal', aliases: ['aceite comestible'], category: 'grasas', baseDimension: 'volume', densityGPerMl: 0.92, purchase: { description: 'Botella 800 ml', quantity: 800, unit: 'ml', priceCents: Q(23) } },

	// ---------- Lácteos ----------
	{ globalId: 'leche', name: 'Leche líquida entera', aliases: ['leche', 'leche fluida'], category: 'lacteos', baseDimension: 'volume', densityGPerMl: 1.03, purchase: { description: 'Litro', quantity: 1, unit: 'l', priceCents: Q(13) } },
	{ globalId: 'leche-polvo', name: 'Leche en polvo', aliases: ['Nido', 'leche entera en polvo'], category: 'lacteos', baseDimension: 'mass', purchase: { description: 'Bolsa 360 g', quantity: 360, unit: 'g', priceCents: Q(38) } },
	{ globalId: 'leche-condensada', name: 'Leche condensada', aliases: ['lechera'], category: 'lacteos', baseDimension: 'piece', massPerPieceG: 397, purchase: { description: 'Lata 14 oz (397 g)', quantity: 1, unit: 'pza', priceCents: Q(17) } },
	{ globalId: 'leche-evaporada', name: 'Leche evaporada', category: 'lacteos', baseDimension: 'piece', massPerPieceG: 360, purchase: { description: 'Lata 360 g', quantity: 1, unit: 'pza', priceCents: Q(12) } },
	{ globalId: 'crema-batir', name: 'Crema para batir', aliases: ['crema de leche', 'crema chantilly líquida', 'whipping cream'], category: 'lacteos', baseDimension: 'volume', densityGPerMl: 1.0, purchase: { description: 'Litro', quantity: 1, unit: 'l', priceCents: Q(45) } },
	{ globalId: 'crema-vegetal', name: 'Crema vegetal para batir', aliases: ['chantilly vegetal', 'topping'], category: 'lacteos', baseDimension: 'volume', densityGPerMl: 1.0, purchase: { description: 'Litro', quantity: 1, unit: 'l', priceCents: Q(32) } },
	{ globalId: 'crema-acida', name: 'Crema ácida', aliases: ['crema', 'crema fresca'], category: 'lacteos', baseDimension: 'mass', purchase: { description: 'Libra', quantity: 1, unit: 'lb', priceCents: Q(22) } },
	{ globalId: 'queso-crema', name: 'Queso crema', aliases: ['Philadelphia', 'cream cheese'], category: 'lacteos', baseDimension: 'mass', purchase: { description: 'Barra 8 oz', quantity: 8, unit: 'oz', priceCents: Q(26) } },
	{ globalId: 'yogur', name: 'Yogur natural', category: 'lacteos', baseDimension: 'mass', purchase: { description: 'Litro (1 kg)', quantity: 1, unit: 'kg', priceCents: Q(28) } },

	// ---------- Huevos ----------
	{ globalId: 'huevo', name: 'Huevo', aliases: ['huevos', 'huevo mediano'], category: 'huevos', baseDimension: 'piece', massPerPieceG: 57, defaultWastePct: 3, purchase: { description: 'Cartón de 30', quantity: 30, unit: 'pza', priceCents: Q(44) }, note: '1 huevo mediano ≈ 2 oz (57 g): ~33 g de clara + ~18 g de yema.' },
	{ globalId: 'clara', name: 'Clara de huevo', aliases: ['claras'], category: 'huevos', baseDimension: 'piece', massPerPieceG: 33, purchase: { description: '1 clara (de huevo a Q1.47)', quantity: 1, unit: 'pza', priceCents: Q(0.9) }, note: 'Costo prorrateado del huevo; si vendes las yemas aparte, ajústalo.' },
	{ globalId: 'yema', name: 'Yema de huevo', aliases: ['yemas'], category: 'huevos', baseDimension: 'piece', massPerPieceG: 18, purchase: { description: '1 yema (de huevo a Q1.47)', quantity: 1, unit: 'pza', priceCents: Q(0.6) } },

	// ---------- Leudantes y sal ----------
	{ globalId: 'levadura-fresca', name: 'Levadura fresca', aliases: ['levadura en pasta', 'levadura de panadero'], category: 'leudantes', baseDimension: 'mass', purchase: { description: 'Libra', quantity: 1, unit: 'lb', priceCents: Q(26) } },
	{ globalId: 'levadura-seca', name: 'Levadura seca instantánea', aliases: ['levadura en polvo', 'levadura instantánea'], category: 'leudantes', baseDimension: 'mass', purchase: { description: 'Sobre 11 g', quantity: 11, unit: 'g', priceCents: Q(3.5) } },
	{ globalId: 'polvo-hornear', name: 'Polvo de hornear', aliases: ['royal', 'levadura química'], category: 'leudantes', baseDimension: 'mass', purchase: { description: 'Libra', quantity: 1, unit: 'lb', priceCents: Q(22) } },
	{ globalId: 'bicarbonato', name: 'Bicarbonato de sodio', category: 'leudantes', baseDimension: 'mass', purchase: { description: 'Libra', quantity: 1, unit: 'lb', priceCents: Q(10) } },
	{ globalId: 'cremor-tartaro', name: 'Crémor tártaro', category: 'leudantes', baseDimension: 'mass', purchase: { description: 'Onza', quantity: 1, unit: 'oz', priceCents: Q(8) } },
	{ globalId: 'sal', name: 'Sal', category: 'leudantes', baseDimension: 'mass', purchase: { description: 'Libra', quantity: 1, unit: 'lb', priceCents: Q(2.5) } },

	// ---------- Chocolate y cocoa ----------
	{ globalId: 'cocoa', name: 'Cocoa en polvo', aliases: ['cacao en polvo'], category: 'chocolate', baseDimension: 'mass', purchase: { description: 'Libra', quantity: 1, unit: 'lb', priceCents: Q(45) } },
	{ globalId: 'chispas-chocolate', name: 'Chispas de chocolate', aliases: ['chips de chocolate', 'gotas de chocolate'], category: 'chocolate', baseDimension: 'mass', purchase: { description: 'Libra', quantity: 1, unit: 'lb', priceCents: Q(42) } },
	{ globalId: 'chocolate-cobertura', name: 'Chocolate de cobertura', aliases: ['chocolate para derretir', 'chocolate sucedáneo', 'chocolate compound'], category: 'chocolate', baseDimension: 'mass', purchase: { description: 'Libra', quantity: 1, unit: 'lb', priceCents: Q(48) } },
	{ globalId: 'chocolate-blanco', name: 'Chocolate blanco', category: 'chocolate', baseDimension: 'mass', purchase: { description: 'Libra', quantity: 1, unit: 'lb', priceCents: Q(52) } },

	// ---------- Frutas ----------
	{ globalId: 'fresa', name: 'Fresas', aliases: ['frutillas'], category: 'frutas', baseDimension: 'mass', defaultWastePct: 10, purchase: { description: 'Libra', quantity: 1, unit: 'lb', priceCents: Q(15) } },
	{ globalId: 'manzana', name: 'Manzana', category: 'frutas', baseDimension: 'piece', massPerPieceG: 170, defaultWastePct: 15, purchase: { description: 'Unidad', quantity: 1, unit: 'pza', priceCents: Q(3.5) } },
	{ globalId: 'banano', name: 'Banano', aliases: ['plátano', 'guineo'], category: 'frutas', baseDimension: 'piece', massPerPieceG: 120, defaultWastePct: 35, purchase: { description: 'Unidad', quantity: 1, unit: 'pza', priceCents: Q(1) } },
	{ globalId: 'limon', name: 'Limón', aliases: ['limón criollo', 'limón persa'], category: 'frutas', baseDimension: 'piece', massPerPieceG: 50, purchase: { description: 'Unidad', quantity: 1, unit: 'pza', priceCents: Q(0.75) } },
	{ globalId: 'naranja', name: 'Naranja', category: 'frutas', baseDimension: 'piece', massPerPieceG: 200, purchase: { description: 'Unidad', quantity: 1, unit: 'pza', priceCents: Q(1.5) } },
	{ globalId: 'jugo-naranja', name: 'Jugo de naranja', category: 'frutas', baseDimension: 'volume', densityGPerMl: 1.04, purchase: { description: 'Litro', quantity: 1, unit: 'l', priceCents: Q(18) } },
	{ globalId: 'pasas', name: 'Pasas', aliases: ['uvas pasas'], category: 'frutas', baseDimension: 'mass', purchase: { description: 'Libra', quantity: 1, unit: 'lb', priceCents: Q(28) } },
	{ globalId: 'guindas', name: 'Guindas rojas', aliases: ['cerezas marrasquino', 'cerezas en almíbar'], category: 'frutas', baseDimension: 'mass', purchase: { description: 'Frasco 16 oz', quantity: 16, unit: 'oz', priceCents: Q(35) } },
	{ globalId: 'fruta-cristalizada', name: 'Fruta cristalizada', aliases: ['fruta confitada', 'fruta abrillantada'], category: 'frutas', baseDimension: 'mass', purchase: { description: 'Libra', quantity: 1, unit: 'lb', priceCents: Q(30) } },
	{ globalId: 'coco-rallado', name: 'Coco rallado', category: 'frutas', baseDimension: 'mass', purchase: { description: 'Libra', quantity: 1, unit: 'lb', priceCents: Q(28) } },

	// ---------- Frutos secos y semillas ----------
	{ globalId: 'nuez', name: 'Nuez', aliases: ['nuez de castilla', 'nueces'], category: 'frutos_secos', baseDimension: 'mass', purchase: { description: 'Libra', quantity: 1, unit: 'lb', priceCents: Q(95) } },
	{ globalId: 'almendra', name: 'Almendra', aliases: ['almendras'], category: 'frutos_secos', baseDimension: 'mass', purchase: { description: 'Libra', quantity: 1, unit: 'lb', priceCents: Q(90) } },
	{ globalId: 'mani', name: 'Maní', aliases: ['cacahuate'], category: 'frutos_secos', baseDimension: 'mass', purchase: { description: 'Libra', quantity: 1, unit: 'lb', priceCents: Q(22) } },
	{ globalId: 'ajonjoli', name: 'Ajonjolí', aliases: ['sésamo', 'ajonjolí descortezado', 'ajonjolí negro'], category: 'frutos_secos', baseDimension: 'mass', purchase: { description: 'Libra', quantity: 1, unit: 'lb', priceCents: Q(25) } },
	{ globalId: 'pepitoria', name: 'Pepitoria', aliases: ['semilla de ayote', 'pepita'], category: 'frutos_secos', baseDimension: 'mass', purchase: { description: 'Libra', quantity: 1, unit: 'lb', priceCents: Q(40) } },

	// ---------- Saborizantes y especias ----------
	{ globalId: 'vainilla', name: 'Esencia de vainilla', aliases: ['vainilla', 'esencia'], category: 'saborizantes', baseDimension: 'volume', densityGPerMl: 1.0, purchase: { description: 'Botella 250 ml', quantity: 250, unit: 'ml', priceCents: Q(18) } },
	{ globalId: 'vaina-vainilla', name: 'Vaina de vainilla', category: 'saborizantes', baseDimension: 'piece', massPerPieceG: 4, purchase: { description: 'Unidad', quantity: 1, unit: 'pza', priceCents: Q(25) } },
	{ globalId: 'canela-polvo', name: 'Canela en polvo', category: 'saborizantes', baseDimension: 'mass', purchase: { description: 'Onza', quantity: 1, unit: 'oz', priceCents: Q(6) } },
	{ globalId: 'canela-raja', name: 'Canela en raja', aliases: ['canela en rama'], category: 'saborizantes', baseDimension: 'mass', purchase: { description: 'Onza', quantity: 1, unit: 'oz', priceCents: Q(7) } },
	{ globalId: 'nuez-moscada', name: 'Nuez moscada', category: 'saborizantes', baseDimension: 'mass', purchase: { description: 'Onza', quantity: 1, unit: 'oz', priceCents: Q(12) } },
	{ globalId: 'cafe-soluble', name: 'Café soluble', aliases: ['café instantáneo'], category: 'saborizantes', baseDimension: 'mass', purchase: { description: 'Frasco 170 g', quantity: 170, unit: 'g', priceCents: Q(42) } },
	{ globalId: 'ron', name: 'Ron', aliases: ['ron añejo', 'licor'], category: 'saborizantes', baseDimension: 'volume', densityGPerMl: 0.95, purchase: { description: 'Botella 750 ml', quantity: 750, unit: 'ml', priceCents: Q(85) } },
	{ globalId: 'colorante', name: 'Colorante en gel', aliases: ['color vegetal', 'colorante'], category: 'saborizantes', baseDimension: 'mass', purchase: { description: 'Frasco 28 g', quantity: 28, unit: 'g', priceCents: Q(22) } },

	// ---------- Rellenos y coberturas ----------
	{ globalId: 'dulce-leche', name: 'Dulce de leche', aliases: ['manjar', 'cajeta', 'arequipe'], category: 'rellenos', baseDimension: 'mass', purchase: { description: 'Libra', quantity: 1, unit: 'lb', priceCents: Q(22) } },
	{ globalId: 'mermelada', name: 'Mermelada', aliases: ['jalea'], category: 'rellenos', baseDimension: 'mass', purchase: { description: 'Frasco 300 g', quantity: 300, unit: 'g', priceCents: Q(18) } },
	{ globalId: 'fondant', name: 'Fondant', aliases: ['pasta de azúcar'], category: 'rellenos', baseDimension: 'mass', purchase: { description: 'Libra', quantity: 1, unit: 'lb', priceCents: Q(35) } },
	{ globalId: 'gelatina-sin-sabor', name: 'Gelatina sin sabor', aliases: ['grenetina', 'colapez'], category: 'rellenos', baseDimension: 'mass', purchase: { description: 'Onza', quantity: 1, unit: 'oz', priceCents: Q(9) } },
	{ globalId: 'galleta-maria', name: 'Galleta María', category: 'rellenos', baseDimension: 'mass', purchase: { description: 'Paquete 200 g', quantity: 200, unit: 'g', priceCents: Q(7) } },

	// ---------- Decoración ----------
	{ globalId: 'chispas-colores', name: 'Chispas de colores', aliases: ['sprinkles', 'grageas', 'confeti'], category: 'decoracion', baseDimension: 'mass', purchase: { description: 'Frasco 100 g', quantity: 100, unit: 'g', priceCents: Q(15) } },
	{ globalId: 'perlas-azucar', name: 'Perlas de azúcar', category: 'decoracion', baseDimension: 'mass', purchase: { description: 'Frasco 100 g', quantity: 100, unit: 'g', priceCents: Q(20) } },

	// ---------- Empaque (por pieza) ----------
	{ globalId: 'caja-pastel', name: 'Caja para pastel', aliases: ['caja de cartón', 'caja 10"'], category: 'empaque', baseDimension: 'piece', purchase: { description: 'Unidad', quantity: 1, unit: 'pza', priceCents: Q(8) } },
	{ globalId: 'base-pastel', name: 'Base de cartón para pastel', aliases: ['disco', 'cake board'], category: 'empaque', baseDimension: 'piece', purchase: { description: 'Unidad', quantity: 1, unit: 'pza', priceCents: Q(4) } },
	{ globalId: 'capacillo', name: 'Capacillo para cupcake', aliases: ['pirotín', 'molde de papel'], category: 'empaque', baseDimension: 'piece', purchase: { description: 'Paquete de 100', quantity: 100, unit: 'pza', priceCents: Q(12) } },
	{ globalId: 'caja-cupcakes', name: 'Caja para 6 cupcakes', category: 'empaque', baseDimension: 'piece', purchase: { description: 'Unidad', quantity: 1, unit: 'pza', priceCents: Q(7) } },
	{ globalId: 'vaso-postre', name: 'Vaso para postre con tapa', aliases: ['vaso 9 oz', 'vaso 12 oz', 'vaso shot'], category: 'empaque', baseDimension: 'piece', purchase: { description: 'Paquete de 50', quantity: 50, unit: 'pza', priceCents: Q(60) } },
	{ globalId: 'cuchara-desechable', name: 'Cuchara desechable', category: 'empaque', baseDimension: 'piece', purchase: { description: 'Paquete de 100', quantity: 100, unit: 'pza', priceCents: Q(15) } },
	{ globalId: 'molde-pie-desechable', name: 'Molde de pie desechable', aliases: ['molde de aluminio'], category: 'empaque', baseDimension: 'piece', purchase: { description: 'Unidad', quantity: 1, unit: 'pza', priceCents: Q(3) } },
	{ globalId: 'bolsa-celofan', name: 'Bolsa de celofán', category: 'empaque', baseDimension: 'piece', purchase: { description: 'Paquete de 100', quantity: 100, unit: 'pza', priceCents: Q(18) } },
	{ globalId: 'papel-hornear', name: 'Papel para hornear', aliases: ['papel encerado', 'papel manteca'], category: 'empaque', baseDimension: 'piece', purchase: { description: 'Rollo (≈ 20 usos)', quantity: 20, unit: 'pza', priceCents: Q(25) }, note: 'Se costea por "uso": una bandeja forrada = 1 pza.' },
	{ globalId: 'manga-desechable', name: 'Manga pastelera desechable', category: 'empaque', baseDimension: 'piece', purchase: { description: 'Paquete de 100', quantity: 100, unit: 'pza', priceCents: Q(45) } },

	// ---------- Otros ----------
	{ globalId: 'agua', name: 'Agua', category: 'otros', baseDimension: 'volume', densityGPerMl: 1, purchase: { description: 'Garrafón 5 gal (18.9 L)', quantity: 18.9, unit: 'l', priceCents: Q(18) } },
	{ globalId: 'gas-propano', name: 'Gas propano (uso)', category: 'otros', baseDimension: 'piece', purchase: { description: 'Cilindro 25 lb (≈ 60 h de horno)', quantity: 60, unit: 'pza', priceCents: Q(115) }, note: 'Cada pza = 1 hora de horno. Alternativa a prorratear como gasto fijo.' }
];

/** Búsqueda tolerante para el autocompletado: nombre, alias, sin tildes. */
export function searchCatalog(query: string, limit = 8): CatalogEntry[] {
	const q = normalize(query);
	if (!q) return [];
	const scored = GT_CATALOG.map((e) => {
		const names = [e.name, ...(e.aliases ?? [])].map(normalize);
		let score = 0;
		for (const n of names) {
			if (n === q) score = Math.max(score, 100);
			else if (n.startsWith(q)) score = Math.max(score, 80);
			else if (n.split(' ').some((w) => w.startsWith(q))) score = Math.max(score, 60);
			else if (n.includes(q)) score = Math.max(score, 40);
		}
		return { e, score };
	})
		.filter((x) => x.score > 0)
		.sort((a, b) => b.score - a.score || a.e.name.localeCompare(b.e.name, 'es'));
	return scored.slice(0, limit).map((x) => x.e);
}

export function normalize(s: string): string {
	return s
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9ñ\s]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}
