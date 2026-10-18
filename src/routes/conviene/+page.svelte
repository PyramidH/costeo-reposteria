<script lang="ts">
	import { store } from '#lib/data/store.svelte.ts';
	import { href as h } from '#lib/ui/href.ts';
	import { singular } from '#lib/ui/words.ts';
	import { reverseQuote, roundPrice, formatMoney, priceFromMargin } from '#lib/costing';
	import QtyInput from '#lib/ui/QtyInput.svelte';
	import MoneyInput from '#lib/ui/MoneyInput.svelte';

	const products = $derived(store.recipes.filter((r) => r.kind === 'product'));
	let recipeId = $state('');
	let units = $state(0);
	let total = $state(0);

	$effect(() => {
		if (!recipeId && products.length) recipeId = products[0].id;
	});

	const recipe = $derived(store.recipe(recipeId));
	const cost = $derived(recipe ? store.cost(recipe.id) : null);
	const margin = $derived(recipe?.marginPct ?? store.business?.settings.defaultMarginPct ?? 40);
	const unitName = $derived(singular(recipe?.yieldUnit ?? ''));
	const rq = $derived(
		cost && !('error' in cost) && units > 0 && total > 0 ? reverseQuote(cost.perUnitCents, units, total, margin) : null
	);
	const suggestedTotal = $derived(cost && !('error' in cost) && units > 0 ? roundPrice(priceFromMargin(cost.perUnitCents, margin) * units) : null);
</script>

<div class="page">
	<div class="row" style="margin-bottom: 12px">
		<a href={h('/')} class="back" aria-label="Volver">
			<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
		</a>
		<h1>¿Me conviene este pedido?</h1>
	</div>
	<p class="hint" style="margin-bottom: 20px">Alguien te pide una cantidad y te ofrece un precio. Elige la receta y te decimos si te conviene, con el costo por pieza de esa receta.</p>

	{#if !products.length}
		<div class="empty">
			<h2>Primero una receta</h2>
			<p>Para saber si un pedido te conviene necesitamos saber cuánto te cuesta hacerlo.</p>
			<a href={h('/recetas/nueva')} class="btn btn-primary" style="margin-top: 20px">Crear receta</a>
		</div>
	{:else}
		<div class="stack" style="gap: 16px">
			<label class="field">
				<span>Receta</span>
				<select class="input" bind:value={recipeId}>
					{#each products as r (r.id)}<option value={r.id}>{r.name}</option>{/each}
				</select>
			</label>
			{#if cost && !('error' in cost)}
				<p class="hint">Cada {unitName} te cuesta <strong class="money">{formatMoney(cost.perUnitCents)}</strong>{cost.laborCents ? ' (con tu tiempo incluido)' : ' (sin contar tu tiempo)'}.</p>
			{:else if cost}
				<p class="warn">{cost.error}</p>
			{/if}
			<div class="row">
				<div class="field" style="width: 120px">
					<span>Me piden</span>
					<QtyInput bind:value={units} label="Unidades" placeholder="20" />
				</div>
				<div class="field grow">
					<span>Me ofrecen en total</span>
					<MoneyInput bind:cents={total} label="Total ofrecido" placeholder="250.00" />
				</div>
			</div>

			{#if rq}
				<div class="verdict" class:bad={rq.verdict === 'loss'} class:warn={rq.verdict === 'below_target'} class:ok={rq.verdict === 'ok'}>
					{#if rq.verdict === 'loss'}
						<strong>No te conviene: pierdes {formatMoney(-rq.profitCents)}.</strong> Hacer {units} {recipe?.yieldUnit} te cuesta {formatMoney(rq.costTotalCents)} y te ofrecen {formatMoney(rq.offeredTotalCents)}.
					{:else if rq.verdict === 'below_target'}
						<strong>Te queda poco: ganas {formatMoney(rq.profitCents)}</strong> ({Math.round(rq.marginPct)}% de margen, menos de tu {margin}%). Con tu margen pedirías {formatMoney(roundPrice(rq.targetTotalCents))}.
					{:else}
						<strong>Te conviene.</strong> Ganas {formatMoney(rq.profitCents)} ({Math.round(rq.marginPct)}% de margen).
					{/if}
					<div class="small" style="margin-top: 4px; opacity: 0.8">Sale a {formatMoney(rq.offeredPerUnitCents)} por {unitName}; te cuesta {formatMoney(cost && !('error' in cost) ? cost.perUnitCents : 0)}.</div>
				</div>
			{:else if suggestedTotal !== null && units > 0}
				<p class="hint">Si tú pones el precio, por {units} {recipe?.yieldUnit} pedirías alrededor de <strong class="money">{formatMoney(suggestedTotal)}</strong> con tu margen del {margin}%.</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.back {
		width: 40px;
		height: 40px;
		display: grid;
		place-items: center;
		border-radius: 50%;
		color: var(--ink-2);
		margin-left: -8px;
		flex-shrink: 0;
	}
	h1 {
		font-size: 1.5rem;
	}
	.warn {
		padding: 8px 12px;
		border-radius: var(--r-sm);
		background: var(--mantequilla-suave);
		color: #8a6a14;
		font-size: 0.875rem;
	}
	.verdict {
		padding: 14px 16px;
		border-radius: var(--r-md);
		line-height: 1.4;
	}
	.verdict.bad {
		background: var(--fresa-suave);
		color: #8d1740;
	}
	.verdict.warn {
		background: var(--mantequilla-suave);
		color: #6b5210;
	}
	.verdict.ok {
		background: var(--pistacho-suave);
		color: #27573a;
	}
</style>
