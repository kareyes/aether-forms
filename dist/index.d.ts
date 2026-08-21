/**
 * aether-forms — schema-first forms for Effect Schema.
 *
 * An Effect Schema is the single source of truth for a form's validation rules,
 * TypeScript types, UI metadata, and layout. Annotate the schema once and the
 * form describes itself.
 *
 * This entry point is pure and framework-agnostic: it depends on `effect` and
 * nothing else, so the same schema can drive a form in the browser and validate
 * a payload on a server. The Svelte 5 components live behind `aether-forms/svelte`.
 *
 * @example
 * ```ts
 * import { Schema, pipe } from "effect";
 * import { withField, withFormLayout, extractForm, validateSync } from "aether-forms";
 *
 * const LoginSchema = pipe(
 *   Schema.Struct({
 *     email: pipe(
 *       Schema.String,
 *       Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
 *       withField({ label: "Email", inputType: "email" }),
 *     ),
 *     password: pipe(
 *       Schema.String,
 *       Schema.minLength(8),
 *       withField({ label: "Password", inputType: "password" }),
 *     ),
 *   }),
 *   withFormLayout({ columns: 2 }),
 * );
 *
 * const form = extractForm(LoginSchema);
 * const result = validateSync(LoginSchema, { email: "a@b.co", password: "hunter22" });
 * ```
 */
export { FieldLayoutSymbol, FieldUISymbol, FormLayoutSymbol, getFieldAnnotation, getFieldLayout, getFieldUI, getFormLayout, RequiredCheckbox, requiredCheckbox, RequiredFile, requiredFile, RequiredSwitch, requiredSwitch, withField, withFieldLayout, withFieldUI, withFormLayout, type ColumnSpan, type FieldAnnotation, type FieldLayoutAnnotation, type FieldOption, type FieldOptionGroup, type FieldUIAnnotation, type FileInputMode, type FormLayoutConfig, type InputType, type SectionConfig, type StepConfig, } from "./annotations.js";
export { createFieldState, createFieldValidator, createFieldValidators, getFirstError, hasErrors, setFieldError, touchField, updateFieldValue, validate, validateAsync, validateField, validateFields, validateSync, type FieldDescriptor, type FieldErrors, type FieldValidators, type FieldState as ValidationFieldState, type ValidationResult, } from "./validation.js";
export { buildDefaultValues, extractFields, extractForm, getColSpanClasses, getFieldsForSection, getFieldsForStep, getGridClasses, getRequiredFields, getVisibleFields, groupFieldsBySection, groupFieldsByStep, type ExtractedField, type ExtractedForm, type ExtractedSection, type ExtractedStep, } from "./layout.js";
export { applyActions, blurActions, canAdvance, createFieldContext, createFormState, createSectionContext, createStepContext, formReducer, getFieldState, maxStep, resetAction, resolveFormConfig, setValueActions, shouldShowError, validateFieldAction, validateFormActions, validateStepActions, type FieldBlurHandler, type FieldChangeHandler, type FieldRenderContext, type FieldState, type FormAction, type FormApi, type FormConfig, type FormState, type ResolvedFormConfig, type SectionRenderContext, type StepRenderContext, type StepValidationOutcome, type SubmitHandler, type ValidationOutcome, } from "./form-state.js";
