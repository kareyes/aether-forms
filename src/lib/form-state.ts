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
import type {
	ExtractedField,
	ExtractedForm,
	ExtractedSection,
	ExtractedStep,
} from "./layout.js";
import {
	buildDefaultValues,
	extractForm,
	getColSpanClasses,
	getGridClasses,
} from "./layout.js";
import type {
	FieldErrors,
	FieldValidators,
	ValidationResult,
} from "./validation.js";
import { validateSync } from "./validation.js";

// ============================================================================
// Form State Types
// ============================================================================

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
export type ResolvedFormConfig<T extends Record<string, unknown>> =
	FormConfig<T> & {
		readonly validateOnChange: boolean;
		readonly validateOnBlur: boolean;
		readonly revalidateOnChange: boolean;
	};

/** Apply the default config values. */
export const resolveFormConfig = <T extends Record<string, unknown>>(
	config: FormConfig<T> = {},
): ResolvedFormConfig<T> => ({
	validateOnChange: true,
	validateOnBlur: true,
	revalidateOnChange: true,
	...config,
});

// ============================================================================
// Form State Construction
// ============================================================================

/**
 * Create initial form state from a schema.
 */
export const createFormState = <A extends Record<string, unknown>, I>(
	schema: Schema.Schema<A, I, never>,
	config: FormConfig<A> = {},
	form?: ExtractedForm,
): FormState<Partial<A>> => {
	const extracted = form ?? extractForm(schema);
	const defaultValues = buildDefaultValues<A>(extracted.fields);
	const values = { ...defaultValues, ...config.initialValues } as Partial<A>;

	let errors: FieldErrors = {};
	if (config.validateOnMount) {
		const result = validateSync(schema, values);
		if (!result.valid) {
			errors = result.errors;
		}
	}

	return {
		values,
		errors,
		touched: {},
		dirty: {},
		isSubmitting: false,
		isValidating: false,
		isValid: Object.keys(errors).length === 0,
		isDirty: false,
		submitCount: 0,
		currentStep: 1,
		validationVersion: 0,
	};
};

// ============================================================================
// Actions
// ============================================================================

/** Every state transition the form supports. */
export type FormAction<T> =
	| { type: "SET_VALUE"; field: string; value: unknown }
	| { type: "SET_VALUES"; values: Partial<T> }
	| { type: "SET_ERROR"; field: string; error: string | undefined }
	| { type: "SET_ERRORS"; errors: FieldErrors }
	| { type: "SET_TOUCHED"; field: string }
	| { type: "SET_TOUCHED_FIELDS"; fields: string[] }
	| { type: "SET_SUBMITTING"; isSubmitting: boolean }
	| { type: "SET_VALIDATING"; isValidating: boolean }
	| { type: "SET_STEP"; step: number }
	| { type: "NEXT_STEP" }
	| { type: "PREV_STEP" }
	| { type: "INCREMENT_SUBMIT_COUNT" }
	| { type: "RESET"; values?: Partial<T> };

/**
 * The form state machine.
 *
 * Total over the action union and free of mutation — every branch returns a new
 * state value rather than editing the one it was given.
 */
export const formReducer = <T extends Record<string, unknown>>(
	state: FormState<Partial<T>>,
	action: FormAction<T>,
): FormState<Partial<T>> => {
	switch (action.type) {
		case "SET_VALUE":
			return {
				...state,
				values: { ...state.values, [action.field]: action.value },
				dirty: { ...state.dirty, [action.field]: true },
				isDirty: true,
			};

		case "SET_VALUES":
			return {
				...state,
				values: { ...state.values, ...action.values },
				isDirty: true,
			};

		case "SET_ERROR": {
			const nextErrors = { ...state.errors };
			if (action.error === undefined) {
				delete nextErrors[action.field];
			} else {
				nextErrors[action.field] = action.error;
			}
			return {
				...state,
				errors: nextErrors,
				isValid: Object.keys(nextErrors).length === 0,
				validationVersion: state.validationVersion + 1,
			};
		}

		case "SET_ERRORS":
			return {
				...state,
				errors: action.errors,
				isValid: Object.keys(action.errors).length === 0,
				validationVersion: state.validationVersion + 1,
			};

		case "SET_TOUCHED":
			return {
				...state,
				touched: { ...state.touched, [action.field]: true },
				validationVersion: state.validationVersion + 1,
			};

		case "SET_TOUCHED_FIELDS": {
			const touchedUpdates = action.fields.reduce<Record<string, boolean>>(
				(acc, field) => {
					acc[field] = true;
					return acc;
				},
				{},
			);
			return {
				...state,
				touched: { ...state.touched, ...touchedUpdates },
				validationVersion: state.validationVersion + 1,
			};
		}

		case "SET_SUBMITTING":
			return { ...state, isSubmitting: action.isSubmitting };

		case "SET_VALIDATING":
			return { ...state, isValidating: action.isValidating };

		case "SET_STEP":
			return { ...state, currentStep: Math.max(1, action.step) };

		case "NEXT_STEP":
			return { ...state, currentStep: state.currentStep + 1 };

		case "PREV_STEP":
			return { ...state, currentStep: Math.max(1, state.currentStep - 1) };

		case "INCREMENT_SUBMIT_COUNT":
			return { ...state, submitCount: state.submitCount + 1 };

		case "RESET":
			return {
				values: action.values ?? ({} as Partial<T>),
				errors: {},
				touched: {},
				dirty: {},
				isSubmitting: false,
				isValidating: false,
				isValid: true,
				isDirty: false,
				submitCount: 0,
				currentStep: 1,
				validationVersion: 0,
			};

		default:
			return state;
	}
};

/** Apply a sequence of actions in order. */
export const applyActions = <T extends Record<string, unknown>>(
	state: FormState<Partial<T>>,
	actions: readonly FormAction<T>[],
): FormState<Partial<T>> => actions.reduce(formReducer, state);

// ============================================================================
// Selectors
// ============================================================================

/** Read one field's slice of the form state. */
export const getFieldState = <T extends Record<string, unknown>>(
	state: FormState<Partial<T>>,
	field: string,
): FieldState => ({
	value: state.values[field as keyof T],
	error: state.errors[field],
	touched: state.touched[field] ?? false,
	dirty: state.dirty[field] ?? false,
	validating: state.isValidating,
});

/**
 * Whether a field's error should be visible.
 *
 * Errors stay hidden until the user has engaged with the field or tried to
 * submit — otherwise an untouched form shows red on first paint.
 */
export const shouldShowError = <T extends Record<string, unknown>>(
	state: FormState<Partial<T>>,
	field: string,
): boolean => {
	const touched = state.touched[field] ?? false;
	return (touched || state.submitCount > 0) && !!state.errors[field];
};

/** The highest step number the form defines, or 1 when it is single-step. */
export const maxStep = (form: ExtractedForm): number =>
	form.steps.length === 0
		? 1
		: form.steps.reduce((highest, s) => Math.max(highest, s.step), 1);

// ============================================================================
// Validation intents
// ============================================================================

/**
 * The action that records one field's validation result.
 *
 * Takes pre-compiled validators rather than a schema so that a keystroke costs
 * a single field parse. See `createFieldValidators`.
 */
export const validateFieldAction = <T extends Record<string, unknown>>(
	validators: FieldValidators,
	field: string,
	value: unknown,
): FormAction<T> | undefined => {
	const validator = validators[field];
	if (!validator) return undefined;
	return { type: "SET_ERROR", field, error: validator(value) };
};

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
export const validateFormActions = <A extends Record<string, unknown>, I>(
	schema: Schema.Schema<A, I, never>,
	values: Partial<A>,
): ValidationOutcome<A> => {
	const result = validateSync(schema, values);
	return {
		result,
		actions: [
			{ type: "SET_ERRORS", errors: result.valid ? {} : result.errors },
		],
	};
};

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
export const validateStepActions = <A extends Record<string, unknown>, I>(
	schema: Schema.Schema<A, I, never>,
	form: ExtractedForm,
	state: FormState<Partial<A>>,
): StepValidationOutcome<A> => {
	const stepFields =
		form.steps.find((s) => s.step === state.currentStep)?.fields ?? [];
	const stepFieldNames = new Set(stepFields.map((f) => f.name));

	const result = validateSync(schema, state.values);

	const stepErrors: Record<string, string | undefined> = {};
	if (!result.valid) {
		for (const [field, error] of Object.entries(result.errors)) {
			if (stepFieldNames.has(field)) {
				stepErrors[field] = error;
			}
		}
	}

	const hasErrors = Object.keys(stepErrors).length > 0;
	if (!hasErrors) {
		return { valid: true, actions: [] };
	}

	return {
		valid: false,
		actions: [
			{ type: "SET_TOUCHED_FIELDS", fields: stepFields.map((f) => f.name) },
			{ type: "SET_ERRORS", errors: stepErrors as FieldErrors },
		],
	};
};

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
export const setValueActions = <A extends Record<string, unknown>>(
	validators: FieldValidators,
	config: ResolvedFormConfig<A>,
	state: FormState<Partial<A>>,
	field: string,
	value: unknown,
): readonly FormAction<A>[] => {
	if (state.values[field as keyof A] === value) return [];

	const actions: FormAction<A>[] = [{ type: "SET_VALUE", field, value }];
	if (config.validateOnChange) {
		const validation = validateFieldAction<A>(validators, field, value);
		if (validation) actions.push(validation);
	}
	return actions;
};

/** The actions a blur produces. */
export const blurActions = <A extends Record<string, unknown>>(
	validators: FieldValidators,
	config: ResolvedFormConfig<A>,
	state: FormState<Partial<A>>,
	field: string,
): readonly FormAction<A>[] => {
	const actions: FormAction<A>[] = [{ type: "SET_TOUCHED", field }];
	if (config.validateOnBlur) {
		const validation = validateFieldAction<A>(
			validators,
			field,
			state.values[field as keyof A],
		);
		if (validation) actions.push(validation);
	}
	return actions;
};

/**
 * Whether the form can advance past the current step.
 *
 * Advancing requires both a valid step and a step to advance to; the final step
 * submits rather than advancing.
 */
export const canAdvance = <A extends Record<string, unknown>>(
	form: ExtractedForm,
	state: FormState<Partial<A>>,
	stepValid: boolean,
): boolean => stepValid && state.currentStep < maxStep(form);

/** The action that returns a form to its initial values. */
export const resetAction = <A extends Record<string, unknown>>(
	form: ExtractedForm,
	config: FormConfig<A> = {},
	values?: Partial<A>,
): Extract<FormAction<A>, { type: "RESET" }> => ({
	type: "RESET",
	values:
		values ??
		({
			...buildDefaultValues<A>(form.fields),
			...config.initialValues,
		} as Partial<A>),
});

// ============================================================================
// Render Contexts
// ============================================================================

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
export const createFieldContext = <A extends Record<string, unknown>>(
	api: FormApi<A>,
	field: ExtractedField,
): FieldRenderContext => {
	const fieldState = getFieldState(api.state, field.name);
	return {
		field,
		value: fieldState.value,
		error: fieldState.error,
		showError: shouldShowError(api.state, field.name),
		touched: fieldState.touched,
		dirty: fieldState.dirty,
		colSpanClass: getColSpanClasses(field),
		onChange: (value) => api.setValue(field.name, value),
		onBlur: () => api.handleBlur(field.name),
	};
};

/** Section render context */
export interface SectionRenderContext {
	readonly section: ExtractedSection;
	readonly fields: readonly FieldRenderContext[];
	readonly gridClass: string;
}

/** Build the render context for a section. */
export const createSectionContext = <A extends Record<string, unknown>>(
	api: FormApi<A>,
	section: ExtractedSection,
): SectionRenderContext => ({
	section,
	fields: section.fields.map((field) => createFieldContext(api, field)),
	gridClass: getGridClasses(api.form.layout),
});

/** Step render context */
export interface StepRenderContext {
	readonly step: ExtractedStep;
	readonly sections: readonly SectionRenderContext[];
	readonly isActive: boolean;
	readonly isCompleted: boolean;
	readonly canNavigateTo: boolean;
}

/** Build the render context for a step. */
export const createStepContext = <A extends Record<string, unknown>>(
	api: FormApi<A>,
	step: ExtractedStep,
): StepRenderContext => {
	const currentStep = api.state.currentStep;
	return {
		step,
		sections: step.sections.map((section) =>
			createSectionContext(api, section),
		),
		isActive: step.step === currentStep,
		isCompleted: step.step < currentStep,
		canNavigateTo: step.step <= currentStep,
	};
};
