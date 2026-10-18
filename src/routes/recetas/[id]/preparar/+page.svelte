<script lang="ts">
	import { page } from '$app/state';
	import { store } from '#lib/data/store.svelte.ts';
	import { href as h } from '#lib/ui/href.ts';
	import { singular, fmtTime } from '#lib/ui/words.ts';
	import { formatFraction, isUnitCode, type RecipeLine } from '#lib/costing';
	import { UNIT_LABELS } from '#lib/ui/units-for.ts';
	import QtyInput from '#lib/ui/QtyInput.svelte';

	const recipe = $derived(store.recipe(page.params.id!));
	let target = $state(0);
	let seeded = $state(false);
	$effect(() => {
		if (!seeded && recipe) {
			target = recipe.yieldQty;
			seeded = true;
		}
	});
	const factor = $derived(recipe && recipe.yieldQty > 0 && target > 0 ? target / recipe.yieldQty : 1);

	let checked = $state<Record<string, boolean>>({});
	let step = $state(-1); // -1 = lista de ingredientes
	const steps = $derived(recipe?.steps ?? []);

	function qty(l: RecipeLine): string {
		if (l.kind === 'estimate') return 'al gusto';
		const q = formatFraction(Math.round(l.quantity * factor * 100) / 100);
		if (l.kind === 'ingredient') return `${q} ${UNIT_LABELS[l.unit]}`;
		const sub = store.recipe(l.recipeId);
		if (l.unit === 'yield') return `${q} × receta${sub ? ` de ${sub.name}` : ''}`;
		return `${q} ${UNIT_LABELS[l.unit]}`;
	}
	function label(l: RecipeLine): string {
		if (l.kind === 'ingredient') return store.ingredient(l.ingredientId)?.name ?? '—';
		if (l.kind === 'subrecipe') return store.recipe(l.recipeId)?.name ?? '—';
		return l.label;
	}

	// Mantener la pantalla encendida mientras se cocina, si el navegador lo permite.
	$effect(() => {
		let lock: { release: () => Promise<void> } | null = null;
		const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
		nav.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => {});
		return () => void lock?.release();
	});
</script>

<div class="page prep">
	{#if !recipe}
		<p class="muted">{store.ready ? 'Esta receta no existe.' : 'Cargando…'}</p>
	{:else}
		<div class="row" style="margin-bottom: 8px">
			<a href={h(`/recetas/${recipe.id}`)} class="back" aria-label="Volver a la receta">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
			</a>
			<h1 class="grow">{recipe.name}</h1>
		</div>

		{#if step === -1}
			<div class="row" style="margin: 8px 0 20px; align-items: flex-end">
				<div class="field" style="width: 110px">
					<span>Voy a hacer</span>
					<QtyInput bind:value={target} label="Cantidad a preparar" />
				</div>
				<span class="muted" style="padding-bottom: 12px">{target === 1 ? singular(recipe.yieldUnit) : recipe.yieldUnit}{factor !== 1 ? ` · receta × ${formatFraction(Math.round(factor * 100) / 100)}` : ''}</span>
			</div>

			<h2>Ingredientes</h2>
			<p class="hint" style="margin-bottom: 8px">Ve marcando lo que ya pesaste.</p>
			<div class="list">
				{#each recipe.lines as l (l.id)}
					<label class="ing" class:done={checked[l.id]}>
						<input type="checkbox" bind:checked={checked[l.id]} />
						<span class="grow">{label(l)}</span>
						<span class="money">{qty(l)}</span>
					</label>
				{/each}
			</div>

			{#if recipe.notes}
				<h2 style="margin-top: 24px">Notas</h2>
				<p class="notes">{recipe.notes}</p>
			{/if}

			{#if steps.length}
				<button class="btn btn-primary btn-block" style="margin-top: 28px" onclick={() => (step = 0)}>Empezar · {steps.length} pasos</button>
			{:else}
				<p class="hint" style="margin-top: 28px">Esta receta no tiene pasos todavía. Puedes agregarlos en la pestaña Receta, sección Preparación.</p>
			{/if}
		{:else}
			{@const s = steps[step]}
			<div class="progress" aria-hidden="true">
				{#each steps as _, i}<span class:on={i <= step}></span>{/each}
			</div>
			<div class="step">
				<div class="small muted">Paso {step + 1} de {steps.length}{s.minutes ? ` · ${fmtTime(s.minutes)}` : ''}</div>
				<p class="step-text">{s.text}</p>
			</div>
			<div class="row" style="margin-top: auto">
				<button class="btn btn-secondary grow" onclick={() => step--}>{step === 0 ? 'Ingredientes' : 'Anterior'}</button>
				{#if step < steps.length - 1}
					<button class="btn btn-primary grow" onclick={() => step++}>Siguiente</button>
				{:else}
					<a href={h(`/recetas/${recipe.id}`)} class="btn btn-primary grow">Listo</a>
				{/if}
			</div>
		{/if}
	{/if}
</div>

<style>
	.prep {
		display: flex;
		flex-direction: column;
		min-height: calc(100dvh - 56px);
	}
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
		font-size: 1.4rem;
	}
	.ing {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 0;
		font-size: 1.05rem;
	}
	.ing input {
		width: 24px;
		height: 24px;
		accent-color: var(--pistacho);
		flex-shrink: 0;
	}
	.ing.done {
		color: var(--ink-3);
		text-decoration: line-through;
	}
	.ing .money {
		font-size: 1.05rem;
	}
	.notes {
		white-space: pre-wrap;
		line-height: 1.5;
		padding: 12px 16px;
		background: var(--mantequilla-suave);
		border-radius: var(--r-md);
	}
	.progress {
		display: flex;
		gap: 4px;
		margin: 12px 0 24px;
	}
	.progress span {
		flex: 1;
		height: 4px;
		border-radius: 2px;
		background: var(--linea);
	}
	.progress span.on {
		background: var(--fresa);
	}
	.step {
		flex: 1;
	}
	.step-text {
		font-family: var(--font-money);
		font-size: 1.6rem;
		line-height: 1.3;
		margin-top: 8px;
		white-space: pre-wrap;
	}
</style>
