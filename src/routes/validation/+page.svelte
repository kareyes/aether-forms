<script lang="ts">
	import { pipe, Schema } from "effect";
	import { extractForm, createFieldValidators, withField, withFormLayout } from "$lib/index.js";
	import { createForm, SchemaForm } from "$lib/svelte/index.js";

	const AccountSchema = pipe(
		Schema.Struct({
			username: pipe(
				Schema.String,
				Schema.minLength(3, { message: () => "At least 3 characters" }),
				Schema.maxLength(20, { message: () => "At most 20 characters" }),
				withField({ label: "Username", section: "creds", order: 1 }),
			),
			email: pipe(
				Schema.String,
				Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
					message: () => "Enter a valid email address",
				}),
				withField({ label: "Email", inputType: "email", section: "creds", order: 2 }),
			),
			age: pipe(
				Schema.optional(
					pipe(
						Schema.Number,
						Schema.greaterThanOrEqualTo(18, { message: () => "Must be 18 or older" }),
					),
				),
				withField({ label: "Age", inputType: "number", section: "creds", order: 3 }),
			),
		}),
		withFormLayout({
			columns: 1,
			sections: [{ id: "creds", title: "Account", order: 1 }],
		}),
	);

	const form = createForm(AccountSchema);

	// The same validators the form uses, exercised directly so the panel below
	// shows exactly what one field's validation returns in isolation.
	const validators = createFieldValidators(AccountSchema, extractForm(AccountSchema).fields);

	const probes = [
		{ field: "username", value: "ab", note: "too short" },
		{ field: "username", value: "ada", note: "valid" },
		{ field: "username", value: "", note: "blank, required" },
		{ field: "email", value: "nope", note: "malformed" },
		{ field: "email", value: "   ", note: "whitespace only, required" },
		{ field: "age", value: "", note: "blank, optional" },
	] as const;
</script>

<div class="space-y-6">
	<div class="space-y-2">
		<h1 class="text-2xl font-semibold">Validation behaviour</h1>
		<p class="text-muted-foreground">
			Errors stay hidden until a field is touched or a submit is attempted.
			Blur a field while it is empty, or press Submit, to surface them.
		</p>
	</div>

	<SchemaForm {form} onSubmit={() => {}} submitText="Validate everything" />

	<section class="space-y-3">
		<h2 class="font-medium">Single-field validation, in isolation</h2>
		<p class="text-sm text-muted-foreground">
			Each row runs one field's validator on its own. A field's validator never
			consults its siblings, and a blank required field reports as required
			rather than failing whatever pattern it would have failed.
		</p>
		<div class="overflow-x-auto">
			<table class="w-full border-collapse text-sm">
				<thead>
					<tr class="border-b text-left">
						<th class="p-2 font-medium">Field</th>
						<th class="p-2 font-medium">Input</th>
						<th class="p-2 font-medium">Case</th>
						<th class="p-2 font-medium">Result</th>
					</tr>
				</thead>
				<tbody>
					{#each probes as probe (probe.field + probe.note)}
						{@const result = validators[probe.field]?.(probe.value)}
						<tr class="border-b">
							<td class="p-2 font-mono">{probe.field}</td>
							<td class="p-2 font-mono">{JSON.stringify(probe.value)}</td>
							<td class="p-2 text-muted-foreground">{probe.note}</td>
							<td class="p-2">
								{#if result}
									<span class="text-destructive">{result}</span>
								{:else}
									<span class="text-muted-foreground">valid</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>
</div>
