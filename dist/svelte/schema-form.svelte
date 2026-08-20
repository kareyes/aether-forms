<script lang="ts" module>
	import type {
		ExtractedForm,
		FieldErrors,
		FieldRenderContext,
		FormState,
		SectionRenderContext,
		StepRenderContext,
	} from "../index.js";
	import type { SvelteForm } from "./form.svelte.js";

	export type {
		ExtractedForm,
		FieldErrors,
		FieldRenderContext,
		FormState,
		SectionRenderContext,
		StepRenderContext,
		SvelteForm,
	};
</script>

<script lang="ts">
	import { Alert, Button, Spinner, StepperPrimitives } from "aether-ui";
	import { cn } from "aether-ui/utils";
	import type { Snippet } from "svelte";
	import { createSectionContext, createStepContext } from "../index.js";
	import SchemaSection from "./schema-section.svelte";
	import SchemaStep from "./schema-step.svelte";

	interface Props {
		// biome-ignore lint/suspicious/noExplicitAny: the component renders whatever schema it is handed.
		form: SvelteForm<any>;
		// biome-ignore lint/suspicious/noExplicitAny: submit payload is the schema's decoded type.
		onSubmit?: (data: any) => Promise<void> | void;
		onError?: (errors: FieldErrors) => void;
		// biome-ignore lint/suspicious/noExplicitAny: values are the schema's partial type.
		onChange?: (values: any) => void;
		sectionVariant?: "default" | "card" | "collapsible";
		showStepIndicator?: boolean;
		submitText?: string;
		nextText?: string;
		prevText?: string;
		class?: string;
		header?: Snippet;
		footer?: Snippet<
			[
				{
					isSubmitting: boolean;
					isValid: boolean;
					isFirstStep: boolean;
					isLastStep: boolean;
					handleSubmit: () => void;
					handleNext: () => void;
					handlePrev: () => void;
				},
			]
		>;
	}

	let {
		form,
		onSubmit,
		onError,
		onChange,
		sectionVariant = "default",
		showStepIndicator = true,
		submitText = "Submit",
		nextText = "Next",
		prevText = "Back",
		class: className,
		header,
		footer,
	}: Props = $props();

	// `form.state` is a `$state` getter, so every derivation below re-runs on its
	// own when the reducer produces new state. The previous controller was an
	// external observable Svelte could not see, which is why this component used
	// to carry a subscription, a mirrored `$state` copy, and a version counter to
	// force context rebuilds. None of that is needed now.
	const structure = $derived(form.form);
	const isMultiStep = $derived(structure.isMultiStep);
	const totalSteps = $derived(structure.steps.length);
	const currentStep = $derived(form.state.currentStep);
	const isFirstStep = $derived(currentStep === 1);
	const isLastStep = $derived(currentStep === totalSteps);
	const activeStepIndex = $derived(currentStep - 1);

	const sectionContexts = $derived(
		structure.sections.map((section) => createSectionContext(form, section)),
	);
	const stepContexts = $derived(
		structure.steps.map((step) => createStepContext(form, step)),
	);

	let formError = $state<string | undefined>(undefined);

	$effect(() => {
		onChange?.(form.state.values);
	});

	async function handleSubmit() {
		formError = undefined;

		const success = await form.submit(async (data) => {
			try {
				await onSubmit?.(data);
			} catch (err) {
				if (err && typeof err === "object" && "field" in err && "message" in err) {
					form.setFieldError(err.field as string, err.message as string);
					onError?.(form.state.errors);
				} else if (err instanceof Error) {
					formError = err.message;
				} else {
					formError = "An unexpected error occurred";
				}
				throw err;
			}
		});

		if (!success) {
			onError?.(form.state.errors);
		}
	}

	function handleNext() {
		form.nextStep();
	}

	function handlePrev() {
		form.prevStep();
	}

	function handleStepClick(stepIndex: number) {
		const step = stepIndex + 1;
		if (step <= currentStep) {
			form.goToStep(step);
		}
	}

	function advance() {
		if (isMultiStep && !isLastStep) {
			handleNext();
		} else {
			handleSubmit();
		}
	}
</script>

<form
	class={cn("space-y-6", className)}
	onsubmit={(e) => {
		e.preventDefault();
		advance();
	}}
	novalidate
>
	{#if header}
		{@render header()}
	{/if}

	{#if formError}
		<Alert variant="error">
			{formError}
		</Alert>
	{/if}

	{#if isMultiStep}
		{#if showStepIndicator}
			<StepperPrimitives.StepperRoot
				activeStep={activeStepIndex}
				clickable={true}
				onStepClick={handleStepClick}
				class="mb-8"
			>
				{#each structure.steps as step, i (step.step)}
					<StepperPrimitives.StepperStep
						step={i}
						label={step.title}
						description={step.description}
						completed={step.step < currentStep}
					/>
					{#if i < structure.steps.length - 1}
						<StepperPrimitives.StepperSeparator />
					{/if}
				{/each}
			</StepperPrimitives.StepperRoot>
		{/if}

		{#each stepContexts as stepCtx (stepCtx.step.step)}
			<SchemaStep ctx={stepCtx} {sectionVariant} {currentStep} />
		{/each}
	{:else}
		<div class="space-y-6">
			{#each sectionContexts as sectionCtx (sectionCtx.section.id)}
				<SchemaSection ctx={sectionCtx} variant={sectionVariant} />
			{/each}
		</div>
	{/if}

	{#if footer}
		{@render footer({
			isSubmitting: form.state.isSubmitting,
			isValid: form.state.isValid,
			isFirstStep,
			isLastStep,
			handleSubmit,
			handleNext,
			handlePrev,
		})}
	{:else}
		<div class="flex items-center justify-between pt-4">
			<div>
				{#if isMultiStep && !isFirstStep}
					<Button
						type="button"
						variant="outline"
						onclick={handlePrev}
						disabled={form.state.isSubmitting}
					>
						{prevText}
					</Button>
				{/if}
			</div>

			<div class="flex items-center gap-2">
				<Button type="submit" disabled={form.state.isSubmitting}>
					{#if form.state.isSubmitting}
						<Spinner class="mr-2 h-4 w-4" />
						Submitting...
					{:else if isMultiStep && !isLastStep}
						{nextText}
					{:else}
						{submitText}
					{/if}
				</Button>
			</div>
		</div>
	{/if}
</form>
