<script lang="ts">
	import { page } from '$app/state';
	import Sheet from './Sheet.svelte';

	const APP_VERSION = '0.1.0';
	const phone = import.meta.env.VITE_SUGGEST_WHATSAPP as string | undefined;

	let open = $state(false);
	let text = $state('');

	const body = $derived(
		`${text.trim()}\n\n— Costeo v${APP_VERSION}, pantalla ${page.url.pathname}`
	);

	function send() {
		const msg = encodeURIComponent(body);
		const url = `https://wa.me/${phone}?text=${msg}`;
		window.open(url, '_blank', 'noopener');
		open = false;
		text = '';
	}
</script>

{#if phone}
<button class="suggest" onclick={() => (open = true)} aria-label="Enviar sugerencia">
	<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-5A8 8 0 1121 12z" />
	</svg>
	<span>Sugerencias</span>
</button>

<Sheet bind:open title="¿Qué mejorarías?">
	<p class="hint">Esta app se construye con lo que ustedes nos cuentan. Dinos qué te falta, qué no entendiste o qué te estorba.</p>
	<textarea class="input" rows="5" bind:value={text} placeholder="Por ejemplo: no encuentro cómo poner la mitad de un huevo"></textarea>
	<button class="btn btn-primary btn-block" disabled={!text.trim()} onclick={send}>
		Enviar por WhatsApp
	</button>
</Sheet>
{/if}

<style>
	.suggest {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		border-radius: 999px;
		color: var(--ink-2);
		font-size: 0.875rem;
		font-weight: 600;
		background: var(--merengue);
	}
	.suggest:hover {
		color: var(--ink);
	}
	textarea.input {
		resize: vertical;
		min-height: 120px;
	}
</style>
