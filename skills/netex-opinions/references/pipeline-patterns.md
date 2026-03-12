# NeTEx Code Generation Pipeline Patterns

Generic patterns for generating typed code from NeTEx XSD schemas, applicable to any target language.

## Recommended pipeline architecture

```
XSD (all 458 files)
  → Parse (recursive include/import resolution)
  → Build type registry (types, elements, groups, attributes)
  → Convert to intermediate representation (JSON Schema, AST, etc.)
  → Filter to enabled parts (by source file path)
  → Generate target language code
  → Split into modules (by XSD source directory)
  → Generate documentation
```

### Why load all, filter output

Loading all 458 XSD files is necessary because cross-references span parts. Filtering at parse time causes unresolved type errors. Instead: parse everything, track source file per definition, filter at output time.

## Annotation propagation

NeTEx XSDs are rich with `xsd:annotation/xsd:documentation`. Propagating these to generated code (JSDoc, docstrings, XML comments) is the single highest-value post-generation enhancement.

### Where annotations appear

| XSD construct | Typical annotation content |
|---|---|
| `complexType` | Type-level description ("Type for a SCHEDULED STOP POINT") |
| `simpleType` | Enum/restriction description ("Allowed values for TRANSPORT MODE") |
| `element` (top-level) | Element description |
| `element` (within sequence/choice) | Property-level description |
| `attribute` | Attribute property description |

### Intermediate representation mapping

| XSD | JSON Schema | TypeScript | Python | Java |
|---|---|---|---|---|
| `xsd:documentation` | `description` field | JSDoc `/** ... */` | Docstring | Javadoc |

### `$ref` + description gotcha (JSON Schema route)

In JSON Schema Draft 07, `$ref` causes sibling keywords to be ignored per spec. When an element references a complex type AND has its own documentation, you cannot write:

```json
{ "$ref": "#/definitions/FooType", "description": "This element is..." }
```

Instead, wrap in `allOf`:

```json
{ "allOf": [{ "$ref": "#/definitions/FooType" }], "description": "This element is..." }
```

This is the most common pitfall when adding description propagation to an existing XSD-to-JSON-Schema converter. Without wrapping, some tools (e.g., `json-schema-to-typescript`) read the sibling description anyway, but others silently drop it. The `allOf` wrapping is spec-correct and universally safe.

**Warning**: Adding `allOf` wrappers increases the number of schema nodes and can trigger stack overflows in tools that recursively resolve circular `$ref` chains. Test with the full NeTEx schema set, not just small examples.

## Output splitting by XSD directory

A monolithic output file for NeTEx base config produces ~3,000 definitions / ~49,000 lines (with annotations). Splitting by XSD source directory yields natural modules:

| Module | Source pattern | Expected % |
|---|---|---|
| reusable | `netex_framework/netex_reusableComponents/` | ~45% |
| responsibility | `netex_framework/netex_responsibility/` | ~29% |
| generic | `netex_framework/netex_genericFramework/` | ~16% |
| siri | `siri/` or `siri_utility/` | ~6% |
| core | Everything else (utility, frames, service, root) | ~4% |
| network | `netex_part_1/` | Incremental when Part 1 enabled |
| timetable | `netex_part_2/` | Incremental when Part 2 enabled |
| fares | `netex_part_3/` | Incremental when Part 3 enabled |
| new-modes | `netex_part_5/` | Incremental when Part 5 enabled |

### Cross-module imports

When splitting, types in one module reference types in another. Two approaches for resolving cross-module imports:

**A. Schema-level $ref graph**: Walk JSON Schema `$ref` chains to find cross-category dependencies. Misses inlined references that the code generator resolves (e.g., `allOf` extension flattening).

**B. Text scanning (more reliable)**: After generation, scan each code block for type name references (e.g., PascalCase identifiers in TypeScript). Match against the global type→module map. Produces correct imports even when the code generator inlines or flattens schema references.

Approach B is more robust for `json-schema-to-typescript` because it aggressively inlines `allOf`/extension types.

## Source file tracking

During XSD parsing, record which source file each definition comes from:

```
TypeName → sourceFile mapping:
  "ScheduledStopPointStructure" → "netex_part_1/.../netex_scheduledStopPoint_version.xsd"
  "DataManagedObjectStructure" → "netex_framework/netex_genericFramework/.../netex_dataManaged_version.xsd"
```

This mapping enables:
1. Subset filtering (only emit definitions from enabled parts)
2. Module splitting (group definitions by source directory)
3. Documentation (link generated types back to XSD source)

## Two-pass parsing

NeTEx XSDs use `xsd:group` compositions that may be referenced before they are defined (alphabetical file loading order doesn't guarantee definition order). A two-pass approach solves this:

- **Pass 1**: Collect all `xsd:group` and `xsd:attributeGroup` definitions into a registry
- **Pass 2**: Convert `complexType`, `simpleType`, and `element` definitions (group references are now resolvable)

This is simpler and more reliable than topological sorting or lazy resolution.
