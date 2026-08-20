<script lang="ts">
	import "../app.css";
	import { page } from "$app/state";

	let { children } = $props();

	// Auto-discovered so the nav stays in sync as demo pages are added.
	const pages = import.meta.glob("./**/+page.svelte");
	const routes = Object.keys(pages)
		.map((path) => {
			const href = path.replace(/^\.\//, "/").replace(/\/?\+page\.svelte$/, "");
			return { href: href === "" ? "/" : href };
		})
		.sort((a, b) => a.href.localeCompare(b.href));

	const label = (href: string): string =>
		href === "/" ? "Overview" : href.slice(1).replace(/-/g, " ");
</script>

<div class="min-h-screen bg-background text-foreground">
	<header class="border-b">
		<nav class="mx-auto flex max-w-4xl flex-wrap items-center gap-1 p-4">
			<span class="mr-4 font-semibold">aether-forms</span>
			{#each routes as route (route.href)}
				<a
					href={route.href}
					class="rounded-md px-3 py-1.5 text-sm capitalize transition-colors {page.url
						.pathname === route.href
						? 'bg-primary text-primary-foreground'
						: 'hover:bg-muted'}"
				>
					{label(route.href)}
				</a>
			{/each}
		</nav>
	</header>

	<main class="mx-auto max-w-4xl p-6">
		{@render children()}
	</main>
</div>
