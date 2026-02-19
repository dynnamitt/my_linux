# XSD-to-Code Tooling Evaluation for NeTEx

Evaluated Feb 2026. The key discriminator is **substitution group support** — NeTEx uses them pervasively and most tools don't handle them.

## Summary table

| Tool | Output language | Subst. groups | Abstract types | Large XSD | Active | Verdict |
|---|---|---|---|---|---|---|
| **cxsd** | TypeScript .d.ts | No (planned) | Yes | Unknown | Low | Missing critical feature |
| **xsd2ts** | TypeScript classes | Unknown | Unknown | Broken | Dead (5yr) | Multi-file schemas broken |
| **Modelina** | TypeScript + others | No | No | Unknown | Active | Missing critical features |
| **xsdata** | Python | Yes | Yes | Optimized | Active (v26.2) | Best XSD tool, Python only |
| **xsd2jsonschema** | JSON Schema | Partial | Partial | Proven | Stable (dormant) | Viable intermediate step |
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
- Handles large multi-file schemas with circular imports
- Proven on ISO 20022 (banking) XSD
- Last published 6 years ago (v0.3.7), ~1,286 weekly downloads
- **Verdict**: Viable as intermediate format. Pair with json-schema-to-typescript or json-schema-to-zod for final output.

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
**Primary**: `xsd2jsonschema` → `json-schema-to-typescript` (14M weekly downloads, well-maintained)
**Alternative**: `xsd2jsonschema` → `json-schema-to-zod` (gets both types and runtime validation)
**Backup**: `xuri/xgen -l=TypeScript` (if JSON Schema intermediate fails)

### Python
**Primary**: `xsdata` — the clear winner, full feature support

### Java
**Primary**: JAXB via `cxf-xjc-plugin` — proven at scale by `netex-java-model`

### Go / Rust / C
**Primary**: `xuri/xgen` — only option with multi-language support

## Key risks for NeTEx code generation

1. **Substitution groups** — Mapped to `oneOf`/`anyOf` in JSON Schema, which may produce overly permissive types. Manual tightening may be needed.
2. **Circular references** — JSON Schema handles via `$ref` cycles. Code generators may emit `any` at break points.
3. **Scale** — 458 XSD files is large. Tools proven on <100 files may hit performance or memory issues.
4. **Namespace isolation** — NeTEx uses a single namespace for all parts but imports GML and SIRI. Tools must handle mixed namespace schemas.
5. **Extension depth** — Deep inheritance chains (Entity → DataManagedObject → specific types) stress type resolution.
