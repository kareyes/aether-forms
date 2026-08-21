import { buildDefaultValues, extractForm, getColSpanClasses, getGridClasses, } from "./layout.js";
import { validateSync } from "./validation.js";
/** Apply the default config values. */
export const resolveFormConfig = (config = {}) => ({
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
export const createFormState = (schema, config = {}, form) => {
    const extracted = form ?? extractForm(schema);
    const defaultValues = buildDefaultValues(extracted.fields);
    const values = { ...defaultValues, ...config.initialValues };
    let errors = {};
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
/**
 * The form state machine.
 *
 * Total over the action union and free of mutation — every branch returns a new
 * state value rather than editing the one it was given.
 */
export const formReducer = (state, action) => {
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
            }
            else {
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
            const touchedUpdates = action.fields.reduce((acc, field) => {
                acc[field] = true;
                return acc;
            }, {});
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
                values: action.values ?? {},
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
export const applyActions = (state, actions) => actions.reduce(formReducer, state);
// ============================================================================
// Selectors
// ============================================================================
/** Read one field's slice of the form state. */
export const getFieldState = (state, field) => ({
    value: state.values[field],
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
export const shouldShowError = (state, field) => {
    const touched = state.touched[field] ?? false;
    return (touched || state.submitCount > 0) && !!state.errors[field];
};
/** The highest step number the form defines, or 1 when it is single-step. */
export const maxStep = (form) => form.steps.length === 0
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
export const validateFieldAction = (validators, field, value) => {
    const validator = validators[field];
    if (!validator)
        return undefined;
    return { type: "SET_ERROR", field, error: validator(value) };
};
/**
 * Validate every field.
 *
 * Unlike per-field validation this runs the full schema, which is what makes
 * cross-field refinements fire.
 */
export const validateFormActions = (schema, values) => {
    const result = validateSync(schema, values);
    return {
        result,
        actions: [
            { type: "SET_ERRORS", errors: result.valid ? {} : result.errors },
        ],
    };
};
/**
 * Validate only the fields belonging to the current step.
 *
 * Runs whole-form validation and keeps the errors that land on this step's
 * fields — a later step's missing values must not block advancing past an
 * earlier one. Fields are marked touched only when validation fails, so a valid
 * step does not repaint every field.
 */
export const validateStepActions = (schema, form, state) => {
    const stepFields = form.steps.find((s) => s.step === state.currentStep)?.fields ?? [];
    const stepFieldNames = new Set(stepFields.map((f) => f.name));
    const result = validateSync(schema, state.values);
    const stepErrors = {};
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
            { type: "SET_ERRORS", errors: stepErrors },
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
export const setValueActions = (validators, config, state, field, value) => {
    if (state.values[field] === value)
        return [];
    const actions = [{ type: "SET_VALUE", field, value }];
    if (config.validateOnChange) {
        const validation = validateFieldAction(validators, field, value);
        if (validation)
            actions.push(validation);
    }
    return actions;
};
/** The actions a blur produces. */
export const blurActions = (validators, config, state, field) => {
    const actions = [{ type: "SET_TOUCHED", field }];
    if (config.validateOnBlur) {
        const validation = validateFieldAction(validators, field, state.values[field]);
        if (validation)
            actions.push(validation);
    }
    return actions;
};
/**
 * Whether the form can advance past the current step.
 *
 * Advancing requires both a valid step and a step to advance to; the final step
 * submits rather than advancing.
 */
export const canAdvance = (form, state, stepValid) => stepValid && state.currentStep < maxStep(form);
/** The action that returns a form to its initial values. */
export const resetAction = (form, config = {}, values) => ({
    type: "RESET",
    values: values ??
        {
            ...buildDefaultValues(form.fields),
            ...config.initialValues,
        },
});
/** Build the render context for a single field. */
export const createFieldContext = (api, field) => {
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
/** Build the render context for a section. */
export const createSectionContext = (api, section) => ({
    section,
    fields: section.fields.map((field) => createFieldContext(api, field)),
    gridClass: getGridClasses(api.form.layout),
});
/** Build the render context for a step. */
export const createStepContext = (api, step) => {
    const currentStep = api.state.currentStep;
    return {
        step,
        sections: step.sections.map((section) => createSectionContext(api, section)),
        isActive: step.step === currentStep,
        isCompleted: step.step < currentStep,
        canNavigateTo: step.step <= currentStep,
    };
};
