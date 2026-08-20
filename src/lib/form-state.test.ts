import { describe, expect, test } from "bun:test";
import { pipe, Schema } from "effect";
import { withField, withFormLayout } from "./annotations";
import {
	applyActions,
	blurActions,
	canAdvance,
	createFieldContext,
	createFormState,
	createSectionContext,
	createStepContext,
	formReducer,
	getFieldState,
	maxStep,
	resetAction,
	resolveFormConfig,
	setValueActions,
	shouldShowError,
	validateFieldAction,
	validateFormActions,
	validateStepActions,
	type FormApi,
	type FormState,
} from "./form-state";
import { extractForm } from "./layout";
import { createFieldValidators } from "./validation";

// --- Fixtures ---

const ContactSchema = pipe(
	Schema.Struct({
		name: pipe(
			Schema.String,
			Schema.minLength(2, { message: () => "Too short" }),
			withField({ label: "Name", section: "who", order: 1 }),
		),
		email: pipe(
			Schema.String,
			Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
				message: () => "Enter a valid email",
			}),
			withField({
				label: "Email",
				inputType: "email",
				section: "who",
				order: 2,
			}),
		),
		notes: pipe(
			Schema.optional(Schema.String),
			withField({
				label: "Notes",
				inputType: "textarea",
				section: "extra",
				order: 3,
			}),
		),
	}),
	withFormLayout({
		columns: 2,
		sections: [
			{ id: "who", title: "Who" },
			{ id: "extra", title: "Extra" },
		],
	}),
);

type Contact = typeof ContactSchema.Type;

const WizardSchema = pipe(
	Schema.Struct({
		email: pipe(
			Schema.String,
			Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
				message: () => "Enter a valid email",
			}),
			withField({ label: "Email", step: 1 }),
		),
		company: pipe(
			Schema.String,
			Schema.minLength(2, { message: () => "Too short" }),
			withField({ label: "Company", step: 2 }),
		),
	}),
	withFormLayout({
		steps: [
			{ step: 1, title: "Account" },
			{ step: 2, title: "Business" },
		],
	}),
);

type Wizard = typeof WizardSchema.Type;

const contactForm = extractForm(ContactSchema);
const wizardForm = extractForm(WizardSchema);
const contactValidators = createFieldValidators(
	ContactSchema,
	contactForm.fields,
);

const initial = () =>
	createFormState<Contact, Contact>(ContactSchema, {}, contactForm);

/** Fixture lookup that fails the test rather than yielding undefined. */
const must = <T>(value: T | undefined, what: string): T => {
	if (value === undefined) throw new Error(`fixture is missing ${what}`);
	return value;
};

// --- Tests ---

describe("resolveFormConfig", () => {
	test("validates on change and on blur by default", () => {
		const resolved = resolveFormConfig<Contact>();

		expect(resolved.validateOnChange).toBe(true);
		expect(resolved.validateOnBlur).toBe(true);
		expect(resolved.revalidateOnChange).toBe(true);
	});

	test("the caller's values win over the defaults", () => {
		const resolved = resolveFormConfig<Contact>({ validateOnChange: false });

		expect(resolved.validateOnChange).toBe(false);
		expect(resolved.validateOnBlur).toBe(true);
	});
});

describe("createFormState", () => {
	test("seeds values from the fields' defaults", () => {
		expect(initial().values).toEqual({ name: "", email: "", notes: "" });
	});

	test("starts clean, valid, and on the first step", () => {
		const state = initial();

		expect(state.errors).toEqual({});
		expect(state.touched).toEqual({});
		expect(state.dirty).toEqual({});
		expect(state.isSubmitting).toBe(false);
		expect(state.isDirty).toBe(false);
		expect(state.isValid).toBe(true);
		expect(state.submitCount).toBe(0);
		expect(state.currentStep).toBe(1);
		expect(state.validationVersion).toBe(0);
	});

	test("initialValues override the schema defaults", () => {
		const state = createFormState<Contact, Contact>(
			ContactSchema,
			{ initialValues: { name: "Ada" } },
			contactForm,
		);

		expect(state.values.name).toBe("Ada");
		expect(state.values.email).toBe("");
	});

	test("validateOnMount seeds the errors and flips isValid", () => {
		const state = createFormState<Contact, Contact>(
			ContactSchema,
			{ validateOnMount: true },
			contactForm,
		);

		expect(state.isValid).toBe(false);
		expect(Object.keys(state.errors).length).toBeGreaterThan(0);
	});

	test("extracts the form itself when none is supplied", () => {
		expect(createFormState<Contact, Contact>(ContactSchema).values).toEqual({
			name: "",
			email: "",
			notes: "",
		});
	});
});

describe("formReducer", () => {
	test("SET_VALUE writes the value and marks the field dirty", () => {
		const next = formReducer<Contact>(initial(), {
			type: "SET_VALUE",
			field: "name",
			value: "Ada",
		});

		expect(next.values.name).toBe("Ada");
		expect(next.dirty.name).toBe(true);
		expect(next.isDirty).toBe(true);
	});

	test("SET_VALUES merges without clearing untouched fields", () => {
		const next = formReducer<Contact>(initial(), {
			type: "SET_VALUES",
			values: { name: "Ada" },
		});

		expect(next.values).toEqual({ name: "Ada", email: "", notes: "" });
		expect(next.isDirty).toBe(true);
	});

	test("SET_ERROR records an error and invalidates the form", () => {
		const next = formReducer<Contact>(initial(), {
			type: "SET_ERROR",
			field: "email",
			error: "Enter a valid email",
		});

		expect(next.errors.email).toBe("Enter a valid email");
		expect(next.isValid).toBe(false);
		expect(next.validationVersion).toBe(1);
	});

	test("SET_ERROR with undefined removes the key entirely", () => {
		const withError = formReducer<Contact>(initial(), {
			type: "SET_ERROR",
			field: "email",
			error: "Bad",
		});
		const cleared = formReducer<Contact>(withError, {
			type: "SET_ERROR",
			field: "email",
			error: undefined,
		});

		expect("email" in cleared.errors).toBe(false);
		expect(cleared.isValid).toBe(true);
	});

	test("SET_ERRORS replaces the whole record", () => {
		const withOne = formReducer<Contact>(initial(), {
			type: "SET_ERROR",
			field: "name",
			error: "Too short",
		});
		const replaced = formReducer<Contact>(withOne, {
			type: "SET_ERRORS",
			errors: { email: "Enter a valid email" },
		});

		expect(replaced.errors).toEqual({ email: "Enter a valid email" });
		expect(replaced.isValid).toBe(false);
	});

	test("SET_ERRORS with an empty record revalidates the form", () => {
		const next = formReducer<Contact>(initial(), {
			type: "SET_ERRORS",
			errors: {},
		});

		expect(next.isValid).toBe(true);
	});

	test("SET_TOUCHED marks one field and bumps the validation version", () => {
		const next = formReducer<Contact>(initial(), {
			type: "SET_TOUCHED",
			field: "email",
		});

		expect(next.touched.email).toBe(true);
		expect(next.validationVersion).toBe(1);
	});

	test("SET_TOUCHED_FIELDS marks several at once", () => {
		const next = formReducer<Contact>(initial(), {
			type: "SET_TOUCHED_FIELDS",
			fields: ["name", "email"],
		});

		expect(next.touched).toEqual({ name: true, email: true });
	});

	test("SET_SUBMITTING and SET_VALIDATING toggle their flags", () => {
		const submitting = formReducer<Contact>(initial(), {
			type: "SET_SUBMITTING",
			isSubmitting: true,
		});
		const validating = formReducer<Contact>(initial(), {
			type: "SET_VALIDATING",
			isValidating: true,
		});

		expect(submitting.isSubmitting).toBe(true);
		expect(validating.isValidating).toBe(true);
	});

	test("NEXT_STEP and PREV_STEP move one step at a time", () => {
		const second = formReducer<Contact>(initial(), { type: "NEXT_STEP" });
		const back = formReducer<Contact>(second, { type: "PREV_STEP" });

		expect(second.currentStep).toBe(2);
		expect(back.currentStep).toBe(1);
	});

	test("PREV_STEP will not move below the first step", () => {
		const next = formReducer<Contact>(initial(), { type: "PREV_STEP" });

		expect(next.currentStep).toBe(1);
	});

	test("SET_STEP jumps to a step and clamps below one", () => {
		expect(
			formReducer<Contact>(initial(), { type: "SET_STEP", step: 3 })
				.currentStep,
		).toBe(3);
		expect(
			formReducer<Contact>(initial(), { type: "SET_STEP", step: 0 })
				.currentStep,
		).toBe(1);
		expect(
			formReducer<Contact>(initial(), { type: "SET_STEP", step: -5 })
				.currentStep,
		).toBe(1);
	});

	test("INCREMENT_SUBMIT_COUNT counts attempts", () => {
		const once = formReducer<Contact>(initial(), {
			type: "INCREMENT_SUBMIT_COUNT",
		});
		const twice = formReducer<Contact>(once, {
			type: "INCREMENT_SUBMIT_COUNT",
		});

		expect(twice.submitCount).toBe(2);
	});

	test("RESET clears everything back to a pristine state", () => {
		const dirty = applyActions<Contact>(initial(), [
			{ type: "SET_VALUE", field: "name", value: "Ada" },
			{ type: "SET_ERROR", field: "email", error: "Bad" },
			{ type: "SET_TOUCHED", field: "email" },
			{ type: "INCREMENT_SUBMIT_COUNT" },
			{ type: "NEXT_STEP" },
		]);
		const reset = formReducer<Contact>(dirty, {
			type: "RESET",
			values: { name: "seed" },
		});

		expect(reset.values).toEqual({ name: "seed" });
		expect(reset.errors).toEqual({});
		expect(reset.touched).toEqual({});
		expect(reset.dirty).toEqual({});
		expect(reset.isDirty).toBe(false);
		expect(reset.isValid).toBe(true);
		expect(reset.submitCount).toBe(0);
		expect(reset.currentStep).toBe(1);
		expect(reset.validationVersion).toBe(0);
	});

	test("an unknown action returns the state unchanged", () => {
		const state = initial();
		const next = formReducer<Contact>(state, {
			type: "NOT_A_REAL_ACTION",
		} as never);

		expect(next).toBe(state);
	});

	test("never mutates the state it is given", () => {
		const state = initial();
		const snapshot = structuredClone(state);

		formReducer<Contact>(state, {
			type: "SET_VALUE",
			field: "name",
			value: "Ada",
		});
		formReducer<Contact>(state, {
			type: "SET_ERROR",
			field: "name",
			error: "Bad",
		});
		formReducer<Contact>(state, { type: "SET_TOUCHED", field: "name" });
		formReducer<Contact>(state, {
			type: "SET_TOUCHED_FIELDS",
			fields: ["name"],
		});

		expect(state).toEqual(snapshot);
	});

	test("returns a new object rather than the same reference", () => {
		const state = initial();
		const next = formReducer<Contact>(state, {
			type: "SET_VALUE",
			field: "name",
			value: "Ada",
		});

		expect(next).not.toBe(state);
		expect(next.values).not.toBe(state.values);
	});
});

describe("applyActions", () => {
	test("folds a sequence in order", () => {
		const next = applyActions<Contact>(initial(), [
			{ type: "SET_VALUE", field: "name", value: "first" },
			{ type: "SET_VALUE", field: "name", value: "second" },
		]);

		expect(next.values.name).toBe("second");
	});

	test("an empty sequence is the identity", () => {
		const state = initial();

		expect(applyActions<Contact>(state, [])).toBe(state);
	});
});

describe("getFieldState", () => {
	test("reads one field's slice", () => {
		const state = applyActions<Contact>(initial(), [
			{ type: "SET_VALUE", field: "name", value: "Ada" },
			{ type: "SET_TOUCHED", field: "name" },
			{ type: "SET_ERROR", field: "name", error: "Too short" },
		]);

		expect(getFieldState(state, "name")).toEqual({
			value: "Ada",
			error: "Too short",
			touched: true,
			dirty: true,
			validating: false,
		});
	});

	test("reports an unknown field as untouched and clean", () => {
		expect(getFieldState(initial(), "nope")).toEqual({
			value: undefined,
			error: undefined,
			touched: false,
			dirty: false,
			validating: false,
		});
	});
});

describe("shouldShowError", () => {
	const withError = (base: FormState<Partial<Contact>>) =>
		formReducer<Contact>(base, {
			type: "SET_ERROR",
			field: "email",
			error: "Bad",
		});

	test("stays hidden on an untouched field", () => {
		expect(shouldShowError(withError(initial()), "email")).toBe(false);
	});

	test("shows once the field is touched", () => {
		const state = formReducer<Contact>(withError(initial()), {
			type: "SET_TOUCHED",
			field: "email",
		});

		expect(shouldShowError(state, "email")).toBe(true);
	});

	test("shows on every field once a submit has been attempted", () => {
		const state = formReducer<Contact>(withError(initial()), {
			type: "INCREMENT_SUBMIT_COUNT",
		});

		expect(shouldShowError(state, "email")).toBe(true);
	});

	test("stays hidden when the field has no error at all", () => {
		const state = formReducer<Contact>(initial(), {
			type: "SET_TOUCHED",
			field: "email",
		});

		expect(shouldShowError(state, "email")).toBe(false);
	});
});

describe("maxStep", () => {
	test("reports the highest declared step", () => {
		expect(maxStep(wizardForm)).toBe(2);
	});

	test("reports one for a single-step form", () => {
		expect(maxStep(contactForm)).toBe(1);
	});
});

describe("validateFieldAction", () => {
	test("produces a SET_ERROR carrying the field's own message", () => {
		const action = validateFieldAction<Contact>(contactValidators, "name", "x");

		expect(action).toEqual({
			type: "SET_ERROR",
			field: "name",
			error: "Too short",
		});
	});

	test("produces a SET_ERROR clearing the error when the value is good", () => {
		const action = validateFieldAction<Contact>(
			contactValidators,
			"name",
			"Ada",
		);

		expect(action).toEqual({
			type: "SET_ERROR",
			field: "name",
			error: undefined,
		});
	});

	test("does not report a sibling field's problem", () => {
		// Validating `name` used to run the whole struct and could surface an
		// unrelated `email` failure. The action must concern exactly one field.
		const action = validateFieldAction<Contact>(
			contactValidators,
			"name",
			"Ada",
		);

		expect(action?.type).toBe("SET_ERROR");
		if (action?.type === "SET_ERROR") {
			expect(action.field).toBe("name");
			expect(action.error).toBeUndefined();
		}
	});

	test("produces nothing for a field with no validator", () => {
		expect(
			validateFieldAction<Contact>(contactValidators, "nope", "x"),
		).toBeUndefined();
	});
});

describe("setValueActions", () => {
	const config = resolveFormConfig<Contact>();

	test("sets the value and validates it", () => {
		const actions = setValueActions(
			contactValidators,
			config,
			initial(),
			"name",
			"x",
		);

		expect(actions).toEqual([
			{ type: "SET_VALUE", field: "name", value: "x" },
			{ type: "SET_ERROR", field: "name", error: "Too short" },
		]);
	});

	test("skips validation when validateOnChange is off", () => {
		const actions = setValueActions(
			contactValidators,
			resolveFormConfig<Contact>({ validateOnChange: false }),
			initial(),
			"name",
			"x",
		);

		expect(actions).toEqual([{ type: "SET_VALUE", field: "name", value: "x" }]);
	});

	test("produces nothing when the value is unchanged", () => {
		// A no-op set would still build a new state object and retrigger every
		// downstream derivation, which is how a component that echoes its value
		// back on render ends up in a loop.
		const state = formReducer<Contact>(initial(), {
			type: "SET_VALUE",
			field: "name",
			value: "Ada",
		});

		expect(
			setValueActions(contactValidators, config, state, "name", "Ada"),
		).toEqual([]);
	});

	test("treats a change from the seeded empty string as a change", () => {
		const actions = setValueActions(
			contactValidators,
			config,
			initial(),
			"name",
			"A",
		);

		expect(actions.length).toBeGreaterThan(0);
	});
});

describe("blurActions", () => {
	const config = resolveFormConfig<Contact>();

	test("touches the field and validates its current value", () => {
		const state = formReducer<Contact>(initial(), {
			type: "SET_VALUE",
			field: "name",
			value: "x",
		});
		const actions = blurActions(contactValidators, config, state, "name");

		expect(actions).toEqual([
			{ type: "SET_TOUCHED", field: "name" },
			{ type: "SET_ERROR", field: "name", error: "Too short" },
		]);
	});

	test("skips validation when validateOnBlur is off", () => {
		const actions = blurActions(
			contactValidators,
			resolveFormConfig<Contact>({ validateOnBlur: false }),
			initial(),
			"name",
		);

		expect(actions).toEqual([{ type: "SET_TOUCHED", field: "name" }]);
	});

	test("reports a blank required field as required", () => {
		const actions = blurActions(contactValidators, config, initial(), "email");

		expect(actions[1]).toEqual({
			type: "SET_ERROR",
			field: "email",
			error: "This field is required",
		});
	});
});

describe("validateFormActions", () => {
	test("reports success and clears the error record", () => {
		const { result, actions } = validateFormActions(ContactSchema, {
			name: "Ada",
			email: "ada@example.com",
		});

		expect(result.valid).toBe(true);
		expect(actions).toEqual([{ type: "SET_ERRORS", errors: {} }]);
	});

	test("reports every failing field at once", () => {
		const { result, actions } = validateFormActions(ContactSchema, {
			name: "x",
			email: "nope",
		});

		expect(result.valid).toBe(false);
		const [action] = actions;
		expect(action.type).toBe("SET_ERRORS");
		if (action.type === "SET_ERRORS") {
			expect(action.errors.name).toBe("Too short");
			expect(action.errors.email).toBe("Enter a valid email");
		}
	});
});

describe("validateStepActions", () => {
	const wizardState = (values: Partial<Wizard>, step: number) =>
		applyActions<Wizard>(
			createFormState<Wizard, Wizard>(
				WizardSchema,
				{ initialValues: values },
				wizardForm,
			),
			step > 1 ? [{ type: "SET_STEP", step }] : [],
		);

	test("passes when this step's fields are valid, ignoring later steps", () => {
		// `company` is still empty, but it belongs to step 2 — it must not block
		// leaving step 1.
		const outcome = validateStepActions(
			WizardSchema,
			wizardForm,
			wizardState({ email: "ada@example.com" }, 1),
		);

		expect(outcome.valid).toBe(true);
		expect(outcome.actions).toEqual([]);
	});

	test("fails and marks this step's fields touched when one is invalid", () => {
		const outcome = validateStepActions(
			WizardSchema,
			wizardForm,
			wizardState({ email: "nope" }, 1),
		);

		expect(outcome.valid).toBe(false);
		expect(outcome.actions[0]).toEqual({
			type: "SET_TOUCHED_FIELDS",
			fields: ["email"],
		});
		const errorAction = outcome.actions[1];
		if (errorAction.type === "SET_ERRORS") {
			expect(errorAction.errors.email).toBe("Enter a valid email");
			expect("company" in errorAction.errors).toBe(false);
		}
	});

	test("validates the step the form is currently on", () => {
		const outcome = validateStepActions(
			WizardSchema,
			wizardForm,
			wizardState({ email: "ada@example.com", company: "x" }, 2),
		);

		expect(outcome.valid).toBe(false);
		const errorAction = outcome.actions[1];
		if (errorAction.type === "SET_ERRORS") {
			expect(errorAction.errors.company).toBe("Too short");
		}
	});

	test("emits no actions on success so a valid step does not repaint", () => {
		const outcome = validateStepActions(
			WizardSchema,
			wizardForm,
			wizardState({ email: "ada@example.com" }, 1),
		);

		expect(outcome.actions).toHaveLength(0);
	});
});

describe("canAdvance", () => {
	const at = (step: number) =>
		applyActions<Wizard>(
			createFormState<Wizard, Wizard>(WizardSchema, {}, wizardForm),
			[{ type: "SET_STEP", step }],
		);

	test("advances from a valid non-final step", () => {
		expect(canAdvance(wizardForm, at(1), true)).toBe(true);
	});

	test("refuses when the step is invalid", () => {
		expect(canAdvance(wizardForm, at(1), false)).toBe(false);
	});

	test("refuses on the final step even when valid", () => {
		expect(canAdvance(wizardForm, at(2), true)).toBe(false);
	});
});

describe("resetAction", () => {
	test("restores the schema defaults", () => {
		const action = resetAction<Contact>(contactForm);

		expect(action.type).toBe("RESET");
		expect(action.values).toEqual({ name: "", email: "", notes: "" });
	});

	test("layers the configured initial values over the defaults", () => {
		const action = resetAction<Contact>(contactForm, {
			initialValues: { name: "Ada" },
		});

		expect(action.values).toEqual({ name: "Ada", email: "", notes: "" });
	});

	test("an explicit value set wins over both", () => {
		const action = resetAction<Contact>(
			contactForm,
			{ initialValues: { name: "Ada" } },
			{ name: "Grace" },
		);

		expect(action.values).toEqual({ name: "Grace" });
	});
});

describe("render contexts", () => {
	const apiFor = (state: FormState<Partial<Contact>>): FormApi<Contact> => ({
		form: contactForm,
		state,
		setValue: () => {},
		handleBlur: () => {},
	});

	test("createFieldContext exposes the field's value, error, and grid class", () => {
		const state = applyActions<Contact>(initial(), [
			{ type: "SET_VALUE", field: "name", value: "Ada" },
			{ type: "SET_TOUCHED", field: "name" },
			{ type: "SET_ERROR", field: "name", error: "Too short" },
		]);
		const field = must(
			contactForm.fields.find((f) => f.name === "name"),
			"the name field",
		);
		const ctx = createFieldContext(apiFor(state), field);

		expect(ctx.value).toBe("Ada");
		expect(ctx.error).toBe("Too short");
		expect(ctx.showError).toBe(true);
		expect(ctx.touched).toBe(true);
		expect(ctx.dirty).toBe(true);
		expect(ctx.colSpanClass).toBe("col-span-full");
	});

	test("createFieldContext routes onChange and onBlur back to the api", () => {
		const calls: string[] = [];
		const api: FormApi<Contact> = {
			form: contactForm,
			state: initial(),
			setValue: (field, value) => calls.push(`set:${field}:${String(value)}`),
			handleBlur: (field) => calls.push(`blur:${field}`),
		};
		const ctx = createFieldContext(api, contactForm.fields[0]);

		ctx.onChange("Ada");
		ctx.onBlur();

		expect(calls).toEqual(["set:name:Ada", "blur:name"]);
	});

	test("createSectionContext builds a context per field plus the grid class", () => {
		const section = must(
			contactForm.sections.find((s) => s.id === "who"),
			"the who section",
		);
		const ctx = createSectionContext(apiFor(initial()), section);

		expect(ctx.fields.map((f) => f.field.name)).toEqual(["name", "email"]);
		expect(ctx.gridClass).toBe("@container grid grid-cols-2 gap-4");
	});

	test("createStepContext marks the active, completed, and reachable steps", () => {
		const wizardApi = (step: number): FormApi<Wizard> => ({
			form: wizardForm,
			state: applyActions<Wizard>(
				createFormState<Wizard, Wizard>(WizardSchema, {}, wizardForm),
				[{ type: "SET_STEP", step }],
			),
			setValue: () => {},
			handleBlur: () => {},
		});
		const api = wizardApi(2);
		const [first, second] = wizardForm.steps.map((s) =>
			createStepContext(api, s),
		);

		expect(first.isActive).toBe(false);
		expect(first.isCompleted).toBe(true);
		expect(first.canNavigateTo).toBe(true);

		expect(second.isActive).toBe(true);
		expect(second.isCompleted).toBe(false);
		expect(second.canNavigateTo).toBe(true);
	});

	test("a step ahead of the current one is not reachable", () => {
		const api: FormApi<Wizard> = {
			form: wizardForm,
			state: createFormState<Wizard, Wizard>(WizardSchema, {}, wizardForm),
			setValue: () => {},
			handleBlur: () => {},
		};
		const second = createStepContext(api, wizardForm.steps[1]);

		expect(second.canNavigateTo).toBe(false);
	});
});
