/**
 * Layout extraction utilities for schema-first forms
 *
 * Extracts fields, sections, and steps from schema annotations
 * to build a framework-agnostic form layout structure.
 */
import { Schema, SchemaAST } from "effect";
import {
	getFieldLayout,
	getFieldUI,
	getFormLayout,
	type ColumnSpan,
	type FieldOption,
	type FieldOptionGroup,
	type FileInputMode,
	type FormLayoutConfig,
	type InputType,
	type SectionConfig,
	type StepConfig,
} from "./annotations.js";

// ============================================================================
// Extracted Field Types
// ============================================================================

/** Complete field descriptor extracted from schema */
export interface ExtractedField {
	readonly name: string;
	readonly label: string;
	readonly placeholder?: string;
	readonly description?: string;
	readonly inputType: InputType;
	readonly required: boolean;
	readonly options?: readonly FieldOption[];
	readonly optionGroups?: readonly FieldOptionGroup[];
	readonly mask?: string;
	readonly autocomplete?: string;
	readonly disabled?: boolean;
	readonly readonly?: boolean;
	readonly section?: string;
	readonly step?: number;
	readonly order: number;
	readonly colSpan: ColumnSpan;
	readonly colSpanSm?: ColumnSpan;
	readonly colSpanMd?: ColumnSpan;
	readonly colSpanLg?: ColumnSpan;
	readonly defaultValue?: unknown;
	// File input options (only used when inputType === "file")
	readonly fileMode?: FileInputMode;
	readonly multiple?: boolean;
	readonly accept?: string;
}

/** Section with its fields */
export interface ExtractedSection {
	readonly id: string;
	readonly title?: string;
	readonly description?: string;
	readonly order: number;
	readonly collapsible?: boolean;
	readonly defaultCollapsed?: boolean;
	readonly fields: readonly ExtractedField[];
}

/** Step with its sections and fields */
export interface ExtractedStep {
	readonly step: number;
	readonly title: string;
	readonly description?: string;
	readonly icon?: string;
	readonly sections: readonly ExtractedSection[];
	readonly fields: readonly ExtractedField[];
}

/** Complete extracted form structure */
export interface ExtractedForm {
	readonly fields: readonly ExtractedField[];
	readonly sections: readonly ExtractedSection[];
	readonly steps: readonly ExtractedStep[];
	readonly layout: FormLayoutConfig;
	readonly isMultiStep: boolean;
}

// ============================================================================
// Schema AST Traversal
// ============================================================================

/**
 * Check if a property signature is optional
 */
const isOptionalProperty = (prop: SchemaAST.PropertySignature): boolean => {
	return prop.isOptional;
};

/**
 * Infer input type from schema AST when not explicitly annotated
 */
const inferInputType = (ast: SchemaAST.AST): InputType => {
	switch (ast._tag) {
		case "BooleanKeyword":
			return "checkbox";
		case "NumberKeyword":
			return "number";
		case "StringKeyword":
			return "text";
		case "Literal": {
			if (typeof ast.literal === "boolean") return "checkbox";
			if (typeof ast.literal === "number") return "number";
			return "text";
		}
		case "Union": {
			// Check if it's an enum-like union of literals
			const allLiterals = ast.types.every(
				(t: SchemaAST.AST) =>
					t._tag === "Literal" &&
					typeof (t as SchemaAST.Literal).literal === "string",
			);
			if (allLiterals && ast.types.length <= 5) return "radio";
			if (allLiterals) return "select";
			return "text";
		}
		case "Refinement":
		case "Transformation":
			// Recurse into the underlying type
			return inferInputType(ast.from);
		case "Suspend":
			return inferInputType(ast.f());
		default:
			return "text";
	}
};

/**
 * Extract default value from schema if available
 */
const extractDefaultValue = (ast: SchemaAST.AST): unknown => {
	// Check for PropertySignatureDefault annotation
	const annotated = ast as SchemaAST.Annotated;
	const defaultAnnotation =
		annotated.annotations?.[SchemaAST.DefaultAnnotationId as symbol];
	if (defaultAnnotation !== undefined) {
		return typeof defaultAnnotation === "function"
			? defaultAnnotation()
			: defaultAnnotation;
	}
	return undefined;
};

/**
 * Unwrap optional/nullable types to get the core type
 */
const unwrapType = (ast: SchemaAST.AST): SchemaAST.AST => {
	if (ast._tag === "Union") {
		// Filter out undefined/null types
		const nonNullTypes = ast.types.filter(
			(t: SchemaAST.AST) =>
				(t._tag !== "UndefinedKeyword" && t._tag !== "Literal") ||
				(t._tag === "Literal" && (t as SchemaAST.Literal).literal !== null),
		);
		if (nonNullTypes.length === 1) {
			return nonNullTypes[0];
		}
	}
	if (ast._tag === "Refinement" || ast._tag === "Transformation") {
		return unwrapType(ast.from);
	}
	return ast;
};

// ============================================================================
// Field Extraction
// ============================================================================

/**
 * Extract a single field from a property signature
 */
const extractField = (
	name: string,
	prop: SchemaAST.PropertySignature,
): ExtractedField | undefined => {
	const ast = prop.type;
	const unwrapped = unwrapType(ast);

	// Annotations can land in three places depending on how the field was
	// written, so all three are consulted, outermost first:
	//
	//   pipe(Schema.optional(X), withField(...))  -> on the PropertySignature
	//   pipe(X, withField(...))                   -> on prop.type
	//   Schema.optional(pipe(X, withField(...)))  -> inside prop.type's union
	//
	// Reading only prop.type used to drop the first case silently: the field
	// still rendered, but with a humanised fallback label, no section, and
	// default ordering.
	const ui =
		getFieldUI(prop as SchemaAST.Annotated) ??
		getFieldUI(ast as SchemaAST.Annotated) ??
		getFieldUI(unwrapped as SchemaAST.Annotated);
	const layout =
		getFieldLayout(prop as SchemaAST.Annotated) ??
		getFieldLayout(ast as SchemaAST.Annotated) ??
		getFieldLayout(unwrapped as SchemaAST.Annotated);

	// If no UI annotation, create minimal field
	const label = ui?.label ?? formatFieldName(name);
	const inputType = ui?.inputType ?? inferInputType(unwrapped);
	const required = !isOptionalProperty(prop);

	return {
		name,
		label,
		placeholder: ui?.placeholder,
		description: ui?.description,
		inputType,
		required,
		options: ui?.options,
		optionGroups: ui?.optionGroups,
		mask: ui?.mask,
		autocomplete: ui?.autocomplete,
		disabled: ui?.disabled,
		readonly: ui?.readonly,
		section: layout?.section,
		step: layout?.step,
		order: layout?.order ?? 999,
		colSpan: layout?.colSpan ?? "full",
		colSpanSm: layout?.colSpanSm,
		colSpanMd: layout?.colSpanMd,
		colSpanLg: layout?.colSpanLg,
		defaultValue: extractDefaultValue(ast),
		fileMode: ui?.fileMode,
		multiple: ui?.multiple,
		accept: ui?.accept,
	};
};

/**
 * Format a camelCase field name as a readable label
 */
const formatFieldName = (name: string): string => {
	return name
		.replace(/([A-Z])/g, " $1")
		.replace(/^./, (str) => str.toUpperCase())
		.trim();
};

// ============================================================================
// Form Extraction
// ============================================================================

/**
 * Extract all fields from a struct schema
 */
export const extractFields = <A, I, R>(
	schema: Schema.Schema<A, I, R>,
): readonly ExtractedField[] => {
	const ast = schema.ast;

	if (ast._tag !== "TypeLiteral") {
		throw new Error("extractFields only works with Struct schemas");
	}

	const fields: ExtractedField[] = [];

	for (const prop of ast.propertySignatures) {
		if (typeof prop.name !== "string") continue;

		const field = extractField(prop.name, prop);
		if (field) {
			fields.push(field);
		}
	}

	return fields.sort((a, b) => a.order - b.order);
};

/**
 * Group fields by section
 */
export const groupFieldsBySection = (
	fields: readonly ExtractedField[],
	sectionConfigs?: readonly SectionConfig[],
): readonly ExtractedSection[] => {
	const sectionMap = new Map<string, ExtractedField[]>();
	const defaultSection = "default";

	// Group fields by section
	for (const field of fields) {
		const sectionId = field.section ?? defaultSection;
		const existing = sectionMap.get(sectionId) ?? [];
		sectionMap.set(sectionId, [...existing, field]);
	}

	// Build section objects
	const sections: ExtractedSection[] = [];
	const configMap = new Map(sectionConfigs?.map((c) => [c.id, c]) ?? []);

	for (const [sectionId, sectionFields] of sectionMap) {
		const config = configMap.get(sectionId);
		sections.push({
			id: sectionId,
			title: config?.title,
			description: config?.description,
			order: config?.order ?? 999,
			collapsible: config?.collapsible,
			defaultCollapsed: config?.defaultCollapsed,
			fields: sectionFields.sort((a, b) => a.order - b.order),
		});
	}

	return sections.sort((a, b) => a.order - b.order);
};

/**
 * Group fields by step (for multi-step forms)
 */
export const groupFieldsByStep = (
	fields: readonly ExtractedField[],
	stepConfigs?: readonly StepConfig[],
	sectionConfigs?: readonly SectionConfig[],
): readonly ExtractedStep[] => {
	const stepMap = new Map<number, ExtractedField[]>();

	// Group fields by step
	for (const field of fields) {
		const step = field.step ?? 1;
		const existing = stepMap.get(step) ?? [];
		stepMap.set(step, [...existing, field]);
	}

	// Build step objects
	const steps: ExtractedStep[] = [];
	const configMap = new Map(stepConfigs?.map((c) => [c.step, c]) ?? []);

	for (const [stepNum, stepFields] of stepMap) {
		const config = configMap.get(stepNum);

		// Group this step's fields by section
		const stepSections = groupFieldsBySection(stepFields, sectionConfigs);

		steps.push({
			step: stepNum,
			title: config?.title ?? `Step ${stepNum}`,
			description: config?.description,
			icon: config?.icon,
			sections: stepSections,
			fields: stepFields.sort((a, b) => a.order - b.order),
		});
	}

	return steps.sort((a, b) => a.step - b.step);
};

/**
 * Extract complete form structure from schema
 *
 * @example
 * ```ts
 * const form = extractForm(UserRegistrationSchema);
 * console.log(form.isMultiStep); // true
 * console.log(form.steps.length); // 3
 * ```
 */
export const extractForm = <A, I, R>(
	schema: Schema.Schema<A, I, R>,
): ExtractedForm => {
	const ast = schema.ast;
	const formLayout = getFormLayout(ast as SchemaAST.Annotated) ?? {
		columns: 1,
		gap: "md",
	};

	const fields = extractFields(schema);
	const sections = groupFieldsBySection(fields, formLayout.sections);
	const steps = groupFieldsByStep(
		fields,
		formLayout.steps,
		formLayout.sections,
	);

	const isMultiStep = steps.length > 1 || formLayout.steps !== undefined;

	return {
		fields,
		sections,
		steps,
		layout: formLayout,
		isMultiStep,
	};
};

// ============================================================================
// Field Filtering Utilities
// ============================================================================

/**
 * Get fields for a specific step
 */
export const getFieldsForStep = (
	form: ExtractedForm,
	step: number,
): readonly ExtractedField[] => {
	const stepData = form.steps.find((s) => s.step === step);
	return stepData?.fields ?? [];
};

/**
 * Get fields for a specific section
 */
export const getFieldsForSection = (
	form: ExtractedForm,
	sectionId: string,
): readonly ExtractedField[] => {
	const section = form.sections.find((s) => s.id === sectionId);
	return section?.fields ?? [];
};

/**
 * Get visible fields (not hidden input type)
 */
export const getVisibleFields = (
	fields: readonly ExtractedField[],
): readonly ExtractedField[] => fields.filter((f) => f.inputType !== "hidden");

/**
 * Get required fields
 */
export const getRequiredFields = (
	fields: readonly ExtractedField[],
): readonly ExtractedField[] => fields.filter((f) => f.required);

// ============================================================================
// Grid CSS Class Generation
// ============================================================================

const COL_SPAN: Record<ColumnSpan, string> = {
	full: "col-span-full",
	1: "col-span-1",
	2: "col-span-2",
	3: "col-span-3",
	4: "col-span-4",
	5: "col-span-5",
	6: "col-span-6",
	7: "col-span-7",
	8: "col-span-8",
	9: "col-span-9",
	10: "col-span-10",
	11: "col-span-11",
	12: "col-span-12",
};

const COL_SPAN_SM: Record<ColumnSpan, string> = {
	full: "@sm:col-span-full",
	1: "@sm:col-span-1",
	2: "@sm:col-span-2",
	3: "@sm:col-span-3",
	4: "@sm:col-span-4",
	5: "@sm:col-span-5",
	6: "@sm:col-span-6",
	7: "@sm:col-span-7",
	8: "@sm:col-span-8",
	9: "@sm:col-span-9",
	10: "@sm:col-span-10",
	11: "@sm:col-span-11",
	12: "@sm:col-span-12",
};

const COL_SPAN_MD: Record<ColumnSpan, string> = {
	full: "@md:col-span-full",
	1: "@md:col-span-1",
	2: "@md:col-span-2",
	3: "@md:col-span-3",
	4: "@md:col-span-4",
	5: "@md:col-span-5",
	6: "@md:col-span-6",
	7: "@md:col-span-7",
	8: "@md:col-span-8",
	9: "@md:col-span-9",
	10: "@md:col-span-10",
	11: "@md:col-span-11",
	12: "@md:col-span-12",
};

const COL_SPAN_LG: Record<ColumnSpan, string> = {
	full: "@lg:col-span-full",
	1: "@lg:col-span-1",
	2: "@lg:col-span-2",
	3: "@lg:col-span-3",
	4: "@lg:col-span-4",
	5: "@lg:col-span-5",
	6: "@lg:col-span-6",
	7: "@lg:col-span-7",
	8: "@lg:col-span-8",
	9: "@lg:col-span-9",
	10: "@lg:col-span-10",
	11: "@lg:col-span-11",
	12: "@lg:col-span-12",
};

const GRID_COLS: Record<number, string> = {
	1: "grid-cols-1",
	2: "grid-cols-2",
	3: "grid-cols-3",
	4: "grid-cols-4",
	5: "grid-cols-5",
	6: "grid-cols-6",
	7: "grid-cols-7",
	8: "grid-cols-8",
	9: "grid-cols-9",
	10: "grid-cols-10",
	11: "grid-cols-11",
	12: "grid-cols-12",
};

/**
 * Generate CSS classes for grid column span
 */
export const getColSpanClasses = (field: ExtractedField): string => {
	const classes: string[] = [COL_SPAN[field.colSpan]];

	if (field.colSpanSm) classes.push(COL_SPAN_SM[field.colSpanSm]);
	if (field.colSpanMd) classes.push(COL_SPAN_MD[field.colSpanMd]);
	if (field.colSpanLg) classes.push(COL_SPAN_LG[field.colSpanLg]);

	return classes.join(" ");
};

/**
 * Generate grid container classes
 */
export const getGridClasses = (layout: FormLayoutConfig): string => {
	// @container makes the grid its own container so @sm:/@md:/@lg: col-span
	// classes on child fields respond to the grid's own width, not the viewport.
	const classes = ["@container", "grid"];

	// Column count
	const cols = layout.columns ?? 1;
	classes.push(GRID_COLS[cols] ?? "grid-cols-1");

	// Gap
	switch (layout.gap) {
		case "none":
			break;
		case "sm":
			classes.push("gap-2");
			break;
		case "lg":
			classes.push("gap-6");
			break;
		case "md":
		default:
			classes.push("gap-4");
	}

	return classes.join(" ");
};

// ============================================================================
// Default Value Extraction
// ============================================================================

/**
 * Build initial form values from extracted fields
 */
export const buildDefaultValues = <T extends Record<string, unknown>>(
	fields: readonly ExtractedField[],
): Partial<T> => {
	const defaults: Record<string, unknown> = {};

	for (const field of fields) {
		if (field.defaultValue !== undefined) {
			defaults[field.name] = field.defaultValue;
		} else {
			// Set sensible defaults based on input type
			switch (field.inputType) {
				case "checkbox":
				case "switch":
					defaults[field.name] = false;
					break;
				case "number":
					defaults[field.name] = undefined;
					break;
				case "file":
					defaults[field.name] = null;
					break;
				default:
					defaults[field.name] = "";
			}
		}
	}

	return defaults as Partial<T>;
};
