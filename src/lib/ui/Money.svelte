<script lang="ts">
	import { CURRENCIES, formatMoney } from '#lib/costing';
	import { store } from '#lib/data/store.svelte.ts';

	let { cents, size = 'md' }: { cents: number; size?: 'sm' | 'md' | 'lg' | 'xl' } = $props();
	const cur = $derived(CURRENCIES[store.business?.currency ?? 'GTQ'] ?? CURRENCIES.GTQ);
</script>

<span class="money {size}">{formatMoney(cents, cur)}</span>

<style>
	.sm {
		font-size: 0.95rem;
	}
	.md {
		font-size: 1.1rem;
	}
	.lg {
		font-size: 1.6rem;
	}
	.xl {
		font-size: 2.6rem;
		line-height: 1;
	}
</style>
