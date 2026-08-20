/**
 * Schema validation utilities for form handling
 *
 * Provides helpers to validate form data against @effect/schema
 * and extract field-level errors for UI display.
 */
import { Schema, Effect } from "effect";
/** Field-level validation errors */
export interface FieldErrors {
    readonly [fieldName: string]: string | undefined;
}
/** Validation result with typed success/failure */
export type ValidationResult<T> = {
    readonly valid: true;
    readonly data: T;
    readonly errors: undefined;
} | {
    readonly valid: false;
    readonly data: undefined;
    readonly errors: FieldErrors;
};
/**
 * Validate form data against a schema synchronously
 *
 * @example
 * ```ts
 * const result = validateSync(UserSchema, formData);
 * if (result.valid) {
 *   console.log(result.data); // typed data
 * } else {
 *   console.log(result.errors); // field errors
 * }
 * ```
 */
export declare const validateSync: <A, I>(schema: Schema.Schema<A, I, never>, data: unknown) => ValidationResult<A>;
/**
 * Validate form data and return an Effect
 *
 * @example
 * ```ts
 * const program = pipe(
 *   validate(UserSchema, formData),
 *   Effect.flatMap((validData) => registerUser(validData))
 * );
 * ```
 */
export declare const validate: <A, I, R>(schema: Schema.Schema<A, I, R>, data: unknown) => Effect.Effect<A, FieldErrors, R>;
/**
 * Validate a single field against a schema
 *
 * @example
 * ```ts
 * const emailError = validateField(EmailSchema, emailValue);
 * // Returns string error message or undefined if valid
 * ```
 */
export declare const validateField: <A, I>(schema: Schema.Schema<A, I, never>, value: unknown) => string | undefined;
/**
 * Create a field validator function for a specific field in a struct schema
 *
 * @example
 * ```ts
 * const validateEmail = createFieldValidator(UserSchema, "email");
 * const error = validateEmail(emailValue);
 * ```
 */
export declare const createFieldValidator: <A extends Record<string, unknown>, I>(schema: Schema.Schema<A, I, never>, fieldName: keyof A) => ((value: unknown) => string | undefined);
/** A field name paired with whether the schema marks it required. */
export interface FieldDescriptor {
    readonly name: string;
    readonly required: boolean;
}
/** Per-field validators, keyed by field name. */
export type FieldValidators = Readonly<Record<string, (value: unknown) => string | undefined>>;
/**
 * Build one validator per field, compiled once.
 *
 * Validating a single field used to mean running the whole struct through
 * `validateSync` and discarding every error but one — O(fields) parse work on
 * each keystroke. These validators are compiled from the struct's property
 * signatures a single time and then reused, so a keystroke costs one field
 * parse.
 *
 * Blank values are special-cased to preserve whole-form semantics. `validateSync`
 * routes form data through `stripEmptyStrings` first, so a blank required field
 * surfaces as `Missing` ("required") rather than being pushed through that
 * field's own refinements and reported as, say, a pattern failure. Validating a
 * field in isolation skips that step, so the blank case is handled here instead.
 *
 * Fields whose validator cannot be built (a non-struct schema, or a name absent
 * from the AST) fall back to always-valid rather than throwing — an unknown
 * field is not the input's fault.
 */
export declare const createFieldValidators: <A extends Record<string, unknown>, I>(schema: Schema.Schema<A, I, never>, fields: readonly FieldDescriptor[]) => FieldValidators;
/**
 * Validate multiple fields and return combined errors
 *
 * @example
 * ```ts
 * const errors = validateFields(UserSchema, {
 *   email: emailValue,
 *   password: passwordValue
 * });
 * // Returns { email?: string, password?: string }
 * ```
 */
export declare const validateFields: <A extends Record<string, unknown>, I>(schema: Schema.Schema<A, I, never>, fields: Partial<Record<keyof A, unknown>>) => FieldErrors;
/**
 * Validate with potential async validators (e.g., email availability check)
 */
export declare const validateAsync: <A, I>(schema: Schema.Schema<A, I, never>, data: unknown) => Promise<ValidationResult<A>>;
/** Form field state */
export interface FieldState<T> {
    readonly value: T;
    readonly error: string | undefined;
    readonly touched: boolean;
    readonly dirty: boolean;
}
/** Create initial field state */
export declare const createFieldState: <T>(value: T) => FieldState<T>;
/** Update field value and mark as dirty */
export declare const updateFieldValue: <T>(state: FieldState<T>, value: T) => FieldState<T>;
/** Mark field as touched (e.g., on blur) */
export declare const touchField: <T>(state: FieldState<T>) => FieldState<T>;
/** Set field error */
export declare const setFieldError: <T>(state: FieldState<T>, error: string | undefined) => FieldState<T>;
/** Check if form has any errors */
export declare const hasErrors: (errors: FieldErrors) => boolean;
/** Get first error message */
export declare const getFirstError: (errors: FieldErrors) => string | undefined;
