import { describe, expect, test } from "bun:test";
import { pipe, Schema, SchemaAST } from "effect";
import {
	FieldLayoutSymbol,
	FieldUISymbol,
	FormLayoutSymbol,
	getFieldAnnotation,
	getFieldLayout,
	getFieldUI,
	getFormLayout,
	RequiredCheckbox,
	requiredCheckbox,
	RequiredSwitch,
	requiredSwitch,
	withField,
	withFieldLayout,
	withFieldUI,
	withFormLayout,
} from "./annotations";

describe("withFieldUI / getFieldUI", () => {
	test("round-trips a UI annotation", () => {
		const annotation = {
			label: "Email",
			placeholder: "you@example.com",
			inputType: "email" as const,
			description: "We never share it",
		};
		const schema = pipe(Schema.String, withFieldUI(annotation));

		expect(getFieldUI(schema.ast)).toEqual(annotation);
	});

	test("returns undefined when the schema carries no UI annotation", () => {
		expect(getFieldUI(Schema.String.ast)).toBeUndefined();
	});

	test("survives refinements applied after the annotation", () => {
		const schema = pipe(
			Schema.String,
			withFieldUI({ label: "Name" }),
			Schema.minLength(2),
		);

		// The refinement wraps the annotated AST rather than replacing it, so the
		// annotation is still reachable on the inner node.
		const ast = schema.ast as SchemaAST.Refinement;
		expect(getFieldUI(ast) ?? getFieldUI(ast.from)).toEqual({ label: "Name" });
	});

	test("a later annotation of the same kind replaces the earlier one", () => {
		const schema = pipe(
			Schema.String,
			withFieldUI({ label: "First" }),
			withFieldUI({ label: "Second" }),
		);

		expect(getFieldUI(schema.ast)).toEqual({ label: "Second" });
	});
});

describe("withFieldLayout / getFieldLayout", () => {
	test("round-trips a layout annotation", () => {
		const annotation = { section: "contact", order: 3, colSpan: 6 as const };
		const schema = pipe(Schema.String, withFieldLayout(annotation));

		expect(getFieldLayout(schema.ast)).toEqual(annotation);
	});

	test("is independent of the UI annotation", () => {
		const schema = pipe(
			Schema.String,
			withFieldUI({ label: "Email" }),
			withFieldLayout({ section: "contact" }),
		);

		expect(getFieldUI(schema.ast)).toEqual({ label: "Email" });
		expect(getFieldLayout(schema.ast)).toEqual({ section: "contact" });
	});
});

describe("withField", () => {
	test("splits a combined annotation into its UI and layout halves", () => {
		const schema = pipe(
			Schema.String,
			withField({
				label: "Email",
				inputType: "email",
				placeholder: "you@example.com",
				section: "contact",
				step: 2,
				order: 1,
				colSpan: 6,
			}),
		);

		expect(getFieldUI(schema.ast)).toEqual({
			label: "Email",
			inputType: "email",
			placeholder: "you@example.com",
		});
		expect(getFieldLayout(schema.ast)).toEqual({
			section: "contact",
			step: 2,
			order: 1,
			colSpan: 6,
			colSpanSm: undefined,
			colSpanMd: undefined,
			colSpanLg: undefined,
		});
	});

	test("writes both annotation symbols", () => {
		const schema = pipe(Schema.String, withField({ label: "Name" }));

		expect(schema.ast.annotations[FieldUISymbol]).toBeDefined();
		expect(schema.ast.annotations[FieldLayoutSymbol]).toBeDefined();
	});
});

describe("withFormLayout / getFormLayout", () => {
	test("round-trips a form layout config", () => {
		const config = {
			columns: 2,
			gap: "lg" as const,
			sections: [{ id: "contact", title: "Contact" }],
		};
		const schema = pipe(
			Schema.Struct({ a: Schema.String }),
			withFormLayout(config),
		);

		expect(getFormLayout(schema.ast)).toEqual(config);
		expect(schema.ast.annotations[FormLayoutSymbol]).toEqual(config);
	});

	test("returns undefined for an unannotated struct", () => {
		expect(
			getFormLayout(Schema.Struct({ a: Schema.String }).ast),
		).toBeUndefined();
	});
});

describe("getFieldAnnotation", () => {
	test("merges the UI and layout halves", () => {
		const schema = pipe(
			Schema.String,
			withField({ label: "Email", inputType: "email", section: "contact" }),
		);

		expect(getFieldAnnotation(schema.ast)).toMatchObject({
			label: "Email",
			inputType: "email",
			section: "contact",
		});
	});

	test("returns undefined when neither half is present", () => {
		expect(getFieldAnnotation(Schema.String.ast)).toBeUndefined();
	});

	test("returns a value when only the UI half is present", () => {
		const schema = pipe(Schema.String, withFieldUI({ label: "Solo" }));
		expect(getFieldAnnotation(schema.ast)).toMatchObject({ label: "Solo" });
	});
});

describe("required-value schemas", () => {
	const decode = <A, I>(schema: Schema.Schema<A, I, never>, value: unknown) =>
		Schema.decodeUnknownEither(schema)(value);

	test("RequiredCheckbox rejects false and accepts true", () => {
		expect(decode(RequiredCheckbox, true)._tag).toBe("Right");
		expect(decode(RequiredCheckbox, false)._tag).toBe("Left");
	});

	test("requiredCheckbox carries the caller's message", () => {
		const schema = requiredCheckbox("You must accept the terms");
		const result = decode(schema, false);

		expect(result._tag).toBe("Left");
		if (result._tag === "Left") {
			expect(String(result.left)).toContain("You must accept the terms");
		}
	});

	test("RequiredSwitch rejects false and accepts true", () => {
		expect(decode(RequiredSwitch, true)._tag).toBe("Right");
		expect(decode(RequiredSwitch, false)._tag).toBe("Left");
	});

	test("requiredSwitch carries the caller's message", () => {
		const result = decode(requiredSwitch("Turn it on"), false);

		expect(result._tag).toBe("Left");
		if (result._tag === "Left") {
			expect(String(result.left)).toContain("Turn it on");
		}
	});
});
