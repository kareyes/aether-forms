/**
 * Schema annotations for UI and layout metadata
 *
 * These annotations allow @effect/schema to be the single source of truth
 * for form rendering, validation, and layout configuration.
 */
import { Schema, SchemaAST } from "effect";
// ============================================================================
// Annotation Symbols (for Effect Schema)
// ============================================================================
/** Symbol for field UI annotations */
export const FieldUISymbol = Symbol.for("@aether-forms/FieldUI");
/** Symbol for field layout annotations */
export const FieldLayoutSymbol = Symbol.for("@aether-forms/FieldLayout");
/** Symbol for form layout configuration */
export const FormLayoutSymbol = Symbol.for("@aether-forms/FormLayout");
// ============================================================================
// Schema Annotation Helpers
// ============================================================================
/**
 * Annotate a schema field with UI metadata
 *
 * @example
 * ```ts
 * const Email = pipe(
 *   Schema.String,
 *   Schema.filter(isEmail),
 *   withFieldUI({
 *     label: "Email Address",
 *     placeholder: "you@example.com",
 *     inputType: "email"
 *   })
 * );
 * ```
 */
export const withFieldUI = (annotation) => 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(schema) => 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
schema.annotations({ [FieldUISymbol]: annotation });
/**
 * Annotate a schema field with layout metadata
 *
 * @example
 * ```ts
 * const FirstName = pipe(
 *   Schema.String,
 *   withFieldLayout({
 *     section: "personal",
 *     order: 1,
 *     colSpan: 6
 *   })
 * );
 * ```
 */
export const withFieldLayout = (annotation) => 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(schema) => 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
schema.annotations({ [FieldLayoutSymbol]: annotation });
/**
 * Annotate a schema field with combined UI and layout metadata
 *
 * @example
 * ```ts
 * const Email = pipe(
 *   Schema.String,
 *   Schema.filter(isEmail),
 *   withField({
 *     label: "Email Address",
 *     inputType: "email",
 *     section: "contact",
 *     colSpan: 6
 *   })
 * );
 * ```
 */
export const withField = (annotation) => 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(schema) => {
    const { section, step, order, colSpan, colSpanSm, colSpanMd, colSpanLg, ...ui } = annotation;
    const layout = {
        section,
        step,
        order,
        colSpan,
        colSpanSm,
        colSpanMd,
        colSpanLg,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return schema.annotations({
        [FieldUISymbol]: ui,
        [FieldLayoutSymbol]: layout,
    });
};
/**
 * Annotate a struct schema with form layout configuration
 *
 * @example
 * ```ts
 * const UserFormSchema = pipe(
 *   Schema.Struct({ ... }),
 *   withFormLayout({
 *     columns: 2,
 *     sections: [
 *       { id: "personal", title: "Personal Info" },
 *       { id: "contact", title: "Contact Details" }
 *     ]
 *   })
 * );
 * ```
 */
export const withFormLayout = (config) => 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(schema) => 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
schema.annotations({ [FormLayoutSymbol]: config });
// ============================================================================
// Annotation Extractors
// ============================================================================
/**
 * Extract UI annotation from a schema's AST
 */
export const getFieldUI = (ast) => ast.annotations[FieldUISymbol];
/**
 * Extract layout annotation from a schema's AST
 */
export const getFieldLayout = (ast) => ast.annotations[FieldLayoutSymbol];
/**
 * Extract form layout config from a struct schema's AST
 */
export const getFormLayout = (ast) => ast.annotations[FormLayoutSymbol];
/**
 * Extract combined field annotation
 */
export const getFieldAnnotation = (ast) => {
    const ui = getFieldUI(ast);
    const layout = getFieldLayout(ast);
    if (!ui && !layout)
        return undefined;
    return { ...ui, ...layout };
};
// ============================================================================
// Common Field Schemas
// ============================================================================
/**
 * Schema for a required checkbox that must be checked (value must be true)
 *
 * Use this for checkboxes like "I agree to terms and conditions"
 * where the user MUST check the box for validation to pass.
 *
 * @example
 * ```ts
 * const AcceptTermsSchema = pipe(
 *   Schema.Struct({
 *     acceptTerms: pipe(
 *       RequiredCheckbox,
 *       withField({
 *         label: "I agree to terms and conditions",
 *         inputType: "checkbox"
 *       })
 *     )
 *   })
 * );
 * ```
 */
export const RequiredCheckbox = Schema.Boolean.pipe(Schema.filter((value) => value === true, {
    message: () => "This field must be checked",
}));
/**
 * Create a required checkbox with a custom error message
 *
 * @example
 * ```ts
 * const acceptTerms = pipe(
 *   requiredCheckbox("You must accept the terms and conditions"),
 *   withField({
 *     label: "I accept the terms",
 *     inputType: "checkbox"
 *   })
 * );
 * ```
 */
export const requiredCheckbox = (message) => Schema.Boolean.pipe(Schema.filter((value) => value === true, {
    message: () => message,
}));
/**
 * Schema for a required switch that must be enabled (value must be true)
 *
 * Use this for switches like "Enable notifications" where the user
 * MUST toggle it on for validation to pass.
 *
 * @example
 * ```ts
 * const EnableSchema = pipe(
 *   Schema.Struct({
 *     notifications: pipe(
 *       RequiredSwitch,
 *       withField({
 *         label: "Enable notifications",
 *         inputType: "switch"
 *       })
 *     )
 *   })
 * );
 * ```
 */
export const RequiredSwitch = Schema.Boolean.pipe(Schema.filter((value) => value === true, {
    message: () => "This field must be enabled",
}));
/**
 * Create a required switch with a custom error message
 *
 * @example
 * ```ts
 * const notifications = pipe(
 *   requiredSwitch("You must enable notifications"),
 *   withField({
 *     label: "Enable notifications",
 *     inputType: "switch"
 *   })
 * );
 * ```
 */
export const requiredSwitch = (message) => Schema.Boolean.pipe(Schema.filter((value) => value === true, {
    message: () => message,
}));
/**
 * Schema for a required file input — value must be a non-empty FileList.
 *
 * Use this for file fields where a selection is mandatory.
 * Default message: "Please select a file"
 *
 * @example
 * ```ts
 * avatar: pipe(
 *   RequiredFile,
 *   withField({ label: "Profile Photo", inputType: "file" })
 * )
 * ```
 */
export const RequiredFile = Schema.Any.pipe(Schema.filter((value) => typeof FileList !== "undefined" &&
    value instanceof FileList &&
    value.length > 0, {
    message: () => "Please select a file",
}));
/**
 * Create a required file input with a custom error message
 *
 * @example
 * ```ts
 * resume: pipe(
 *   requiredFile("Please upload your resume"),
 *   withField({ label: "Resume", inputType: "file" })
 * )
 * ```
 */
export const requiredFile = (message) => Schema.Any.pipe(Schema.filter((value) => typeof FileList !== "undefined" &&
    value instanceof FileList &&
    value.length > 0, {
    message: () => message,
}));
