<script lang="ts">
	import { parseMoney, CURRENCIES } from '#lib/costing';
	import { store } from '#lib/data/store.svelte.ts';

	let { cents = $bindable(0), id, label, placeholder = '0.00' }: { cents: number; id?: string; label?: string; placeholder?: string } = $props();

	const cur = $derived(CURRENCIES[store.business?.currency ?? 'GTQ'] ?? CURRENCIES.GTQ);
	let text = $state(cents ? (cents / 100).toFixed(2) : '');
	let focused = $state(false);

	$effect(() => {
		if (!focused) text = cents ? (cents / 100).toFixed(2) : '';
	});

	function onInput(e: Event) {
		text = (e.target as HTMLInputElement).value;
		const c = parseMoney(text);
		if (c !== null) cents = c;
		else if (!text.trim()) cents = 0;
	}
</script>

<div class="money-in">
	<span class="sym">{cur.symbol}</span>
	<input
		{id}
		class="input"
		type="text"
		inputmode="decimal"
		autocomplete="off"
		aria-label={label}
		{placeholder}
		value={text}
		oninput={onInput}
		onfocus={() => (focused = true)}
		onblur={() => (focused = false)}
	/>
</div>

<style>
	.money-in {
		position: relative;
	}
	.sym {
		position: absolute;
		left: 14px;
		top: 50%;
		transform: translateY(-50%);
		color: var(--ink-2);
		font-family: var(--font-money);
		pointer-events: none;
	}
	.input {
		padding-left: 32px;
		font-variant-numeric: tabular-nums;
	}
</style>
