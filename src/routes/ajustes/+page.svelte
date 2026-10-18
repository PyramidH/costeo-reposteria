<script lang="ts">
	import { store } from '#lib/data/store.svelte.ts';
	import { CURRENCIES, type CostingSettings } from '#lib/costing';
	import MoneyInput from '#lib/ui/MoneyInput.svelte';
	import { exportAll, importAll } from '#lib/db';
	import { href as h } from '#lib/ui/href.ts';

	const b = $derived(store.business);
	const s = $derived(b?.settings);

	async function patch(p: Partial<CostingSettings>) {
		if (!b) return;
		await store.saveBusiness({ settings: { ...b.settings, ...p } });
	}

	let fileInput = $state<HTMLInputElement>();
	let backupMsg = $state('');

	async function exportBackup() {
		const data = await exportAll();
		const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = `costeo-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		URL.revokeObjectURL(a.href);
		backupMsg = `Respaldo guardado: ${data.recipes.length} recetas, ${data.ingredients.length} ingredientes.`;
	}

	async function importBackup(e: Event) {
		const f = (e.target as HTMLInputElement).files?.[0];
		if (!f) return;
		try {
			const data = JSON.parse(await f.text());
			if (!confirm('Esto reemplaza lo que tienes en este teléfono por lo del respaldo. ¿Continuar?')) return;
			const n = await importAll(data);
			backupMsg = `Respaldo cargado: ${n.recipes} recetas, ${n.ingredients} ingredientes.`;
		} catch (err) {
			backupMsg = `No se pudo leer el respaldo: ${err instanceof Error ? err.message : String(err)}`;
		}
		(e.target as HTMLInputElement).value = '';
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
					<span>Teléfono o contacto al pie de las cotizaciones (opcional)</span>
					<input class="input" value={b.contact ?? ''} placeholder="5555-1234 · @mipasteleria" onchange={(e) => store.saveBusiness({ contact: e.currentTarget.value.trim() || undefined })} />
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
				<p class="hint">Estos valores se usan en todas tus recetas. Si no estás segura, deja los que vienen: son un punto de partida razonable y los puedes cambiar cuando quieras.</p>
				<label class="field">
					<span>Margen de ganancia por defecto</span>
					<div class="row">
						<input type="range" min="10" max="60" step="5" value={s.defaultMarginPct} oninput={(e) => patch({ defaultMarginPct: Number(e.currentTarget.value) })} class="grow" aria-label="Margen por defecto" />
						<span class="money" style="width: 48px; text-align: right">{s.defaultMarginPct}%</span>
					</div>
					<p class="hint">De cada quetzal que cobras, cuánto es ganancia. 40% equivale a multiplicar el costo por 1.7; 50%, por 2. Cada receta puede tener el suyo.</p>
				</label>

				<div class="field">
					<span>Mi hora de trabajo vale</span>
					<div onfocusout={() => hourly > 0 && patch({ hourlyRateCents: hourly })}><MoneyInput bind:cents={hourly} label="Valor por hora" /></div>
				</div>

				<label class="field">
					<span>Gas, luz y agua</span>
					<select class="input" value={s.overheadMode} onchange={(e) => patch({ overheadMode: e.currentTarget.value as 'percent' | 'monthly' })}>
						<option value="percent">Un porcentaje de los ingredientes (simple)</option>
						<option value="monthly">Mis gastos fijos del mes repartidos (avanzado)</option>
					</select>
				</label>
				{#if s.overheadMode === 'percent'}
					<label class="field">
						<span>Porcentaje sobre ingredientes</span>
						<div class="row">
							<input type="range" min="5" max="25" step="1" value={s.overheadPct} oninput={(e) => patch({ overheadPct: Number(e.currentTarget.value) })} class="grow" aria-label="Porcentaje de gastos" />
							<span class="money" style="width: 48px; text-align: right">{s.overheadPct}%</span>
						</div>
						<p class="hint">Lo que se enseña en los cursos de costeo: entre 10 y 15 % cubre gas, luz y agua en una cocina de casa.</p>
					</label>
				{:else}
					<div class="field">
						<span>Gastos fijos al mes (gas, luz, agua, internet, renta)</span>
						<div onfocusout={() => fixed >= 0 && patch({ monthlyFixedCents: fixed })}><MoneyInput bind:cents={fixed} label="Gastos fijos al mes" /></div>
					</div>
					<label class="field">
						<span>Horas que produzco al mes</span>
						<input class="input" type="number" min="1" inputmode="numeric" bind:value={hours} onchange={() => hours > 0 && patch({ monthlyProductionMinutes: hours * 60 })} />
						<p class="hint">Los gastos del mes se dividen entre estas horas y cada receta carga la parte de su tiempo de trabajo. Si horneas 4 horas al día, 5 días a la semana, son unas 80.</p>
					</label>
				{/if}

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
				<p class="hint">Todo se guarda en este teléfono y sobrevive a las actualizaciones de la app. Si cambias de teléfono o quieres estar tranquila, guarda un respaldo: es un archivo que puedes volver a cargar aquí.</p>
				<div class="row">
					<button class="btn btn-secondary grow" onclick={exportBackup}>Guardar respaldo</button>
					<button class="btn btn-secondary grow" onclick={() => fileInput?.click()}>Cargar respaldo</button>
					<input bind:this={fileInput} type="file" accept="application/json,.json" hidden onchange={importBackup} />
				</div>
				{#if backupMsg}<p class="hint">{backupMsg}</p>{/if}
			</section>

			<section class="stack">
				<h2>Ayuda</h2>
				<a href={h('/guia')} class="btn btn-secondary" style="align-self: flex-start">Cómo funciona la app</a>
			</section>

			<p class="small muted">Costeo v0.1.0</p>
		</div>
	{/if}
</div>
