<script lang="ts" module>
	export type { FieldRenderContext } from "../index.js";
</script>

<script lang="ts">
	import {
		Checkbox,
		DatePicker,
		Field,
		FileInput,
		Input,
		RadioGroup,
		Select,
		Switch,
		Textarea,
	} from "aether-ui";
	import type { SelectPrimitives } from "aether-ui";
	import type { FieldRenderContext } from "../index.js";
	import { type DateValue, parseDate } from "@internationalized/date";

	// Reached through the namespace export rather than the module path they are
	// declared in: `aether-ui` publishes the namespace, not that internal path.
	type SelectOption = SelectPrimitives.SelectOption;
	type SelectOptionGroup = SelectPrimitives.SelectOptionGroup;

	interface Props {
		ctx: FieldRenderContext;
		class?: string;
	}

	let { ctx, class: className }: Props = $props();

	const field = $derived(ctx.field);
	const showError = $derived(ctx.showError);
	const error = $derived(showError ? ctx.error : undefined);

	// Convert options format for Select component
	const selectOptions = $derived(
		field.options?.map((opt) => ({
			value: opt.value,
			label: opt.label,
			disabled: opt.disabled,
		})) as SelectOption[] | undefined,
	);

	const selectGroups = $derived(
		field.optionGroups?.map((group) => ({
			label: group.label,
			options: group.options.map((opt) => ({
				value: opt.value,
				label: opt.label,
				disabled: opt.disabled,
			})),
		})) as SelectOptionGroup[] | undefined,
	);

	// Convert options for RadioGroup (requires id property)
	const radioOptions = $derived(
		field.options?.map((opt, idx) => ({
			id: `${field.name}-${idx}`,
			value: opt.value,
			label: opt.label,
			disabled: opt.disabled,
		})) ?? [],
	);

	// Handle value changes
	function handleChange(value: unknown) {
		ctx.onChange(value);
	}

	function handleBlur() {
		ctx.onBlur();
	}

	// Checkbox/Switch specific handler
	function handleCheckChange(checked: boolean) {
		ctx.onChange(checked);
	}

	// Input event handler
	function handleInputEvent(e: Event) {
		const target = e.target as HTMLInputElement;
		let value: unknown = target.value;

		if (field.inputType === "number" && target.value !== "") {
			value = Number(target.value);
		}

		handleChange(value);
	}

	// Textarea event handler
	function handleTextareaEvent(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		handleChange(target.value);
	}
</script>

{#if field.inputType === "text" || field.inputType === "email" || field.inputType === "password" || field.inputType === "tel" || field.inputType === "url" || field.inputType === "number"}
	<Field
		label={field.label}
		description={field.description}
		descriptionPosition="after"
		{error}
		required={field.required}
		disabled={field.disabled}
		class={className}
	>
		<Input
			type={field.inputType === "number" ? "number" : field.inputType}
			value={ctx.value as string | number | undefined}
			placeholder={field.placeholder}
			disabled={field.disabled}
			readonly={field.readonly}
			mask={field.mask}
			error={showError && !!error}
			oninput={handleInputEvent}
			onblur={handleBlur}
		/>
	</Field>
{:else if field.inputType === "textarea"}
	<Field
		label={field.label}
		description={field.description}
		descriptionPosition="after"
		{error}
		required={field.required}
		disabled={field.disabled}
		class={className}
	>
		<Textarea
			value={ctx.value as string | undefined}
			placeholder={field.placeholder}
			disabled={field.disabled}
			readonly={field.readonly}
			error={showError && !!error}
			oninput={handleTextareaEvent}
			onblur={handleBlur}
		/>
	</Field>
{:else if field.inputType === "select" || field.inputType === "combobox"}
	<Field
		label={field.label}
		description={field.description}
		descriptionPosition="after"
		{error}
		required={field.required}
		disabled={field.disabled}
		class={className}
	>
		<Select
			value={ctx.value as string | undefined}
			placeholder={field.placeholder}
			options={selectOptions ?? []}
			groups={selectGroups}
			disabled={field.disabled}
			error={showError && !!error}
			onSelectionChange={(v: string | undefined) => handleChange(v)}
		/>
	</Field>
{:else if field.inputType === "date"}
	<Field
		label={field.label}
		description={field.description}
		descriptionPosition="after"
		{error}
		required={field.required}
		disabled={field.disabled}
		class={className}
	>
		<DatePicker
			value={ctx.value ? parseDate(ctx.value as string) : undefined}
			disabled={field.disabled}
			error={showError && !!error}
			onValueChange={(v: DateValue | undefined) =>
				handleChange(v?.toString())}
		/>
	</Field>
{:else if field.inputType === "checkbox"}
	<Field
		label={field.label}
		description={field.description}
		descriptionPosition="after"
		{error}
		required={field.required}
		disabled={field.disabled}
		orientation="horizontal"
		labelPosition="after"
		class={className}
	>
		<Checkbox
			checked={ctx.value as boolean | undefined}
			disabled={field.disabled}
			onCheckedChange={handleCheckChange}
		/>
	</Field>
{:else if field.inputType === "switch"}
	<Field
		label={field.label}
		description={field.description}
		descriptionPosition="after"
		{error}
		required={field.required}
		disabled={field.disabled}
		orientation="horizontal"
		labelPosition="after"
		class={className}
	>
		<Switch
			checked={ctx.value as boolean | undefined}
			disabled={field.disabled}
			onCheckedChange={handleCheckChange}
		/>
	</Field>
{:else if field.inputType === "radio"}
	<Field
		label={field.label}
		description={field.description}
		descriptionPosition="after"
		{error}
		required={field.required}
		disabled={field.disabled}
		class={className}
	>
		<RadioGroup
			options={radioOptions}
			value={ctx.value as string | undefined}
			disabled={field.disabled}
			onValueChange={(v) => handleChange(v)}
		/>
	</Field>
{:else if field.inputType === "file"}
	<Field
		label={field.label}
		description={field.description}
		descriptionPosition="after"
		{error}
		required={field.required}
		disabled={field.disabled}
		class={className}
	>
		<FileInput
			mode={field.fileMode ?? "drag-drop"}
			files={ctx.value as FileList | null}
			multiple={field.multiple}
			accept={field.accept}
			disabled={field.disabled}
			error={showError && !!error}
			onFilesChange={(files) => {
				handleChange(files);
				handleBlur();
			}}
			onblur={handleBlur}
		/>
	</Field>
{:else if field.inputType === "hidden"}
	<input
		type="hidden"
		name={field.name}
		value={ctx.value as string | undefined}
	/>
{:else}
	<Field
		label={field.label}
		description={field.description}
		descriptionPosition="after"
		{error}
		required={field.required}
		disabled={field.disabled}
		class={className}
	>
		<Input
			type="text"
			value={ctx.value as string | undefined}
			placeholder={field.placeholder}
			disabled={field.disabled}
			readonly={field.readonly}
			error={showError && !!error}
			oninput={handleInputEvent}
			onblur={handleBlur}
		/>
	</Field>
{/if}
