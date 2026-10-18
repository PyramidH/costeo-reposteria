<script lang="ts">
	import { store } from '#lib/data/store.svelte.ts';
	import { href as h, basePrefix } from '#lib/ui/href.ts';
	import Money from '#lib/ui/Money.svelte';
	import { priceFromMargin, roundPrice } from '#lib/costing';

	const products = $derived(store.recipes.filter((r) => r.kind === 'product'));
	const bases = $derived(store.recipes.filter((r) => r.kind === 'base'));

	function margin(r: { marginPct?: number }) {
		return r.marginPct ?? store.business?.settings.defaultMarginPct ?? 40;
	}
</script>

<div class="page">
	{#if store.recipes.length}
		<div class="page-head">
			<h1>Recetas</h1>
			<a href={h('/recetas/nueva')} class="btn btn-primary">Nueva</a>
		</div>
	{/if}

	{#if !store.ready}
		<p class="muted">Cargando…</p>
	{:else if !store.recipes.length}
		<div class="welcome">
			<h2 class="pitch">¿No sabes cuánto cobrar por lo que horneas?</h2>
			<p class="lead">Anota una receta como la tienes en tu cuaderno y te decimos cuánto te cuesta cada pieza, cuánto te queda de verdad y cuánto podrías cobrar.</p>
			<a href={h('/recetas/nueva')} class="btn btn-primary btn-block" style="margin: 8px 0 28px">Empezar con una receta</a>

			<ol class="how">
				<li>
					<strong>Escribe la receta.</strong>
					<span>Harina, huevos, mantequilla… en libras, onzas o piezas, como la compras. Los precios de referencia ya vienen; tú los ajustas a lo que pagas.</span>
				</li>
				<li>
					<strong>Di cuánto rinde.</strong>
					<span>12 cupcakes, 1 strudel, 10 vasos. Con eso sale el costo por pieza.</span>
				</li>
				<li>
					<strong>Mira lo que casi nadie cuenta.</strong>
					<span>Tu tiempo, el gas, la caja. Actívalos y ve cómo cambia el número. Si ya lo vendes, pon tu precio y te decimos a cuánto te sale la hora.</span>
				</li>
			</ol>
			<p class="hint">Todo se guarda en este teléfono y funciona sin cuenta. <a href={h('/guia')}>Cómo funciona, con más detalle</a>.</p>
		</div>
	{:else}
		{#snippet row(r: (typeof store.recipes)[number])}
			{@const c = store.cost(r.id)}
			<a href={h(`/recetas/${r.id}`)} class="list-item">
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
			<a href={h('/cotizar')} class="action-row" style="margin-top: 20px">
				<span class="icon">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-5A8 8 0 1121 12z" /></svg>
				</span>
				<span class="grow">
					<strong>Cotizar un pedido</strong>
					<span class="small muted">Arma el pedido y mándalo por WhatsApp con tu nombre.{store.quotes.length ? ` ${store.quotes.length} guardadas.` : ''}</span>
				</span>
				<svg class="chev" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
			</a>
			<a href={h('/conviene')} class="action-row" style="margin-top: 10px">
				<span class="icon">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>
				</span>
				<span class="grow">
					<strong>¿Te piden un pedido?</strong>
					<span class="small muted">Te dicen cuántos y cuánto pagan; te decimos si te conviene.</span>
				</span>
				<svg class="chev" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
			</a>
		{/if}

		{#if bases.length}
			<h2 class="sub">Recetas base</h2>
			<p class="hint" style="margin-bottom: 4px">Masas, cremas y rellenos que usas dentro de otras recetas.</p>
			<div class="list">
				{#each bases as r (r.id)}{@render row(r)}{/each}
			</div>
		{/if}
		<p class="hint" style="margin-top: 28px; text-align: center">
			{#if store.quotes.length}<a href={h('/cotizaciones')}>Mis cotizaciones</a> · {/if}<a href={h('/guia')}>¿Cómo funciona la app?</a>
		</p>
	{/if}
</div>

<style>
	.welcome {
		padding: 8px 0;
	}
	.pitch {
		font-size: 1.9rem;
		line-height: 1.1;
		margin-bottom: 12px;
	}
	.lead {
		color: var(--ink-2);
		margin-bottom: 16px;
		line-height: 1.5;
	}
	.how {
		list-style: none;
		counter-reset: paso;
		padding: 0;
		margin: 0 0 20px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.how li {
		counter-increment: paso;
		display: grid;
		grid-template-columns: 32px 1fr;
		column-gap: 12px;
	}
	.how li::before {
		content: counter(paso);
		grid-row: 1 / span 2;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: var(--fresa-suave);
		color: var(--fresa);
		font-family: var(--font-money);
		font-weight: 600;
		display: grid;
		place-items: center;
	}
	.how strong {
		display: block;
	}
	.how span {
		color: var(--ink-2);
		font-size: 0.95rem;
		line-height: 1.45;
	}
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
