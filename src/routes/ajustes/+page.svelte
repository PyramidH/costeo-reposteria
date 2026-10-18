<script lang="ts">
	import { store } from '#lib/data/store.svelte.ts';
	import { CURRENCIES, type CostingSettings } from '#lib/costing';
	import MoneyInput from '#lib/ui/MoneyInput.svelte';

	const b = $derived(store.business);
	const s = $derived(b?.settings);

	async function patch(p: Partial<CostingSettings>) {
		if (!b) return;
		await store.saveBusiness({ settings: { ...b.settings, ...p } });
	}

	let hourly = $state(0);
	let fixed = $state(0);
	let hours = $state(0);
	let seeded = $state(false);
	$effect(() => {
		if (seeded || !s) return;
		hourly = s.hourlyRateCents;
		fixed = s.monthlyFixedCents;
		hours = Math.round(s.monthlyProductionMinutes / 60);
		seeded = true;
	});
</script>

<div class="page">
	<div class="page-head"><h1>Ajustes</h1></div>

	{#if b && s}
		<div class="stack" style="gap: 28px">
			<section class="stack">
				<h2>Mi negocio</h2>
				<label class="field">
					<span>Nombre</span>
					<input class="input" value={b.name} onchange={(e) => store.saveBusiness({ name: e.currentTarget.value.trim() || 'Mi negocio' })} />
				</label>
				<label class="field">
					<span>Moneda</span>
					<select class="input" value={b.currency} onchange={(e) => store.saveBusiness({ currency: e.currentTarget.value })}>
						{#each Object.values(CURRENCIES) as c}<option value={c.code}>{c.code} ({c.symbol})</option>{/each}
					</select>
				</label>
			</section>

			<section class="stack">
				<h2>Cómo costear</h2>
				<label class="field">
					<span>Margen de ganancia por defecto</span>
					<div class="row">
						<input type="range" min="10" max="80" step="5" value={s.defaultMarginPct} oninput={(e) => patch({ defaultMarginPct: Number(e.currentTarget.value) })} class="grow" aria-label="Margen por defecto" />
						<span class="money" style="width: 48px; text-align: right">{s.defaultMarginPct}%</span>
					</div>
					<p class="hint">Cada receta puede tener el suyo; este es el que se usa si no lo cambias.</p>
				</label>

				<div class="field">
					<span>Mi hora de trabajo vale</span>
					<div onfocusout={() => hourly > 0 && patch({ hourlyRateCents: hourly })}><MoneyInput bind:cents={hourly} label="Valor por hora" /></div>
				</div>

				<div class="field">
					<span>Gastos fijos al mes (gas, luz, agua, internet, renta)</span>
					<div onfocusout={() => fixed >= 0 && patch({ monthlyFixedCents: fixed })}><MoneyInput bind:cents={fixed} label="Gastos fijos al mes" /></div>
				</div>

				<label class="field">
					<span>Horas que produzco al mes</span>
					<input class="input" type="number" min="1" inputmode="numeric" bind:value={hours} onchange={() => hours > 0 && patch({ monthlyProductionMinutes: hours * 60 })} />
					<p class="hint">Sirve para repartir los gastos fijos entre lo que horneas. Si trabajas 4 horas al día, 5 días a la semana, son unas 80.</p>
				</label>

				<label class="field">
					<span>Mi libra pesa</span>
					<select class="input" value={String(s.lbGrams)} onchange={(e) => patch({ lbGrams: Number(e.currentTarget.value) })}>
						<option value="460">460 g (libra de mercado en Guatemala)</option>
						<option value="453.592">453.6 g (libra internacional)</option>
					</select>
				</label>
			</section>

			<section class="stack">
				<h2>Mis datos</h2>
				<p class="hint">Todo se guarda en este teléfono. Si lo cambias o lo pierdes, se pierde. Pronto podrás respaldarlo con una cuenta.</p>
			</section>

			<p class="small muted">Costeo v0.1.0</p>
		</div>
	{/if}
</div>
