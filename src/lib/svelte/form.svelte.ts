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
import {
	applyActions,
	blurActions,
	canAdvance,
	createFieldValidators,
	createFormState,
	extractForm,
	resetAction,
	resolveFormConfig,
	setValueActions,
	validateFormActions,
	validateStepActions,
	type ExtractedForm,
	type FieldErrors,
	type FormAction,
	type FormApi,
	type FormConfig,
	type FormState,
	type SubmitHandler,
	type ValidationResult,
} from "../index.js";

/** A reactive form, backed by the pure reducer. */
export interface SvelteForm<A extends Record<string, unknown>>
	extends FormApi<A> {
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
export function createForm<A extends Record<string, unknown>, I>(
	schema: Schema.Schema<A, I, never>,
	config: FormConfig<A> = {},
): SvelteForm<A> {
	const form = extractForm(schema);
	const resolved = resolveFormConfig(config);
	const validators = createFieldValidators(schema, form.fields);

	let state = $state<FormState<Partial<A>>>(
		createFormState(schema, config, form),
	);

	const dispatch = (...actions: readonly FormAction<A>[]): void => {
		state = applyActions(state, actions);
	};

	return {
		form,
		get state() {
			return state;
		},

		setValue(field, value) {
			dispatch(...setValueActions(validators, resolved, state, field, value));
		},

		setValues(values) {
			dispatch({ type: "SET_VALUES", values });
		},

		handleBlur(field) {
			dispatch(...blurActions(validators, resolved, state, field));
		},

		validate() {
			const { result, actions } = validateFormActions(schema, state.values);
			dispatch(...actions);
			return result;
		},

		validateStep() {
			const { valid, actions } = validateStepActions(schema, form, state);
			dispatch(...actions);
			return valid;
		},

		nextStep() {
			const { valid, actions } = validateStepActions(schema, form, state);
			dispatch(...actions);
			if (!canAdvance(form, state, valid)) return false;
			dispatch({ type: "NEXT_STEP" });
			return true;
		},

		prevStep() {
			dispatch({ type: "PREV_STEP" });
		},

		goToStep(step) {
			dispatch({ type: "SET_STEP", step });
		},

		async submit(handler) {
			dispatch(
				{ type: "INCREMENT_SUBMIT_COUNT" },
				{ type: "SET_SUBMITTING", isSubmitting: true },
			);
			try {
				const { result, actions } = validateFormActions(schema, state.values);
				dispatch(...actions);
				if (!result.valid) return false;
				await handler(result.data);
				return true;
			} finally {
				dispatch({ type: "SET_SUBMITTING", isSubmitting: false });
			}
		},

		reset(values) {
			dispatch(resetAction(form, config, values));
		},

		setFieldError(field, error) {
			dispatch({ type: "SET_ERROR", field, error });
		},

		setErrors(errors) {
			dispatch({ type: "SET_ERRORS", errors });
		},
	};
}
