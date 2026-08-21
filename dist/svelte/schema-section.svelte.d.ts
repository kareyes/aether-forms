export type { SectionRenderContext } from "../index.js";
import type { SectionRenderContext } from "../index.js";
interface Props {
    ctx: SectionRenderContext;
    variant?: "default" | "card" | "collapsible";
    class?: string;
}
declare const SchemaSection: import("svelte").Component<Props, {}, "">;
type SchemaSection = ReturnType<typeof SchemaSection>;
export default SchemaSection;
