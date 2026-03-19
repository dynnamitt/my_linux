# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A code scaffolder for NeTEx entity editor components. Given a TypeScript file or JSON Schema describing an entity, it generates a complete npm workspace package (`packages/<name>-editor/`) with types, validation, XML normalize/serialize, a React form component, and tests.

Both entry points share the same IR, builders, and templates (`scaffold-v2/`).

## Commands

```bash
# Scaffold from TypeScript entity file
npm run gen:types -- samples/v-t.ts VehicleType

# Scaffold from JSON Schema
npm run gen:schema -- schemas/vt-demo.json

# Type-check
npm run tsc

# Tests
npm test                                 # vitest (this project)
npm test -w @entur/<name>-editor         # vitest (generated package)
npm run build -w @entur/<name>-editor    # vite lib mode (generated package)

# Host app (visual testing of generated editors)
npm run dev                              # Vite dev server at http://localhost:5173
npm run build                            # production build
npm run preview                          # preview production build
```

The second scaffolder argument (interface name) is optional — defaults to the first exported interface (TS) or `schema.title` / filename (JSON Schema).

Generated packages live in a sibling `packages/<name>-editor/` directory and are linked as npm workspaces. Run `npm install` after first scaffold to link the workspace.

## Host App

A minimal Vite + React + MUI app in `src/` for visually testing generated editor packages. It uses `import.meta.glob` to dynamically discover all `packages/*/src/index.ts` exports at dev/build time and renders each on its own route.

### How it works

- `src/App.tsx` — `import.meta.glob` discovers editors, wraps each `Editor` export in `React.lazy()`, builds route entries
- `src/pages/Home.tsx` — lists discovered editors as clickable links
- `src/pages/EditorPage.tsx` — renders the selected editor with local state, an error boundary, and a debug JSON panel
- `src/main.tsx` — React root with MUI ThemeProvider, CssBaseline, HashRouter

### Workspace and glob exclusions

The `packages/base@vehicletype@tiny-editor/` directory contains invalid TypeScript identifiers (`@` in type names) and an invalid npm package name. It is excluded in two places:

- `package.json` workspaces: `"!packages/*@*"` negation pattern
- `src/App.tsx` glob: `!../packages/*@*/src/index.ts` exclusion in `import.meta.glob`

## Architecture

### Shared Pipeline

Both entry points produce the same `ParseResult` IR, then feed it to shared builders and templates:

```
TypeScript file → parse.ts (ts-morph → IR) ─┐
                                             ├→ builders.ts (IR → code) → templates (.tpl) → output
JSON Schema     → parse-schema.ts (JSON → IR)┘
```

### Key Modules

- **`scaffold-v2/parse.ts`** — ts-morph parser that walks interfaces and type aliases, producing an `InterfaceInfo`/`FieldInfo` IR. Classifies fields into kinds: `primitive`, `union-literal`, `union-literal-array`, `ref`, `ref-array`.
- **`scaffold-v2/parse-schema.ts`** — JSON Schema parser producing the same IR. Maps JSON Schema types/`$ref`/`$defs` to the same field kinds.
- **`scaffold-v2/builders.ts`** — ~30 builder functions that transform the IR into code fragments (type declarations, validate checks, normalize assignments, serialize mappings, editor JSX sections, test cases).
- **`types-driven.ts`** — CLI entry point for TypeScript input.
- **`schema-driven.ts`** — CLI entry point for JSON Schema input.

### JSON Schema → IR Mapping

| JSON Schema | FieldKind |
|-------------|-----------|
| `"type": "string"` | `primitive` (string) |
| `"type": "number"` / `"integer"` | `primitive` (number) |
| `"type": "boolean"` | `primitive` (boolean) |
| `"enum": [...]` or `"$ref"` to enum def | `union-literal` |
| `"$ref"` to object def | `ref` |
| `"type": "array", "items": { "$ref": ... }` (object) | `ref-array` |
| `"type": "array", "items": { "$ref": ... }` (enum) | `union-literal-array` |

JSON Schema `$defs` (or `definitions`) entries become either helper interfaces (object types) or type aliases (enum types) in the IR.

### Field Kind → Generated UI Mapping

| Kind | Example | UI |
|------|---------|-----|
| `primitive` (string) | `shortName?: string` | Text input |
| `primitive` (number) | `length?: number` | Number input |
| `primitive` (boolean) | `monitored?: boolean` | Checkbox |
| `union-literal` | `transportMode?: 'bus' \| 'tram'` | Select dropdown |
| `union-literal-array` | `propulsionType?: PropulsionEnum[]` | Multi-select |
| `ref` | `capacity?: PassengerCapacityStructure` | Expandable sub-form |
| `ref-array` | `name?: TextType[]` | Editable list with add/remove |

### Re-scaffold Behavior

Running the scaffolder again on an existing package:

- **`init_only/`** files (package.json, tsconfig, Editor.tsx, tests, etc.) — skipped, developer owns these
- **`always/`** files (types.ts, validate.ts, normalize.ts, serialize.ts) — shows unified diff, prompts `Overwrite? [y/N]` per file

### Skipped Fields

Fields named `id`, `version`, `created`, `changed`, `modification`, `status`, `derivedFromVersionRef`, `compatibleWithVersionFrameVersionRef`, `derivedFromObjectRef`, `__typename` are auto-skipped during generation. In the TypeScript path these are handled in templates; in the JSON Schema path they are filtered by `parse-schema.ts`.

### Section Comments

`// ── SectionName ──` comments in TypeScript input files are preserved as `<fieldset>` section dividers in the generated editor. The parser tracks these via `SECTION_RE`. JSON Schema input does not currently support sections.

### Template Placeholders

Templates use `{{PLACEHOLDER}}` syntax, filled by `fillTemplate()`. Each `FileSpec` declares which builder functions produce which placeholders.

## Key Conventions

- PascalCase ↔ camelCase conversion is central — XML uses PascalCase element names, TypeScript uses camelCase properties. `normalize` converts incoming, `serialize` converts outgoing.
- Generated packages have zero devDependencies — they rely on Hathor workspace hoisting for vite, vitest, typescript.
- Runtime dependency is `fast-xml-parser` for XML serialization.
- `Partial<T>` is used pervasively — all entity fields are optional by design (NeTEx allows sparse documents).
