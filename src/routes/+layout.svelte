<script lang="ts">
	import '@fontsource-variable/figtree';
	import '@fontsource-variable/fraunces/opsz.css';
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';
	import { page } from '$app/state';
	import { href as h, basePrefix } from '#lib/ui/href.ts';
	import { store } from '#lib/data/store.svelte.ts';
	import SuggestButton from '#lib/ui/SuggestButton.svelte';

	let { children }: LayoutProps = $props();

	$effect(() => {
		store.start();
	});

	const tabs = [
		// Recetas: cuaderno. Ingredientes: bol con cuchara. Ajustes: deslizadores.
		{ href: '/', label: 'Recetas', icon: 'M6 3h11a1 1 0 011 1v16a1 1 0 01-1 1H6a2 2 0 01-2-2V5a2 2 0 012-2zM9 3v18M12 8h3M12 12h3' },
		{ href: '/ingredientes', label: 'Ingredientes', icon: 'M4 11h16a8 8 0 01-16 0zM12 11V7m0 0a2 2 0 100-4 2 2 0 000 4z' },
		{ href: '/ajustes', label: 'Ajustes', icon: 'M4 8h10M18 8h2M4 16h4M12 16h8M14 5.5v5M8 13.5v5' }
	];

	const prefix = basePrefix;
	const path = $derived(page.url.pathname.slice(prefix.length) || '/');
	const active = (href: string) =>
		href === '/' ? path === '/' || path.startsWith('/recetas') : path.startsWith(href);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Costeo</title>
</svelte:head>

<div class="shell">
	<header class="top">
		<div class="top-inner">
			<a href={h('/')} class="brand">Costeo</a>
			<SuggestButton />
		</div>
	</header>

	<main>
		{@render children()}
	</main>

	<nav class="nav" aria-label="Secciones">
		{#each tabs as t}
			<a href={h(t.href)} class:active={active(t.href)} aria-current={active(t.href) ? 'page' : undefined}>
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
					<path d={t.icon} />
				</svg>
				<span>{t.label}</span>
			</a>
		{/each}
	</nav>
</div>

<style>
	.shell {
		min-height: 100dvh;
	}
	.top {
		position: sticky;
		top: 0;
		z-index: 10;
		background: var(--paper);
		border-bottom: 1px solid var(--linea);
	}
	.top-inner {
		max-width: 480px;
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 16px;
	}
	.brand {
		font-family: var(--font-money);
		font-weight: 600;
		font-size: 1.25rem;
		text-decoration: none;
		color: var(--fresa);
	}
	.nav {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 10;
		display: flex;
		justify-content: center;
		background: var(--merengue);
		border-top: 1px solid var(--linea);
		padding-bottom: var(--safe-b);
	}
	.nav a {
		flex: 1;
		max-width: 160px;
		height: var(--nav-h);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 3px;
		text-decoration: none;
		color: var(--ink-3);
		font-size: 0.75rem;
		font-weight: 600;
	}
	.nav a.active {
		color: var(--fresa);
	}
</style>
