export type { StepRenderContext } from '../index.js';
import type { StepRenderContext } from '../index.js';
interface Props {
    ctx: StepRenderContext;
    sectionVariant?: 'default' | 'card' | 'collapsible';
    currentStep: number;
    class?: string;
}
declare const SchemaStep: import("svelte").Component<Props, {}, "">;
type SchemaStep = ReturnType<typeof SchemaStep>;
export default SchemaStep;
