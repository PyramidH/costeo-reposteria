<script lang="ts">
	import { store } from '#lib/data/store.svelte.ts';
	import {
		type CostBreakdown,
		type Recipe,
		priceFromMargin,
		roundPrice,
		reverseQuote,
		tierPrices,
		defaultTiers,
		formatMoney
	} from '#lib/costing';
	import Money from './Money.svelte';
	import MoneyInput from './MoneyInput.svelte';
	import QtyInput from './QtyInput.svelte';
	import { singular, joinY, fmtTime } from './words';

	let { recipe, cost, onMargin }: { recipe: Recipe; cost: CostBreakdown; onMargin: (m: number) => void } = $props();

	const settings = $derived(store.business!.settings);
	const margin = $derived(recipe.marginPct ?? settings.defaultMarginPct);
	const unitName = $derived(singular(recipe.yieldUnit));

	const price = $derived(priceFromMargin(cost.perUnitCents, margin));
	const priceRounded = $derived(roundPrice(price));
	const profitPerUnit = $derived(priceRounded - cost.perUnitCents);

	const tiers = $derived(tierPrices(cost.perUnitCents, defaultTiers(margin)));

	// Calculadora inversa
	let rqUnits = $state(0);
	let rqTotal = $state(0);
	const rq = $derived(rqUnits > 0 && rqTotal > 0 ? reverseQuote(cost.perUnitCents, rqUnits, rqTotal, margin) : null);

	async function toggle(key: 'includeLabor' | 'includeOverhead' | 'includeWaste') {
		await store.saveBusiness({ settings: { ...settings, [key]: !settings[key] } });
	}
	// Copias locales editables; se guardan al salir del campo.
	let hourly = $state(0);
	let fixed = $state(0);
	$effect(() => {
		hourly = settings.hourlyRateCents;
		fixed = settings.monthlyFixedCents;
	});
	async function saveHourly() {
		if (hourly > 0 && hourly !== settings.hourlyRateCents) await store.saveBusiness({ settings: { ...settings, hourlyRateCents: hourly } });
	}
	async function saveFixed() {
		if (fixed >= 0 && fixed !== settings.monthlyFixedCents) await store.saveBusiness({ settings: { ...settings, monthlyFixedCents: fixed } });
	}

	const laborPreview = $derived(Math.round((recipe.laborMinutes / 60) * settings.hourlyRateCents));
	const overheadPreview = $derived(
		settings.overheadMode === 'percent'
			? Math.round(cost.ingredientsCents * (settings.overheadPct / 100))
			: settings.monthlyProductionMinutes > 0
				? Math.round(recipe.laborMinutes * (settings.monthlyFixedCents / settings.monthlyProductionMinutes))
				: 0
	);
	async function setOverheadPct(pct: number) {
		await store.saveBusiness({ settings: { ...settings, overheadPct: pct } });
	}

	// "Lo que cobras hoy": una sola historia con el mismo costo que el sugerido.
	// 1) ¿cubre lo que sale de la bolsa (todo menos tu tiempo)?
	// 2) lo que queda es tu paga: ¿a cuánto sale la hora frente a lo que dijiste que vale?
	const today = $derived.by(() => {
		const p = recipe.currentPriceCents;
		if (!p || p <= 0) return null;
		const outOfPocketPerUnit = Math.round((cost.totalCents - cost.laborCents) / cost.yieldQty);
		const leftPerUnit = p - outOfPocketPerUnit;
		const leftBatch = leftPerUnit * cost.yieldQty;
		const hours = recipe.laborMinutes / 60;
		const hourlyCents = hours > 0 ? Math.round(leftBatch / hours) : null;
		const parts = ['ingredientes', ...(cost.extrasCents ? ['empaque'] : []), ...(cost.overheadCents ? ['gas'] : [])];
		let verdict: 'loss' | 'low' | 'ok';
		if (leftPerUnit < 0) verdict = 'loss';
		else if (hourlyCents !== null) verdict = hourlyCents < settings.hourlyRateCents ? 'low' : 'ok';
		else verdict = p < priceRounded ? 'low' : 'ok';
		return { price: p, outOfPocketPerUnit, leftPerUnit, leftBatch, hourlyCents, parts, verdict };
	});

	// Desglose del precio sugerido, para que se vea de dónde sale.
	const perUnit = $derived({
		ingredients: Math.round((cost.ingredientsCents + cost.extrasCents) / cost.yieldQty),
		labor: Math.round(cost.laborCents / cost.yieldQty),
		overhead: Math.round(cost.overheadCents / cost.yieldQty)
	});
	const multiplier = $derived((1 / (1 - margin / 100)).toFixed(1));
</script>

<div class="stack" style="gap: 28px">
	<!-- Desglose -->
	<section>
		<div class="row" style="justify-content: space-between; align-items: baseline">
			<h2>Qué cuesta</h2>
			<span class="small muted">receta completa · {recipe.yieldQty} {recipe.yieldUnit}</span>
		</div>
		<div class="list" style="margin-top: 8px">
			{#each cost.lines as l (l.lineId)}
				<div class="brow">
					<span class="grow">{l.label} <span class="small muted">{l.detail}</span></span>
					<Money cents={l.costCents} size="sm" />
				</div>
			{/each}
			{#if cost.laborCents}
				<div class="brow"><span class="grow">Tu tiempo <span class="small muted">{fmtTime(recipe.laborMinutes)}</span></span><Money cents={cost.laborCents} size="sm" /></div>
			{/if}
			{#if cost.overheadCents}
				<div class="brow"><span class="grow">Gas, luz y gastos fijos</span><Money cents={cost.overheadCents} size="sm" /></div>
			{/if}
			<div class="brow total">
				<span class="grow">Total</span>
				<Money cents={cost.totalCents} />
			</div>
			<div class="brow total">
				<span class="grow">Por {unitName}</span>
				<Money cents={cost.perUnitCents} size="lg" />
			</div>
		</div>
		{#each cost.warnings as w}
			<p class="warn">{w}</p>
		{/each}
	</section>

	<!-- Lo que nadie cuenta -->
	<section class="stack">
		<h2>Lo que casi nadie cuenta</h2>
		<p class="hint">Actívalos y mira cómo cambia el costo. Si no los cobras, los pagas tú.</p>

		<label class="opt" class:on={settings.includeLabor}>
			<span class="switch"><input type="checkbox" checked={settings.includeLabor} onchange={() => toggle('includeLabor')} /><span></span></span>
			<div class="grow">
				<div class="opt-title">Tu tiempo <span class="money small">+{formatMoney(laborPreview)}</span></div>
				<p class="hint">Si no te pagas la hora, tu negocio te está pagando Q0 por trabajar. Aunque sea poco, ponle precio.</p>
				{#if settings.includeLabor}
					<div class="row" style="margin-top: 8px">
						<span class="small muted">Mi hora vale</span>
						<div style="width: 130px" onfocusout={saveHourly}><MoneyInput bind:cents={hourly} label="Valor por hora" /></div>
					</div>
				{/if}
			</div>
		</label>

		<label class="opt" class:on={settings.includeOverhead}>
			<span class="switch"><input type="checkbox" checked={settings.includeOverhead} onchange={() => toggle('includeOverhead')} /><span></span></span>
			<div class="grow">
				<div class="opt-title">Gas, luz y agua <span class="money small">+{formatMoney(overheadPreview)}</span></div>
				{#if settings.overheadMode === 'percent'}
					<p class="hint">El horno gasta aunque el pastel salga perfecto. Lo usual es sumar entre 10 y 15 % del costo de los ingredientes.</p>
					{#if settings.includeOverhead}
						<div class="row" style="margin-top: 8px">
							<input type="range" min="5" max="25" step="1" value={settings.overheadPct} oninput={(e) => setOverheadPct(Number(e.currentTarget.value))} class="grow" aria-label="Porcentaje de gastos" />
							<span class="money" style="width: 44px; text-align: right">{settings.overheadPct}%</span>
						</div>
					{/if}
				{:else}
					<p class="hint">Tus gastos fijos del mes repartidos entre el tiempo que produces (modo avanzado, se configura en Ajustes).</p>
					{#if settings.includeOverhead}
						<div class="row" style="margin-top: 8px">
							<span class="small muted">Al mes gasto</span>
							<div style="width: 130px" onfocusout={saveFixed}><MoneyInput bind:cents={fixed} label="Gastos fijos al mes" /></div>
						</div>
					{/if}
				{/if}
			</div>
		</label>

		<label class="opt" class:on={settings.includeWaste}>
			<span class="switch"><input type="checkbox" checked={settings.includeWaste} onchange={() => toggle('includeWaste')} /><span></span></span>
			<div class="grow">
				<div class="opt-title">Merma</div>
				<p class="hint">El huevo que se rompe, lo que queda en el bol, la fruta que se tira. Suma un pequeño porcentaje por ingrediente.</p>
			</div>
		</label>
	</section>

	<!-- Precio -->
	<section class="stack">
		<h2>Cuánto cobrar</h2>
		<div class="price-card">
			<div class="row" style="justify-content: space-between">
				<span>Margen de ganancia</span>
				<span class="money">{margin}%</span>
			</div>
			<input type="range" min="10" max="60" step="5" value={margin} oninput={(e) => onMargin(Number(e.currentTarget.value))} aria-label="Margen" />
			<p class="hint">De cada quetzal que cobras, {margin} centavos son ganancia. Es como multiplicar el costo por {multiplier}.</p>
			<div class="big">
				<div class="small muted">Con ese margen, cada {unitName} saldría en</div>
				<Money cents={priceRounded} size="xl" />
				<div class="small muted">{formatMoney(cost.perUnitCents)} de costo + {formatMoney(profitPerUnit)} de ganancia</div>
				<div class="small muted">
					El costo son {formatMoney(perUnit.ingredients)} de ingredientes{cost.extrasCents ? ' y empaque' : ''}{#if perUnit.labor}, <strong>{formatMoney(perUnit.labor)} de tu tiempo</strong>{/if}{#if perUnit.overhead}, {formatMoney(perUnit.overhead)} de gas{/if}.
					{#if perUnit.labor}Tu tiempo está activado arriba: por eso el precio incluye pagarte {formatMoney(settings.hourlyRateCents)} la hora.{/if}
				</div>
			</div>
		</div>

		{#if today}
			<div class="today" class:bad={today.verdict === 'loss'} class:warn={today.verdict === 'low'} class:ok={today.verdict === 'ok'}>
				<div class="small muted">Hoy lo vendes a {formatMoney(today.price)} por {unitName}</div>
				{#if today.verdict === 'loss'}
					<p><strong>Pierdes dinero.</strong> Solo {joinY(today.parts)} te cuestan {formatMoney(today.outOfPocketPerUnit)} por {unitName}; cobras {formatMoney(today.price)}. Pones {formatMoney(-today.leftPerUnit)} de tu bolsa en cada {unitName}, y tu trabajo sale gratis.</p>
				{:else}
					<p>
						Pagando {joinY(today.parts)} ({formatMoney(today.outOfPocketPerUnit)}) te quedan <strong class="money">{formatMoney(today.leftPerUnit)}</strong> por {unitName}. Eso es lo que te pagas a ti por hacerlo.
					</p>
					{#if today.hourlyCents !== null}
						<p>
							Por toda la receta son {formatMoney(today.leftBatch)} en {fmtTime(recipe.laborMinutes)} de trabajo: <strong class="money">{formatMoney(today.hourlyCents)} la hora</strong>.
							{#if today.verdict === 'low'}
								<strong>Es menos de los {formatMoney(settings.hourlyRateCents)} que dijiste que vale tu hora.</strong> No hace falta llegar al sugerido de golpe: cada quetzal que subas va directo a tu hora.
							{:else}
								<strong>Vas bien:</strong> es más de los {formatMoney(settings.hourlyRateCents)} que dijiste que vale tu hora.
							{/if}
						</p>
					{:else if today.verdict === 'low'}
						<p><strong>Está por debajo del sugerido</strong> ({formatMoney(priceRounded)}). Pon el tiempo que te toma en la pestaña Receta y te decimos a cuánto te sale la hora.</p>
					{/if}
				{/if}
			</div>
		{:else}
			<p class="hint">¿Ya lo vendes? Pon lo que cobras hoy en la pestaña Receta y aquí verás cuánto te queda de verdad y a cuánto sale tu hora.</p>
		{/if}

		<h3 style="margin-top: 8px">Si te piden por mayor</h3>
		<p class="hint">Cuando te piden por docena o por ciento esperan descuento. Estos son los precios por {unitName} que puedes ofrecer según la cantidad sin regalar tu trabajo: hacer 100 no abarata los ingredientes, así que el descuento sale de aceptar un poco menos de margen en pedidos grandes.</p>
		<div class="list">
			{#each tiers as t (t.minQty)}
				<div class="brow">
					<span class="grow">{t.minQty === 1 ? 'Unidad' : `Desde ${t.minQty}`} <span class="small muted">{t.marginPct}% margen</span></span>
					<Money cents={t.rounded} size="sm" />
				</div>
			{/each}
		</div>
	</section>

	<!-- Calculadora inversa -->
	<section class="stack">
		<h2>¿Me conviene este pedido?</h2>
		<p class="hint">Alguien te pide varias {recipe.yieldUnit || 'piezas'} de esta receta y te ofrece un precio total. Pon los dos números y te decimos si te conviene, usando el costo por {unitName} que ves arriba.</p>
		<div class="row">
			<div class="field" style="width: 110px">
				<span>Me piden</span>
				<QtyInput bind:value={rqUnits} label="Unidades" placeholder="20" />
			</div>
			<div class="field grow">
				<span>Me ofrecen en total</span>
				<MoneyInput bind:cents={rqTotal} label="Total ofrecido" placeholder="250.00" />
			</div>
		</div>
		{#if rq}
			<div class="verdict" class:bad={rq.verdict === 'loss'} class:warn={rq.verdict === 'below_target'} class:ok={rq.verdict === 'ok'}>
				{#if rq.verdict === 'loss'}
					<strong>Pierdes {formatMoney(-rq.profitCents)}.</strong> Hacerlo te cuesta {formatMoney(rq.costTotalCents)} y te ofrecen {formatMoney(rq.offeredTotalCents)}.
				{:else if rq.verdict === 'below_target'}
					<strong>Ganas {formatMoney(rq.profitCents)}</strong> ({Math.round(rq.marginPct)}% de margen), menos de tu {margin}%. A tu margen serían {formatMoney(roundPrice(rq.targetTotalCents))}.
				{:else}
					<strong>Te conviene.</strong> Ganas {formatMoney(rq.profitCents)} ({Math.round(rq.marginPct)}% de margen).
				{/if}
				<div class="small" style="margin-top: 4px; opacity: 0.8">Sale a {formatMoney(rq.offeredPerUnitCents)} por {unitName}; te cuesta {formatMoney(cost.perUnitCents)}.</div>
			</div>
		{/if}
	</section>
</div>

<style>
	.brow {
		display: flex;
		align-items: baseline;
		gap: 10px;
		padding: 9px 0;
	}
	.brow.total {
		font-weight: 600;
	}
	.brow.total :global(.money) {
		color: var(--fresa);
	}
	.warn {
		margin-top: 8px;
		padding: 8px 12px;
		border-radius: var(--r-sm);
		background: var(--mantequilla-suave);
		color: #8a6a14;
		font-size: 0.875rem;
	}
	.opt {
		display: flex;
		gap: 12px;
		padding: 12px;
		border: 1px solid var(--linea);
		border-radius: var(--r-md);
		cursor: pointer;
	}
	.opt.on {
		border-color: var(--pistacho);
		background: var(--pistacho-suave);
	}
	.opt .switch {
		margin-top: 2px;
		order: 2;
	}
	.opt-title {
		font-weight: 600;
		display: flex;
		justify-content: space-between;
		gap: 8px;
	}
	.opt-title .money {
		color: var(--ink-2);
		font-weight: 500;
	}
	.opt.on .opt-title .money {
		color: var(--pistacho);
	}
	.today {
		padding: 14px 16px;
		border-radius: var(--r-md);
		background: var(--merengue);
		display: flex;
		flex-direction: column;
		gap: 6px;
		line-height: 1.45;
	}
	.today.bad {
		background: var(--fresa-suave);
	}
	.today.warn {
		background: var(--mantequilla-suave);
	}
	.today.ok {
		background: var(--pistacho-suave);
	}
	.today p {
		line-height: 1.45;
	}
	.price-card {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 16px;
		border-radius: var(--r-lg);
		background: var(--fresa-suave);
	}
	.price-card input[type='range'] {
		width: 100%;
		accent-color: var(--fresa);
	}
	.big {
		margin-top: 8px;
		padding-top: 12px;
		border-top: 1px solid rgba(201, 36, 92, 0.2);
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.big :global(.xl) {
		color: var(--fresa);
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
