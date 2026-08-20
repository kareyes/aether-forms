# aether-forms

A schema-first form system powered by [Effect Schema](https://github.com/Effect-TS/effect). Define your form once with validation, types, and UI metadata — the form renders itself.

## Two entry points

| Import | Contains | Depends on |
|--------|----------|------------|
| `aether-forms` | Annotations, validation, layout extraction, and the form state machine. Pure and framework-agnostic. | `effect` |
| `aether-forms/svelte` | `createForm` plus the Svelte 5 components. | `svelte`, `aether-ui`, `effect` |

The split is load-bearing, not cosmetic: the root entry has no Svelte and no DOM
in it, so the same annotated schema that renders a form in the browser can
validate the payload on a server.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
  - [SchemaForm Component](#schemaform-component)
  - [createForm](#createform)
  - [Annotations](#annotations)
- [Input Types](#input-types)
- [Form Layouts](#form-layouts)
- [Multi-Step Forms](#multi-step-forms)
- [Async Data Loading](#async-data-loading)
- [Validation](#validation)
- [Advanced Usage](#advanced-usage)
- [Low-Level Components](#low-level-components)
- [Standalone Validation Utilities](#standalone-validation-utilities)
- [Troubleshooting](#troubleshooting)

---

## Overview

SchemaForm provides a declarative approach to building forms where your Effect Schema serves as the single source of truth for:

- **Validation rules** - Type constraints, patterns, min/max values
- **TypeScript types** - Automatically inferred from schema
- **UI metadata** - Labels, placeholders, input types, descriptions
- **Layout configuration** - Sections, steps, column spans, ordering

```typescript
// Define once, get everything
const LoginSchema = pipe(
  Schema.Struct({
    email: pipe(
      Schema.String,
      Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
      withField({
        label: "Email",
        inputType: "email",
        placeholder: "you@example.com"
      })
    ),
    password: pipe(
      Schema.String,
      Schema.minLength(8),
      withField({
        label: "Password",
        inputType: "password"
      })
    )
  })
);

// TypeScript type is automatically inferred
type Login = Schema.Schema.Type<typeof LoginSchema>;
// { email: string; password: string }
```

---

## Installation

```bash
bun add aether-forms effect

# The Svelte components additionally need aether-ui and svelte:
bun add aether-ui svelte
```

---

## Quick Start

### 1. Define Your Schema

```typescript
import { Schema, pipe } from "effect";
import { withField, withFormLayout } from "aether-forms";

const ContactSchema = pipe(
  Schema.Struct({
    name: pipe(
      Schema.String,
      Schema.minLength(1),
      withField({
        label: "Full Name",
        placeholder: "John Doe",
        inputType: "text"
      })
    ),
    email: pipe(
      Schema.String,
      Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
      Schema.annotations({
        message: () => "Please enter a valid email"
      }),
      withField({
        label: "Email Address",
        inputType: "email"
      })
    ),
    message: pipe(
      Schema.String,
      Schema.minLength(10),
      withField({
        label: "Message",
        inputType: "textarea",
        placeholder: "How can we help?"
      })
    )
  }),
  withFormLayout({
    columns: 1,
    sections: [{ id: "contact", title: "Contact Us" }]
  })
);
```

### 2. Create the Form

```typescript
import { createForm } from "aether-forms/svelte";

const form = createForm(ContactSchema, {
  validateOnBlur: true,
  validateOnChange: false,
  initialValues: {
    name: "",
    email: "",
    message: ""
  }
});
```

### 3. Render the Form

```svelte
<script lang="ts">
  import { SchemaForm } from "aether-forms/svelte";

  async function handleSubmit(data) {
    console.log("Form submitted:", data);
    await api.submitContact(data);
  }
</script>

<SchemaForm
  {form}
  onSubmit={handleSubmit}
  submitText="Send Message"
/>
```

---

## Core Concepts

### Schema-First Design

The schema defines everything about your form:

```typescript
const UserSchema = pipe(
  Schema.Struct({
    // Validation: minLength(2), maxLength(50)
    // Type: string
    // UI: text input with label "Username"
    username: pipe(
      Schema.String,
      Schema.minLength(2),
      Schema.maxLength(50),
      withField({
        label: "Username",
        inputType: "text",
        description: "Choose a unique username"
      })
    )
  })
);
```

### Annotations

Annotations attach metadata to schema fields:

- **`withField()`** - Combined UI and layout metadata
- **`withFieldUI()`** - UI-only metadata (label, placeholder, inputType)
- **`withFieldLayout()`** - Layout-only metadata (section, step, colSpan)
- **`withFormLayout()`** - Form-level configuration (sections, steps, columns)

### createForm

The controller manages form state and provides methods for:

- Value manipulation (`setValue`, `setValues`)
- Validation (`validate`, `validateField`, `validateStep`)
- Step navigation (`nextStep`, `prevStep`, `goToStep`)
- Submission (`submit`)
- Reset (`reset`)

---

## API Reference

### SchemaForm Component

The main component that renders your form.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `form` | `SvelteForm` | **required** | The form returned by `createForm` |
| `onSubmit` | `(data) => Promise<void> \| void` | - | Called with validated data on submit |
| `onError` | `(errors: FieldErrors) => void` | - | Called when validation fails |
| `onChange` | `(values) => void` | - | Called when any value changes |
| `sectionVariant` | `'default' \| 'card' \| 'collapsible'` | `'default'` | Section styling variant |
| `showStepIndicator` | `boolean` | `true` | Show/hide step indicator in multi-step forms |
| `submitText` | `string` | `'Submit'` | Submit button text |
| `nextText` | `string` | `'Next'` | Next button text (multi-step) |
| `prevText` | `string` | `'Back'` | Back button text (multi-step) |
| `class` | `string` | - | Additional CSS classes |

#### Snippets

```svelte
<SchemaForm {form} onSubmit={handleSubmit}>
  {#snippet header()}
    <h2>Custom Header</h2>
  {/snippet}

  {#snippet footer({ isSubmitting, isValid, isFirstStep, isLastStep, handleSubmit, handleNext, handlePrev })}
    <div class="flex justify-between">
      {#if !isFirstStep}
        <Button variant="outline" onclick={handlePrev}>Back</Button>
      {/if}
      <Button onclick={isLastStep ? handleSubmit : handleNext} disabled={isSubmitting}>
        {isLastStep ? "Save" : "Next"}
      </Button>
    </div>
  {/snippet}
</SchemaForm>
```

##### Footer snippet parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `isSubmitting` | `boolean` | True while form submission is in progress |
| `isValid` | `boolean` | True when there are no validation errors |
| `isFirstStep` | `boolean` | True when on the first step (always true for single-step forms) |
| `isLastStep` | `boolean` | True when on the last step (always true for single-step forms) |
| `handleSubmit` | `() => void` | Trigger form submission |
| `handleNext` | `() => void` | Advance to next step (validates current step first) |
| `handlePrev` | `() => void` | Go back to previous step |

#### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Submit form or advance to next step |

### createForm

`createForm` binds the pure state machine to Svelte's reactivity. `form.state`
is backed by `$state`, so `$derived` over it works the way it does for any other
rune — there is nothing to subscribe to.

```typescript
function createForm<A, I>(
  schema: Schema.Schema<A, I, never>,
  config?: FormConfig<A>
): SvelteForm<A>;

interface SvelteForm<A> {
  // State
  readonly state: FormState<Partial<A>>;
  readonly form: ExtractedForm;

  // Values
  setValue(field: string, value: unknown): void;
  setValues(values: Partial<A>): void;
  handleBlur(field: string): void;

  // Validation
  validate(): ValidationResult<A>;
  validateStep(): boolean;

  // Errors
  setFieldError(field: string, error: string): void;
  setErrors(errors: FieldErrors): void;

  // Steps (multi-step forms)
  nextStep(): boolean;  // true if the step was valid and navigation occurred
  prevStep(): void;
  goToStep(step: number): void;

  // Submission
  submit(handler: (data: A) => Promise<void>): Promise<boolean>;

  // Reset
  reset(values?: Partial<A>): void;
}
```

Reading a single field's state is a function over `form.state` rather than a
method, and lives in the framework-agnostic entry point:

```typescript
import { getFieldState, shouldShowError } from "aether-forms";

const field = getFieldState(form.state, "email");
const visible = shouldShowError(form.state, "email");
```

#### FormConfig

```typescript
interface FormConfig<T> {
  initialValues?: Partial<T>;
  validateOnChange?: boolean;  // Default: true
  validateOnBlur?: boolean;    // Default: true
  validateOnMount?: boolean;   // Default: false
  revalidateOnChange?: boolean; // Default: true
}
```

#### FormState

```typescript
interface FormState<T> {
  values: T;
  errors: Record<string, string | undefined>;
  touched: Record<string, boolean>;
  dirty: Record<string, boolean>;
  isSubmitting: boolean;
  isValidating: boolean;
  isValid: boolean;
  isDirty: boolean;
  submitCount: number;
  currentStep: number;
  validationVersion: number; // Increments on every error/touched change — useful for derived reactive contexts
}
```

### Annotations

#### withField()

Combined UI and layout annotation:

```typescript
withField({
  // UI properties
  label: string;              // Field label (required)
  placeholder?: string;       // Input placeholder
  description?: string;       // Help text below field
  inputType?: InputType;      // Input type (auto-detected if not set)
  options?: FieldOption[];    // For select/radio/combobox
  optionGroups?: FieldOptionGroup[]; // Grouped options for select/combobox
  mask?: string;              // Input mask (e.g., "phone")
  autocomplete?: string;      // HTML autocomplete attribute
  disabled?: boolean;         // Disable field
  readonly?: boolean;         // Read-only field

  // File input properties (inputType: "file" only)
  fileMode?: 'drag-drop' | 'regular' | 'button-only'; // Display mode (default: "drag-drop")
  multiple?: boolean;         // Allow multiple file selection
  accept?: string;            // HTML accept attribute (e.g. "image/*", ".pdf,.docx")

  // Layout properties
  section?: string;           // Section ID
  step?: number;              // Step number (1-based)
  order?: number;             // Sort order within section
  colSpan?: ColumnSpan;       // Column span (1-12 or "full")
  colSpanSm?: ColumnSpan;     // Column span at sm breakpoint
  colSpanMd?: ColumnSpan;     // Column span at md breakpoint
  colSpanLg?: ColumnSpan;     // Column span at lg breakpoint
})
```

#### withFormLayout()

Form-level layout configuration:

```typescript
withFormLayout({
  columns?: number;           // Grid columns (default: 1)
  gap?: "none" | "sm" | "md" | "lg"; // Gap between fields (default: "md")
  sections?: SectionConfig[];  // Section definitions
  steps?: StepConfig[];       // Step definitions (for multi-step)
})

interface SectionConfig {
  id: string;                 // Unique section ID
  title?: string;             // Section title
  description?: string;       // Section description
  order?: number;             // Sort order
  collapsible?: boolean;      // Make section collapsible
  defaultCollapsed?: boolean; // Start collapsed (requires collapsible: true or sectionVariant="collapsible")
}

interface StepConfig {
  step: number;               // Step number (1-based)
  title: string;              // Step title
  description?: string;       // Step description
  icon?: string;              // Icon name
}
```

---

## Input Types

SchemaForm automatically renders the appropriate input component based on the `inputType` annotation:

| Input Type | Component | Schema Type |
|------------|-----------|-------------|
| `text` | Input | `Schema.String` |
| `email` | Input (type="email") | `Schema.String` |
| `password` | Input (type="password") | `Schema.String` |
| `tel` | Input (type="tel") | `Schema.String` |
| `url` | Input (type="url") | `Schema.String` |
| `number` | Input (type="number") | `Schema.Number` |
| `textarea` | Textarea | `Schema.String` |
| `select` | Select | `Schema.String` |
| `combobox` | Combobox | `Schema.String` |
| `checkbox` | Checkbox | `RequiredCheckbox \| requiredCheckbox() \| Schema.Boolean` |
| `switch` | Switch | `RequiredSwitch \| requiredSwitch() \| Schema.Boolean` |
| `radio` | RadioGroup | `Schema.String` |
| `date` | DatePicker | `Schema.String` |
| `datetime` | DateTimePicker | `Schema.String` |
| `file` | FileInput | `RequiredFile \| requiredFile() \| Schema.Any` |
| `hidden` | Hidden input | Any |

### Auto-Detection

If `inputType` is not specified, it's inferred from the schema type:

- `Schema.Boolean` → `checkbox`
- `Schema.Number` → `number`
- `Schema.String` → `text`
- Union of ≤5 string literals → `radio`
- Union of >5 string literals → `select`

---

## Form Layouts

### Single Section

```typescript
const FormSchema = pipe(
  Schema.Struct({
    field1: pipe(Schema.String, withField({ label: "Field 1" })),
    field2: pipe(Schema.String, withField({ label: "Field 2" }))
  }),
  withFormLayout({
    columns: 2,
    sections: [{ id: "main", title: "Form Title" }]
  })
);
```

### Multiple Sections

```typescript
const FormSchema = pipe(
  Schema.Struct({
    firstName: pipe(
      Schema.String,
      withField({ label: "First Name", section: "personal", colSpan: 6 })
    ),
    lastName: pipe(
      Schema.String,
      withField({ label: "Last Name", section: "personal", colSpan: 6 })
    ),
    email: pipe(
      Schema.String,
      withField({ label: "Email", section: "contact" })
    )
  }),
  withFormLayout({
    columns: 12,
    sections: [
      { id: "personal", title: "Personal Information", order: 1 },
      { id: "contact", title: "Contact Details", order: 2 }
    ]
  })
);
```

### Collapsible Sections

Sections can be individually made collapsible via the `SectionConfig`, or all sections can be made collapsible via `sectionVariant="collapsible"` on `SchemaForm`.

```typescript
withFormLayout({
  columns: 12,
  sections: [
    {
      id: "advanced",
      title: "Advanced Settings",
      collapsible: true,
      defaultCollapsed: true  // Starts collapsed
    },
    {
      id: "basic",
      title: "Basic Settings",
      collapsible: true,
      defaultCollapsed: false // Starts open
    }
  ]
})
```

### Section Variants

```svelte
<!-- Default: simple dividers -->
<SchemaForm {form} sectionVariant="default" />

<!-- Card: each section in a card -->
<SchemaForm {form} sectionVariant="card" />

<!-- Collapsible: accordion-style sections -->
<SchemaForm {form} sectionVariant="collapsible" />
```

### Responsive Column Spans

Use `colSpanSm`, `colSpanMd`, `colSpanLg` for responsive layouts. The grid must use enough columns (`columns: 12` is common).

These use **Tailwind CSS v4 container queries** (`@sm:`, `@md:`, `@lg:`) scoped to the grid's own width — not the viewport. The grid div automatically receives `@container` so breakpoints respond to the form's rendered width regardless of where it is placed on the page.

```typescript
withField({
  label: "Full Name",
  colSpan: "full",   // Full width (default / narrow container)
  colSpanMd: 6,      // Half width when container ≥ 768px
  colSpanLg: 4       // One-third when container ≥ 1024px
})
```

Breakpoint reference (container width, not viewport):

| Annotation | Class emitted | Applies when container ≥ |
|---|---|---|
| `colSpanSm` | `@sm:col-span-X` | 640px |
| `colSpanMd` | `@md:col-span-X` | 768px |
| `colSpanLg` | `@lg:col-span-X` | 1024px |

> **Note:** Column span classes are generated from static lookup maps, not dynamic string interpolation, so all classes are always included in the Tailwind CSS bundle.

---

## Multi-Step Forms

Create wizard-style forms by defining steps:

```typescript
const WizardSchema = pipe(
  Schema.Struct({
    // Step 1 fields
    email: pipe(
      Schema.String,
      withField({ label: "Email", step: 1, section: "account" })
    ),
    password: pipe(
      Schema.String,
      withField({ label: "Password", step: 1, section: "account" })
    ),

    // Step 2 fields
    firstName: pipe(
      Schema.String,
      withField({ label: "First Name", step: 2, section: "profile" })
    ),
    lastName: pipe(
      Schema.String,
      withField({ label: "Last Name", step: 2, section: "profile" })
    ),

    // Step 3 fields
    newsletter: pipe(
      Schema.Boolean,
      withField({ label: "Subscribe", step: 3, section: "preferences" })
    )
  }),
  withFormLayout({
    sections: [
      { id: "account", title: "Account" },
      { id: "profile", title: "Profile" },
      { id: "preferences", title: "Preferences" }
    ],
    steps: [
      { step: 1, title: "Account", description: "Create your login" },
      { step: 2, title: "Profile", description: "Personal details" },
      { step: 3, title: "Finish", description: "Preferences" }
    ]
  })
);
```

### Step Navigation

```svelte
<SchemaForm
  {form}
  showStepIndicator={true}
  nextText="Continue"
  prevText="Go Back"
  submitText="Complete"
/>
```

### Per-Step Validation

Each step is validated before proceeding to the next:

```typescript
// Manually trigger step validation
const isValid = form.validateStep();

// Manually navigate (nextStep validates current step first, returns false if invalid)
const advanced = form.nextStep();
form.prevStep();  // No validation needed
form.goToStep(2); // Jump to specific step
```

---

## Async Data Loading

Load options dynamically before creating the form:

```typescript
// 1. Define a schema factory
function createFormSchema(options: FieldOption[]) {
  return pipe(
    Schema.Struct({
      category: pipe(
        Schema.String,
        withField({
          label: "Category",
          inputType: "select",
          options: options  // Dynamic options
        })
      )
    })
  );
}

// 2. Load data and create controller
const options = await fetchCategories();
const schema = createFormSchema(options);
const form = createForm(schema);
```

### Complete Example

```svelte
<script lang="ts">
  import { onMount } from "svelte";
  import { createForm, SchemaForm } from "aether-forms/svelte";

  let form = $state(null);
  let loading = $state(true);

  onMount(async () => {
    const [categories, regions] = await Promise.all([
      fetchCategories(),
      fetchRegions()
    ]);

    const schema = createFormSchema(categories, regions);
    controller = createForm(schema);
    loading = false;
  });
</script>

{#if loading}
  <Skeleton />
{:else if controller}
  <SchemaForm {form} onSubmit={handleSubmit} />
{/if}
```

---

## Validation

### Schema-Level Validation

Use Effect Schema's built-in validators:

```typescript
const schema = pipe(
  Schema.String,
  Schema.minLength(2),
  Schema.maxLength(100),
  Schema.pattern(/^[a-zA-Z]+$/),
  Schema.annotations({
    message: () => "Only letters allowed, 2-100 characters"
  })
);
```

### Custom Error Messages

```typescript
// Per-field message
const email = pipe(
  Schema.String,
  Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
  Schema.annotations({
    message: () => "Please enter a valid email address"
  })
);

// Refinement with message
const age = pipe(
  Schema.Number,
  Schema.filter(
    (n) => n >= 18,
    { message: () => "Must be 18 or older" }
  )
);
```

### Required Checkboxes

For checkboxes that must be checked (e.g., "I agree to terms"):

```typescript
import { RequiredCheckbox, requiredCheckbox } from "aether-forms";

// Default message: "This field must be checked"
acceptTerms: pipe(
  RequiredCheckbox,
  withField({ label: "I accept the terms", inputType: "checkbox" })
)

// Custom message
acceptPrivacy: pipe(
  requiredCheckbox("You must accept the privacy policy"),
  withField({ label: "I accept the privacy policy", inputType: "checkbox" })
)
```

### Required Switches

For switches that must be enabled:

```typescript
import { RequiredSwitch, requiredSwitch } from "aether-forms";

// Default message: "This field must be enabled"
notifications: pipe(
  RequiredSwitch,
  withField({ label: "Enable notifications", inputType: "switch" })
)

// Custom message
dataSharing: pipe(
  requiredSwitch("You must enable data sharing to continue"),
  withField({ label: "Allow data sharing", inputType: "switch" })
)
```

### Required File Fields

File fields default to `null` when nothing is selected. `Schema.Any` accepts `null`, so it should only be used for **optional** file fields. Use `RequiredFile` or `requiredFile()` to enforce a selection:

```typescript
import { RequiredFile, requiredFile } from "aether-forms";

// Required — default message: "Please select a file"
avatar: pipe(
  RequiredFile,
  withField({
    label: "Profile Photo",
    inputType: "file",
    accept: "image/png,image/jpeg",
    // fileMode defaults to "drag-drop"
  })
)

// Required — custom message
resume: pipe(
  requiredFile("Please upload your resume"),
  withField({
    label: "Resume",
    inputType: "file",
    fileMode: "regular",
    accept: ".pdf",
  })
)

// Optional — null (no file selected) is valid
attachments: pipe(
  Schema.Any,
  withField({
    label: "Attachments",
    inputType: "file",
    fileMode: "button-only",
    multiple: true,
    description: "Optional"
  })
)
```

> `RequiredFile` checks `value instanceof FileList && value.length > 0` with a `typeof FileList !== "undefined"` guard for SSR safety.

File fields store a `FileList | null` as their value. Upload the files inside `onSubmit`:

```svelte
<SchemaForm
  {form}
  onSubmit={async (data) => {
    const formData = new FormData();
    if (data.avatar) formData.append("avatar", data.avatar[0]);
    if (data.resume) formData.append("resume", data.resume[0]);
    await fetch("/api/upload", { method: "POST", body: formData });
  }}
/>
```

### Server-Side Errors

Set errors from API responses:

```typescript
async function handleSubmit(data) {
  try {
    await api.register(data);
  } catch (error) {
    if (error.code === "EMAIL_EXISTS") {
      form.setFieldError("email", "This email is already registered");
    } else {
      form.setErrors({
        email: error.errors?.email,
        password: error.errors?.password
      });
    }
    throw error; // Re-throw to prevent success state
  }
}
```

You can also throw a structured object from `onSubmit` to set a field error inline:

```typescript
onSubmit={async (data) => {
  const res = await api.register(data);
  if (!res.ok) {
    throw { field: "email", message: "Email already taken" };
  }
}}
```

---

## Advanced Usage

### Custom Footer

```svelte
<SchemaForm {form} onSubmit={handleSubmit}>
  {#snippet footer({ isSubmitting, isValid, isFirstStep, isLastStep, handleSubmit, handleNext, handlePrev })}
    <div class="flex justify-between">
      <Button variant="outline" onclick={handlePrev} disabled={isFirstStep}>
        Back
      </Button>
      <div class="flex gap-2">
        <Button variant="outline" onclick={() => form.reset()}>
          Reset
        </Button>
        <Button
          onclick={isLastStep ? handleSubmit : handleNext}
          disabled={isSubmitting || !isValid}
        >
          {isSubmitting ? "Saving..." : isLastStep ? "Save" : "Next"}
        </Button>
      </div>
    </div>
  {/snippet}
</SchemaForm>
```

### Watching Values

```svelte
<script>
  // React to value changes
  $effect(() => {
    const country = form.state.values.country;
    if (country) {
      loadStatesForCountry(country);
    }
  });
</script>

<SchemaForm
  {form}
  onChange={(values) => console.log("Values changed:", values)}
/>
```

### Programmatic Control

```typescript
// Set values programmatically
form.setValue("email", "user@example.com");
form.setValues({ firstName: "John", lastName: "Doe" });

// Validate
const result = form.validate();
if (!result.valid) {
  console.log("Errors:", result.errors);
}

// Reset with new values
form.reset({ email: "", password: "" });

// Set errors from external source
form.setFieldError("email", "Already taken");
form.setErrors({ email: "Already taken", username: "Already taken" });
```

### Input Masks

Apply input masks using the `mask` annotation:

```typescript
phone: pipe(
  Schema.String,
  withField({
    label: "Phone Number",
    inputType: "tel",
    mask: "phone",  // Built-in: (555) 123-4567
    placeholder: "(555) 123-4567"
  })
)
```

---

## Low-Level Components

The form system exposes its internal rendering components for advanced customisation:

```typescript
import {
  SchemaField,    // Renders a single field based on FieldRenderContext
  SchemaSection,  // Renders a section (grid of fields) based on SectionRenderContext
  SchemaStep      // Renders a step (collection of sections) based on StepRenderContext
} from "aether-forms/svelte";
```

You can also build render contexts manually to drive custom layouts:

```typescript
import {
  createFieldContext,
  createSectionContext,
  createStepContext
} from "aether-forms";

const sectionCtx = createSectionContext(controller, section);
const fieldCtx   = createFieldContext(controller, field);
```

---

## Standalone Validation Utilities

These can be used independently of the form components:

```typescript
import {
  validateSync,       // Validate data against schema, returns ValidationResult
  validate,           // Same but returns an Effect
  validateField,      // Validate a single value against a schema
  validateFields,     // Validate multiple fields, returns combined FieldErrors
  createFieldValidator, // Create a reusable validator for a specific field
  validateAsync,      // Async wrapper (for future async validators)
  hasErrors,          // Check if a FieldErrors object has any errors
  getFirstError       // Get the first error message from FieldErrors
} from "aether-forms";

// Standalone sync validation
const result = validateSync(UserSchema, formData);
if (result.valid) {
  console.log(result.data);   // Typed, validated data
} else {
  console.log(result.errors); // { fieldName: "error message" }
}

// Effect-based validation (composable with other Effects)
import { pipe } from "effect";
import { Effect } from "effect";
const program = pipe(
  validate(UserSchema, formData),
  Effect.flatMap((validData) => registerUser(validData))
);

// Per-field validator factory
const validateEmail = createFieldValidator(UserSchema, "email");
const error = validateEmail(emailValue); // string | undefined

// Validate specific fields only
const errors = validateFields(UserSchema, { email: emailValue, password: pwValue });
```

---

## Troubleshooting

### Common Issues

#### 1. Checkbox shows "Invalid value" instead of custom error

Use `RequiredCheckbox` or `requiredCheckbox()` instead of `Schema.Boolean`:

```typescript
// ❌ Wrong - "false" is a valid boolean
acceptTerms: Schema.Boolean

// ✅ Correct - requires value to be true
acceptTerms: RequiredCheckbox
```

#### 2. Switch shows "Invalid value" instead of custom error

Same pattern — use `RequiredSwitch` or `requiredSwitch()`:

```typescript
// ❌ Wrong
notifications: Schema.Boolean

// ✅ Correct
notifications: RequiredSwitch
```

#### 3. File input passes validation even when empty

`Schema.Any` accepts `null`, so a file field using it will always pass — even when nothing is selected. Use `RequiredFile` or `requiredFile()` for required file fields:

```typescript
// ❌ Wrong - null (no file) passes validation
avatar: pipe(Schema.Any, withField({ inputType: "file" }))

// ✅ Correct - requires a file to be selected
avatar: pipe(RequiredFile, withField({ inputType: "file" }))

// ✅ Correct - custom error message
avatar: pipe(requiredFile("Please upload a photo"), withField({ inputType: "file" }))
```

#### 4. col-span / grid columns not applying

Dynamic Tailwind class names built with string interpolation (e.g. `` `col-span-${n}` ``) are purged at build time. This system avoids that by using static lookup maps, so all span classes (`col-span-1` through `col-span-12`, `col-span-full`, and container-query responsive variants `@sm:` / `@md:` / `@lg:`) are always in the CSS bundle.

The grid div automatically includes `@container` so container queries are always active — no external `@container` wrapper is needed. If you extend `ColumnSpan` or add custom breakpoints, add the new literals to the corresponding lookup map in [layout.ts](./layout.ts).

#### 5. Infinite loop on form load

Ensure you're not tracking `formState.values` directly in effects:

```typescript
// ❌ Can cause loops
$effect(() => {
  console.log(formState.values);
});

// ✅ Safe - track specific values
$effect(() => {
  const email = formState.values.email;
  // ...
});
```

#### 6. Input mask not working

The mask is applied in the Input component. Ensure you're passing it through:

```typescript
withField({
  inputType: "tel",
  mask: "phone"  // Must specify mask
})
```

#### 7. Select options not showing

Ensure options are provided in the annotation:

```typescript
withField({
  inputType: "select",
  options: [
    { value: "a", label: "Option A" },
    { value: "b", label: "Option B" }
  ]
})
```

#### 8. Validation not triggering

Check your `createForm` configuration:

```typescript
const form = createForm(schema, {
  validateOnBlur: true,   // Validate when field loses focus
  validateOnChange: true  // Validate on every keystroke
});
```

### Debug Mode

Add console logging to track form state:

```svelte
<SchemaForm
  {form}
  onChange={(values) => console.log("Values:", values)}
  onError={(errors) => console.log("Errors:", errors)}
/>
```

---

## Examples

For complete working examples, see:

- **Basic Form**: `/form-schema` - Simple login form
- **Multi-Section**: `/form-schema` - Profile form with multiple sections (card variant)
- **Multi-Step**: `/form-schema` - User registration wizard
- **Input Types**: `/form-schema` - All supported input types showcase
- **Validation**: `/form-schema` - Schema-level validation with custom messages

---

## TypeScript Support

Full type inference from schema:

```typescript
const UserSchema = Schema.Struct({
  name: Schema.String,
  age: Schema.Number,
  active: Schema.Boolean
});

// Inferred type
type User = Schema.Schema.Type<typeof UserSchema>;
// { name: string; age: number; active: boolean }

// Input type (for partial form state)
type UserInput = Schema.Schema.Encoded<typeof UserSchema>;

// Use in handler with full type safety
async function handleSubmit(data: User) {
  // data.name is string
  // data.age is number
  // data.active is boolean
}
```
