<script lang="ts" module>
	export type { StepRenderContext } from '../index.js';
</script>

<script lang="ts">
	import SchemaSection from './schema-section.svelte';
	import type { StepRenderContext } from '../index.js';
	import { cn } from 'aether-ui/utils';

	interface Props {
		ctx: StepRenderContext;
		sectionVariant?: 'default' | 'card' | 'collapsible';
		currentStep: number;
		class?: string;
	}

	let { ctx, sectionVariant = 'default', currentStep, class: className }: Props = $props();

	const step = $derived(ctx.step);
	// Compute isActive reactively based on the current step prop
	const isActive = $derived(step.step === currentStep);
</script>

<div
	class={cn('space-y-6', !isActive && 'hidden', className)}
	role="tabpanel"
	aria-labelledby={`step-${step.step}-trigger`}
	id={`step-${step.step}-panel`}
>
	{#if step.title || step.description}
		<div class="space-y-1">
			{#if step.title}
				<h2 class="text-xl font-semibold">{step.title}</h2>
			{/if}
			{#if step.description}
				<p class="text-muted-foreground">{step.description}</p>
			{/if}
		</div>
	{/if}

	<div class="space-y-6">
		{#each ctx.sections as sectionCtx (sectionCtx.section.id)}
			<SchemaSection ctx={sectionCtx} variant={sectionVariant} />
		{/each}
	</div>
</div>
