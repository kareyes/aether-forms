/**
 * Layout extraction utilities for schema-first forms
 *
 * Extracts fields, sections, and steps from schema annotations
 * to build a framework-agnostic form layout structure.
 */
import { Schema } from "effect";
import { type ColumnSpan, type FieldOption, type FieldOptionGroup, type FileInputMode, type FormLayoutConfig, type InputType, type SectionConfig, type StepConfig } from "./annotations.js";
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
/**
 * Extract all fields from a struct schema
 */
export declare const extractFields: <A, I, R>(schema: Schema.Schema<A, I, R>) => readonly ExtractedField[];
/**
 * Group fields by section
 */
export declare const groupFieldsBySection: (fields: readonly ExtractedField[], sectionConfigs?: readonly SectionConfig[]) => readonly ExtractedSection[];
/**
 * Group fields by step (for multi-step forms)
 */
export declare const groupFieldsByStep: (fields: readonly ExtractedField[], stepConfigs?: readonly StepConfig[], sectionConfigs?: readonly SectionConfig[]) => readonly ExtractedStep[];
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
export declare const extractForm: <A, I, R>(schema: Schema.Schema<A, I, R>) => ExtractedForm;
/**
 * Get fields for a specific step
 */
export declare const getFieldsForStep: (form: ExtractedForm, step: number) => readonly ExtractedField[];
/**
 * Get fields for a specific section
 */
export declare const getFieldsForSection: (form: ExtractedForm, sectionId: string) => readonly ExtractedField[];
/**
 * Get visible fields (not hidden input type)
 */
export declare const getVisibleFields: (fields: readonly ExtractedField[]) => readonly ExtractedField[];
/**
 * Get required fields
 */
export declare const getRequiredFields: (fields: readonly ExtractedField[]) => readonly ExtractedField[];
/**
 * Generate CSS classes for grid column span
 */
export declare const getColSpanClasses: (field: ExtractedField) => string;
/**
 * Generate grid container classes
 */
export declare const getGridClasses: (layout: FormLayoutConfig) => string;
/**
 * Build initial form values from extracted fields
 */
export declare const buildDefaultValues: <T extends Record<string, unknown>>(fields: readonly ExtractedField[]) => Partial<T>;
