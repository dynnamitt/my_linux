---
name: netex-opinions
description: >
  Domain knowledge about NeTEx (Network Timetable Exchange) XSD schema structure,
  code generation challenges, and tooling landscape. Use when working with NeTEx
  XSD schemas, generating code from NeTEx in any language, understanding NeTEx
  part structure, evaluating XSD-to-code tools, or dealing with NeTEx
  cross-dependencies and subset selection.
---

# NeTEx Domain Knowledge

Reference material from analysis of NeTEx 2.0 XSD schemas and code generation tooling (Feb 2026).

## NeTEx XSD structure

See [references/xsd-structure.md](references/xsd-structure.md) for:
- Part inventory (458 files across 8 directories)
- Cross-dependency chains between parts
- Include/import patterns, namespaces, and aggregator files
- The `netex_service/` dependency web (critical for subset selection)
- SIRI structural dependency analysis
- XSD complexity features that challenge code generation

## Code generation tooling landscape

See [references/tooling-evaluation.md](references/tooling-evaluation.md) for:
- Evaluation of 8 XSD-to-code tools across languages (including the proven custom converter)
- Why substitution group support is the key discriminator for NeTEx
- Risk assessment per tool
- Recommendations for different target languages
- Documentation propagation pitfalls (JSON Schema `$ref` + `description`)

## Generation pipeline patterns

See [references/pipeline-patterns.md](references/pipeline-patterns.md) for:
- Recommended pipeline architecture (load all → filter output)
- Annotation propagation strategy (`xsd:documentation` → JSDoc/docstrings)
- Output splitting by XSD source directory (natural module boundaries)
- Cross-module import resolution approaches
- Source file tracking and two-pass parsing

## Real data container heuristics

See [references/real-data-containers.md](references/real-data-containers.md) for:
- How to distinguish top-tier NeTEx entities from structural scaffolding (`_VersionStructure`, `_RelStructure`, etc.)
- Three converging signals: frame membership, `DataManagedObject` inheritance, substitution groups
- Machine-applicable classification rules (suffix-based + frame parsing)
- Why frame XSDs are the authoritative "top-tier entity" registry
- Implications for code generation (flatten scaffolding, parse frames for entity lists)

## Key insights

1. **SIRI is structurally required** — `NeTEx_publication.xsd` unconditionally imports 3 SIRI files. Any code generator starting from that entry point needs SIRI present. Only 12 files / 2,204 lines — negligible overhead.

2. **Subset selection is hard** — `netex_service/netex_all.xsd` includes all parts unconditionally. The filter files (`netex_filter_frame.xsd`) have hard dependencies on Part 1. Generating code for a subset requires either synthetic aggregators or load-all-filter-output.

3. **Substitution groups are the key challenge** — Every major NeTEx element is a substitution group member. Most XSD-to-code tools don't handle them. This is the single biggest discriminator when choosing tooling.

4. **Part 4 was never published** — NeTEx skips from Part 3 to Part 5. Not an error.

5. **Cross-references require all files present** — Even when generating for a single part, the full XSD set must be available because parts reference types from other parts and the framework.

6. **XSD annotations are the documentation goldmine** — Most NeTEx types, elements, and attributes have `xsd:annotation/xsd:documentation`. Any code generation pipeline should propagate these to output (JSDoc, docstrings, XML comments). Expect ~3x increase in output volume when annotations are preserved. Many upstream downloads strip annotations for size — keep them.

7. **Type distribution is heavily framework-weighted** — Of ~3,000 base definitions (framework + SIRI only, no domain parts), ~92% come from `netex_framework/` (reusable components: 45%, responsibility: 30%, generic framework: 15%), ~6% from SIRI, ~5% core/service. Domain parts add modest incremental counts. This distribution matters for splitting generated output into manageable modules.

8. **NeTEx XSD naming convention reveals natural module boundaries** — `*_support.xsd` (180 files) defines base types/enums, `*_version.xsd` (198 files) defines concrete elements. The directory structure (`netex_framework/netex_reusableComponents/`, `netex_framework/netex_responsibility/`, etc.) maps cleanly to output module boundaries.
