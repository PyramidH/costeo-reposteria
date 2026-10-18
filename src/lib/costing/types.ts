/**
 * Tipos del dominio de costeo.
 *
 * Convenciones:
 * - Dinero: enteros en centavos (`Cents`). Nunca floats para montos.
 * - Cantidades físicas: números en la unidad indicada; internamente se
 *   convierten a unidad base (g, ml, pza).
 * - Todo lo que se persiste lleva `id` UUID generado en el cliente.
 */

export type Cents = number;

export type Dimension = 'mass' | 'volume' | 'piece';

/** Unidades soportadas en v1. `g`/`ml`/`pza` son las bases internas. */
export type UnitCode =
	| 'g'
	| 'kg'
	| 'oz'
	| 'lb'
	| 'ml'
	| 'l'
	| 'taza'
	| 'cda'
	| 'cdta'
	| 'pza';

export interface UnitDef {
	code: UnitCode;
	dimension: Dimension;
	/** Factor a unidad base de su dimensión (g, ml o pza). */
	toBase: number;
	label: string;
	plural: string;
}

export interface Ingredient {
	id: string;
	name: string;
	/** Dimensión en la que se compra y se costea el ingrediente. */
	baseDimension: Dimension;
	/**
	 * Para ingredientes por pieza: masa aproximada de una pieza en gramos.
	 * Permite usar "6 oz de huevo" o "3 huevos" indistintamente.
	 */
	massPerPieceG?: number;
	/** Densidad en g/ml para convertir volumen↔masa (opcional, v2). */
	densityGPerMl?: number;
	/** Merma por defecto en porcentaje (0–100). */
	defaultWastePct?: number;
	category?: string;
	/** Referencia al ingrediente canónico del catálogo global (si aplica). */
	globalId?: string;
}

/**
 * Presentación de compra: "barra de 250 g a Q12", "cartón de 30 huevos a Q45".
 * Un ingrediente puede tener varias; se costea con la activa.
 * Cada cambio de precio crea un registro nuevo (historial implícito).
 */
export interface Purchase {
	id: string;
	ingredientId: string;
	description?: string;
	quantity: number;
	unit: UnitCode;
	priceCents: Cents;
	/** ISO date */
	date: string;
	supplier?: string;
	active: boolean;
}

export type RecipeKind = 'base' | 'product';

export type RecipeLine =
	| {
			kind: 'ingredient';
			id: string;
			ingredientId: string;
			quantity: number;
			unit: UnitCode;
			/** Sobrescribe la merma por defecto del ingrediente (0–100). */
			wastePct?: number;
	  }
	| {
			/** "Al gusto": no hay cantidad medible, se estima un costo fijo. */
			kind: 'estimate';
			id: string;
			ingredientId?: string;
			label: string;
			costCents: Cents;
	  }
	| {
			kind: 'subrecipe';
			id: string;
			recipeId: string;
			quantity: number;
			/**
			 * Unidad de la cantidad. `'yield'` = fracción del rendimiento de la
			 * sub-receta (0.5 = la mitad). Si es una UnitCode, la sub-receta debe
			 * tener rendimiento en una unidad de la misma dimensión.
			 */
			unit: UnitCode | 'yield';
	  };

/** Costo adicional por lote: empaque, moldes desechables, decoración comprada. */
export interface ExtraCost {
	id: string;
	label: string;
	costCents: Cents;
	/** Si es por unidad producida (empaque) en vez de por lote. */
	perUnit?: boolean;
}

export interface Recipe {
	id: string;
	name: string;
	kind: RecipeKind;
	lines: RecipeLine[];
	extras: ExtraCost[];
	/** Cuántas unidades produce la receta completa. */
	yieldQty: number;
	/**
	 * En qué está expresado el rendimiento. Una UnitCode (g, oz, ml, pza) permite
	 * usar la receta como sub-receta por cantidad; una etiqueta libre
	 * ("porción", "cupcake", "vaso") solo permite usarla por fracción.
	 */
	yieldUnit: UnitCode | string;
	/** Tiempo de elaboración del lote completo, en minutos. */
	laborMinutes: number;
	/** Margen deseado sobre el precio (0–100). Si falta, usa el del negocio. */
	marginPct?: number;
	notes?: string;
}

export interface CostingSettings {
	/** Gramos por libra: 460 (libra de mercado en Guatemala) o 453.592. */
	lbGrams: number;
	/** Valor de la hora de trabajo propio. */
	hourlyRateCents: Cents;
	/** Gastos fijos del mes (gas, luz, renta, internet…). */
	monthlyFixedCents: Cents;
	/** Minutos de producción estimados al mes, base para prorratear fijos. */
	monthlyProductionMinutes: number;
	defaultMarginPct: number;
	includeLabor: boolean;
	includeOverhead: boolean;
	includeWaste: boolean;
}

export const DEFAULT_SETTINGS: CostingSettings = {
	lbGrams: 460,
	hourlyRateCents: 2000,
	monthlyFixedCents: 0,
	monthlyProductionMinutes: 80 * 60,
	defaultMarginPct: 40,
	includeLabor: false,
	includeOverhead: false,
	includeWaste: false
};

export interface LineCost {
	lineId: string;
	label: string;
	costCents: Cents;
	/** Descripción legible del cálculo, para mostrar en el desglose. */
	detail: string;
}

export interface CostBreakdown {
	recipeId: string;
	ingredientsCents: Cents;
	extrasCents: Cents;
	laborCents: Cents;
	overheadCents: Cents;
	totalCents: Cents;
	yieldQty: number;
	perUnitCents: Cents;
	lines: LineCost[];
	warnings: string[];
}

/** Repositorio mínimo que el motor necesita para resolver referencias. */
export interface CostingContext {
	ingredients: Map<string, Ingredient>;
	/** Compra activa por ingrediente. */
	purchases: Map<string, Purchase>;
	recipes: Map<string, Recipe>;
	settings: CostingSettings;
}
