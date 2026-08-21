/**
 * Schema validation utilities for form handling
 *
 * Provides helpers to validate form data against @effect/schema
 * and extract field-level errors for UI display.
 */
import { Schema, SchemaAST, Effect, Either, Option, ParseResult, pipe, } from "effect";
// ============================================================================
// Error Extraction
// ============================================================================
/**
 * Helper to get first element from SingleOrNonEmpty path
 */
const getFirstKey = (path) => {
    if (Array.isArray(path)) {
        return path[0];
    }
    return path;
};
/**
 * Helper to iterate SingleOrNonEmpty issues
 */
const iterateIssues = (issues) => {
    if (Array.isArray(issues)) {
        return issues;
    }
    return [issues];
};
/**
 * The message a refinement issue should report.
 *
 * Prefers the schema author's `message` annotation, in either the plain-string
 * or `{ message }` form, and falls back to Effect's own rendering.
 */
const refinementMessage = (issue) => {
    const annotation = SchemaAST.getMessageAnnotation(issue.ast);
    if (Option.isSome(annotation)) {
        const result = annotation.value(issue);
        if (typeof result === "string") {
            return result;
        }
        if (typeof result === "object" &&
            "message" in result &&
            typeof result.message === "string") {
            return result.message;
        }
    }
    return ParseResult.TreeFormatter.formatIssueSync(issue);
};
/**
 * Recursively extract all field errors from a ParseResult error
 */
const extractFieldErrors = (error, prefix = "") => {
    const errors = {};
    const processIssue = (issue, path = "") => {
        switch (issue._tag) {
            case "Type": {
                // Type mismatch error
                const message = issue.message ?? `Invalid value`;
                if (path) {
                    errors[path] = message;
                }
                break;
            }
            case "Missing": {
                // Missing required field
                if (path) {
                    errors[path] = issue.message ?? "This field is required";
                }
                break;
            }
            case "Pointer": {
                // Field access - drill down
                const key = getFirstKey(issue.path);
                const fieldPath = path ? `${path}.${String(key)}` : String(key);
                processIssue(issue.issue, fieldPath);
                break;
            }
            case "Composite": {
                // Multiple issues
                for (const subIssue of iterateIssues(issue.issues)) {
                    processIssue(subIssue, path);
                }
                break;
            }
            case "Refinement": {
                // A refinement fails in one of two ways: its own predicate rejected
                // the value ("Predicate"), or the schema it wraps rejected it first
                // ("From"). Only the former is this refinement's own doing, so only
                // then may its message be used.
                //
                // Reading the annotation before checking the kind made the outermost
                // message win for every failure in a chain: a two-character value
                // against `minLength(3)` then `maxLength(20)` reported "At most 20
                // characters", because maxLength is the outer refinement even though
                // minLength is what rejected it.
                if (issue.kind === "From") {
                    processIssue(issue.issue, path);
                    // The inner schema may be an unannotated built-in that recorded
                    // nothing; only then does this refinement's own message stand in.
                    if (!path || errors[path] !== undefined)
                        break;
                }
                if (!path)
                    break;
                errors[path] = refinementMessage(issue);
                break;
            }
            case "Transformation": {
                // For transformation-level failures, use TreeFormatter for the message
                if (issue.kind === "Transformation" && path) {
                    errors[path] = ParseResult.TreeFormatter.formatIssueSync(issue);
                }
                else {
                    processIssue(issue.issue, path);
                }
                break;
            }
            case "Forbidden": {
                // Unexpected field
                if (path) {
                    errors[path] = issue.message ?? "This field is not allowed";
                }
                break;
            }
        }
    };
    processIssue(error.issue, prefix);
    return errors;
};
// ============================================================================
// Data Pre-processing
// ============================================================================
/**
 * Strip empty/blank strings from form data so they become undefined,
 * allowing the schema's required property check to produce Missing errors
 * instead of refinement errors (e.g. pattern, minLength) for blank fields.
 */
const stripEmptyStrings = (data) => {
    if (data === null || data === undefined || typeof data !== "object") {
        return data;
    }
    if (Array.isArray(data)) {
        return data.map(stripEmptyStrings);
    }
    const result = {};
    for (const [key, value] of Object.entries(data)) {
        if (typeof value === "string" && value.trim() === "") {
            // Omit empty strings — they'll be seen as missing by the struct schema
            continue;
        }
        result[key] = value;
    }
    return result;
};
// ============================================================================
// Validation Functions
// ============================================================================
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
export const validateSync = (schema, data) => {
    const decode = Schema.decodeUnknownEither(schema, { errors: "all" });
    const result = decode(stripEmptyStrings(data));
    return Either.match(result, {
        onLeft: (parseError) => ({
            valid: false,
            data: undefined,
            errors: extractFieldErrors(parseError),
        }),
        onRight: (validData) => ({
            valid: true,
            data: validData,
            errors: undefined,
        }),
    });
};
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
export const validate = (schema, data) => pipe(Schema.decodeUnknown(schema, { errors: "all" })(stripEmptyStrings(data)), Effect.mapError(extractFieldErrors));
/**
 * Stand-in path for a schema validated on its own.
 *
 * `extractFieldErrors` keys errors by the property path it walked to reach
 * them, and records nothing when that path is empty. A field schema validated
 * outside a struct has no path, so every message was dropped and callers saw
 * the generic "Invalid value" fallback instead of the schema's own message —
 * the same rule reported "At least 8 characters" nested in a struct and
 * "Invalid value" on its own. Seeding a non-empty root gives the walk something
 * to key on; the key itself is never read, only the message.
 */
const ROOT_PATH = "value";
/**
 * Validate a single field against a schema
 *
 * @example
 * ```ts
 * const emailError = validateField(EmailSchema, emailValue);
 * // Returns string error message or undefined if valid
 * ```
 */
export const validateField = (schema, value) => {
    const decode = Schema.decodeUnknownEither(schema, { errors: "first" });
    const result = decode(value);
    return Either.match(result, {
        onLeft: (parseError) => {
            const errors = extractFieldErrors(parseError, ROOT_PATH);
            return Object.values(errors)[0] ?? "Invalid value";
        },
        onRight: (_validData) => undefined,
    });
};
/**
 * Create a field validator function for a specific field in a struct schema
 *
 * @example
 * ```ts
 * const validateEmail = createFieldValidator(UserSchema, "email");
 * const error = validateEmail(emailValue);
 * ```
 */
export const createFieldValidator = (schema, fieldName) => {
    // Extract field schema from struct
    const ast = schema.ast;
    if (ast._tag !== "TypeLiteral") {
        throw new Error("createFieldValidator only works with Struct schemas");
    }
    const field = ast.propertySignatures.find((prop) => prop.name === fieldName);
    if (!field) {
        throw new Error(`Field "${String(fieldName)}" not found in schema`);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fieldSchema = Schema.make(field.type);
    return (value) => validateField(fieldSchema, value);
};
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
export const createFieldValidators = (schema, fields) => {
    const validators = {};
    for (const field of fields) {
        let decode;
        try {
            decode = createFieldValidator(schema, field.name);
        }
        catch {
            decode = undefined;
        }
        validators[field.name] = (value) => {
            if (isBlank(value)) {
                return field.required ? "This field is required" : undefined;
            }
            return decode?.(value);
        };
    }
    return validators;
};
/**
 * Whether a value counts as "not filled in" for form purposes.
 *
 * Mirrors `stripEmptyStrings`: a whitespace-only string is blank, but `false`
 * and `0` are real answers and must not be.
 */
const isBlank = (value) => value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim() === "");
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
export const validateFields = (schema, fields) => {
    const errors = {};
    for (const [fieldName, value] of Object.entries(fields)) {
        try {
            const validator = createFieldValidator(schema, fieldName);
            const error = validator(value);
            if (error) {
                errors[fieldName] = error;
            }
        }
        catch {
            // Field might not exist or schema structure issue
        }
    }
    return errors;
};
// ============================================================================
// Async Validation (for server-side checks)
// ============================================================================
/**
 * Validate with potential async validators (e.g., email availability check)
 */
export const validateAsync = async (schema, data) => {
    // First do sync validation
    const syncResult = validateSync(schema, data);
    if (!syncResult.valid) {
        return syncResult;
    }
    // Here you could add async validation steps
    // e.g., checking email availability via API
    return syncResult;
};
/** Create initial field state */
export const createFieldState = (value) => ({
    value,
    error: undefined,
    touched: false,
    dirty: false,
});
/** Update field value and mark as dirty */
export const updateFieldValue = (state, value) => ({
    ...state,
    value,
    dirty: true,
});
/** Mark field as touched (e.g., on blur) */
export const touchField = (state) => ({
    ...state,
    touched: true,
});
/** Set field error */
export const setFieldError = (state, error) => ({
    ...state,
    error,
});
/** Check if form has any errors */
export const hasErrors = (errors) => Object.values(errors).some((error) => error !== undefined);
/** Get first error message */
export const getFirstError = (errors) => Object.values(errors).find((error) => error !== undefined);
