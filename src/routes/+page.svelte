<script lang="ts">
	import { store } from '#lib/data/store.svelte.ts';
	import Money from '#lib/ui/Money.svelte';
	import { priceFromMargin, roundPrice } from '#lib/costing';

	const products = $derived(store.recipes.filter((r) => r.kind === 'product'));
	const bases = $derived(store.recipes.filter((r) => r.kind === 'base'));

	function margin(r: { marginPct?: number }) {
		return r.marginPct ?? store.business?.settings.defaultMarginPct ?? 40;
	}
</script>

<div class="page">
	<div class="page-head">
		<h1>Recetas</h1>
		{#if store.recipes.length}
			<a href="/recetas/nueva" class="btn btn-primary">Nueva</a>
		{/if}
	</div>

	{#if !store.ready}
		<p class="muted">Cargando…</p>
	{:else if !store.recipes.length}
		<div class="empty">
			<h2>Empieza por lo que más vendes</h2>
			<p>Anota los ingredientes de una receta y te decimos cuánto te cuesta cada pieza y cuánto cobrar.</p>
			<a href="/recetas/nueva" class="btn btn-primary" style="margin-top: 24px">Crear mi primera receta</a>
		</div>
	{:else}
		{#snippet row(r: (typeof store.recipes)[number])}
			{@const c = store.cost(r.id)}
			<a href="/recetas/{r.id}" class="list-item">
				<div class="grow">
					<div class="name">{r.name}</div>
					{#if 'error' in c}
						<div class="small" style="color: var(--fresa)">{c.error}</div>
					{:else}
						<div class="small muted">
							Rinde {r.yieldQty} {r.yieldUnit} · cuesta <Money cents={c.perUnitCents} size="sm" /> c/u
							{#if c.warnings.length}<span class="tag tag-warn">sin precio</span>{/if}
						</div>
					{/if}
				</div>
				{#if !('error' in c) && r.kind === 'product'}
					<div class="price">
						<Money cents={roundPrice(priceFromMargin(c.perUnitCents, margin(r)))} size="md" />
						<span class="small muted">precio</span>
					</div>
				{/if}
			</a>
		{/snippet}

		{#if products.length}
			<div class="list">
				{#each products as r (r.id)}{@render row(r)}{/each}
			</div>
		{/if}

		{#if bases.length}
			<h2 class="sub">Recetas base</h2>
			<p class="hint" style="margin-bottom: 4px">Masas, cremas y rellenos que usas dentro de otras recetas.</p>
			<div class="list">
				{#each bases as r (r.id)}{@render row(r)}{/each}
			</div>
		{/if}
	{/if}
</div>

<style>
	.name {
		font-weight: 600;
	}
	.price {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		line-height: 1.1;
		color: var(--fresa);
	}
	.price .small {
		color: var(--ink-3);
	}
	.sub {
		margin-top: 32px;
		margin-bottom: 4px;
	}
</style>
