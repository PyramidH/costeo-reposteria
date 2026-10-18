<script lang="ts">
	import { GT_CATALOG, normalize, searchCatalog, type CatalogEntry } from '#lib/catalog/gt.ts';
	import { store } from '#lib/data/store.svelte.ts';
	import { formatMoney } from '#lib/costing';

	export type Pick =
		| { type: 'ingredient'; id: string }
		| { type: 'catalog'; entry: CatalogEntry }
		| { type: 'recipe'; id: string }
		| { type: 'estimate'; label: string }
		| { type: 'new'; name: string };

	let {
		onpick,
		excludeRecipeId,
		allowRecipes = true
	}: { onpick: (p: Pick) => void; excludeRecipeId?: string; allowRecipes?: boolean } = $props();

	let q = $state('');
	let input: HTMLInputElement;

	$effect(() => {
		input?.focus();
	});

	const nq = $derived(normalize(q));

	const localHits = $derived(
		nq
			? store.ingredients.filter((i) => normalize(i.name).includes(nq)).slice(0, 6)
			: store.ingredients.slice(0, 8)
	);
	const localGlobalIds = $derived(new Set(store.ingredients.map((i) => i.globalId).filter(Boolean)));
	const catalogHits = $derived(
		(nq ? searchCatalog(q, 8) : GT_CATALOG.slice(0, 0)).filter((e) => !localGlobalIds.has(e.globalId))
	);
	const recipeHits = $derived(
		allowRecipes
			? store.recipes.filter((r) => r.id !== excludeRecipeId && (!nq || normalize(r.name).includes(nq))).slice(0, 5)
			: []
	);
	const exactLocal = $derived(store.ingredients.some((i) => normalize(i.name) === nq));
</script>

<div class="picker stack">
	<input
		bind:this={input}
		class="input"
		type="search"
		placeholder="Busca: harina, huevo, vitina…"
		bind:value={q}
		autocomplete="off"
	/>

	{#if localHits.length}
		<section>
			<h3 class="sec">Mis ingredientes</h3>
			<div class="list">
				{#each localHits as i (i.id)}
					{@const p = store.activePurchases.get(i.id)}
					<button class="list-item" onclick={() => onpick({ type: 'ingredient', id: i.id })}>
						<span class="grow">{i.name}</span>
						{#if p}<span class="small muted">{formatMoney(p.priceCents)} / {p.description ?? `${p.quantity} ${p.unit}`}</span>{/if}
					</button>
				{/each}
			</div>
		</section>
	{/if}

	{#if catalogHits.length}
		<section>
			<h3 class="sec">Del catálogo <span class="muted small">precio de referencia, lo ajustas después</span></h3>
			<div class="list">
				{#each catalogHits as e (e.globalId)}
					<button class="list-item" onclick={() => onpick({ type: 'catalog', entry: e })}>
						<span class="grow">{e.name}</span>
						<span class="small muted">≈ {formatMoney(e.purchase.priceCents)} / {e.purchase.description}</span>
					</button>
				{/each}
			</div>
		</section>
	{/if}

	{#if recipeHits.length}
		<section>
			<h3 class="sec">Mis recetas (como sub-receta)</h3>
			<div class="list">
				{#each recipeHits as r (r.id)}
					<button class="list-item" onclick={() => onpick({ type: 'recipe', id: r.id })}>
						<span class="grow">{r.name}</span>
						<span class="tag">{r.kind === 'base' ? 'base' : 'producto'}</span>
					</button>
				{/each}
			</div>
		</section>
	{/if}

	<section class="list">
		{#if nq && !exactLocal}
			<button class="list-item" onclick={() => onpick({ type: 'new', name: q.trim() })}>
				<span class="grow">Crear ingrediente “{q.trim()}”</span>
				<span class="small muted">nuevo</span>
			</button>
		{/if}
		<button class="list-item" onclick={() => onpick({ type: 'estimate', label: q.trim() || 'Al gusto' })}>
			<span class="grow">Agregar “al gusto” {nq ? `(${q.trim()})` : ''}</span>
			<span class="small muted">costo estimado</span>
		</button>
	</section>
</div>

<style>
	.sec {
		font-family: var(--font-ui);
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--ink-2);
		margin: 8px 0 2px;
	}
	.sec .muted {
		font-weight: 400;
	}
	.list-item {
		padding: 11px 0;
	}
</style>
