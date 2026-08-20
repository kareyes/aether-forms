<script lang="ts">
	import { pipe, Schema } from "effect";
	import { withField, withFormLayout } from "$lib/index.js";
	import { createForm, SchemaForm } from "$lib/svelte/index.js";

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
				Schema.minLength(2, { message: () => "At least 2 characters" }),
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
			newsletter: pipe(
				Schema.optional(Schema.Boolean),
				withField({ label: "Send me product updates", inputType: "switch", step: 3, order: 6 }),
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

	const form = createForm(SignupSchema);
	let submitted = $state<string | undefined>(undefined);
</script>

<div class="space-y-6">
	<div class="space-y-2">
		<h1 class="text-2xl font-semibold">Multi-step wizard</h1>
		<p class="text-muted-foreground">
			Steps are an annotation on each field. Pressing Next validates only the
			step you are on — the later steps' empty required fields do not block it.
			Completed steps stay clickable; steps ahead do not.
		</p>
	</div>

	<SchemaForm
		{form}
		onSubmit={(data) => {
			submitted = JSON.stringify(data, null, 2);
		}}
	/>

	{#if submitted}
		<pre class="overflow-x-auto rounded-lg border bg-muted p-4 text-sm">{submitted}</pre>
	{/if}
</div>
