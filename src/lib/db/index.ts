import Dexie, { type EntityTable } from 'dexie';
import type { Ingredient, Purchase, Recipe, CostingSettings } from '$lib/costing';
import { DEFAULT_SETTINGS } from '$lib/costing';

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
}

export class CosteoDB extends Dexie {
	business!: EntityTable<Business, 'id'>;
	ingredients!: EntityTable<IngredientRow, 'id'>;
	purchases!: EntityTable<PurchaseRow, 'id'>;
	recipes!: EntityTable<RecipeRow, 'id'>;

	constructor() {
		super('costeo');
		this.version(1).stores({
			business: 'id',
			ingredients: 'id, businessId, name, globalId, updatedAt',
			purchases: 'id, businessId, ingredientId, [ingredientId+active], date, updatedAt',
			recipes: 'id, businessId, name, kind, updatedAt'
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
