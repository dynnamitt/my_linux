# NeTEx 2.0 XSD Structure

Based on analysis of the `next` branch of https://github.com/NeTEx-CEN/NeTEx (Feb 2026).

## Part inventory

| Directory | Files | Domain |
|---|---|---|
| `netex_framework` | 143 | Base types, reusable components, organizations, frames. Always required. |
| `netex_part_1` | 93 | Routes, lines, stop places, scheduled stop points, timing patterns |
| `netex_part_2` | 56 | Timetables, service journeys, passing times, vehicle services |
| `netex_part_3` | 92 | Fares, pricing, distribution, sales transactions |
| `netex_part_5` | 32 | New modes, mobility services (Part 4 was never published) |
| `gml` | 7 | Geographic coordinates (GML standard). Required by any part with location data. |
| `siri` + `siri_utility` | 12 | Real-time updates (SIRI standard). Structurally required by the entry point. |
| `netex_service` | 4 | Request/delivery wrappers, filter definitions |

**Total: 458+ XSD files**

Root-level XSD files: `NeTEx_publication.xsd` (entry point), `ifopt.xsd`, `NeTEx_publication-NoConstraint.xsd`, `NeTEx_siri.xsd`, `NX.xsd`.

## Framework sub-directories

| Sub-directory | Key types |
|---|---|
| `netex_genericFramework` | `DataManagedObject`, `EntityInVersion`, `VersionFrame`, `ValidBetween` |
| `netex_reusableComponents` | `VehicleType`, `Vehicle`, `Equipment`, `PassengerCapacity`, transport modes |
| `netex_responsibility` | `DataSource`, `GeneralOrganisation`, `Codespace` |
| `netex_utility` | `MultilingualString`, `PrivateCode`, `TypeOfValue` |
| `netex_frames` | `ResourceFrame`, `GeneralFrame` |

## Namespaces and include/import patterns

NeTEx uses two XSD mechanisms:
- `<xsd:include>` — same namespace (`http://www.netex.org.uk/netex`), used for all NeTEx-to-NeTEx references
- `<xsd:import>` — cross-namespace, used for GML (`http://www.opengis.net/gml/3.2`) and SIRI (`http://www.siri.org.uk/siri`)

### File naming convention

- `*_support.xsd` (180 files) — base type definitions, refs, enums
- `*_version.xsd` (198 files) — concrete elements extending support types

### Aggregator pattern

Each part has aggregator files that include all sub-files:
- `netex_framework/netex_all_objects_framework.xsd`
- `netex_part_1/part1_tacticalPlanning/netex_all_objects_part1_tacticalPlanning.xsd`
- `netex_part_2/netex_all_objects_part2.xsd`
- etc.

The master aggregator is `netex_service/netex_all.xsd` which includes all part aggregators.

## Cross-dependency chains

```
Part 2 (timetables) ──references──► Part 1 (routes, stop points)
Part 3 (fares) ──references──► Part 1 (lines, fare zones)
Part 5 (new modes) ──references──► Framework only (mostly self-contained)
Part 1 ──references──► Framework + GML + IFOPT
```

Parts are not fully independent. Including Part 2 without Part 1 will produce unresolved type references.

## The NeTEx_publication.xsd dependency web

This is critical to understand for any code generation or subset selection strategy:

```
NeTEx_publication.xsd
  ├── <xsd:import> siri/siri_base-v2.0.xsd              ← SIRI (unconditional)
  ├── <xsd:import> siri_utility/siri_participant-v2.0.xsd ← SIRI (unconditional)
  ├── <xsd:import> siri/siri_requests-v2.0.xsd            ← SIRI (unconditional)
  ├── <xsd:include> netex_service/netex_dataObjectRequest_service.xsd
  │     ├── <xsd:import> siri/siri_requests-v2.0.xsd
  │     ├── <xsd:include> netex_filter_frame.xsd
  │     │     └── <xsd:include> ../netex_part_1/.../netex_line_support.xsd  ← PART 1!
  │     └── <xsd:include> ../netex_framework/netex_all_objects_framework.xsd
  └── <xsd:include> netex_service/netex_all.xsd            ← MASTER AGGREGATOR
        ├── framework aggregator (always)
        ├── Part 1 aggregators
        ├── Part 2 aggregators
        ├── Part 3 aggregators
        ├── Part 5 aggregators
        └── netex_filter_frame.xsd + netex_filter_object.xsd  ← Part 1 deps!
```

**Key insight for subset selection**: `netex_filter_frame.xsd` has a hard dependency on Part 1 (`netex_line_support.xsd`). When generating code without Part 1, you must either exclude filter files or provide stubs for the Part 1 types they reference.

## SIRI structural dependency

SIRI is structurally required because `NeTEx_publication.xsd` unconditionally imports 3 SIRI files. There is no way to use the standard entry point without SIRI present.

| Metric | SIRI | Framework | Ratio |
|---|---|---|---|
| Files | 12 | 143 | 8% |
| Lines | 2,204 | ~41,000 | 5% |

**Recommendation**: Treat SIRI as a required dependency. The overhead is negligible and eliminating it would require modifying the upstream XSD or maintaining stub schemas.

### SIRI types used by NeTEx service layer

The `netex_dataObjectRequest_service.xsd` extends these SIRI base types:
- `siri:AbstractFunctionalServiceRequestStructure`
- `siri:AbstractSubscriptionStructure`
- `siri:AbstractServiceDeliveryStructure`
- `siri:AbstractCapabilitiesStructure`

## XSD complexity features

NeTEx heavily uses these XSD features that challenge code generation tools:

- **Substitution groups** — every major element (Vehicle, StopPlace, Line, etc.) is a substitution group member of abstract base elements like `DataManagedObject`. This is the #1 challenge for code generators.
- **Extension/restriction** — deep inheritance chains: Entity → DataManagedObject → specialized types
- **Named groups** — `<xsd:group>` compositions for type reuse across parts
- **Abstract types** — base structures that can't be instantiated directly
- **Circular references** — Vehicle ↔ VehicleType ↔ PassengerCapacity

## Subset selection strategies

When you only need a subset of NeTEx (e.g., just stop places, or just fares), there are two viable approaches:

### A. Synthetic entry point
Generate a custom aggregator XSD that only includes the parts you need, replacing `netex_all.xsd`. Keep all XSD files present on disk for cross-reference resolution but only process specific aggregators.

### B. Load all, filter output
Feed all 458 XSD files to the code generator, then filter the output to only keep generated code for the desired parts. Simpler but generates unnecessary intermediate artifacts.

Both approaches require all XSD files to be available because cross-references between parts need to resolve during parsing.
