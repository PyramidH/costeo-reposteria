<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { href as h, basePrefix } from '#lib/ui/href.ts';
	import { store } from '#lib/data/store.svelte.ts';
	import { formatMoney, makeUnits, convertToIngredientBase, formatQty, recipesUsingIngredient, type UnitCode } from '#lib/costing';
	import { unitsFor, UNIT_LABELS } from '#lib/ui/units-for.ts';
	import { GT_CATALOG } from '#lib/catalog/gt.ts';
	import QtyInput from '#lib/ui/QtyInput.svelte';
	import MoneyInput from '#lib/ui/MoneyInput.svelte';

	const ing = $derived(store.ingredient(page.params.id!));
	const active = $derived(ing ? store.activePurchases.get(ing.id) : undefined);
	const history = $derived(ing ? store.priceHistory(ing.id) : []);
	const catalog = $derived(ing?.globalId ? GT_CATALOG.find((e) => e.globalId === ing.globalId) : undefined);
	const usedIn = $derived(ing ? recipesUsingIngredient(ing.id, new Map(store.recipes.map((r) => [r.id, r]))) : []);

	// Formulario de precio nuevo, precargado con la compra activa.
	let f = $state({ description: '', qty: 1, unit: 'lb' as UnitCode, priceCents: 0 });
	let seeded = $state(false);
	$effect(() => {
		if (seeded || !ing) return;
		if (active) f = { description: active.description ?? '', qty: active.quantity, unit: active.unit, priceCents: active.priceCents };
		else f.unit = unitsFor(ing)[0];
		seeded = true;
	});

	const unitCost = $derived.by(() => {
		if (!ing || !active) return null;
		const units = makeUnits(store.business?.settings.lbGrams);
		const base = convertToIngredientBase(active.quantity, active.unit, ing, units);
		return { perBase: active.priceCents / base, units };
	});

	function perLabel() {
		if (!ing || !unitCost) return '';
		const { perBase, units } = unitCost;
		if (ing.baseDimension === 'piece') return `${formatMoney(Math.round(perBase))} por pieza`;
		if (ing.baseDimension === 'volume') return `${formatMoney(Math.round(perBase * 1000))} por litro`;
		return `${formatMoney(Math.round(perBase * units.lb.toBase))} por libra · ${formatMoney(Math.round(perBase * units.oz.toBase))} por onza`;
	}

	const changed = $derived(
		!active || active.quantity !== f.qty || active.unit !== f.unit || active.priceCents !== f.priceCents || (active.description ?? '') !== f.description
	);

	async function savePrice() {
		if (!ing || f.priceCents <= 0 || f.qty <= 0) return;
		await store.setPrice(ing.id, { description: f.description || undefined, quantity: f.qty, unit: f.unit, priceCents: f.priceCents });
	}

	async function rename(e: Event) {
		const name = (e.target as HTMLInputElement).value.trim();
		if (ing && name && name !== ing.name) await store.updateIngredient(ing.id, { name });
	}

	async function remove() {
		if (!ing) return;
		if (usedIn.length) {
			alert(`Lo usan ${usedIn.map((r) => r.name).join(', ')}. Quítalo de esas recetas primero.`);
			return;
		}
		if (!confirm(`¿Borrar “${ing.name}”?`)) return;
		await store.deleteIngredient(ing.id);
		goto(h(`/ingredientes`));
	}
</script>

<div class="page">
	{#if !ing}
		<p class="muted">{store.ready ? 'Este ingrediente no existe.' : 'Cargando…'}</p>
	{:else}
		<div class="row" style="margin-bottom: 20px">
			<a href={h('/ingredientes')} class="back" aria-label="Volver">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
			</a>
			<input class="title" value={ing.name} onchange={rename} aria-label="Nombre" />
		</div>

		<div class="stack" style="gap: 24px">
			<section class="stack">
				<h2>Cómo lo compro</h2>
				<div class="row">
					<div class="field" style="width: 90px">
						<span>Cantidad</span>
						<QtyInput bind:value={f.qty} label="Cantidad" />
					</div>
					<label class="field" style="width: 100px">
						<span>Unidad</span>
						<select class="input" bind:value={f.unit}>
							{#each unitsFor(ing) as u}<option value={u}>{UNIT_LABELS[u]}</option>{/each}
						</select>
					</label>
					<div class="field grow">
						<span>Precio</span>
						<MoneyInput bind:cents={f.priceCents} label="Precio" />
					</div>
				</div>
				<label class="field">
					<span>Presentación (opcional)</span>
					<input class="input" bind:value={f.description} placeholder={catalog?.purchase.description ?? 'Cartón de 30, barra de 250 g…'} />
				</label>
				{#if catalog && !active}
					<p class="hint">Referencia: {catalog.purchase.description} ≈ {formatMoney(catalog.purchase.priceCents)}. Pon el precio que tú pagas.</p>
				{/if}
				<button class="btn btn-primary" disabled={!changed || f.priceCents <= 0} onclick={savePrice}>
					{active ? 'Guardar precio nuevo' : 'Guardar precio'}
				</button>
				{#if unitCost}
					<p class="hint">Te sale a <strong class="money">{perLabel()}</strong>.</p>
				{/if}
			</section>

			{#if ing.baseDimension === 'piece' || ing.massPerPieceG}
				<section class="stack">
					<h2>Peso por pieza</h2>
					<p class="hint">Permite usar este ingrediente en onzas o gramos aunque lo compres por unidad. Un huevo mediano pesa unos 57 g (2 oz).</p>
					<div class="row">
						<input class="input" type="number" min="0" inputmode="decimal" style="width: 120px" value={ing.massPerPieceG ?? ''} onchange={(e) => store.updateIngredient(ing.id, { massPerPieceG: Number(e.currentTarget.value) || undefined })} aria-label="Gramos por pieza" />
						<span class="muted">gramos por pieza</span>
					</div>
				</section>
			{/if}

			{#if history.length > 1}
				<section>
					<h2>Historial de precios</h2>
					<div class="list" style="margin-top: 8px">
						{#each history as h (h.id)}
							<div class="hrow">
								<span class="grow">{h.date} <span class="small muted">{h.description ?? `${h.quantity} ${h.unit}`}</span></span>
								<span class="money">{formatMoney(h.priceCents)}</span>
							</div>
						{/each}
					</div>
				</section>
			{/if}

			{#if usedIn.length}
				<section>
					<h2>Lo usan</h2>
					<div class="list" style="margin-top: 8px">
						{#each usedIn as r (r.id)}
							<a href={h(`/recetas/${r.id}`)} class="list-item">{r.name}</a>
						{/each}
					</div>
				</section>
			{/if}

			<button class="btn btn-secondary" style="color: var(--fresa); align-self: flex-start" onclick={remove}>Borrar ingrediente</button>
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
	.hrow {
		display: flex;
		gap: 10px;
		padding: 9px 0;
	}
</style>
