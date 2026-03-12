# XSD-to-Code Tooling Evaluation for NeTEx

Evaluated Feb 2026. The key discriminator is **substitution group support** — NeTEx uses them pervasively and most tools don't handle them.

## Summary table

| Tool | Output language | Subst. groups | Abstract types | Large XSD | Active | Verdict |
|---|---|---|---|---|---|---|
| **cxsd** | TypeScript .d.ts | No (planned) | Yes | Unknown | Low | Missing critical feature |
| **xsd2ts** | TypeScript classes | Unknown | Unknown | Broken | Dead (5yr) | Multi-file schemas broken |
| **Modelina** | TypeScript + others | No | No | Unknown | Active | Missing critical features |
| **xsdata** | Python | Yes | Yes | Optimized | Active (v26.2) | Best XSD tool, Python only |
| **xsd2jsonschema** | JSON Schema | Partial | Partial | Broken | Stable (dormant) | Broken for NeTEx |
| **Custom fast-xml-parser** | JSON Schema | No | Yes | Proven (458 files) | N/A (project-specific) | Proven — the approach that works |
| **@kie-tools/xml-parser-ts-codegen** | TypeScript | Yes (unions) | Unknown | Unknown | Apache-backed | Not tested on arbitrary XSD |
| **xuri/xgen** | Go/C/Java/Rust/TS | Unknown | Unknown | Unknown | Active | Unproven at NeTEx scale |

## Detailed evaluations

### cxsd (npm)
- Direct XSD → TypeScript .d.ts + .js parser state machine
- Handles namespaces, derived types, automated dependency resolution
- **Substitution groups listed as "soon" — not implemented**
- Tested on 96-file schemas (~720KB XSD → 9 .d.ts files)
- ~193 weekly downloads, 28 open issues
- **Verdict**: Rejected for NeTEx due to missing substitution group support

### xsd2ts (npm)
- Programmatic API: `generateTemplateClassesFromXSD('./file.xsd')`, outputs TypeScript classes
- 44 GitHub stars, ~300-800 weekly downloads, UNLICENSED
- **Unmaintained**: no updates in 5 years, pinned to TypeScript 3.9.9
- **Multi-file schemas broken**: Issue #20 (open 16+ months) — cannot resolve types across `<xsd:include>` files. Fatal for NeTEx's 458-file schema set.
- No documented substitution group or abstract type support
- **Verdict**: Rejected — broken multi-file support alone disqualifies it for any non-trivial XSD

### Modelina (AsyncAPI)
- Modern, multi-language (TypeScript, Python, Java, etc.)
- Supports simple/complex types, sequences, choices, attributes, enums
- **Explicitly does not support substitution groups or abstract types**
- Also missing: named groups, full restriction support, namespace validation
- **Verdict**: Not suitable for NeTEx

### xsdata (Python)
- Full substitution group support via `useSubstitutionGroups` config
- Complex type inheritance, extension, large schema optimization
- Active (v26.2 released Feb 2026)
- **Python only — no TypeScript output**
- **Verdict**: Best XSD tool available, but requires language bridge for non-Python targets

### xsd2jsonschema (npm)
- Pure JavaScript, XSD → JSON Schema (draft 04/06/07)
- Last published 6 years ago (v0.3.7), ~1,286 weekly downloads
- **`xs:include` is a documented no-op** (TODO in source) — fatal for NeTEx's 458 include-based files. Only `xs:import` (cross-namespace) works.
- **Crashes on `xsd:simpleContent` with `xsd:extension`**: `Cannot read properties of undefined (reading 'addAttributeProperty')` — NeTEx uses this pattern extensively.
- Only works for simple single-file or import-only schemas. ISO 20022 (banking) uses imports, not includes, which is why it worked there.
- **Verdict**: Broken for NeTEx. Do not use.

### Custom fast-xml-parser converter (project-specific)
- XSD → JSON Schema Draft 07 using `fast-xml-parser` for XML parsing, paired with `json-schema-to-typescript` for final output
- ~630-line TypeScript converter purpose-built for NeTEx
- **Two-pass architecture**: pass 1 collects groups and raw type entries; pass 2 converts (groups must be available before complex types reference them)
- Handles: `complexType`, `simpleType`, `element`, `group`, `attributeGroup`, `complexContent` (extension/restriction), `simpleContent`, `sequence`, `choice`, `all`
- Tracks `sourceFile` per definition during parsing — enables subset filtering at JSON Schema emission time
- **Proven results**: 458 XSD files → 2,963 JSON Schema definitions → 15,108 lines TypeScript, zero compile errors
- **Known limitations**: no substitution groups, no `xsd:any`, no attribute `use="required"`, no `mixed` content, no `xsd:redefine`
- **Depth-limited cycle breaking**: circular `$ref` chains are broken at configurable depth to prevent infinite recursion
- **Verdict**: The approach that actually works for NeTEx → TypeScript. Substitution group support would be the main enhancement.

### @kie-tools/xml-parser-ts-codegen (npm)
- Generates TypeScript types + metadata from XSD
- Handles substitution groups via union types
- **Explicitly warns: not tested against arbitrary XSD files**
- Only validated against DMN, SceSim, BPMN, PMML schemas
- **Verdict**: Promising but risk of failure on NeTEx complexity

### xuri/xgen (Go CLI)
- Generates Go/C/Java/Rust/TypeScript from XSD
- Active maintenance, BSD-3 licensed
- Limited documentation on multi-file XSD handling
- **Verdict**: Unknown viability, needs testing

## Recommended pipelines by target language

### TypeScript
**Primary**: Custom `fast-xml-parser` XSD→JSON Schema converter → `json-schema-to-typescript` — proven at NeTEx scale (458 files → 2,963 definitions → zero compile errors). Key `json-schema-to-typescript` options: `unreachableDefinitions: true`, `format: false` (skip prettier for speed), `additionalProperties: false`.
**Alternative**: Same converter → `json-schema-to-zod` (gets both types and runtime validation)
**Backup**: `xuri/xgen -l=TypeScript` (untested at NeTEx scale)
**Do not use**: `xsd2jsonschema` (broken `xs:include`, crashes on `simpleContent`)

### Python
**Primary**: `xsdata` — the clear winner, full feature support

### Java
**Primary**: JAXB via `cxf-xjc-plugin` — proven at scale by `netex-java-model`

### Go / Rust / C
**Primary**: `xuri/xgen` — only option with multi-language support

## Key risks for NeTEx code generation

1. **Substitution groups** — Mapped to `oneOf`/`anyOf` in JSON Schema, which may produce overly permissive types. Most custom converters skip substitution groups entirely; elements in a group are treated as independent types.
2. **Circular references** — JSON Schema handles via `$ref` cycles. In practice, depth-limited recursion is needed during conversion to prevent infinite loops. `json-schema-to-typescript` handles the resulting `$ref` cycles gracefully.
3. **Scale** — 458 XSD files is large. Tools proven on <100 files may hit performance or memory issues. The custom converter + `json-schema-to-typescript` handles the full set in seconds.
4. **Namespace isolation** — NeTEx uses a single namespace for all parts but imports GML and SIRI. Tools must handle mixed namespace schemas. In practice, stripping namespace prefixes works because NeTEx and SIRI/GML use distinct naming conventions.
5. **Extension depth** — Deep inheritance chains (Entity → DataManagedObject → specific types) stress type resolution.
6. **Group resolution ordering** — `xsd:group` definitions must be collected before complex types that reference them. A two-pass approach (collect groups first, then convert types) solves this.
7. **Disabled-part cross-references** — When generating a subset, types from disabled parts are referenced but missing. Emitting placeholder `{}` definitions (which compile as `unknown` in TypeScript) provides graceful degradation.

## Documentation propagation pitfalls

When propagating `xsd:annotation/xsd:documentation` through a JSON Schema intermediate representation:

1. **`$ref` + sibling `description` in JSON Schema Draft 07** — Draft 07 specifies that `$ref` causes all sibling keywords to be ignored. However, `json-schema-to-typescript` reads `description` from `$ref` siblings anyway. To be safe (and spec-correct), wrap as `{ allOf: [{ $ref: "..." }], description: "..." }`. This is critical for property-level descriptions on elements that reference complex types.

2. **XML parser output format** — When `xsd:documentation` has an `xml:lang` attribute, XML parsers typically produce `{ "#text": "...", "@_xml:lang": "en" }` instead of a plain string. Handle both forms: `typeof doc === "string" ? doc : doc["#text"]`.

3. **Output volume increase** — Expect ~3x line count increase when annotations are preserved (e.g., 15K → 49K lines). The added documentation is valuable but may require splitting output into multiple files for ergonomics.
