<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { store } from '#lib/data/store.svelte.ts';
	import { href as h } from '#lib/ui/href.ts';
	import { singular } from '#lib/ui/words.ts';
	import { newId, now, type QuoteLine } from '#lib/db';
	import { priceFromMargin, roundPrice, tierPrices, defaultTiers, tierFor, formatMoney } from '#lib/costing';
	import { quoteText, quoteDeposit, whatsappShareUrl } from '#lib/quote.ts';
	import QtyInput from '#lib/ui/QtyInput.svelte';
	import MoneyInput from '#lib/ui/MoneyInput.svelte';
	import Sheet from '#lib/ui/Sheet.svelte';

	const products = $derived(store.recipes.filter((r) => r.kind === 'product'));
	const b = $derived(store.business);

	let lines = $state<QuoteLine[]>([]);
	let client = $state('');
	let deliveryDate = $state('');
	let depositPct = $state(50);
	let notes = $state('');
	let picker = $state(false);
	let seeded = $state(false);
	let copied = $state(false);

	$effect(() => {
		if (seeded || !b) return;
		depositPct = b.depositPct ?? 50;
		const pre = page.url.searchParams.get('receta');
		if (pre && store.recipe(pre)) addLine(pre);
		seeded = true;
	});

	function suggested(recipeId: string, qty: number): number {
		const r = store.recipe(recipeId);
		const c = store.cost(recipeId);
		if (!r || 'error' in c) return 0;
		const margin = r.marginPct ?? b?.settings.defaultMarginPct ?? 40;
		const tiers = tierPrices(c.perUnitCents, defaultTiers(margin));
		return tierFor(qty, tiers).rounded;
	}

	function addLine(recipeId: string) {
		const r = store.recipe(recipeId);
		if (!r) return;
		lines.push({ recipeId, name: r.name, unitName: r.yieldUnit || 'piezas', qty: 1, unitPriceCents: r.currentPriceCents ?? suggested(recipeId, 1) });
		picker = false;
	}
	function setQty(i: number, qty: number) {
		const l = lines[i];
		const prev = suggested(l.recipeId, l.qty);
		l.qty = qty;
		// Si el precio seguía al sugerido, actualiza al escalón nuevo.
		if (l.unitPriceCents === prev || l.unitPriceCents === 0) l.unitPriceCents = suggested(l.recipeId, qty);
	}
	function remove(i: number) {
		lines.splice(i, 1);
	}

	const total = $derived(lines.reduce((s, l) => s + l.qty * l.unitPriceCents, 0));
	const draft = $derived({
		id: '',
		client: client.trim() || undefined,
		deliveryDate: deliveryDate || undefined,
		lines: $state.snapshot(lines),
		totalCents: total,
		depositPct,
		notes: notes.trim() || undefined,
		createdAt: ''
	});
	const text = $derived(b ? quoteText(draft, b) : '');

	// Costo real de lo cotizado, para avisar si se está regalando.
	const costTotal = $derived(
		lines.reduce((s, l) => {
			const c = store.cost(l.recipeId);
			return s + ('error' in c ? 0 : c.perUnitCents * l.qty);
		}, 0)
	);

	async function save() {
		const q = { ...draft, id: newId(), createdAt: now() };
		await store.saveQuote(q);
		if (b && b.depositPct !== depositPct) await store.saveBusiness({ depositPct });
		return q;
	}
	async function send() {
		await save();
		window.open(whatsappShareUrl(text), '_blank', 'noopener');
		goto(h('/cotizaciones'));
	}
	async function copy() {
		await save();
		try {
			await navigator.clipboard.writeText(text);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			/* sin portapapeles */
		}
	}
</script>

<div class="page">
	<div class="row" style="margin-bottom: 8px">
		<a href={h('/')} class="back" aria-label="Volver">
			<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
		</a>
		<h1>Cotizar</h1>
	</div>
	<p class="hint" style="margin-bottom: 20px">Arma el pedido y mándalo por WhatsApp con el nombre de tu negocio. El precio por unidad sale de tu receta y baja solo según la cantidad; puedes cambiarlo.</p>

	{#if !products.length}
		<div class="empty">
			<h2>Primero una receta</h2>
			<p>Las cotizaciones toman el precio de tus recetas.</p>
			<a href={h('/recetas/nueva')} class="btn btn-primary" style="margin-top: 20px">Crear receta</a>
		</div>
	{:else if b}
		<div class="stack" style="gap: 20px">
			<section class="stack">
				<h2>Productos</h2>
				{#each lines as l, i (i)}
					<div class="qline">
						<div class="row" style="justify-content: space-between">
							<strong>{l.name}</strong>
							<button class="del" onclick={() => remove(i)} aria-label="Quitar {l.name}">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
							</button>
						</div>
						<div class="qgrid">
							<label class="field">
								<span>Cantidad</span>
								<QtyInput bind:value={() => l.qty, (v) => setQty(i, v)} label="Cantidad" />
							</label>
							<label class="field">
								<span>Precio por {singular(l.unitName)}</span>
								<MoneyInput bind:cents={l.unitPriceCents} label="Precio unitario" />
							</label>
							<div class="field">
								<span>Subtotal</span>
								<div class="money sub">{formatMoney(l.qty * l.unitPriceCents)}</div>
							</div>
						</div>
						{#if suggested(l.recipeId, l.qty) !== l.unitPriceCents}
							<button class="link small" onclick={() => (l.unitPriceCents = suggested(l.recipeId, l.qty))}>Usar sugerido: {formatMoney(suggested(l.recipeId, l.qty))} c/u</button>
						{/if}
					</div>
				{/each}
				<button class="add-line" onclick={() => (picker = true)}>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
					Agregar producto
				</button>
			</section>

			<section class="stack">
				<h2>Para quién</h2>
				<label class="field">
					<span>Cliente (opcional)</span>
					<input class="input" bind:value={client} placeholder="María" />
				</label>
				<div class="row">
					<label class="field grow">
						<span>Entrega (opcional)</span>
						<input class="input" type="date" bind:value={deliveryDate} />
					</label>
					<label class="field" style="width: 120px">
						<span>Anticipo</span>
						<select class="input" bind:value={depositPct}>
							<option value={0}>Sin anticipo</option>
							<option value={30}>30%</option>
							<option value={50}>50%</option>
							<option value={100}>Pago completo</option>
						</select>
					</label>
				</div>
				<label class="field">
					<span>Nota (opcional)</span>
					<input class="input" bind:value={notes} placeholder="Incluye caja. Se entrega en zona 10." />
				</label>
			</section>

			{#if lines.length}
				<section class="stack">
					<h2>Así se verá</h2>
					<div class="preview">
						{#each text.split('\n') as line}
							{#if /^\*.+\*$/.test(line)}<strong>{line.slice(1, -1)}</strong>{:else}{line}{/if}<br />
						{/each}
					</div>
					{#if costTotal > 0 && total < costTotal}
						<p class="warnbox">Ojo: este pedido te cuesta {formatMoney(costTotal)} y estás cotizando {formatMoney(total)}. Lo estarías regalando.</p>
					{/if}
					<div class="row">
						<button class="btn btn-secondary grow" onclick={copy}>{copied ? 'Copiado' : 'Copiar texto'}</button>
						<button class="btn btn-primary grow" onclick={send}>Enviar por WhatsApp</button>
					</div>
					<p class="hint">Si tu negocio no se llama “{b.name}” o quieres poner tu teléfono al pie, cámbialo en <a href={h('/ajustes')}>Ajustes</a>.</p>
				</section>
			{/if}
		</div>
	{/if}
</div>

<Sheet bind:open={picker} title="Agregar producto">
	<div class="list">
		{#each products as r (r.id)}
			{@const c = store.cost(r.id)}
			<button class="list-item" onclick={() => addLine(r.id)}>
				<span class="grow">{r.name}</span>
				{#if !('error' in c)}<span class="small muted">{formatMoney(suggested(r.id, 1))} c/u</span>{/if}
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
	.qline {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 12px 0;
		border-bottom: 1px solid var(--linea);
	}
	.qgrid {
		display: grid;
		grid-template-columns: 1fr 1.2fr 1fr;
		gap: 8px;
	}
	.sub {
		min-height: 48px;
		display: flex;
		align-items: center;
		font-size: 1.05rem;
	}
	.del {
		width: 32px;
		height: 32px;
		display: grid;
		place-items: center;
		border-radius: 50%;
		color: var(--ink-3);
	}
	.link {
		color: var(--fresa);
		font-weight: 600;
		align-self: flex-start;
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
	.preview {
		margin: 0;
		padding: 14px 16px;
		border-radius: var(--r-md);
		background: var(--merengue);
		font-family: var(--font-ui);
		font-size: 0.95rem;
		line-height: 1.5;
		word-break: break-word;
	}
	.warnbox {
		padding: 10px 14px;
		border-radius: var(--r-md);
		background: var(--fresa-suave);
		color: #8d1740;
		font-size: 0.9rem;
	}
</style>
