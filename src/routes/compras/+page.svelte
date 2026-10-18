<script lang="ts">
	import { page } from '$app/state';
	import { store } from '#lib/data/store.svelte.ts';
	import { href as h } from '#lib/ui/href.ts';
	import { singular } from '#lib/ui/words.ts';
	import { CATEGORY_LABELS, type CatalogCategory } from '#lib/catalog/gt.ts';
	import { shoppingList, formatMoney, type ShoppingRequest } from '#lib/costing';
	import QtyInput from '#lib/ui/QtyInput.svelte';
	import Sheet from '#lib/ui/Sheet.svelte';

	let reqs = $state<ShoppingRequest[]>([]);
	let picker = $state(false);
	let checked = $state<Record<string, boolean>>({});
	let seeded = $state(false);

	$effect(() => {
		if (seeded || !store.ready) return;
		const pre = page.url.searchParams.get('receta');
		const r = pre ? store.recipe(pre) : null;
		if (r) reqs.push({ recipeId: r.id, units: r.yieldQty });
		seeded = true;
	});

	function add(id: string) {
		const r = store.recipe(id);
		if (r && !reqs.some((x) => x.recipeId === id)) reqs.push({ recipeId: id, units: r.yieldQty });
		picker = false;
	}
	const list = $derived(store.ctx ? shoppingList($state.snapshot(reqs), store.ctx) : null);
	const grouped = $derived.by(() => {
		const m = new Map<string, NonNullable<typeof list>['items']>();
		for (const i of list?.items ?? []) {
			const k = i.category ?? 'otros';
			if (!m.has(k)) m.set(k, []);
			m.get(k)!.push(i);
		}
		return [...m.entries()];
	});
	const label = (k: string) => CATEGORY_LABELS[k as CatalogCategory] ?? 'Otros';
	const pending = $derived((list?.items ?? []).filter((i) => !checked[i.ingredientId]));
	const pendingCents = $derived(pending.reduce((s, i) => s + (i.estimatedCents ?? 0), 0));

	function shareText(): string {
		const lines = ['*Lista de compras*', ''];
		for (const [cat, items] of grouped) {
			lines.push(label(cat));
			for (const i of items) lines.push(`☐ ${i.name}: ${i.neededLabel}${i.estimatedCents != null ? ` (~${formatMoney(i.estimatedCents)})` : ''}`);
			lines.push('');
		}
		if (list) lines.push(`Total aproximado: ${formatMoney(list.totalCents)}`);
		return lines.join('\n');
	}
	function share() {
		window.open(`https://wa.me/?text=${encodeURIComponent(shareText())}`, '_blank', 'noopener');
	}
</script>

<div class="page">
	<div class="row" style="margin-bottom: 8px">
		<a href={h('/')} class="back" aria-label="Volver">
			<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
		</a>
		<h1>Lista de compras</h1>
	</div>
	<p class="hint" style="margin-bottom: 20px">Di qué vas a hacer y cuánto; te decimos qué comprar, cuánto de cada cosa y más o menos cuánto vas a gastar.</p>

	<section class="stack" style="margin-bottom: 24px">
		{#each reqs as r, i (r.recipeId)}
			{@const rec = store.recipe(r.recipeId)}
			{#if rec}
				<div class="row">
					<span class="grow" style="font-weight: 600">{rec.name}</span>
					<div style="width: 90px"><QtyInput bind:value={r.units} label="Cantidad de {rec.name}" /></div>
					<span class="small muted" style="width: 70px">{r.units === 1 ? singular(rec.yieldUnit) : rec.yieldUnit}</span>
					<button class="del" onclick={() => reqs.splice(i, 1)} aria-label="Quitar {rec.name}">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
					</button>
				</div>
			{/if}
		{/each}
		<button class="add-line" onclick={() => (picker = true)}>
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
			Agregar receta
		</button>
	</section>

	{#if list && list.items.length}
		{#each grouped as [cat, items] (cat)}
			<h2 class="cat">{label(cat)}</h2>
			<div class="list" style="margin-bottom: 16px">
				{#each items as i (i.ingredientId)}
					<label class="item" class:done={checked[i.ingredientId]}>
						<input type="checkbox" bind:checked={checked[i.ingredientId]} />
						<span class="grow">
							<span class="name">{i.name}</span>
							{#if i.usedIn.length > 1 || reqs.length > 1}<span class="small muted"> · {i.usedIn.join(', ')}</span>{/if}
						</span>
						<span class="qty money">{i.neededLabel}</span>
						<span class="small muted" style="width: 64px; text-align: right">{i.estimatedCents != null ? `~${formatMoney(i.estimatedCents)}` : 'sin precio'}</span>
					</label>
				{/each}
			</div>
		{/each}
		{#if list.estimates.length}
			<p class="hint">Más lo “al gusto”: {list.estimates.map((e) => e.label).join(', ')} (~{formatMoney(list.estimates.reduce((s, e) => s + e.costCents, 0))}).</p>
		{/if}
		{#each list.warnings as w}<p class="hint" style="color: var(--fresa)">{w}</p>{/each}

		<div class="total">
			<div class="grow">
				<div class="small muted">Gasto aproximado{pending.length < list.items.length ? ' (lo que falta)' : ''}</div>
				<div class="money" style="font-size: 1.6rem; color: var(--fresa)">{formatMoney(pendingCents)}</div>
			</div>
			<button class="btn btn-secondary" onclick={share}>Enviar lista</button>
		</div>
		<p class="hint">Las cantidades salen de tus recetas y los precios de lo que pagaste la última vez. Compara con lo que tengas en la despensa antes de salir.</p>
	{:else if reqs.length}
		<p class="hint">Estas recetas no tienen ingredientes todavía.</p>
	{/if}
</div>

<Sheet bind:open={picker} title="¿Qué vas a hacer?">
	<div class="list">
		{#each store.recipes as r (r.id)}
			<button class="list-item" onclick={() => add(r.id)}>
				<span class="grow">{r.name}</span>
				<span class="small muted">rinde {r.yieldQty} {r.yieldUnit}</span>
			</button>
		{/each}
	</div>
</Sheet>

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
	h1 {
		font-size: 1.5rem;
	}
	.cat {
		font-family: var(--font-ui);
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--ink-2);
		margin-bottom: 2px;
	}
	.item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 11px 0;
	}
	.item input {
		width: 22px;
		height: 22px;
		accent-color: var(--pistacho);
		flex-shrink: 0;
	}
	.item.done .name,
	.item.done .qty {
		text-decoration: line-through;
		color: var(--ink-3);
	}
	.name {
		font-weight: 600;
	}
	.qty {
		font-size: 1rem;
		white-space: nowrap;
	}
	.del {
		width: 32px;
		height: 32px;
		display: grid;
		place-items: center;
		border-radius: 50%;
		color: var(--ink-3);
	}
	.add-line {
		width: 100%;
		min-height: 48px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		border: 1.5px dashed var(--linea);
		border-radius: var(--r-md);
		color: var(--fresa);
		font-weight: 600;
	}
	.total {
		display: flex;
		align-items: center;
		gap: 12px;
		margin: 20px 0 8px;
		padding: 14px 16px;
		border-radius: var(--r-md);
		background: var(--merengue);
	}
</style>
