/**
 * Svelte 5 layer for aether-forms.
 *
 * `createForm` binds the pure state machine from the package root to Svelte's
 * reactivity; the components render an extracted form using aether-ui controls.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { createForm, SchemaForm } from "aether-forms/svelte";
 *   import { ContactSchema } from "./schema";
 *
 *   const form = createForm(ContactSchema);
 * </script>
 *
 * <SchemaForm {form} onSubmit={(data) => save(data)} />
 * ```
 */
export { createForm, type SvelteForm } from "./form.svelte.js";

export { default as SchemaField } from "./schema-field.svelte";
export { default as SchemaForm } from "./schema-form.svelte";
export { default as SchemaSection } from "./schema-section.svelte";
export { default as SchemaStep } from "./schema-step.svelte";
