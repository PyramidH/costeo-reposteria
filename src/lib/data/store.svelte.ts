import { liveQuery } from 'dexie';
import { db, ensureBusiness, LOCAL_BUSINESS_ID, newId, now, type Business, type IngredientRow, type PurchaseRow, type RecipeRow } from '#lib/db';
import type { CostingContext, Ingredient, Purchase, Recipe, UnitCode } from '#lib/costing';
import { costRecipe, type CostBreakdown } from '#lib/costing';
import type { CatalogEntry } from '#lib/catalog/gt.ts';

/**
 * Estado reactivo de la app sobre Dexie.liveQuery.
 * Los datos de un negocio son pequeños (decenas de recetas, cientos de
 * ingredientes), así que se cargan completos y el costeo es síncrono.
 */
class AppStore {
	business = $state<Business | null>(null);
	ingredients = $state<IngredientRow[]>([]);
	purchases = $state<PurchaseRow[]>([]);
	recipes = $state<RecipeRow[]>([]);
	ready = $state(false);

	private started = false;

	start() {
		if (this.started) return;
		this.started = true;
		ensureBusiness().then((b) => (this.business = b));
		liveQuery(() => db.business.get(LOCAL_BUSINESS_ID)).subscribe((b) => {
			if (b) this.business = b;
		});
		liveQuery(() => db.ingredients.filter((i) => !i.deletedAt).toArray()).subscribe((rows) => {
			this.ingredients = rows.sort((a, b) => a.name.localeCompare(b.name, 'es'));
		});
		liveQuery(() => db.purchases.filter((p) => !p.deletedAt).toArray()).subscribe((rows) => {
			this.purchases = rows;
		});
		liveQuery(() => db.recipes.filter((r) => !r.deletedAt).toArray()).subscribe((rows) => {
			this.recipes = rows.sort((a, b) => a.name.localeCompare(b.name, 'es'));
			this.ready = true;
		});
	}

	// ---------- Derivados ----------

	/** Compra activa por ingrediente (la más reciente marcada activa). */
	activePurchases = $derived.by(() => {
		const map = new Map<string, PurchaseRow>();
		for (const p of this.purchases) {
			if (!p.active) continue;
			const cur = map.get(p.ingredientId);
			if (!cur || p.date > cur.date || (p.date === cur.date && p.updatedAt > cur.updatedAt)) map.set(p.ingredientId, p);
		}
		return map;
	});

	ctx = $derived.by<CostingContext | null>(() => {
		if (!this.business) return null;
		return {
			ingredients: new Map(this.ingredients.map((i) => [i.id, i])),
			purchases: this.activePurchases as Map<string, Purchase>,
			recipes: new Map(this.recipes.map((r) => [r.id, r])),
			settings: this.business.settings
		};
	});

	cost(recipeId: string): CostBreakdown | { error: string } {
		if (!this.ctx) return { error: 'cargando' };
		try {
			return costRecipe(recipeId, this.ctx);
		} catch (e) {
			return { error: e instanceof Error ? e.message : String(e) };
		}
	}

	/** Costea una receta aún no guardada (editor en vivo). */
	costDraft(draft: Recipe): CostBreakdown | { error: string } {
		if (!this.ctx) return { error: 'cargando' };
		const recipes = new Map(this.ctx.recipes);
		recipes.set(draft.id, draft);
		try {
			return costRecipe(draft.id, { ...this.ctx, recipes });
		} catch (e) {
			return { error: e instanceof Error ? e.message : String(e) };
		}
	}

	ingredient(id: string) {
		return this.ingredients.find((i) => i.id === id);
	}
	recipe(id: string) {
		return this.recipes.find((r) => r.id === id);
	}

	// ---------- Mutaciones ----------

	async saveBusiness(patch: Partial<Business>) {
		if (!this.business) return;
		await db.business.put({ ...this.business, ...patch, updatedAt: now() });
	}

	async addIngredient(data: Omit<Ingredient, 'id'>, purchase?: Omit<Purchase, 'id' | 'ingredientId' | 'date' | 'active'>) {
		const id = newId();
		await db.transaction('rw', db.ingredients, db.purchases, async () => {
			await db.ingredients.add({ ...data, id, businessId: LOCAL_BUSINESS_ID, updatedAt: now(), deletedAt: null });
			if (purchase) await this.setPrice(id, purchase);
		});
		return id;
	}

	/** Importa una entrada del catálogo global como ingrediente local (si no existe ya). */
	async importFromCatalog(entry: CatalogEntry): Promise<string> {
		const existing = this.ingredients.find((i) => i.globalId === entry.globalId);
		if (existing) return existing.id;
		return this.addIngredient(
			{
				name: entry.name,
				baseDimension: entry.baseDimension,
				massPerPieceG: entry.massPerPieceG,
				densityGPerMl: entry.densityGPerMl,
				defaultWastePct: entry.defaultWastePct,
				category: entry.category,
				globalId: entry.globalId
			},
			entry.purchase
		);
	}

	async updateIngredient(id: string, patch: Partial<Ingredient>) {
		await db.ingredients.update(id, { ...patch, updatedAt: now() });
	}

	async deleteIngredient(id: string) {
		await db.ingredients.update(id, { deletedAt: now(), updatedAt: now() });
	}

	/** Registra un precio nuevo; desactiva los anteriores (historial implícito). */
	async setPrice(ingredientId: string, p: { description?: string; quantity: number; unit: UnitCode; priceCents: number; supplier?: string }) {
		await db.transaction('rw', db.purchases, async () => {
			const prev = await db.purchases.where('ingredientId').equals(ingredientId).toArray();
			for (const x of prev) if (x.active) await db.purchases.update(x.id, { active: false, updatedAt: now() });
			await db.purchases.add({
				id: newId(),
				ingredientId,
				...p,
				date: now().slice(0, 10),
				active: true,
				businessId: LOCAL_BUSINESS_ID,
				updatedAt: now(),
				deletedAt: null
			});
		});
	}

	priceHistory(ingredientId: string) {
		return this.purchases.filter((p) => p.ingredientId === ingredientId).sort((a, b) => b.date.localeCompare(a.date));
	}

	async saveRecipe(r: Recipe) {
		await db.recipes.put({ ...r, businessId: LOCAL_BUSINESS_ID, updatedAt: now(), deletedAt: null });
	}

	async deleteRecipe(id: string) {
		await db.recipes.update(id, { deletedAt: now(), updatedAt: now() });
	}

	/** Recetas que usan esta receta como sub-receta (para impedir borrar). */
	usedBy(recipeId: string) {
		return this.recipes.filter((r) => r.lines.some((l) => l.kind === 'subrecipe' && l.recipeId === recipeId));
	}
}

export const store = new AppStore();
