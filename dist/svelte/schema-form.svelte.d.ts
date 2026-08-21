import type { ExtractedForm, FieldErrors, FieldRenderContext, FormState, SectionRenderContext, StepRenderContext } from "../index.js";
import type { SvelteForm } from "./form.svelte.js";
export type { ExtractedForm, FieldErrors, FieldRenderContext, FormState, SectionRenderContext, StepRenderContext, SvelteForm, };
import type { Snippet } from "svelte";
interface Props {
    form: SvelteForm<any>;
    onSubmit?: (data: any) => Promise<void> | void;
    onError?: (errors: FieldErrors) => void;
    onChange?: (values: any) => void;
    sectionVariant?: "default" | "card" | "collapsible";
    showStepIndicator?: boolean;
    submitText?: string;
    nextText?: string;
    prevText?: string;
    class?: string;
    header?: Snippet;
    footer?: Snippet<[
        {
            isSubmitting: boolean;
            isValid: boolean;
            isFirstStep: boolean;
            isLastStep: boolean;
            handleSubmit: () => void;
            handleNext: () => void;
            handlePrev: () => void;
        }
    ]>;
}
declare const SchemaForm: import("svelte").Component<Props, {}, "">;
type SchemaForm = ReturnType<typeof SchemaForm>;
export default SchemaForm;
