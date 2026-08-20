<script lang="ts" module>
	export type { SectionRenderContext } from "../index.js";
</script>

<script lang="ts">
	import { AccordionPrimitives, Separator, Card } from "aether-ui";
	import SchemaField from "./schema-field.svelte";
	import type { SectionRenderContext } from "../index.js";
	import { cn } from "aether-ui/utils";

	interface Props {
		ctx: SectionRenderContext;
		variant?: "default" | "card" | "collapsible";
		class?: string;
	}

	let { ctx, variant = "default", class: className }: Props = $props();

	const section = $derived(ctx.section);
	const hasHeader = $derived(!!section.title || !!section.description);
	const isCollapsible = $derived(
		section.collapsible ?? variant === "collapsible",
	);
</script>

{#if variant === "card"}
	<Card
		class={className}
		title={section.title}
		description={section.description}
	>
		<div class={ctx.gridClass}>
			{#each ctx.fields as fieldCtx (fieldCtx.field.name)}
				<div class={fieldCtx.colSpanClass}>
					<SchemaField ctx={fieldCtx} />
				</div>
			{/each}
		</div>
	</Card>
{:else if isCollapsible}
	<AccordionPrimitives.Root
		variant="shadow"
		type="single"
		value={section.defaultCollapsed ? undefined : section.id}
		class={className}
	>
		<AccordionPrimitives.Item value={section.id}>
			<AccordionPrimitives.Trigger class="w-full">
				<div class="flex flex-col items-start text-left">
					{#if section.title}
						<span class="font-medium">{section.title}</span>
					{/if}
					{#if section.description}
						<span class="text-sm text-muted-foreground"
							>{section.description}</span
						>
					{/if}
				</div>
			</AccordionPrimitives.Trigger>
			<AccordionPrimitives.Content>
				<div class={cn(ctx.gridClass, "pt-4")}>
					{#each ctx.fields as fieldCtx (fieldCtx.field.name)}
						<div class={fieldCtx.colSpanClass}>
							<SchemaField ctx={fieldCtx} />
						</div>
					{/each}
				</div>
			</AccordionPrimitives.Content>
		</AccordionPrimitives.Item>
	</AccordionPrimitives.Root>
{:else}
	<div class={cn("space-y-4", className)}>
		{#if hasHeader}
			<div class="space-y-1">
				{#if section.title}
					<h3 class="text-lg font-medium">{section.title}</h3>
				{/if}
				{#if section.description}
					<p class="text-sm text-muted-foreground">
						{section.description}
					</p>
				{/if}
			</div>
			<Separator />
		{/if}
		<div class={ctx.gridClass}>
			{#each ctx.fields as fieldCtx (fieldCtx.field.name)}
				<div class={fieldCtx.colSpanClass}>
					<SchemaField ctx={fieldCtx} />
				</div>
			{/each}
		</div>
	</div>
{/if}
