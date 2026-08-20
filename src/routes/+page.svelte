<script lang="ts">
	const demos = [
		{
			href: "/simple",
			title: "Sectioned form",
			body: "One schema, two sections, a two-column grid. Every label, placeholder, input type, and column span is read off the schema.",
		},
		{
			href: "/multi-step",
			title: "Multi-step wizard",
			body: "Steps declared as annotations. Advancing validates only the current step, so a later step's empty fields never block the one you are on.",
		},
		{
			href: "/validation",
			title: "Validation behaviour",
			body: "When errors appear, how blank required fields are reported, and that typing in one field never surfaces another field's error.",
		},
	];
</script>

<div class="space-y-6">
	<div class="space-y-2">
		<h1 class="text-3xl font-semibold">aether-forms</h1>
		<p class="text-muted-foreground">
			An Effect Schema is the single source of truth for a form's validation
			rules, types, UI metadata, and layout. Annotate the schema once and the
			form describes itself.
		</p>
	</div>

	<div class="grid gap-4 sm:grid-cols-2">
		{#each demos as demo (demo.href)}
			<a
				href={demo.href}
				class="block space-y-2 rounded-lg border p-4 transition-colors hover:bg-muted"
			>
				<h2 class="font-medium">{demo.title}</h2>
				<p class="text-sm text-muted-foreground">{demo.body}</p>
			</a>
		{/each}
	</div>
</div>
