<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { pipe, Schema } from "effect";
	import { withField, withFormLayout } from "$lib/index.js";
	import { createForm } from "../form.svelte.js";
	import SchemaForm from "../schema-form.svelte";

	const { Story } = defineMeta({
		title: "Forms/SchemaForm",
		component: SchemaForm,
		tags: ["autodocs"],
		parameters: {
			docs: {
				description: {
					component:
						"Renders an annotated Effect Schema as a form. Labels, input types, " +
						"sections, steps, column spans, and validation all come from the schema " +
						"— the component is handed a form created by `createForm` and nothing else.",
				},
			},
		},
		argTypes: {
			sectionVariant: {
				control: { type: "select" },
				options: ["default", "card", "collapsible"],
				description: "How each section is framed",
			},
			showStepIndicator: {
				control: { type: "boolean" },
				description: "Show the stepper on a multi-step form",
			},
			submitText: { control: { type: "text" } },
			nextText: { control: { type: "text" } },
			prevText: { control: { type: "text" } },
		},
	});

	const ProfileSchema = pipe(
		Schema.Struct({
			firstName: pipe(
				Schema.String,
				Schema.minLength(2, { message: () => "First name needs at least 2 characters" }),
				withField({ label: "First name", section: "personal", order: 1, colSpan: 6 }),
			),
			lastName: pipe(
				Schema.String,
				Schema.minLength(2, { message: () => "Last name needs at least 2 characters" }),
				withField({ label: "Last name", section: "personal", order: 2, colSpan: 6 }),
			),
			email: pipe(
				Schema.String,
				Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
					message: () => "Enter a valid email address",
				}),
				withField({
					label: "Email",
					inputType: "email",
					placeholder: "you@example.com",
					section: "contact",
					order: 3,
					colSpan: 6,
				}),
			),
			phone: pipe(
				Schema.optional(Schema.String),
				withField({
					label: "Phone",
					inputType: "tel",
					placeholder: "Optional",
					section: "contact",
					order: 4,
					colSpan: 6,
				}),
			),
			bio: pipe(
				Schema.optional(Schema.String),
				withField({
					label: "Bio",
					inputType: "textarea",
					description: "A sentence or two.",
					section: "contact",
					order: 5,
				}),
			),
		}),
		withFormLayout({
			columns: 12,
			gap: "md",
			sections: [
				{ id: "personal", title: "Personal", description: "How we address you.", order: 1 },
				{ id: "contact", title: "Contact", description: "How we reach you.", order: 2 },
			],
		}),
	);

	const CollapsibleSchema = pipe(
		Schema.Struct({
			name: pipe(
				Schema.String,
				Schema.minLength(2, { message: () => "Name needs at least 2 characters" }),
				withField({ label: "Name", section: "basics" }),
			),
			notes: pipe(
				Schema.optional(Schema.String),
				withField({ label: "Notes", inputType: "textarea", section: "advanced" }),
			),
			internalId: pipe(
				Schema.optional(Schema.String),
				withField({ label: "Internal ID", section: "advanced" }),
			),
		}),
		withFormLayout({
			columns: 1,
			sections: [
				{ id: "basics", title: "Basics", order: 1 },
				{
					id: "advanced",
					title: "Advanced",
					description: "Rarely needed.",
					order: 2,
					collapsible: true,
					defaultCollapsed: true,
				},
			],
		}),
	);

	const SignupSchema = pipe(
		Schema.Struct({
			email: pipe(
				Schema.String,
				Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
					message: () => "Enter a valid email address",
				}),
				withField({ label: "Email", inputType: "email", step: 1, order: 1 }),
			),
			password: pipe(
				Schema.String,
				Schema.minLength(8, { message: () => "At least 8 characters" }),
				withField({ label: "Password", inputType: "password", step: 1, order: 2 }),
			),
			company: pipe(
				Schema.String,
				Schema.minLength(2, { message: () => "Company needs at least 2 characters" }),
				withField({ label: "Company", step: 2, order: 3 }),
			),
			size: pipe(
				Schema.Literal("1-10", "11-50", "51+"),
				withField({
					label: "Team size",
					inputType: "radio",
					options: [
						{ value: "1-10", label: "1 – 10" },
						{ value: "11-50", label: "11 – 50" },
						{ value: "51+", label: "51 or more" },
					],
					step: 2,
					order: 4,
				}),
			),
			acceptTerms: pipe(
				Schema.Boolean,
				Schema.filter((v): v is true => v === true, {
					message: () => "You must accept the terms to continue",
				}),
				withField({ label: "I accept the terms", inputType: "checkbox", step: 3, order: 5 }),
			),
		}),
		withFormLayout({
			columns: 1,
			steps: [
				{ step: 1, title: "Account", description: "How you sign in." },
				{ step: 2, title: "Company", description: "Who you work for." },
				{ step: 3, title: "Preferences", description: "Almost done." },
			],
		}),
	);

	const InputTypesSchema = pipe(
		Schema.Struct({
			text: pipe(Schema.optional(Schema.String), withField({ label: "Text", colSpan: 6 })),
			number: pipe(
				Schema.optional(Schema.Number),
				withField({ label: "Number", inputType: "number", colSpan: 6 }),
			),
			select: pipe(
				Schema.optional(Schema.String),
				withField({
					label: "Select",
					inputType: "select",
					placeholder: "Pick one",
					options: [
						{ value: "a", label: "Option A" },
						{ value: "b", label: "Option B" },
					],
					colSpan: 6,
				}),
			),
			date: pipe(
				Schema.optional(Schema.String),
				withField({ label: "Date", inputType: "date", colSpan: 6 }),
			),
			checkbox: pipe(
				Schema.optional(Schema.Boolean),
				withField({ label: "Checkbox", inputType: "checkbox", colSpan: 6 }),
			),
			toggle: pipe(
				Schema.optional(Schema.Boolean),
				withField({ label: "Switch", inputType: "switch", colSpan: 6 }),
			),
			textarea: pipe(
				Schema.optional(Schema.String),
				withField({ label: "Textarea", inputType: "textarea" }),
			),
		}),
		withFormLayout({ columns: 12, gap: "md" }),
	);
</script>

<Story
	name="Sectioned"
	args={{ sectionVariant: "default", submitText: "Save profile" }}
>
	{#snippet template(args)}
		<SchemaForm {...args} form={createForm(ProfileSchema)} onSubmit={() => {}} />
	{/snippet}
</Story>

<Story
	name="Sections as cards"
	args={{ sectionVariant: "card", submitText: "Save profile" }}
>
	{#snippet template(args)}
		<SchemaForm {...args} form={createForm(ProfileSchema)} onSubmit={() => {}} />
	{/snippet}
</Story>

<Story name="Collapsible section" args={{ submitText: "Save" }}>
	{#snippet template(args)}
		<SchemaForm {...args} form={createForm(CollapsibleSchema)} onSubmit={() => {}} />
	{/snippet}
</Story>

<Story
	name="Multi-step"
	args={{ showStepIndicator: true, submitText: "Create account" }}
>
	{#snippet template(args)}
		<SchemaForm {...args} form={createForm(SignupSchema)} onSubmit={() => {}} />
	{/snippet}
</Story>

<Story name="Multi-step without indicator" args={{ showStepIndicator: false }}>
	{#snippet template(args)}
		<SchemaForm {...args} form={createForm(SignupSchema)} onSubmit={() => {}} />
	{/snippet}
</Story>

<Story name="Every input type">
	{#snippet template(args)}
		<SchemaForm {...args} form={createForm(InputTypesSchema)} onSubmit={() => {}} />
	{/snippet}
</Story>

<Story
	name="Errors already visible"
	parameters={{
		docs: {
			description: {
				story:
					"Errors normally stay hidden until a field is touched or a submit is " +
					"attempted. This story mounts with `validateOnMount` so every message " +
					"is visible at once.",
			},
		},
	}}
>
	{#snippet template(args)}
		<SchemaForm
			{...args}
			form={createForm(ProfileSchema, {
				validateOnMount: true,
				initialValues: { firstName: "A", email: "not-an-email" },
			})}
			onSubmit={() => {}}
		/>
	{/snippet}
</Story>

<Story name="Custom footer">
	{#snippet template(args)}
		<SchemaForm {...args} form={createForm(ProfileSchema)} onSubmit={() => {}}>
			{#snippet footer({ isSubmitting, isValid, handleSubmit })}
				<div class="flex items-center justify-end gap-3 pt-4">
					<span class="text-sm text-muted-foreground">
						{isValid ? "Ready to save" : "Some fields need attention"}
					</span>
					<button
						type="button"
						class="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
						disabled={isSubmitting}
						onclick={handleSubmit}
					>
						Save
					</button>
				</div>
			{/snippet}
		</SchemaForm>
	{/snippet}
</Story>
