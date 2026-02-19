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
- Evaluation of 7 XSD-to-code tools across languages
- Why substitution group support is the key discriminator for NeTEx
- Risk assessment per tool
- Recommendations for different target languages

## Key insights

1. **SIRI is structurally required** — `NeTEx_publication.xsd` unconditionally imports 3 SIRI files. Any code generator starting from that entry point needs SIRI present. Only 12 files / 2,204 lines — negligible overhead.

2. **Subset selection is hard** — `netex_service/netex_all.xsd` includes all parts unconditionally. The filter files (`netex_filter_frame.xsd`) have hard dependencies on Part 1. Generating code for a subset requires either synthetic aggregators or load-all-filter-output.

3. **Substitution groups are the key challenge** — Every major NeTEx element is a substitution group member. Most XSD-to-code tools don't handle them. This is the single biggest discriminator when choosing tooling.

4. **Part 4 was never published** — NeTEx skips from Part 3 to Part 5. Not an error.

5. **Cross-references require all files present** — Even when generating for a single part, the full XSD set must be available because parts reference types from other parts and the framework.
