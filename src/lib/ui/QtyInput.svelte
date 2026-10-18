<script lang="ts">
	import { parseQty, formatFraction } from '#lib/costing';

	/**
	 * Campo de cantidad que acepta fracciones ("1 1/2", "½", "2.5") y
	 * ofrece atajos de fracciones comunes bajo el teclado.
	 */
	let {
		value = $bindable(0),
		placeholder = '0',
		id,
		label
	}: { value: number; placeholder?: string; id?: string; label?: string } = $props();

	let text = $state(value ? formatFraction(value) : '');
	let focused = $state(false);
	let invalid = $state(false);

	// Si el valor cambia desde afuera, refleja.
	$effect(() => {
		if (!focused) text = value ? formatFraction(value) : '';
	});

	function onInput(e: Event) {
		text = (e.target as HTMLInputElement).value;
		const n = parseQty(text);
		invalid = text.trim() !== '' && n === null;
		if (n !== null) value = n;
		else if (text.trim() === '') value = 0;
	}

	function addFrac(f: string) {
		const whole = Math.floor(value);
		text = whole ? `${whole}${f}` : f;
		value = parseQty(text) ?? value;
		invalid = false;
	}
</script>

<div class="qty">
	<input
		{id}
		class="input"
		class:invalid
		type="text"
		inputmode="decimal"
		autocomplete="off"
		aria-label={label}
		{placeholder}
		value={text}
		oninput={onInput}
		onfocus={() => (focused = true)}
		onblur={() => {
			focused = false;
			if (!invalid) text = value ? formatFraction(value) : '';
		}}
	/>
	{#if focused}
		<div class="fracs" role="group" aria-label="Fracciones">
			{#each ['¼', '⅓', '½', '⅔', '¾'] as f}
				<button type="button" onmousedown={(e) => e.preventDefault()} onclick={() => addFrac(f)}>{f}</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.qty {
		position: relative;
	}
	.input.invalid {
		outline: 2px solid var(--fresa);
		background: var(--fresa-suave);
	}
	.fracs {
		position: absolute;
		left: 0;
		right: 0;
		top: calc(100% + 4px);
		z-index: 5;
		display: flex;
		gap: 4px;
		padding: 4px;
		background: var(--paper);
		border: 1px solid var(--linea);
		border-radius: var(--r-md);
		box-shadow: 0 6px 20px rgba(43, 29, 21, 0.12);
	}
	.fracs button {
		flex: 1;
		min-height: 36px;
		border-radius: var(--r-sm);
		background: var(--merengue);
		font-family: var(--font-money);
		font-size: 1.1rem;
	}
	.fracs button:hover {
		background: var(--fresa-suave);
		color: var(--fresa);
	}
</style>
