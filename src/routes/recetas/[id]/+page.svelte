<script lang="ts">
	import { page } from '$app/state';
	import { goto, replaceState } from '$app/navigation';
	import { href as h, basePrefix } from '#lib/ui/href.ts';
	import { untrack } from 'svelte';
	import { store } from '#lib/data/store.svelte.ts';
	import { newId } from '#lib/db';
	import type { Recipe, RecipeLine, ExtraCost, UnitCode } from '#lib/costing';
	import Money from '#lib/ui/Money.svelte';
	import MoneyInput from '#lib/ui/MoneyInput.svelte';
	import QtyInput from '#lib/ui/QtyInput.svelte';
	import Sheet from '#lib/ui/Sheet.svelte';
	import IngredientPicker, { type Pick } from '#lib/ui/IngredientPicker.svelte';
	import CostPanel from '#lib/ui/CostPanel.svelte';
	import { unitsFor, UNIT_LABELS } from '#lib/ui/units-for.ts';
	import { isUnitCode } from '#lib/costing';

	const isNew = $derived(page.params.id === 'nueva');

	let draft = $state<Recipe>({
		id: newId(),
		name: '',
		kind: 'product',
		lines: [],
		extras: [],
		yieldQty: 0,
		yieldUnit: '',
		laborMinutes: 0
	});
	let loaded = $state(false);
	let picker = $state(false);
	let newIngName = $state<string | null>(null);
	let tab = $state<'receta' | 'precio'>('receta');
	let yieldText = $state('');

	// Cargar receta existente (una vez que el store esté listo).
	$effect(() => {
		if (loaded || !store.ready) return;
		if (isNew) {
			loaded = true;
			return;
		}
		const r = store.recipe(page.params.id!);
		if (r) {
			const { businessId, updatedAt, deletedAt, ...rest } = r;
			draft = structuredClone($state.snapshot(rest)) as Recipe;
			yieldText = draft.yieldUnit;
		}
		loaded = true;
	});

	// Autosave con retardo cuando hay nombre.
	let saveTimer: ReturnType<typeof setTimeout> | undefined;
	let savedOnce = $state(page.params.id !== 'nueva');
	$effect(() => {
		const snap = $state.snapshot(draft);
		if (!loaded) return;
		untrack(() => {
			if (!snap.name.trim()) return;
			clearTimeout(saveTimer);
			saveTimer = setTimeout(async () => {
				await store.saveRecipe(snap);
				if (!savedOnce) {
					savedOnce = true;
					replaceState(h(`/recetas/${snap.id}`), {});
				}
			}, 500);
		});
	});

	const cost = $derived(loaded ? store.costDraft(draft) : { error: 'cargando' });
	const canCost = $derived(draft.yieldQty > 0 && draft.lines.length > 0);

	// ---------- Líneas ----------

	async function onPick(p: Pick) {
		picker = false;
		if (p.type === 'ingredient') addIngredientLine(p.id, store.ingredient(p.id));
		else if (p.type === 'catalog') addIngredientLine(await store.importFromCatalog(p.entry), p.entry, p.entry.purchase.unit);
		else if (p.type === 'recipe') {
			const sub = store.recipe(p.id)!;
			draft.lines.push({ kind: 'subrecipe', id: newId(), recipeId: p.id, quantity: isUnitCode(sub.yieldUnit) ? sub.yieldQty : 1, unit: isUnitCode(sub.yieldUnit) ? sub.yieldUnit : 'yield' });
		} else if (p.type === 'estimate') draft.lines.push({ kind: 'estimate', id: newId(), label: p.label, costCents: 100 });
		else if (p.type === 'new') newIngName = p.name;
	}

	/** `like` evita depender de que liveQuery ya haya propagado un ingrediente recién creado. */
	function addIngredientLine(ingredientId: string, like?: Parameters<typeof unitsFor>[0], unit?: UnitCode) {
		const ing = like ?? store.ingredient(ingredientId);
		if (!ing) return;
		const allowed = unitsFor(ing);
		const preferred = unit ?? store.activePurchases.get(ingredientId)?.unit;
		draft.lines.push({ kind: 'ingredient', id: newId(), ingredientId, quantity: 1, unit: preferred && allowed.includes(preferred) ? preferred : allowed[0] });
	}

	function removeLine(id: string) {
		draft.lines = draft.lines.filter((l) => l.id !== id);
	}

	function lineLabel(l: RecipeLine) {
		if (l.kind === 'ingredient') return store.ingredient(l.ingredientId)?.name ?? '—';
		if (l.kind === 'subrecipe') return store.recipe(l.recipeId)?.name ?? '—';
		return l.label;
	}

	function lineCost(id: string) {
		if ('error' in cost) return null;
		return cost.lines.find((x) => x.lineId === id);
	}

	function subUnits(recipeId: string): (UnitCode | 'yield')[] {
		const sub = store.recipe(recipeId);
		if (!sub) return ['yield'];
		return isUnitCode(sub.yieldUnit) ? [sub.yieldUnit, 'yield'] : ['yield'];
	}

	// ---------- Nuevo ingrediente rápido ----------
	let ni = $state({ dim: 'mass' as 'mass' | 'volume' | 'piece', qty: 1, unit: 'lb' as UnitCode, priceCents: 0 });
	async function createIngredient() {
		if (!newIngName) return;
		const id = await store.addIngredient(
			{ name: newIngName, baseDimension: ni.dim },
			ni.priceCents > 0 ? { quantity: ni.qty, unit: ni.unit, priceCents: ni.priceCents } : undefined
		);
		newIngName = null;
		addIngredientLine(id, { baseDimension: ni.dim }, ni.unit);
	}
	$effect(() => {
		ni.unit = ni.dim === 'mass' ? 'lb' : ni.dim === 'volume' ? 'l' : 'pza';
	});

	// ---------- Extras ----------
	function addExtra() {
		draft.extras.push({ id: newId(), label: '', costCents: 0, perUnit: true });
	}
	function removeExtra(id: string) {
		draft.extras = draft.extras.filter((x) => x.id !== id);
	}

	async function remove() {
		const users = store.usedBy(draft.id);
		if (users.length) {
			alert(`No se puede borrar: la usan ${users.map((u) => u.name).join(', ')}.`);
			return;
		}
		if (!confirm(`¿Borrar “${draft.name}”?`)) return;
		await store.deleteRecipe(draft.id);
		goto(h(`/`));
	}
</script>

<div class="page editor">
	<div class="row" style="margin-bottom: 12px">
		<a href={h('/')} class="back" aria-label="Volver a recetas">
			<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
		</a>
		<input class="title" placeholder="Nombre de la receta" bind:value={draft.name} aria-label="Nombre de la receta" />
	</div>

	<div class="seg" role="tablist">
		<button role="tab" aria-selected={tab === 'receta'} class:on={tab === 'receta'} onclick={() => (tab = 'receta')}>Receta</button>
		<button role="tab" aria-selected={tab === 'precio'} class:on={tab === 'precio'} onclick={() => (tab = 'precio')} disabled={!canCost}>Costo y precio</button>
	</div>

	{#if tab === 'receta'}
		<div class="stack" style="gap: 20px">
			<div class="row">
				<label class="field grow">
					<span>Tipo</span>
					<select class="input" bind:value={draft.kind}>
						<option value="product">Producto que vendo</option>
						<option value="base">Receta base (masa, crema, relleno)</option>
					</select>
				</label>
			</div>

			<section>
				<div class="row" style="justify-content: space-between; margin-bottom: 4px">
					<h2>Ingredientes</h2>
					<button class="btn btn-ghost" onclick={() => (picker = true)}>+ Agregar</button>
				</div>
				{#if !draft.lines.length}
					<p class="hint">Agrega ingredientes, otras recetas tuyas (masa, crema) o cosas “al gusto”.</p>
				{:else}
					<div class="list">
						{#each draft.lines as l (l.id)}
							{@const lc = lineCost(l.id)}
							<div class="line">
								<div class="line-top">
									<span class="line-name grow">{lineLabel(l)}</span>
									{#if lc}<Money cents={lc.costCents} size="sm" />{/if}
									<button class="del" onclick={() => removeLine(l.id)} aria-label="Quitar">
										<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
									</button>
								</div>
								<div class="line-edit">
									{#if l.kind === 'ingredient'}
										{@const ing = store.ingredient(l.ingredientId)}
										<QtyInput bind:value={l.quantity} label="Cantidad" />
										<select class="input" bind:value={l.unit} aria-label="Unidad">
											{#each ing ? unitsFor(ing) : [l.unit] as u}<option value={u}>{UNIT_LABELS[u]}</option>{/each}
										</select>
									{:else if l.kind === 'subrecipe'}
										<QtyInput bind:value={l.quantity} label="Cantidad" />
										<select class="input" bind:value={l.unit} aria-label="Unidad">
											{#each subUnits(l.recipeId) as u}<option value={u}>{u === 'yield' ? 'veces la receta' : UNIT_LABELS[u]}</option>{/each}
										</select>
									{:else}
										<input class="input" bind:value={l.label} placeholder="Qué es" aria-label="Descripción" />
										<MoneyInput bind:cents={l.costCents} label="Costo estimado" />
									{/if}
								</div>
								{#if lc?.detail}<div class="small muted">{lc.detail}</div>{/if}
							</div>
						{/each}
					</div>
				{/if}
			</section>

			<section class="stack">
				<h2>Rendimiento</h2>
				<p class="hint">Lo que sale de esta receta completa. Es lo que define el costo por pieza.</p>
				<div class="row">
					<div class="field" style="width: 110px">
						<span>Cantidad</span>
						<QtyInput bind:value={draft.yieldQty} label="Cantidad que rinde" />
					</div>
					<label class="field grow">
						<span>De qué</span>
						<input
							class="input"
							list="yield-units"
							placeholder={draft.kind === 'base' ? 'g, oz, ml…' : 'porciones, cupcakes, vasos…'}
							bind:value={yieldText}
							oninput={() => (draft.yieldUnit = yieldText.trim())}
						/>
						<datalist id="yield-units">
							<option value="porciones"></option><option value="piezas"></option><option value="cupcakes"></option><option value="vasos"></option><option value="galletas"></option>
							<option value="g"></option><option value="oz"></option><option value="lb"></option><option value="ml"></option><option value="l"></option>
						</datalist>
					</label>
				</div>
				{#if draft.kind === 'base'}
					<p class="hint">Si la mides en g, oz, ml o L, otras recetas podrán usar “300 g de esta crema”. Si pones una palabra (“porciones”), solo podrán usar “media receta”.</p>
				{/if}
			</section>

			<section class="stack">
				<h2>Tiempo</h2>
				<label class="field">
					<span>Minutos de trabajo para toda la receta</span>
					<input class="input" type="number" min="0" inputmode="numeric" bind:value={draft.laborMinutes} placeholder="0" />
				</label>
				<p class="hint">Tu tiempo vale. Por ahora no se suma al costo; en “Costo y precio” puedes activarlo y ver cuánto cambia.</p>
			</section>

			<section class="stack">
				<div class="row" style="justify-content: space-between">
					<h2>Empaque y extras</h2>
					<button class="btn btn-ghost" onclick={addExtra}>+ Agregar</button>
				</div>
				{#if !draft.extras.length}
					<p class="hint">Cajas, vasos, capacillos, moldes desechables. Lo que nadie cuenta y sí cuesta.</p>
				{/if}
				{#each draft.extras as x (x.id)}
					<div class="line">
						<div class="line-edit extra">
							<input class="input" bind:value={x.label} placeholder="Caja, vaso, capacillo…" aria-label="Extra" />
							<MoneyInput bind:cents={x.costCents} label="Costo" />
							<select class="input" bind:value={x.perUnit} aria-label="Por unidad o por lote">
								<option value={true}>c/u</option>
								<option value={false}>lote</option>
							</select>
							<button class="del" onclick={() => removeExtra(x.id)} aria-label="Quitar">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
							</button>
						</div>
					</div>
				{/each}
			</section>

			{#if !isNew || savedOnce}
				<button class="btn btn-secondary" style="color: var(--fresa); align-self: flex-start" onclick={remove}>Borrar receta</button>
			{/if}
		</div>
	{:else if !('error' in cost)}
		<CostPanel recipe={draft} {cost} onMargin={(m) => (draft.marginPct = m)} />
	{/if}
</div>

<!-- Pie fijo: el número que importa -->
{#if tab === 'receta'}
	<div class="foot">
		<div class="foot-inner">
			{#if 'error' in cost}
				<span class="small muted">{draft.lines.length ? cost.error : 'Agrega ingredientes para ver el costo'}</span>
			{:else if !canCost}
				<div class="grow">
					<div class="small muted">Costo de la receta</div>
					<Money cents={cost.totalCents} size="lg" />
				</div>
				<span class="small muted">Pon el rendimiento para ver el costo por pieza</span>
			{:else}
				<div class="grow">
					<div class="small muted">Cada {draft.yieldUnit.replace(/s$/, '') || 'pieza'} te cuesta</div>
					<Money cents={cost.perUnitCents} size="xl" />
				</div>
				<button class="btn btn-primary" onclick={() => (tab = 'precio')}>¿Cuánto cobro?</button>
			{/if}
		</div>
	</div>
{/if}

<Sheet bind:open={picker} title="Agregar a la receta">
	{#if picker}<IngredientPicker onpick={onPick} excludeRecipeId={draft.id} />{/if}
</Sheet>

<Sheet open={newIngName !== null} title="Nuevo ingrediente">
	{#if newIngName !== null}
		<p><strong>{newIngName}</strong></p>
		<label class="field">
			<span>¿Cómo lo mides?</span>
			<select class="input" bind:value={ni.dim}>
				<option value="mass">Por peso (lb, oz, g)</option>
				<option value="volume">Por volumen (L, ml, tazas)</option>
				<option value="piece">Por pieza (unidades)</option>
			</select>
		</label>
		<div class="field">
			<span>¿Cómo lo compras y a cuánto?</span>
			<div class="row">
				<div style="width: 90px"><QtyInput bind:value={ni.qty} label="Cantidad" /></div>
				<select class="input" style="width: 90px" bind:value={ni.unit} aria-label="Unidad">
					{#each unitsFor({ baseDimension: ni.dim }) as u}<option value={u}>{UNIT_LABELS[u]}</option>{/each}
				</select>
				<div class="grow"><MoneyInput bind:cents={ni.priceCents} label="Precio" /></div>
			</div>
			<p class="hint">Puedes dejarlo sin precio y ponerlo después.</p>
		</div>
		<div class="row">
			<button class="btn btn-secondary grow" onclick={() => (newIngName = null)}>Cancelar</button>
			<button class="btn btn-primary grow" onclick={createIngredient}>Crear y agregar</button>
		</div>
	{/if}
</Sheet>

<style>
	.editor {
		padding-bottom: calc(var(--nav-h) + var(--safe-b) + 120px);
	}
	.back {
		width: 40px;
		height: 40px;
		display: grid;
		place-items: center;
		border-radius: 50%;
		color: var(--ink-2);
		margin-left: -8px;
	}
	.title {
		flex: 1;
		min-width: 0;
		border: 0;
		border-bottom: 2px solid var(--linea);
		padding: 6px 0;
		font-family: var(--font-money);
		font-size: 1.6rem;
		font-weight: 500;
		background: transparent;
	}
	.title:focus {
		outline: none;
		border-bottom-color: var(--fresa);
	}
	.seg {
		display: flex;
		background: var(--merengue);
		border-radius: 999px;
		padding: 4px;
		margin: 16px 0 20px;
	}
	.seg button {
		flex: 1;
		min-height: 40px;
		border-radius: 999px;
		font-weight: 600;
		color: var(--ink-2);
	}
	.seg button.on {
		background: var(--paper);
		color: var(--ink);
		box-shadow: 0 1px 3px rgba(43, 29, 21, 0.1);
	}
	.seg button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.line {
		padding: 12px 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.line-top {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.line-name {
		font-weight: 600;
	}
	.line-edit {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}
	.line-edit.extra {
		grid-template-columns: 1.4fr 1fr 80px 40px;
		align-items: center;
	}
	.del {
		width: 36px;
		height: 36px;
		display: grid;
		place-items: center;
		border-radius: 50%;
		color: var(--ink-3);
	}
	.del:hover {
		background: var(--fresa-suave);
		color: var(--fresa);
	}
	.foot {
		position: fixed;
		left: 0;
		right: 0;
		bottom: calc(var(--nav-h) + var(--safe-b));
		z-index: 9;
		background: var(--paper);
		border-top: 1px solid var(--linea);
	}
	.foot-inner {
		max-width: 480px;
		margin: 0 auto;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px;
		min-height: 84px;
	}
	.foot-inner :global(.money) {
		color: var(--fresa);
	}
</style>
