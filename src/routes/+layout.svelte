<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';
	import { page } from '$app/state';
	import { store } from '#lib/data/store.svelte.ts';
	import SuggestButton from '#lib/ui/SuggestButton.svelte';

	let { children }: LayoutProps = $props();

	$effect(() => {
		store.start();
	});

	const tabs = [
		{ href: '/', label: 'Recetas', icon: 'M4 6h16M4 12h16M4 18h10' },
		{ href: '/ingredientes', label: 'Ingredientes', icon: 'M12 3v18M3 12h18' },
		{ href: '/ajustes', label: 'Ajustes', icon: 'M12 8a4 4 0 100 8 4 4 0 000-8zM3 12h2m14 0h2M12 3v2m0 14v2' }
	];

	const active = (href: string) =>
		href === '/' ? page.url.pathname === '/' || page.url.pathname.startsWith('/recetas') : page.url.pathname.startsWith(href);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Costeo</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="shell">
	<header class="top">
		<div class="top-inner">
			<a href="/" class="brand">Costeo</a>
			<SuggestButton />
		</div>
	</header>

	<main>
		{@render children()}
	</main>

	<nav class="nav" aria-label="Secciones">
		{#each tabs as t}
			<a href={t.href} class:active={active(t.href)} aria-current={active(t.href) ? 'page' : undefined}>
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
