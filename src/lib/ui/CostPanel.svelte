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

	let { recipe, cost, onMargin }: { recipe: Recipe; cost: CostBreakdown; onMargin: (m: number) => void } = $props();

	const settings = $derived(store.business!.settings);
	const margin = $derived(recipe.marginPct ?? settings.defaultMarginPct);
	const unitName = $derived(recipe.yieldUnit.replace(/s$/, '') || 'pieza');

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

	// "Lo que cobras hoy": la realidad frente al cálculo.
	const fmtTime = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);
	const today = $derived.by(() => {
		const p = recipe.currentPriceCents;
		if (!p || p <= 0) return null;
		// Costo sin mano de obra: lo que de verdad sale de la bolsa.
		const outOfPocketPerUnit = Math.round((cost.totalCents - cost.laborCents) / cost.yieldQty);
		const profitPerUnit = p - outOfPocketPerUnit;
		const profitBatch = profitPerUnit * cost.yieldQty;
		const hours = recipe.laborMinutes / 60;
		const hourlyCents = hours > 0 ? Math.round(profitBatch / hours) : null;
		const marginNow = p > 0 ? ((p - cost.perUnitCents) / p) * 100 : 0;
		return { price: p, profitPerUnit, profitBatch, hourlyCents, marginNow };
	});
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
				<div class="brow"><span class="grow">Tu tiempo <span class="small muted">{recipe.laborMinutes} min</span></span><Money cents={cost.laborCents} size="sm" /></div>
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
			<input type="checkbox" checked={settings.includeLabor} onchange={() => toggle('includeLabor')} />
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
			<input type="checkbox" checked={settings.includeOverhead} onchange={() => toggle('includeOverhead')} />
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
			<input type="checkbox" checked={settings.includeWaste} onchange={() => toggle('includeWaste')} />
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
			<input type="range" min="10" max="80" step="5" value={margin} oninput={(e) => onMargin(Number(e.currentTarget.value))} aria-label="Margen" />
			<p class="hint">De cada quetzal que cobras, {margin} centavos son ganancia y {100 - margin} pagan la receta. No es lo mismo que “subirle {Math.round((margin / (100 - margin)) * 100)}% al costo”, aunque da el mismo precio.</p>
			<div class="big">
				<div class="small muted">Con ese margen, cada {unitName} saldría en</div>
				<Money cents={priceRounded} size="xl" />
				<div class="small muted">exacto {formatMoney(price)} · ganarías <span class="money" style="color: var(--pistacho)">{formatMoney(profitPerUnit)}</span> por {unitName}</div>
			</div>
		</div>

		{#if today}
			<div class="today" class:bad={today.profitPerUnit < 0}>
				<div class="small muted">Hoy lo vendes a {formatMoney(today.price)}</div>
				{#if today.profitPerUnit < 0}
					<p><strong>Pierdes {formatMoney(-today.profitPerUnit)} por {unitName}</strong> sin contar tu tiempo: los ingredientes{cost.overheadCents ? ', el gas' : ''}{cost.extrasCents ? ' y el empaque' : ''} cuestan más que el precio.</p>
				{:else}
					<p>Te quedan <strong class="money">{formatMoney(today.profitPerUnit)}</strong> por {unitName} después de ingredientes{cost.overheadCents ? ', gas' : ''}{cost.extrasCents ? ' y empaque' : ''}.
					{#if today.hourlyCents !== null}
						En {fmtTime(recipe.laborMinutes)} de trabajo son <strong class="money">{formatMoney(today.profitBatch)}</strong>: <strong class="money">{formatMoney(today.hourlyCents)} la hora</strong>.
					{/if}
					</p>
					{#if today.hourlyCents !== null && today.hourlyCents < settings.hourlyRateCents}
						<p class="hint">Tú dijiste que tu hora vale {formatMoney(settings.hourlyRateCents)}. No hace falta subir al precio sugerido de golpe: cada quetzal que subas va directo a tu hora.</p>
					{/if}
				{/if}
			</div>
		{:else}
			<p class="hint">¿Ya lo vendes? Pon lo que cobras hoy en la pestaña Receta y aquí verás cuánto te queda de verdad y a cuánto sale tu hora.</p>
		{/if}

		<h3 style="margin-top: 8px">Por volumen</h3>
		<p class="hint">Los ingredientes cuestan lo mismo por pieza vendas 1 o 100. El descuento sale de aceptar menos margen, y aquí lo ves.</p>
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
		<h2>¿Me conviene?</h2>
		<p class="hint">Te piden una cantidad y te ofrecen un precio. Pon los dos números.</p>
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
	.opt input {
		width: 22px;
		height: 22px;
		margin: 2px 0 0;
		accent-color: var(--pistacho);
		flex-shrink: 0;
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
