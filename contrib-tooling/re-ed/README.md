# Editor Component Scaffolder

Two versions of the scaffolder exist. **v2 is the current one** — it reads TypeScript entity files directly using ts-morph and handles the full NeTEx type landscape (primitives, booleans, string-literal unions, ref objects, ref arrays). v1 reads JSON Schema and only supports flat `string`/`number` fields.

## v2 — TypeScript entity input (recommended)

### Quick start

```bash
# First run — scaffolds the full package
node --experimental-strip-types tools/scaffold-edit-comp-v2.ts tools/samples/v-t.ts VehicleType

# Link the workspace and verify
npm install
npm test  -w @entur/vehicletype-editor
npm run build -w @entur/vehicletype-editor
```

The first argument is a `.ts` file containing the entity interfaces. The optional second argument selects which interface is the root entity (defaults to the first exported interface).

### What it does

Given a TypeScript file with interfaces describing an entity and its helpers, the v2 scaffolder generates a complete npm workspace package under `packages/<name>-editor/` with:

- TypeScript types and validation (supports `string`, `number`, `boolean`, string-literal unions, ref objects, ref arrays)
- XML normalize/serialize functions (PascalCase XML <-> camelCase objects)
- A React form component with section grouping from `// ── Section ──` comments
- Tests for normalize, serialize, and validate

### Input format

A `.ts` file with one main interface and zero or more helper interfaces/types. The parser uses ts-morph to extract the full type graph.

```ts
export interface VehicleType {
  // ── EntityStructure ──
  id?: string;
  version?: string;

  // ── DataManagedObjectStructure ──
  name?: TextType[];
  description?: TextType[];

  // ── VehicleType fields ──
  monitored?: boolean;
  length?: number;
  transportMode?: AllPublicTransportModesEnumeration;
  passengerCapacity?: PassengerCapacityStructure;
}

interface TextType {
  value?: string;
  lang?: string;
}

type AllPublicTransportModesEnumeration = 'bus' | 'tram' | 'rail' | 'metro';

interface PassengerCapacityStructure {
  totalCapacity?: number;
  seatingCapacity?: number;
}
```

The parser classifies each field:

| Kind | Example | Generated UI |
|------|---------|-------------|
| `primitive` | `length?: number` | Text input |
| `primitive` (boolean) | `monitored?: boolean` | Switch |
| `union-literal` | `transportMode?: 'bus' \| 'tram'` | Select dropdown |
| `ref` | `passengerCapacity?: PassengerCapacityStructure` | Expandable sub-form |
| `ref-array` | `name?: TextType[]` | Editable list |

Fields named `id`, `version`, `created`, `changed`, `modification`, `status`, `derivedFromVersionRef`, `compatibleWithVersionFrameVersionRef`, `derivedFromObjectRef`, and `__typename` are skipped automatically.

Section headers from `// ── SectionName ──` comments are preserved and rendered as form section dividers.

### Re-scaffolding

Same behavior as v1 — run the same command again after editing the entity file:

| Category | Files | Behavior |
|----------|-------|----------|
| **init_only** | `package.json`, `tsconfig.json`, `vite.config.ts`, `src/index.ts`, `src/Editor.tsx`, `src/Editor.css`, all `__tests__/` | Skipped — you own these after first run |
| **always** | `src/generated/types.ts`, `src/generated/validate.ts`, `src/normalize.ts`, `src/serialize.ts` | Shows a unified diff and asks `Overwrite? [y/N]` per file |

### Template layout

```
tools/
├── scaffold-edit-comp-v2.ts       # v2 entry point
└── scaffold-v2/
    ├── parse.ts                   # ts-morph parser -> IR
    ├── builders.ts                # template placeholder builders
    ├── always/                    # regenerated on every run
    │   ├── types.ts.tpl           → src/generated/types.ts
    │   ├── validate.ts.tpl        → src/generated/validate.ts
    │   ├── normalize.ts.tpl       → src/normalize.ts
    │   └── serialize.ts.tpl       → src/serialize.ts
    └── init_only/                 # written once, never overwritten
        ├── package.json.tpl       → package.json
        ├── tsconfig.json.tpl      → tsconfig.json
        ├── vite.config.ts.tpl     → vite.config.ts
        ├── index.ts.tpl           → src/index.ts
        ├── Editor.tsx.tpl         → src/Editor.tsx
        ├── Editor.css.tpl         → src/Editor.css
        ├── normalize.test.ts.tpl  → __tests__/normalize.test.ts
        ├── serialize.test.ts.tpl  → __tests__/serialize.test.ts
        └── validate.test.ts.tpl   → __tests__/validate.test.ts
```

### Sample entity files

`tools/samples/` contains example input files:

- `v-t.ts` — minimal VehicleType with primitives, booleans, and TextType refs
- `v-t-complete.ts` — full VehicleType with unions, nested refs, ref arrays, and all NeTEx patterns

---

## v1 — JSON Schema input (original)

### Quick start

```bash
node tools/scaffold-edit-comp.ts schemas/vt-demo.json

npm install
npm test  -w @entur/vehicletype-editor
npm run build -w @entur/vehicletype-editor
```

### What it does

Given a JSON Schema describing an entity (only `string` and `number` fields), generates a complete npm workspace package under `packages/<name>-editor/`.

### Schema format

Standard JSON Schema (draft-07). The scaffolder reads `title`, `properties`, and `required`.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "VehicleType",
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "length": { "type": "number" }
  },
  "required": ["name"]
}
```

The `title` determines the package name (`VehicleType` -> `@entur/vehicletype-editor`), the TypeScript interface name, and the XML root element.

### Template layout

```
tools/
├── scaffold-edit-comp.ts          # v1 entry point
└── scaffold/
    ├── always/                    # regenerated on every run
    │   ├── types.ts.tpl           → src/generated/types.ts
    │   ├── validate.ts.tpl        → src/generated/validate.ts
    │   ├── normalize.ts.tpl       → src/normalize.ts
    │   └── serialize.ts.tpl       → src/serialize.ts
    └── init_only/                 # written once, never overwritten
        ├── package.json.tpl       → package.json
        ├── tsconfig.json.tpl      → tsconfig.json
        ├── vite.config.ts.tpl     → vite.config.ts
        ├── index.ts.tpl           → src/index.ts
        ├── Editor.tsx.tpl         → src/Editor.tsx
        ├── Editor.css.tpl         → src/Editor.css
        ├── normalize.test.ts.tpl  → __tests__/normalize.test.ts
        ├── serialize.test.ts.tpl  → __tests__/serialize.test.ts
        └── validate.test.ts.tpl   → __tests__/validate.test.ts
```

---

## Generated package (both versions)

The package has zero devDependencies — it uses hathor's `vite`, `vitest`, and `typescript` via npm workspace hoisting. Runtime dependency is `fast-xml-parser` for XML serialization.

```bash
npm test  -w @entur/vehicletype-editor   # vitest
npm run build -w @entur/vehicletype-editor   # vite lib mode -> dist/

# Import in hathor
import { Editor, normalize, serialize, validate } from '@entur/vehicletype-editor';
```

## Caveats

After deleting a generated package directory (`rm -rf packages/<name>`), run `npm install` before re-scaffolding. The npm workspace resolver caches symlinks and will fail to resolve the script if the workspace member directory is missing.
