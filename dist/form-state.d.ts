/**
 * Framework-agnostic form state machine.
 *
 * Everything here is pure: `createFormState` builds an initial state from a
 * schema, `formReducer` maps `(state, action)` to the next state, and the
 * remaining functions are either selectors over a state value or builders that
 * turn an intent ("validate this field") into the actions that express it.
 *
 * Nothing in this module holds state or subscribes to anything. Binding the
 * reducer to a UI framework's reactivity is the job of a shell around it — see
 * the `./svelte` entry point for the Svelte 5 one.
 */
import type { Schema } from "effect";
import type { ExtractedField, ExtractedForm, ExtractedSection, ExtractedStep } from "./layout.js";
import type { FieldErrors, FieldValidators, ValidationResult } from "./validation.js";
/** Current state of a form field */
export interface FieldState {
    readonly value: unknown;
    readonly error: string | undefined;
    readonly touched: boolean;
    readonly dirty: boolean;
    readonly validating: boolean;
}
/** Complete form state */
export interface FormState<T extends Record<string, unknown>> {
    readonly values: T;
    readonly errors: FieldErrors;
    readonly touched: Record<string, boolean>;
    readonly dirty: Record<string, boolean>;
    readonly isSubmitting: boolean;
    readonly isValidating: boolean;
    readonly isValid: boolean;
    readonly isDirty: boolean;
    readonly submitCount: number;
    readonly currentStep: number;
    /** Increments whenever errors or touched change. */
    readonly validationVersion: number;
}
/** Form configuration options */
export interface FormConfig<T extends Record<string, unknown>> {
    readonly initialValues?: Partial<T>;
    readonly validateOnChange?: boolean;
    readonly validateOnBlur?: boolean;
    readonly validateOnMount?: boolean;
    readonly revalidateOnChange?: boolean;
}
/** Config with the defaults applied. */
export type ResolvedFormConfig<T extends Record<string, unknown>> = FormConfig<T> & {
    readonly validateOnChange: boolean;
    readonly validateOnBlur: boolean;
    readonly revalidateOnChange: boolean;
};
/** Apply the default config values. */
export declare const resolveFormConfig: <T extends Record<string, unknown>>(config?: FormConfig<T>) => ResolvedFormConfig<T>;
/**
 * Create initial form state from a schema.
 */
export declare const createFormState: <A extends Record<string, unknown>, I>(schema: Schema.Schema<A, I, never>, config?: FormConfig<A>, form?: ExtractedForm) => FormState<Partial<A>>;
/** Every state transition the form supports. */
export type FormAction<T> = {
    type: "SET_VALUE";
    field: string;
    value: unknown;
} | {
    type: "SET_VALUES";
    values: Partial<T>;
} | {
    type: "SET_ERROR";
    field: string;
    error: string | undefined;
} | {
    type: "SET_ERRORS";
    errors: FieldErrors;
} | {
    type: "SET_TOUCHED";
    field: string;
} | {
    type: "SET_TOUCHED_FIELDS";
    fields: string[];
} | {
    type: "SET_SUBMITTING";
    isSubmitting: boolean;
} | {
    type: "SET_VALIDATING";
    isValidating: boolean;
} | {
    type: "SET_STEP";
    step: number;
} | {
    type: "NEXT_STEP";
} | {
    type: "PREV_STEP";
} | {
    type: "INCREMENT_SUBMIT_COUNT";
} | {
    type: "RESET";
    values?: Partial<T>;
};
/**
 * The form state machine.
 *
 * Total over the action union and free of mutation — every branch returns a new
 * state value rather than editing the one it was given.
 */
export declare const formReducer: <T extends Record<string, unknown>>(state: FormState<Partial<T>>, action: FormAction<T>) => FormState<Partial<T>>;
/** Apply a sequence of actions in order. */
export declare const applyActions: <T extends Record<string, unknown>>(state: FormState<Partial<T>>, actions: readonly FormAction<T>[]) => FormState<Partial<T>>;
/** Read one field's slice of the form state. */
export declare const getFieldState: <T extends Record<string, unknown>>(state: FormState<Partial<T>>, field: string) => FieldState;
/**
 * Whether a field's error should be visible.
 *
 * Errors stay hidden until the user has engaged with the field or tried to
 * submit — otherwise an untouched form shows red on first paint.
 */
export declare const shouldShowError: <T extends Record<string, unknown>>(state: FormState<Partial<T>>, field: string) => boolean;
/** The highest step number the form defines, or 1 when it is single-step. */
export declare const maxStep: (form: ExtractedForm) => number;
/**
 * The action that records one field's validation result.
 *
 * Takes pre-compiled validators rather than a schema so that a keystroke costs
 * a single field parse. See `createFieldValidators`.
 */
export declare const validateFieldAction: <T extends Record<string, unknown>>(validators: FieldValidators, field: string, value: unknown) => FormAction<T> | undefined;
/** Result of validating the whole form, plus the actions that record it. */
export interface ValidationOutcome<A extends Record<string, unknown>> {
    readonly result: ValidationResult<A>;
    readonly actions: readonly FormAction<A>[];
}
/**
 * Validate every field.
 *
 * Unlike per-field validation this runs the full schema, which is what makes
 * cross-field refinements fire.
 */
export declare const validateFormActions: <A extends Record<string, unknown>, I>(schema: Schema.Schema<A, I, never>, values: Partial<A>) => ValidationOutcome<A>;
/** Outcome of validating the fields on the current step. */
export interface StepValidationOutcome<A extends Record<string, unknown>> {
    readonly valid: boolean;
    readonly actions: readonly FormAction<A>[];
}
/**
 * Validate only the fields belonging to the current step.
 *
 * Runs whole-form validation and keeps the errors that land on this step's
 * fields — a later step's missing values must not block advancing past an
 * earlier one. Fields are marked touched only when validation fails, so a valid
 * step does not repaint every field.
 */
export declare const validateStepActions: <A extends Record<string, unknown>, I>(schema: Schema.Schema<A, I, never>, form: ExtractedForm, state: FormState<Partial<A>>) => StepValidationOutcome<A>;
/**
 * The actions a value change produces.
 *
 * Split out of the Svelte shell so that the decision — whether a change
 * validates, and against what — is testable without a component tree. The shell
 * only forwards the result to the reducer.
 *
 * Returns nothing when the value is unchanged. A no-op set would still build a
 * new state object, retriggering every downstream derivation; components that
 * echo their value back on render would loop.
 */
export declare const setValueActions: <A extends Record<string, unknown>>(validators: FieldValidators, config: ResolvedFormConfig<A>, state: FormState<Partial<A>>, field: string, value: unknown) => readonly FormAction<A>[];
/** The actions a blur produces. */
export declare const blurActions: <A extends Record<string, unknown>>(validators: FieldValidators, config: ResolvedFormConfig<A>, state: FormState<Partial<A>>, field: string) => readonly FormAction<A>[];
/**
 * Whether the form can advance past the current step.
 *
 * Advancing requires both a valid step and a step to advance to; the final step
 * submits rather than advancing.
 */
export declare const canAdvance: <A extends Record<string, unknown>>(form: ExtractedForm, state: FormState<Partial<A>>, stepValid: boolean) => boolean;
/** The action that returns a form to its initial values. */
export declare const resetAction: <A extends Record<string, unknown>>(form: ExtractedForm, config?: FormConfig<A>, values?: Partial<A>) => Extract<FormAction<A>, {
    type: "RESET";
}>;
/** Field change handler */
export type FieldChangeHandler = (field: string, value: unknown) => void;
/** Field blur handler */
export type FieldBlurHandler = (field: string) => void;
/** Form submission handler */
export type SubmitHandler<T> = (values: T) => Promise<void> | void;
/**
 * The surface a form shell exposes to the render-context builders.
 *
 * Kept deliberately small: the current state, the extracted layout, and the two
 * handlers a field can fire. Anything that reads or decides belongs in this
 * module as a pure function over `state`.
 */
export interface FormApi<A extends Record<string, unknown>> {
    readonly form: ExtractedForm;
    readonly state: FormState<Partial<A>>;
    readonly setValue: (field: string, value: unknown) => void;
    readonly handleBlur: (field: string) => void;
}
/** Field render context */
export interface FieldRenderContext {
    readonly field: ExtractedField;
    readonly value: unknown;
    readonly error: string | undefined;
    readonly showError: boolean;
    readonly touched: boolean;
    readonly dirty: boolean;
    readonly colSpanClass: string;
    readonly onChange: (value: unknown) => void;
    readonly onBlur: () => void;
}
/** Build the render context for a single field. */
export declare const createFieldContext: <A extends Record<string, unknown>>(api: FormApi<A>, field: ExtractedField) => FieldRenderContext;
/** Section render context */
export interface SectionRenderContext {
    readonly section: ExtractedSection;
    readonly fields: readonly FieldRenderContext[];
    readonly gridClass: string;
}
/** Build the render context for a section. */
export declare const createSectionContext: <A extends Record<string, unknown>>(api: FormApi<A>, section: ExtractedSection) => SectionRenderContext;
/** Step render context */
export interface StepRenderContext {
    readonly step: ExtractedStep;
    readonly sections: readonly SectionRenderContext[];
    readonly isActive: boolean;
    readonly isCompleted: boolean;
    readonly canNavigateTo: boolean;
}
/** Build the render context for a step. */
export declare const createStepContext: <A extends Record<string, unknown>>(api: FormApi<A>, step: ExtractedStep) => StepRenderContext;
