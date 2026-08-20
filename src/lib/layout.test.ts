import { describe, expect, test } from "bun:test";
import { pipe, Schema } from "effect";
import { withField, withFormLayout } from "./annotations";
import {
	buildDefaultValues,
	extractFields,
	extractForm,
	getColSpanClasses,
	getFieldsForSection,
	getFieldsForStep,
	getGridClasses,
	getRequiredFields,
	getVisibleFields,
	groupFieldsBySection,
	groupFieldsByStep,
} from "./layout";

const ContactSchema = pipe(
	Schema.Struct({
		firstName: pipe(
			Schema.String,
			withField({
				label: "First name",
				section: "personal",
				order: 1,
				colSpan: 6,
			}),
		),
		lastName: pipe(
			Schema.String,
			withField({
				label: "Last name",
				section: "personal",
				order: 2,
				colSpan: 6,
			}),
		),
		email: pipe(
			Schema.String,
			withField({
				label: "Email",
				inputType: "email",
				section: "contact",
				order: 3,
			}),
		),
		phone: pipe(
			Schema.optional(Schema.String),
			withField({
				label: "Phone",
				inputType: "tel",
				section: "contact",
				order: 4,
			}),
		),
	}),
	withFormLayout({
		columns: 2,
		gap: "lg",
		sections: [
			{ id: "contact", title: "Contact", order: 2 },
			{ id: "personal", title: "Personal", order: 1 },
		],
	}),
);

describe("extractFields", () => {
	test("discovers every property of the struct", () => {
		const fields = extractFields(ContactSchema);

		expect(fields.map((f) => f.name)).toEqual([
			"firstName",
			"lastName",
			"email",
			"phone",
		]);
	});

	test("orders fields by their declared order annotation", () => {
		const Unordered = Schema.Struct({
			c: pipe(Schema.String, withField({ label: "C", order: 3 })),
			a: pipe(Schema.String, withField({ label: "A", order: 1 })),
			b: pipe(Schema.String, withField({ label: "B", order: 2 })),
		});

		expect(extractFields(Unordered).map((f) => f.name)).toEqual([
			"a",
			"b",
			"c",
		]);
	});

	test("marks optional properties as not required", () => {
		const fields = extractFields(ContactSchema);
		const byName = new Map(fields.map((f) => [f.name, f]));

		expect(byName.get("email")?.required).toBe(true);
		expect(byName.get("phone")?.required).toBe(false);
	});

	test("falls back to a humanised label when none is annotated", () => {
		const Bare = Schema.Struct({ firstName: Schema.String });

		expect(extractFields(Bare)[0].label).toBe("First Name");
	});

	test("infers input type from the underlying schema when unannotated", () => {
		const Bare = Schema.Struct({
			age: Schema.Number,
			active: Schema.Boolean,
			name: Schema.String,
		});
		const byName = new Map(extractFields(Bare).map((f) => [f.name, f]));

		expect(byName.get("age")?.inputType).toBe("number");
		expect(byName.get("active")?.inputType).toBe("checkbox");
		expect(byName.get("name")?.inputType).toBe("text");
	});

	test("an explicit inputType annotation wins over inference", () => {
		const Annotated = Schema.Struct({
			bio: pipe(
				Schema.String,
				withField({ label: "Bio", inputType: "textarea" }),
			),
		});

		expect(extractFields(Annotated)[0].inputType).toBe("textarea");
	});

	test("defaults colSpan to full and order to a trailing sentinel", () => {
		const Bare = Schema.Struct({ name: Schema.String });
		const [field] = extractFields(Bare);

		expect(field.colSpan).toBe("full");
		expect(field.order).toBe(999);
	});

	test("keeps annotations written outside Schema.optional", () => {
		// `pipe(Schema.optional(X), withField(...))` annotates the PropertySignature
		// rather than its type. Reading only the type dropped every annotation on
		// the floor: the field kept rendering, but with a fallback label and no
		// section or ordering.
		const Optional = Schema.Struct({
			phone: pipe(
				Schema.optional(Schema.String),
				withField({
					label: "Phone number",
					inputType: "tel",
					section: "contact",
					order: 2,
					colSpan: 6,
				}),
			),
		});
		const [field] = extractFields(Optional);

		expect(field.label).toBe("Phone number");
		expect(field.inputType).toBe("tel");
		expect(field.section).toBe("contact");
		expect(field.order).toBe(2);
		expect(field.colSpan).toBe(6);
		expect(field.required).toBe(false);
	});

	test("keeps annotations written inside Schema.optional", () => {
		const Optional = Schema.Struct({
			phone: Schema.optional(
				pipe(
					Schema.String,
					withField({ label: "Phone number", section: "contact" }),
				),
			),
		});
		const [field] = extractFields(Optional);

		expect(field.label).toBe("Phone number");
		expect(field.section).toBe("contact");
		expect(field.required).toBe(false);
	});

	test("rejects a schema that is not a struct", () => {
		expect(() => extractFields(Schema.String)).toThrow(
			"extractFields only works with Struct schemas",
		);
	});
});

describe("groupFieldsBySection", () => {
	test("groups fields under their annotated section and applies config order", () => {
		const form = extractForm(ContactSchema);

		expect(form.sections.map((s) => s.id)).toEqual(["personal", "contact"]);
		expect(form.sections[0].title).toBe("Personal");
		expect(form.sections[0].fields.map((f) => f.name)).toEqual([
			"firstName",
			"lastName",
		]);
	});

	test("places unsectioned fields in a default section", () => {
		const fields = extractFields(Schema.Struct({ a: Schema.String }));
		const sections = groupFieldsBySection(fields);

		expect(sections).toHaveLength(1);
		expect(sections[0].id).toBe("default");
	});
});

describe("groupFieldsByStep", () => {
	const WizardSchema = pipe(
		Schema.Struct({
			email: pipe(Schema.String, withField({ label: "Email", step: 1 })),
			password: pipe(Schema.String, withField({ label: "Password", step: 1 })),
			company: pipe(Schema.String, withField({ label: "Company", step: 2 })),
		}),
		withFormLayout({
			steps: [
				{ step: 1, title: "Account" },
				{ step: 2, title: "Business" },
			],
		}),
	);

	test("splits fields across their annotated steps", () => {
		const form = extractForm(WizardSchema);

		expect(form.steps.map((s) => s.step)).toEqual([1, 2]);
		expect(form.steps[0].fields.map((f) => f.name)).toEqual([
			"email",
			"password",
		]);
		expect(form.steps[1].fields.map((f) => f.name)).toEqual(["company"]);
	});

	test("titles each step from its config", () => {
		const form = extractForm(WizardSchema);

		expect(form.steps.map((s) => s.title)).toEqual(["Account", "Business"]);
	});

	test("falls back to a generated title when no config names the step", () => {
		const fields = extractFields(
			Schema.Struct({
				a: pipe(Schema.String, withField({ label: "A", step: 4 })),
			}),
		);

		expect(groupFieldsByStep(fields)[0].title).toBe("Step 4");
	});

	test("assigns unstepped fields to step 1", () => {
		const fields = extractFields(Schema.Struct({ a: Schema.String }));

		expect(groupFieldsByStep(fields)[0].step).toBe(1);
	});
});

describe("extractForm", () => {
	test("reports a single-step form as not multi-step", () => {
		expect(extractForm(ContactSchema).isMultiStep).toBe(false);
	});

	test("reports a form with step config as multi-step", () => {
		const Stepped = pipe(
			Schema.Struct({
				a: pipe(Schema.String, withField({ label: "A", step: 1 })),
			}),
			withFormLayout({ steps: [{ step: 1, title: "Only" }] }),
		);

		expect(extractForm(Stepped).isMultiStep).toBe(true);
	});

	test("carries the form layout through", () => {
		const form = extractForm(ContactSchema);

		expect(form.layout.columns).toBe(2);
		expect(form.layout.gap).toBe("lg");
	});

	test("defaults the layout when the struct is unannotated", () => {
		const form = extractForm(Schema.Struct({ a: Schema.String }));

		expect(form.layout).toEqual({ columns: 1, gap: "md" });
	});
});

describe("field queries", () => {
	test("getFieldsForStep returns only that step's fields", () => {
		const Stepped = pipe(
			Schema.Struct({
				a: pipe(Schema.String, withField({ label: "A", step: 1 })),
				b: pipe(Schema.String, withField({ label: "B", step: 2 })),
			}),
			withFormLayout({
				steps: [
					{ step: 1, title: "One" },
					{ step: 2, title: "Two" },
				],
			}),
		);
		const form = extractForm(Stepped);

		expect(getFieldsForStep(form, 2).map((f) => f.name)).toEqual(["b"]);
		expect(getFieldsForStep(form, 99)).toEqual([]);
	});

	test("getFieldsForSection returns only that section's fields", () => {
		const form = extractForm(ContactSchema);

		expect(getFieldsForSection(form, "contact").map((f) => f.name)).toEqual([
			"email",
			"phone",
		]);
		expect(getFieldsForSection(form, "nope")).toEqual([]);
	});

	test("getVisibleFields drops hidden inputs", () => {
		const fields = extractFields(
			Schema.Struct({
				token: pipe(
					Schema.String,
					withField({ label: "Token", inputType: "hidden" }),
				),
				name: pipe(Schema.String, withField({ label: "Name" })),
			}),
		);

		expect(getVisibleFields(fields).map((f) => f.name)).toEqual(["name"]);
	});

	test("getRequiredFields drops optional fields", () => {
		const fields = extractFields(ContactSchema);

		expect(getRequiredFields(fields).map((f) => f.name)).toEqual([
			"firstName",
			"lastName",
			"email",
		]);
	});
});

describe("grid class generation", () => {
	test("emits the base column span", () => {
		const [field] = extractFields(
			Schema.Struct({
				a: pipe(Schema.String, withField({ label: "A", colSpan: 6 })),
			}),
		);

		expect(getColSpanClasses(field)).toBe("col-span-6");
	});

	test("appends responsive spans in ascending breakpoint order", () => {
		const [field] = extractFields(
			Schema.Struct({
				a: pipe(
					Schema.String,
					withField({
						label: "A",
						colSpan: 12,
						colSpanSm: 6,
						colSpanMd: 4,
						colSpanLg: 3,
					}),
				),
			}),
		);

		expect(getColSpanClasses(field)).toBe(
			"col-span-12 @sm:col-span-6 @md:col-span-4 @lg:col-span-3",
		);
	});

	test("maps full to the spanning class", () => {
		const [field] = extractFields(Schema.Struct({ a: Schema.String }));

		expect(getColSpanClasses(field)).toBe("col-span-full");
	});

	test("builds a container grid with the configured column count and gap", () => {
		expect(getGridClasses({ columns: 3, gap: "sm" })).toBe(
			"@container grid grid-cols-3 gap-2",
		);
		expect(getGridClasses({ columns: 2, gap: "lg" })).toBe(
			"@container grid grid-cols-2 gap-6",
		);
	});

	test("omits the gap class entirely when gap is none", () => {
		expect(getGridClasses({ columns: 1, gap: "none" })).toBe(
			"@container grid grid-cols-1",
		);
	});

	test("falls back to a single column and medium gap", () => {
		expect(getGridClasses({})).toBe("@container grid grid-cols-1 gap-4");
	});
});

describe("buildDefaultValues", () => {
	test("seeds text-like fields with an empty string", () => {
		const fields = extractFields(
			Schema.Struct({
				name: pipe(Schema.String, withField({ label: "Name" })),
			}),
		);

		expect(buildDefaultValues(fields)).toEqual({ name: "" });
	});

	test("seeds boolean-shaped inputs with false", () => {
		const fields = extractFields(
			Schema.Struct({
				agree: pipe(
					Schema.Boolean,
					withField({ label: "Agree", inputType: "checkbox" }),
				),
				notify: pipe(
					Schema.Boolean,
					withField({ label: "Notify", inputType: "switch" }),
				),
			}),
		);

		expect(buildDefaultValues(fields)).toEqual({ agree: false, notify: false });
	});

	test("seeds file inputs with null and numbers with undefined", () => {
		const fields = extractFields(
			Schema.Struct({
				avatar: pipe(
					Schema.Any,
					withField({ label: "Avatar", inputType: "file" }),
				),
				age: pipe(Schema.Number, withField({ label: "Age" })),
			}),
		);
		const defaults = buildDefaultValues(fields);

		expect(defaults.avatar).toBeNull();
		expect(defaults.age).toBeUndefined();
	});
});
