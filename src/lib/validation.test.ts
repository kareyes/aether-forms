import { describe, expect, test } from "bun:test";
import { Effect, Exit, pipe, Schema } from "effect";
import { extractFields } from "./layout";
import {
	createFieldState,
	createFieldValidator,
	createFieldValidators,
	getFirstError,
	hasErrors,
	setFieldError,
	touchField,
	updateFieldValue,
	validate,
	validateAsync,
	validateField,
	validateFields,
	validateSync,
} from "./validation";

const UserSchema = Schema.Struct({
	email: pipe(
		Schema.String,
		Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
			message: () => "Enter a valid email",
		}),
	),
	password: pipe(
		Schema.String,
		Schema.minLength(8, { message: () => "At least 8 characters" }),
	),
	nickname: Schema.optional(Schema.String),
});

const validUser = {
	email: "someone@example.com",
	password: "hunter22!",
};

describe("validateSync", () => {
	test("returns the decoded data when the input is valid", () => {
		const result = validateSync(UserSchema, validUser);

		expect(result.valid).toBe(true);
		if (result.valid) {
			expect(result.data.email).toBe("someone@example.com");
			expect(result.errors).toBeUndefined();
		}
	});

	test("reports one error per failing field", () => {
		const result = validateSync(UserSchema, {
			email: "nope",
			password: "short",
		});

		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.errors.email).toBe("Enter a valid email");
			expect(result.errors.password).toBe("At least 8 characters");
		}
	});

	test("treats a blank string as missing rather than malformed", () => {
		const result = validateSync(UserSchema, {
			email: "",
			password: "hunter22!",
		});

		expect(result.valid).toBe(false);
		if (!result.valid) {
			// Blank means "not filled in", so the message must be about the field
			// being required — not about the pattern it would have failed.
			expect(result.errors.email).toContain("required");
		}
	});

	test("treats a whitespace-only string as missing", () => {
		const result = validateSync(UserSchema, {
			email: "   ",
			password: "hunter22!",
		});

		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.errors.email).toContain("required");
		}
	});

	test("accepts an absent optional field", () => {
		expect(validateSync(UserSchema, validUser).valid).toBe(true);
	});

	test("reports a missing required field", () => {
		const result = validateSync(UserSchema, { password: "hunter22!" });

		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.errors.email).toBeDefined();
		}
	});
});

describe("chained refinements", () => {
	// Reading the message annotation off the outermost refinement meant the last
	// rule in a chain claimed every failure: a two-character value reported "At
	// most 20 characters". The message must come from the rule that actually
	// rejected the value.
	const Username = pipe(
		Schema.String,
		Schema.minLength(3, { message: () => "At least 3 characters" }),
		Schema.maxLength(20, { message: () => "At most 20 characters" }),
	);
	const Wrapper = Schema.Struct({ username: Username });

	const wholeForm = (value: unknown): string | undefined => {
		const result = validateSync(Wrapper, { username: value });
		return result.valid ? undefined : result.errors.username;
	};

	test("reports the inner rule when the inner rule is what failed", () => {
		expect(wholeForm("ab")).toBe("At least 3 characters");
	});

	test("reports the outer rule when the outer rule is what failed", () => {
		expect(wholeForm("x".repeat(21))).toBe("At most 20 characters");
	});

	test("accepts a value that satisfies the whole chain", () => {
		expect(wholeForm("ada")).toBeUndefined();
	});

	test("picks the same rule when the field is validated on its own", () => {
		expect(validateField(Username, "ab")).toBe("At least 3 characters");
		expect(validateField(Username, "x".repeat(21))).toBe(
			"At most 20 characters",
		);
		expect(validateField(Username, "ada")).toBeUndefined();
	});

	test("still reports something for an unannotated chain", () => {
		const Bare = pipe(Schema.String, Schema.minLength(3), Schema.maxLength(20));

		expect(validateField(Bare, "ab")).toBeDefined();
		expect(validateField(Bare, "ada")).toBeUndefined();
	});

	test("reports a type mismatch under a refinement chain", () => {
		expect(wholeForm(42)).toBeDefined();
	});
});

describe("validate", () => {
	test("succeeds with the decoded value", async () => {
		const exit = await Effect.runPromiseExit(validate(UserSchema, validUser));

		expect(Exit.isSuccess(exit)).toBe(true);
	});

	test("fails with the field errors in the error channel", async () => {
		const exit = await Effect.runPromiseExit(
			validate(UserSchema, { email: "nope", password: "short" }),
		);

		expect(Exit.isFailure(exit)).toBe(true);
		if (Exit.isFailure(exit)) {
			const errors = exit.cause._tag === "Fail" ? exit.cause.error : undefined;
			expect(errors?.email).toBe("Enter a valid email");
		}
	});
});

describe("validateField", () => {
	test("returns undefined for a valid value", () => {
		const Email = pipe(Schema.String, Schema.pattern(/^\S+@\S+$/));

		expect(validateField(Email, "a@b.co")).toBeUndefined();
	});

	test("returns a message for an invalid value", () => {
		const Email = pipe(
			Schema.String,
			Schema.pattern(/^\S+@\S+$/, { message: () => "Bad email" }),
		);

		expect(validateField(Email, "nope")).toBe("Bad email");
	});
});

describe("createFieldValidator", () => {
	test("validates one property of a struct in isolation", () => {
		const check = createFieldValidator(UserSchema, "password");

		expect(check("hunter22!")).toBeUndefined();
		expect(check("short")).toBe("At least 8 characters");
	});

	test("rejects a non-struct schema", () => {
		expect(() => createFieldValidator(Schema.String as never, "x")).toThrow(
			"createFieldValidator only works with Struct schemas",
		);
	});

	test("rejects a field the schema does not declare", () => {
		expect(() => createFieldValidator(UserSchema, "missing" as never)).toThrow(
			'Field "missing" not found in schema',
		);
	});
});

describe("createFieldValidators", () => {
	const fields = extractFields(UserSchema);
	const validators = createFieldValidators(UserSchema, fields);

	test("builds one validator per field", () => {
		expect(Object.keys(validators).sort()).toEqual([
			"email",
			"nickname",
			"password",
		]);
	});

	test("validates a field against its own rules only", () => {
		expect(validators.password("hunter22!")).toBeUndefined();
		expect(validators.password("short")).toBe("At least 8 characters");
	});

	test("does NOT report other fields' errors", () => {
		// The regression this whole function exists for: validating one field used
		// to run the entire struct through validateSync and pick one error out, so
		// a keystroke in `password` did the work of validating `email` too. A
		// field's validator must be blind to every other field.
		expect(validators.password("hunter22!")).toBeUndefined();
		expect(validators.email("someone@example.com")).toBeUndefined();
	});

	test("reports a blank required field as required, not as malformed", () => {
		// Whole-form validation strips blanks before decoding so a blank required
		// field reads as missing. A field validated in isolation has to reach the
		// same conclusion rather than reporting a pattern failure.
		expect(validators.email("")).toBe("This field is required");
		expect(validators.email("   ")).toBe("This field is required");
		expect(validators.email(undefined)).toBe("This field is required");
		expect(validators.email(null)).toBe("This field is required");
	});

	test("accepts a blank optional field", () => {
		expect(validators.nickname("")).toBeUndefined();
		expect(validators.nickname(undefined)).toBeUndefined();
	});

	test("does not treat false or zero as blank", () => {
		const Toggles = Schema.Struct({
			agree: Schema.Boolean,
			count: Schema.Number,
		});
		const checks = createFieldValidators(Toggles, extractFields(Toggles));

		expect(checks.agree(false)).toBeUndefined();
		expect(checks.count(0)).toBeUndefined();
	});

	test("treats an unbuildable field as always valid rather than throwing", () => {
		const checks = createFieldValidators(UserSchema, [
			{ name: "notInSchema", required: false },
		]);

		expect(checks.notInSchema("anything")).toBeUndefined();
	});
});

describe("validateFields", () => {
	test("collects errors across several fields", () => {
		const errors = validateFields(UserSchema, {
			email: "nope",
			password: "short",
		});

		expect(errors.email).toBe("Enter a valid email");
		expect(errors.password).toBe("At least 8 characters");
	});

	test("returns an empty record when everything passes", () => {
		expect(validateFields(UserSchema, validUser)).toEqual({});
	});
});

describe("validateAsync", () => {
	test("mirrors the synchronous result", async () => {
		expect((await validateAsync(UserSchema, validUser)).valid).toBe(true);
		expect((await validateAsync(UserSchema, { email: "nope" })).valid).toBe(
			false,
		);
	});
});

describe("field state helpers", () => {
	test("createFieldState starts clean and untouched", () => {
		expect(createFieldState("hello")).toEqual({
			value: "hello",
			error: undefined,
			touched: false,
			dirty: false,
		});
	});

	test("updateFieldValue replaces the value and marks it dirty", () => {
		const next = updateFieldValue(createFieldState("a"), "b");

		expect(next.value).toBe("b");
		expect(next.dirty).toBe(true);
	});

	test("touchField marks the field touched without changing the value", () => {
		const next = touchField(createFieldState("a"));

		expect(next.touched).toBe(true);
		expect(next.value).toBe("a");
	});

	test("setFieldError attaches and clears an error", () => {
		const withError = setFieldError(createFieldState("a"), "Bad");
		expect(withError.error).toBe("Bad");
		expect(setFieldError(withError, undefined).error).toBeUndefined();
	});

	test("the helpers never mutate the state they are given", () => {
		const original = createFieldState("a");
		updateFieldValue(original, "b");
		touchField(original);
		setFieldError(original, "Bad");

		expect(original).toEqual({
			value: "a",
			error: undefined,
			touched: false,
			dirty: false,
		});
	});
});

describe("error record helpers", () => {
	test("hasErrors ignores keys explicitly set to undefined", () => {
		expect(hasErrors({})).toBe(false);
		expect(hasErrors({ email: undefined })).toBe(false);
		expect(hasErrors({ email: "Bad" })).toBe(true);
	});

	test("getFirstError skips undefined entries", () => {
		expect(getFirstError({})).toBeUndefined();
		expect(getFirstError({ a: undefined, b: "Second" })).toBe("Second");
	});
});
