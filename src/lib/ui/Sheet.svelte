<script lang="ts">
	import type { Snippet } from 'svelte';

	let { open = $bindable(false), title, children }: { open: boolean; title: string; children: Snippet } = $props();

	let dialog: HTMLDialogElement;

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		else if (!open && dialog.open) dialog.close();
	});

	function onClickBackdrop(e: MouseEvent) {
		if (e.target === dialog) open = false;
	}
</script>

<dialog bind:this={dialog} onclose={() => (open = false)} onclick={onClickBackdrop}>
	<div class="sheet">
		<div class="handle" aria-hidden="true"></div>
		<div class="sheet-head">
			<h2>{title}</h2>
			<button class="close" onclick={() => (open = false)} aria-label="Cerrar">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
			</button>
		</div>
		<div class="sheet-body stack">
			{@render children()}
		</div>
	</div>
</dialog>

<style>
	dialog {
		border: 0;
		padding: 0;
		margin: 0;
		max-width: 100vw;
		max-height: 100dvh;
		width: 100%;
		height: 100%;
		background: transparent;
		display: flex;
		align-items: flex-end;
		justify-content: center;
	}
	dialog:not([open]) {
		display: none;
	}
	dialog::backdrop {
		background: rgba(43, 29, 21, 0.45);
	}
	.sheet {
		width: 100%;
		max-width: 480px;
		max-height: 92dvh;
		overflow: auto;
		background: var(--paper);
		border-radius: var(--r-lg) var(--r-lg) 0 0;
		padding: 8px 16px calc(20px + var(--safe-b));
		animation: up 180ms ease-out;
	}
	@keyframes up {
		from {
			transform: translateY(24px);
			opacity: 0;
		}
	}
	.handle {
		width: 40px;
		height: 4px;
		border-radius: 2px;
		background: var(--linea);
		margin: 0 auto 12px;
	}
	.sheet-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 16px;
	}
	.close {
		width: 40px;
		height: 40px;
		display: grid;
		place-items: center;
		border-radius: 50%;
		color: var(--ink-2);
	}
	.close:hover {
		background: var(--merengue);
	}
</style>
