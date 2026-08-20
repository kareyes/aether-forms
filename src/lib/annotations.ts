/**
 * Schema annotations for UI and layout metadata
 *
 * These annotations allow @effect/schema to be the single source of truth
 * for form rendering, validation, and layout configuration.
 */
import { Schema, SchemaAST } from "effect";

// ============================================================================
// UI Annotation Types
// ============================================================================

/** Supported input types for form fields */
export type InputType =
	| "text"
	| "email"
	| "password"
	| "tel"
	| "url"
	| "number"
	| "textarea"
	| "select"
	| "combobox"
	| "checkbox"
	| "switch"
	| "radio"
	| "date"
	| "datetime"
	| "file"
	| "hidden";

/** Options for select/radio/checkbox group fields */
export interface FieldOption {
	readonly value: string;
	readonly label: string;
	readonly disabled?: boolean;
}

/** Option group for categorized select options */
export interface FieldOptionGroup {
	readonly label?: string;
	readonly options: readonly FieldOption[];
}

/** File input display mode */
export type FileInputMode = "drag-drop" | "regular" | "button-only";

/** UI-specific field metadata */
export interface FieldUIAnnotation {
	readonly label: string;
	readonly placeholder?: string;
	readonly description?: string;
	readonly inputType?: InputType;
	readonly options?: readonly FieldOption[];
	readonly optionGroups?: readonly FieldOptionGroup[];
	readonly mask?: string;
	readonly autocomplete?: string;
	readonly disabled?: boolean;
	readonly readonly?: boolean;
	// File input options (only used when inputType === "file")
	readonly fileMode?: FileInputMode;
	readonly multiple?: boolean;
	readonly accept?: string;
}

// ============================================================================
// Layout Annotation Types
// ============================================================================

/** Grid column span (1-12 for 12-column grid) */
export type ColumnSpan =
	| 1
	| 2
	| 3
	| 4
	| 5
	| 6
	| 7
	| 8
	| 9
	| 10
	| 11
	| 12
	| "full";

/** Layout-specific field metadata */
export interface FieldLayoutAnnotation {
	readonly section?: string;
	readonly step?: number;
	readonly order?: number;
	readonly colSpan?: ColumnSpan;
	readonly colSpanSm?: ColumnSpan;
	readonly colSpanMd?: ColumnSpan;
	readonly colSpanLg?: ColumnSpan;
}

/** Combined field metadata (UI + Layout) */
export interface FieldAnnotation
	extends FieldUIAnnotation,
		FieldLayoutAnnotation {}

// ============================================================================
// Section & Step Configuration
// ============================================================================

/** Section configuration for grouped fields */
export interface SectionConfig {
	readonly id: string;
	readonly title?: string;
	readonly description?: string;
	readonly order?: number;
	readonly collapsible?: boolean;
	readonly defaultCollapsed?: boolean;
}

/** Step configuration for wizard/multi-step forms */
export interface StepConfig {
	readonly step: number;
	readonly title: string;
	readonly description?: string;
	readonly icon?: string;
}

/** Form-level layout configuration */
export interface FormLayoutConfig {
	readonly sections?: readonly SectionConfig[];
	readonly steps?: readonly StepConfig[];
	readonly columns?: number;
	readonly gap?: "none" | "sm" | "md" | "lg";
}

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
export const withFieldUI =
	(annotation: FieldUIAnnotation) =>
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	<S>(schema: S): S =>
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(schema as any).annotations({ [FieldUISymbol]: annotation }) as S;

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
export const withFieldLayout =
	(annotation: FieldLayoutAnnotation) =>
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	<S>(schema: S): S =>
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(schema as any).annotations({ [FieldLayoutSymbol]: annotation }) as S;

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
export const withField =
	(annotation: FieldAnnotation) =>
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	<S>(schema: S): S => {
		const {
			section,
			step,
			order,
			colSpan,
			colSpanSm,
			colSpanMd,
			colSpanLg,
			...ui
		} = annotation;
		const layout: FieldLayoutAnnotation = {
			section,
			step,
			order,
			colSpan,
			colSpanSm,
			colSpanMd,
			colSpanLg,
		};
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return (schema as any).annotations({
			[FieldUISymbol]: ui as FieldUIAnnotation,
			[FieldLayoutSymbol]: layout,
		}) as S;
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
export const withFormLayout =
	(config: FormLayoutConfig) =>
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	<S>(schema: S): S =>
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(schema as any).annotations({ [FormLayoutSymbol]: config }) as S;

// ============================================================================
// Annotation Extractors
// ============================================================================

/**
 * Extract UI annotation from a schema's AST
 */
export const getFieldUI = (
	ast: SchemaAST.Annotated,
): FieldUIAnnotation | undefined =>
	ast.annotations[FieldUISymbol] as FieldUIAnnotation | undefined;

/**
 * Extract layout annotation from a schema's AST
 */
export const getFieldLayout = (
	ast: SchemaAST.Annotated,
): FieldLayoutAnnotation | undefined =>
	ast.annotations[FieldLayoutSymbol] as FieldLayoutAnnotation | undefined;

/**
 * Extract form layout config from a struct schema's AST
 */
export const getFormLayout = (
	ast: SchemaAST.Annotated,
): FormLayoutConfig | undefined =>
	ast.annotations[FormLayoutSymbol] as FormLayoutConfig | undefined;

/**
 * Extract combined field annotation
 */
export const getFieldAnnotation = (
	ast: SchemaAST.Annotated,
): FieldAnnotation | undefined => {
	const ui = getFieldUI(ast);
	const layout = getFieldLayout(ast);
	if (!ui && !layout) return undefined;
	return { ...ui, ...layout } as FieldAnnotation;
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
export const RequiredCheckbox = Schema.Boolean.pipe(
	Schema.filter((value): value is true => value === true, {
		message: () => "This field must be checked",
	}),
);

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
export const requiredCheckbox = (message: string) =>
	Schema.Boolean.pipe(
		Schema.filter((value): value is true => value === true, {
			message: () => message,
		}),
	);

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
export const RequiredSwitch = Schema.Boolean.pipe(
	Schema.filter((value): value is true => value === true, {
		message: () => "This field must be enabled",
	}),
);

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
export const requiredSwitch = (message: string) =>
	Schema.Boolean.pipe(
		Schema.filter((value): value is true => value === true, {
			message: () => message,
		}),
	);

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
export const RequiredFile = Schema.Any.pipe(
	Schema.filter(
		(value): value is FileList =>
			typeof FileList !== "undefined" &&
			value instanceof FileList &&
			value.length > 0,
		{
			message: () => "Please select a file",
		},
	),
);

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
export const requiredFile = (message: string) =>
	Schema.Any.pipe(
		Schema.filter(
			(value): value is FileList =>
				typeof FileList !== "undefined" &&
				value instanceof FileList &&
				value.length > 0,
			{
				message: () => message,
			},
		),
	);
