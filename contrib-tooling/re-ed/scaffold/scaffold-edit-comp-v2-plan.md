# scaffold-edit-comp-v2 — Design Plan

Scaffolder that reads a TypeScript entity file and generates an in-app MUI edit page following Hathor patterns.

## Invocation

```
node tools/scaffold-edit-comp-v2.ts src/data/vehicle-types/vehicleTypeTypes.ts VehicleType
```

Arguments: path to `.ts` file containing type definitions, name of the root entity type.

## Step 1: Parsing (ts-morph)

Use `ts-morph` to get full semantic understanding of the type graph. From the root type alias/interface, walk every property and extract:

- Name, optionality (`?`)
- Primitive type (`string`, `number`, `boolean`)
- Reference to another type in the file (`Name`, `DeckPlan`)
- Array-of-reference (`Vehicle[]`)

### Intermediate Representation

```ts
interface FieldInfo {
  name: string;            // 'length', 'name', 'deckPlan'
  optional: boolean;       // from '?'
  kind: 'primitive' | 'ref' | 'ref-array' | 'skip';
  tsType: string;          // 'number', 'string', 'Name', 'DeckPlan'
  primitiveType?: string;  // 'string' | 'number' | 'boolean'
  refTarget?: EntityInfo;  // resolved reference -> recursive structure
}

interface EntityInfo {
  name: string;            // 'VehicleType'
  fields: FieldInfo[];
}
```

### Example: VehicleType

| Field | Kind | Type | Notes |
|-------|------|------|-------|
| `id` | skip | string | Server-managed |
| `version` | skip | number | Server-managed |
| `name` | ref | `Name` | Value object (single `.value` property) -> inline as TextField |
| `deckPlan` | ref, optional | `DeckPlan` | Entity ref (has `id`) -> ReferenceSelect |
| `length` | primitive | number | |
| `width` | primitive | number | |
| `height` | primitive | number | |
| `vehicles` | ref-array, optional | `Vehicle[]` | Read-only list display |
| `__typename` | skip | string | GraphQL metadata |

## Step 2: Field Classification

Different `kind` values map to different UI patterns:

### `primitive` -> form field
- `string` -> `<TextField />`
- `number` -> `<TextField type="number" />`
- `boolean` -> `<Switch />` or `<Checkbox />`

### `ref` (single object) -> two sub-cases

1. **Value object** — type has a single `value` property (e.g. `Name = { value: string }`). Inline as a `<TextField>`, read/write through `.value`.

2. **Entity reference** — type has an `id` field (e.g. `DeckPlan`). Render as a `<ReferenceSelect>` / autocomplete dropdown. The edit page links to an existing entity, doesn't edit it inline.

Heuristic: has `id` field -> entity reference. No `id` -> value object.

### `ref-array` -> read-only display
Chip list or simple sub-table. Editing reverse relationships is out of scope for the generated page.

### `skip` -> not rendered
Built-in skip list: `id`, `version`, `__typename`. Extensible via `/** @scaffold-readonly */` JSDoc or `--skip` CLI flag.

## Step 3: Output Files

Generated into `src/data/{entity}/`:

```
src/data/{entity}/
├── {Entity}EditPage.tsx          <- full-page edit form (MUI)
├── {Entity}EditPage.test.tsx     <- basic render/interaction tests
├── use{Entity}Form.ts            <- form state hook (controlled fields, dirty tracking)
├── {entity}Validation.ts         <- field-level validation
└── cells/
    └── EditActionCell.tsx        <- updated to navigate to edit route
```

Plus a route fragment suggestion printed to stdout:

```ts
// Add to App.tsx:
<Route path="/vehicle-types/:id/edit" element={<VehicleTypeEditPage />} />
```

### Template Placeholders

Each template uses filtered subsets of FieldInfo[]:

| Placeholder | Filter |
|---|---|
| `{{PRIMITIVE_FIELDS}}` | `kind === 'primitive'` |
| `{{VALUE_OBJECT_FIELDS}}` | `kind === 'ref'` where ref has no `id` |
| `{{REFERENCE_SELECTS}}` | `kind === 'ref'` where ref has `id` |
| `{{READONLY_LISTS}}` | `kind === 'ref-array'` |
| `{{FORM_STATE_FIELDS}}` | all editable (excludes ref-array, skip) |
| `{{VALIDATION_CHECKS}}` | all non-optional editables |

## Step 4: Template Directory Structure

```
tools/scaffold-v2/
├── templates/
│   ├── EditPage.tsx.tpl
│   ├── useForm.ts.tpl
│   ├── validation.ts.tpl
│   ├── EditPage.test.tsx.tpl
│   └── EditActionCell.tsx.tpl
├── parse.ts                      <- ts-morph parsing -> FieldInfo[]
├── classify.ts                   <- field classification logic
├── generate.ts                   <- template filling
└── scaffold-edit-comp-v2.ts      <- CLI entry point
```

## Step 5: Re-scaffold Behavior

Same first-pass vs override-candidate split as v1:

- **Init-only** (never overwritten): `EditPage.tsx`, test files — developer customizes heavily
- **Re-generable** (diffed + prompted): `validation.ts`, form state hook — mechanical, safe to regenerate when fields change

## Tricky Parts

### NeTEx value wrappers
`Name = { value: string }` is pervasive in Sobek/Tiamat. The single-`value`-property heuristic handles this. Escape hatch: `/** @scaffold-inline */` JSDoc for ambiguous cases.

### GraphQL mutations
The scaffolder doesn't know the mutation schema. Generate a TODO stub:
```ts
const SAVE_MUTATION = gql`/* TODO: define mutation */`;
```
Optionally accept a `.graphql` file as second input in a future iteration.

### Editable vs non-editable
Not every field should be in the form. Default skip list: `id`, `version`, `__typename`. Use `/** @scaffold-readonly */` for display-only fields like `vehicles`. `--skip` CLI flag for ad-hoc exclusions.

## v1 vs v2 Comparison

| Aspect | v1 (JSON Schema) | v2 (TS entity file) |
|--------|-------------------|---------------------|
| Input | External schema file | Existing source-of-truth types |
| Parser | `JSON.parse` | `ts-morph` |
| Field awareness | Flat primitives only | Primitives, refs, arrays, optionality |
| Output location | `packages/<name>-editor/` | `src/data/<entity>/` (in-app) |
| UI framework | Raw `<input>` + custom CSS | MUI `<TextField>`, project patterns |
| Ref handling | None | Inline value objects, reference selects, read-only lists |
| Mutation/fetch | None | TODO stub or optional `.graphql` input |
| Form state | Stateless `{value, onChange}` props | `useForm` hook with dirty tracking |
