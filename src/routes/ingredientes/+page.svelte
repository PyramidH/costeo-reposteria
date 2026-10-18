<script lang="ts">
	import { store } from '#lib/data/store.svelte.ts';
	import { normalize, CATEGORY_LABELS, type CatalogCategory } from '#lib/catalog/gt.ts';
	import { formatMoney } from '#lib/costing';
	import Sheet from '#lib/ui/Sheet.svelte';
	import IngredientPicker, { type Pick } from '#lib/ui/IngredientPicker.svelte';
	import { goto } from '$app/navigation';
	import { href as h, basePrefix } from '#lib/ui/href.ts';

	let q = $state('');
	let picker = $state(false);

	const nq = $derived(normalize(q));
	const rows = $derived(nq ? store.ingredients.filter((i) => normalize(i.name).includes(nq)) : store.ingredients);

	const grouped = $derived.by(() => {
		const m = new Map<string, typeof rows>();
		for (const i of rows) {
			const k = i.category ?? 'otros';
			if (!m.has(k)) m.set(k, []);
			m.get(k)!.push(i);
		}
		return [...m.entries()].sort((a, b) => label(a[0]).localeCompare(label(b[0]), 'es'));
	});
	const label = (k: string) => CATEGORY_LABELS[k as CatalogCategory] ?? 'Otros';

	async function onPick(p: Pick) {
		picker = false;
		if (p.type === 'ingredient') goto(h(`/ingredientes/${p.id}`));
		else if (p.type === 'catalog') goto(h(`/ingredientes/${await store.importFromCatalog(p.entry)}`));
		else if (p.type === 'new') goto(h(`/ingredientes/${await store.addIngredient({ name: p.name, baseDimension: 'mass' })}`));
	}
</script>

<div class="page">
	<div class="page-head">
		<h1>Ingredientes</h1>
		<button class="btn btn-primary" onclick={() => (picker = true)}>Agregar</button>
	</div>

	{#if store.ingredients.length > 6}
		<input class="input" type="search" placeholder="Buscar" bind:value={q} style="margin-bottom: 16px" />
	{/if}

	{#if !store.ingredients.length}
		<div class="empty">
			<h2>Aquí viven tus precios</h2>
			<p>Cada ingrediente guarda cómo lo compras y a cuánto. Cuando sube el huevo, lo cambias aquí y todas tus recetas se actualizan.</p>
			<button class="btn btn-primary" style="margin-top: 24px" onclick={() => (picker = true)}>Agregar ingrediente</button>
		</div>
	{:else}
		{#each grouped as [cat, items] (cat)}
			<h2 class="cat">{label(cat)}</h2>
			<div class="list" style="margin-bottom: 20px">
				{#each items as i (i.id)}
					{@const p = store.activePurchases.get(i.id)}
					<a href={h(`/ingredientes/${i.id}`)} class="list-item">
						<span class="grow">{i.name}</span>
						{#if p}
							<span class="small muted">{formatMoney(p.priceCents)} / {p.description ?? `${p.quantity} ${p.unit}`}</span>
						{:else}
							<span class="tag tag-warn">sin precio</span>
						{/if}
					</a>
				{/each}
			</div>
		{/each}
	{/if}
</div>

<Sheet bind:open={picker} title="Agregar ingrediente">
	{#if picker}<IngredientPicker onpick={onPick} allowRecipes={false} />{/if}
</Sheet>

<style>
	.cat {
		font-family: var(--font-ui);
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--ink-2);
		margin-bottom: 2px;
	}
</style>
