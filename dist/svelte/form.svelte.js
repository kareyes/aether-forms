import { applyActions, blurActions, canAdvance, createFieldValidators, createFormState, extractForm, resetAction, resolveFormConfig, setValueActions, validateFormActions, validateStepActions, } from "../index.js";
/**
 * Create a reactive form from an annotated schema.
 *
 * Layout extraction and per-field validator compilation both happen once here,
 * not per render and not per keystroke.
 */
export function createForm(schema, config = {}) {
    const form = extractForm(schema);
    const resolved = resolveFormConfig(config);
    const validators = createFieldValidators(schema, form.fields);
    let state = $state(createFormState(schema, config, form));
    const dispatch = (...actions) => {
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
            if (!canAdvance(form, state, valid))
                return false;
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
            dispatch({ type: "INCREMENT_SUBMIT_COUNT" }, { type: "SET_SUBMITTING", isSubmitting: true });
            try {
                const { result, actions } = validateFormActions(schema, state.values);
                dispatch(...actions);
                if (!result.valid)
                    return false;
                await handler(result.data);
                return true;
            }
            finally {
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
