export type { FieldRenderContext } from "../index.js";
import type { FieldRenderContext } from "../index.js";
interface Props {
    ctx: FieldRenderContext;
    class?: string;
}
declare const SchemaField: import("svelte").Component<Props, {}, "">;
type SchemaField = ReturnType<typeof SchemaField>;
export default SchemaField;
