import { liveQuery } from 'dexie';
import { db, ensureBusiness, LOCAL_BUSINESS_ID, newId, now, type Business, type IngredientRow, type PurchaseRow, type RecipeRow, type Quote } from '#lib/db';
import type { CostingContext, Ingredient, Purchase, Recipe, UnitCode } from '#lib/costing';
import { costRecipe, DEFAULT_SETTINGS, type CostBreakdown } from '#lib/costing';
import type { CatalogEntry } from '#lib/catalog/gt.ts';

/** IndexedDB no puede clonar proxies de $state: siempre se escribe una copia plana. */
const plain = <T>(x: T): T => JSON.parse(JSON.stringify(x));

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
	quotes = $state<Quote[]>([]);
	ready = $state(false);

	private started = false;

	start() {
		if (this.started) return;
		this.started = true;
		void this.recoverJournal();
		// Ajustes nuevos en versiones posteriores toman su valor por defecto.
		const withDefaults = (b: Business): Business => ({ ...b, settings: { ...DEFAULT_SETTINGS, ...b.settings } });
		ensureBusiness().then((b) => (this.business = withDefaults(b)));
		liveQuery(() => db.business.get(LOCAL_BUSINESS_ID)).subscribe((b) => {
			if (b) this.business = withDefaults(b);
		});
		liveQuery(() => db.ingredients.filter((i) => !i.deletedAt).toArray()).subscribe((rows) => {
			this.ingredients = rows.sort((a, b) => a.name.localeCompare(b.name, 'es'));
		});
		liveQuery(() => db.purchases.filter((p) => !p.deletedAt).toArray()).subscribe((rows) => {
			this.purchases = rows;
		});
		liveQuery(() => db.quotes.filter((q) => !q.deletedAt).toArray()).subscribe((rows) => {
			this.quotes = rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
		});
		liveQuery(() => db.recipes.filter((r) => !r.deletedAt).toArray()).subscribe((rows) => {
			this.recipes = rows.sort((a, b) => a.name.localeCompare(b.name, 'es'));
			this.ready = true;
		});
	}

	/**
	 * Diario de borrador: copia síncrona del último estado del editor en
	 * localStorage. Si la pestaña se cierra antes de que IndexedDB confirme el
	 * autoguardado, aquí se recupera al siguiente arranque.
	 */
	static JOURNAL = 'costeo.draft';
	journalWrite(r: Recipe) {
		try {
			localStorage.setItem(AppStore.JOURNAL, JSON.stringify({ at: now(), recipe: r }));
		} catch {
			/* sin localStorage: no pasa nada */
		}
	}
	journalClear() {
		try {
			localStorage.removeItem(AppStore.JOURNAL);
		} catch {
			/* ignorar */
		}
	}
	private async recoverJournal() {
		try {
			const raw = localStorage.getItem(AppStore.JOURNAL);
			if (!raw) return;
			const { at, recipe } = JSON.parse(raw) as { at: string; recipe: Recipe };
			const existing = await db.recipes.get(recipe.id);
			if (!existing || existing.updatedAt < at) {
				await db.recipes.put({ ...recipe, name: recipe.name?.trim() || 'Receta sin nombre', businessId: LOCAL_BUSINESS_ID, updatedAt: at, deletedAt: null });
			}
		} catch {
			/* diario corrupto: se descarta */
		} finally {
			this.journalClear();
		}
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
		await db.business.put(plain({ ...this.business, ...patch, updatedAt: now() }));
	}

	async addIngredient(data: Omit<Ingredient, 'id'>, purchase?: Omit<Purchase, 'id' | 'ingredientId' | 'date' | 'active'>) {
		const id = newId();
		await db.transaction('rw', db.ingredients, db.purchases, async () => {
			await db.ingredients.add({ ...plain(data), id, businessId: LOCAL_BUSINESS_ID, updatedAt: now(), deletedAt: null });
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
		await db.ingredients.update(id, { ...plain(patch), updatedAt: now() });
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
		await db.recipes.put({ ...plain(r), businessId: LOCAL_BUSINESS_ID, updatedAt: now(), deletedAt: null });
	}

	async deleteRecipe(id: string) {
		await db.recipes.update(id, { deletedAt: now(), updatedAt: now() });
	}

	async saveQuote(q: Omit<Quote, 'businessId' | 'updatedAt' | 'deletedAt'>) {
		// IndexedDB no puede clonar proxies de $state: se guarda una copia plana.
		await db.quotes.put({ ...plain(q), businessId: LOCAL_BUSINESS_ID, updatedAt: now(), deletedAt: null });
	}
	async deleteQuote(id: string) {
		await db.quotes.update(id, { deletedAt: now(), updatedAt: now() });
	}

	/** Recetas que usan esta receta como sub-receta (para impedir borrar). */
	usedBy(recipeId: string) {
		return this.recipes.filter((r) => r.lines.some((l) => l.kind === 'subrecipe' && l.recipeId === recipeId));
	}
}

export const store = new AppStore();
