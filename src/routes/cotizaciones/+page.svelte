<script lang="ts">
	import { store } from '#lib/data/store.svelte.ts';
	import { href as h } from '#lib/ui/href.ts';
	import { formatMoney } from '#lib/costing';
	import { quoteText, quoteDeposit, whatsappShareUrl, formatDate } from '#lib/quote.ts';

	const b = $derived(store.business);
	function resend(id: string) {
		const q = store.quotes.find((x) => x.id === id);
		if (!q || !b) return;
		window.open(whatsappShareUrl(quoteText(q, b)), '_blank', 'noopener');
	}
	async function remove(id: string) {
		if (confirm('¿Borrar esta cotización?')) await store.deleteQuote(id);
	}
	const fmtCreated = (iso: string) => new Date(iso).toLocaleDateString('es-GT', { day: 'numeric', month: 'short' });
</script>

<div class="page">
	<div class="page-head">
		<h1>Cotizaciones</h1>
		<a href={h('/cotizar')} class="btn btn-primary">Nueva</a>
	</div>

	{#if !store.quotes.length}
		<div class="empty">
			<h2>Aquí quedan tus cotizaciones</h2>
			<p>Cada pedido que cotices se guarda para que recuerdes qué ofreciste, a quién y para cuándo.</p>
			<a href={h('/cotizar')} class="btn btn-primary" style="margin-top: 20px">Cotizar un pedido</a>
		</div>
	{:else}
		<div class="list">
			{#each store.quotes as q (q.id)}
				<div class="q">
					<div class="row" style="align-items: flex-start">
						<div class="grow">
							<div class="who">{q.client || 'Sin nombre'} <span class="small muted">· {fmtCreated(q.createdAt)}</span></div>
							<div class="small muted">{q.lines.map((l) => `${l.qty} ${l.name}`).join(', ')}</div>
							{#if q.deliveryDate}<div class="small muted">Entrega {formatDate(q.deliveryDate)}</div>{/if}
						</div>
						<div style="text-align: right">
							<div class="money" style="color: var(--fresa)">{formatMoney(q.totalCents)}</div>
							{#if q.depositPct > 0 && q.depositPct < 100}<div class="small muted">anticipo {formatMoney(quoteDeposit(q))}</div>{/if}
						</div>
					</div>
					<div class="row" style="gap: 8px">
						<button class="btn btn-secondary small-btn" onclick={() => resend(q.id)}>Reenviar</button>
						<button class="btn btn-ghost small-btn" onclick={() => remove(q.id)}>Borrar</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.q {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 14px 0;
	}
	.who {
		font-weight: 600;
	}
	.small-btn {
		min-height: 36px;
		padding: 0 14px;
		font-size: 0.875rem;
	}
</style>
