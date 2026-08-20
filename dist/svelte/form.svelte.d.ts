/**
 * Svelte 5 binding for the form state machine.
 *
 * This is deliberately the thinnest layer that can exist: it holds the reducer's
 * output in `$state` and routes every intent through the pure builders in the
 * core. There is no logic here that is worth testing in isolation — if a change
 * would add some, it belongs in `form-state.ts` instead, where it is testable
 * without a component tree.
 */
import type { Schema } from "effect";
import { type ExtractedForm, type FieldErrors, type FormApi, type FormConfig, type FormState, type SubmitHandler, type ValidationResult } from "../index.js";
/** A reactive form, backed by the pure reducer. */
export interface SvelteForm<A extends Record<string, unknown>> extends FormApi<A> {
    readonly form: ExtractedForm;
    readonly state: FormState<Partial<A>>;
    readonly setValue: (field: string, value: unknown) => void;
    readonly setValues: (values: Partial<A>) => void;
    readonly handleBlur: (field: string) => void;
    readonly validate: () => ValidationResult<A>;
    readonly validateStep: () => boolean;
    readonly nextStep: () => boolean;
    readonly prevStep: () => void;
    readonly goToStep: (step: number) => void;
    readonly submit: (handler: SubmitHandler<A>) => Promise<boolean>;
    readonly reset: (values?: Partial<A>) => void;
    readonly setFieldError: (field: string, error: string) => void;
    readonly setErrors: (errors: FieldErrors) => void;
}
/**
 * Create a reactive form from an annotated schema.
 *
 * Layout extraction and per-field validator compilation both happen once here,
 * not per render and not per keystroke.
 */
export declare function createForm<A extends Record<string, unknown>, I>(schema: Schema.Schema<A, I, never>, config?: FormConfig<A>): SvelteForm<A>;
