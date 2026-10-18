import Dexie, { type EntityTable } from 'dexie';
import type { Ingredient, Purchase, Recipe, CostingSettings } from '#lib/costing';
import { DEFAULT_SETTINGS } from '#lib/costing';

/**
 * Campos de sincronización que llevan todas las entidades persistidas.
 * Last-write-wins por registro, borrado lógico.
 */
export interface Synced {
	businessId: string;
	updatedAt: string; // ISO
	deletedAt?: string | null;
}

export type IngredientRow = Ingredient & Synced;
export type PurchaseRow = Purchase & Synced;
export type RecipeRow = Recipe & Synced;

export interface Business extends Synced {
	id: string;
	name: string;
	currency: string; // ISO 4217
	settings: CostingSettings;
	/** Teléfono o @ que va al pie de las cotizaciones (opcional). */
	contact?: string;
	/** Porcentaje de anticipo habitual (0–100). */
	depositPct?: number;
}

export interface QuoteLine {
	recipeId: string;
	name: string;
	unitName: string;
	qty: number;
	unitPriceCents: number;
}

export interface Quote extends Synced {
	id: string;
	client?: string;
	deliveryDate?: string; // ISO date
	lines: QuoteLine[];
	totalCents: number;
	depositPct: number;
	notes?: string;
	createdAt: string;
}

export class CosteoDB extends Dexie {
	business!: EntityTable<Business, 'id'>;
	ingredients!: EntityTable<IngredientRow, 'id'>;
	purchases!: EntityTable<PurchaseRow, 'id'>;
	recipes!: EntityTable<RecipeRow, 'id'>;
	quotes!: EntityTable<Quote, 'id'>;

	constructor() {
		super('costeo');
		this.version(1).stores({
			business: 'id',
			ingredients: 'id, businessId, name, globalId, updatedAt',
			purchases: 'id, businessId, ingredientId, [ingredientId+active], date, updatedAt',
			recipes: 'id, businessId, name, kind, updatedAt'
		});
		// v2: cotizaciones. Las tablas anteriores no cambian.
		this.version(2).stores({
			quotes: 'id, businessId, createdAt, client, updatedAt'
		});
	}
}

export const db = new CosteoDB();

export const LOCAL_BUSINESS_ID = 'local';

/** Garantiza que exista el negocio local (modo sin cuenta). */
export async function ensureBusiness(): Promise<Business> {
	const existing = await db.business.get(LOCAL_BUSINESS_ID);
	if (existing) return existing;
	const b: Business = {
		id: LOCAL_BUSINESS_ID,
		businessId: LOCAL_BUSINESS_ID,
		name: 'Mi negocio',
		currency: 'GTQ',
		settings: { ...DEFAULT_SETTINGS },
		updatedAt: new Date().toISOString(),
		deletedAt: null
	};
	await db.business.put(b);
	return b;
}

export function newId(): string {
	return crypto.randomUUID();
}

export function now(): string {
	return new Date().toISOString();
}

export interface Backup {
	app: 'costeo';
	schema: number;
	exportedAt: string;
	business: Business[];
	ingredients: IngredientRow[];
	purchases: PurchaseRow[];
	recipes: RecipeRow[];
	quotes?: Quote[];
}

export async function exportAll(): Promise<Backup> {
	const [business, ingredients, purchases, recipes, quotes] = await Promise.all([
		db.business.toArray(),
		db.ingredients.toArray(),
		db.purchases.toArray(),
		db.recipes.toArray(),
		db.quotes.toArray()
	]);
	return { app: 'costeo', schema: db.verno, exportedAt: now(), business, ingredients, purchases, recipes, quotes };
}

/** Reemplaza todo el contenido local con el respaldo. Valida la forma mínima. */
export async function importAll(data: unknown) {
	const b = data as Partial<Backup>;
	if (!b || b.app !== 'costeo' || !Array.isArray(b.recipes) || !Array.isArray(b.ingredients) || !Array.isArray(b.purchases))
		throw new Error('el archivo no es un respaldo de Costeo');
	await db.transaction('rw', db.business, db.ingredients, db.purchases, db.recipes, db.quotes, async () => {
		await Promise.all([db.business.clear(), db.ingredients.clear(), db.purchases.clear(), db.recipes.clear(), db.quotes.clear()]);
		if (b.business?.length) await db.business.bulkPut(b.business);
		await db.ingredients.bulkPut(b.ingredients!);
		await db.purchases.bulkPut(b.purchases!);
		await db.recipes.bulkPut(b.recipes!);
		if (b.quotes?.length) await db.quotes.bulkPut(b.quotes);
	});
	return { recipes: b.recipes.length, ingredients: b.ingredients.length };
}
