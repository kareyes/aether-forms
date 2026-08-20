<script lang="ts">
	import { pipe, Schema } from "effect";
	import { withField, withFormLayout } from "$lib/index.js";
	import { createForm, SchemaForm } from "$lib/svelte/index.js";

	const ProfileSchema = pipe(
		Schema.Struct({
			firstName: pipe(
				Schema.String,
				Schema.minLength(2, { message: () => "At least 2 characters" }),
				withField({ label: "First name", section: "personal", order: 1, colSpan: 6 }),
			),
			lastName: pipe(
				Schema.String,
				Schema.minLength(2, { message: () => "At least 2 characters" }),
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
			role: pipe(
				Schema.Literal("engineer", "designer", "manager"),
				withField({
					label: "Role",
					inputType: "select",
					placeholder: "Pick one",
					options: [
						{ value: "engineer", label: "Engineer" },
						{ value: "designer", label: "Designer" },
						{ value: "manager", label: "Manager" },
					],
					section: "contact",
					order: 5,
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
					order: 6,
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

	const form = createForm(ProfileSchema);
	let submitted = $state<string | undefined>(undefined);
</script>

<div class="space-y-6">
	<div class="space-y-2">
		<h1 class="text-2xl font-semibold">Sectioned form</h1>
		<p class="text-muted-foreground">
			Two sections on a twelve-column grid. Nothing below is laid out by hand —
			the section titles, the ordering, and every column span come from the
			schema's annotations.
		</p>
	</div>

	<SchemaForm
		{form}
		sectionVariant="card"
		onSubmit={(data) => {
			submitted = JSON.stringify(data, null, 2);
		}}
	/>

	{#if submitted}
		<pre class="overflow-x-auto rounded-lg border bg-muted p-4 text-sm">{submitted}</pre>
	{/if}
</div>
