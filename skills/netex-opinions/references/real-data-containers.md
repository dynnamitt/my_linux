# Real Data Container Heuristics

How to distinguish top-tier NeTEx entities (things users care about) from structural scaffolding (XSD plumbing).

## The naming convention

For any concept `Xxx`, the XSD may define:

| Suffix | XSD construct | Role |
|---|---|---|
| `Xxx` | `element` | Concrete, usable XML tag |
| `Xxx_` | `element` (abstract) | Substitution group head (polymorphic slot) |
| `Xxx_VersionStructure` | `complexType` | Property blueprint for the element |
| `Xxx_BaseStructure` | `complexType` | Common base shared with derived views |
| `Xxx_DerivedViewStructure` | `complexType` | Denormalized projection for embedding |
| `Xxx_RelStructure` | `complexType` | Collection wrapper (holds a list of `Xxx`) |
| `XxxRef` / `XxxRefStructure` | `element` / `complexType` | Reference by ID |

The element `Xxx` and its type `Xxx_VersionStructure` always come in pairs. XSD requires both because substitution groups are element-level while type inheritance is complexType-level — parallel hierarchies serving different purposes.

## Three converging signals for top-tier status

No single `isTopLevel="true"` flag exists. Top-tier status is established by:

### 1. Frame membership (most authoritative)

Frames are NeTEx's containers. Each frame type explicitly declares which elements can be direct children:

- **ResourceFrame** — organisations, typesOfValue, vehicleTypes, equipments, ...
- **ServiceFrame** — Network, routePoints, routes, lines, scheduledStopPoints, ...
- **TimetableFrame** — vehicleJourneys, ServiceJourney, ...
- **SiteFrame** — stopPlaces, parkings, topographicPlaces, ...
- **FareFrame** — fareStructureElements, tariffs, prices, ...
- **GeneralFrame** — catch-all for arbitrary members

If an element can live directly inside a frame, it is a top-tier entity. The frame XSDs (e.g. `netex_resourceFrame_version.xsd`) are the authoritative source.

### 2. Inheritance from DataManagedObject

Top-tier entities almost always descend from:

```
EntityInVersion
  └─ DataManagedObject
       └─ (domain parent)
            └─ Xxx_VersionStructure
```

`DataManagedObject` grants: versioning, responsibility sets, key-value metadata, validity conditions. If something inherits from it, it's designed to be a managed, referenceable, versionable entity.

### 3. Substitution group membership

Abstract elements ending in `_` (like `Place_`, `DataManagedObject_`, `TypeOfValue_`) are substitution group heads. Concrete elements declare `substitutionGroup="SomeHead_"` to participate. When a frame references `DataManagedObject_`, any element in that group can appear there.

## Classification heuristics (machine-applicable)

| Rule | Classifies as |
|---|---|
| Concrete element (no `abstract="true"`) with `substitutionGroup` | Usable entity |
| Referenced from a frame `_RelStructure` | **Top-tier** (frame member) |
| Extends `DataManagedObject` chain | Managed, versionable entity |
| Name ends in `_VersionStructure` | Scaffolding (type definition) |
| Name ends in `_RelStructure` | Scaffolding (collection wrapper) |
| Name ends in `_RefStructure` | Scaffolding (reference type) |
| Name ends in `_DerivedViewStructure` | Scaffolding (denormalized view) |
| Name ends in `_` | Scaffolding (abstract substitution group head) |

The combination **concrete element + in a frame + extends DataManagedObject** is the NeTEx definition of top-tier.

## Implications for code generation

- **Generate everything but organize** — emit all types, but mark or group them so consumers know what's a real entity vs plumbing. Suffix-based heuristics reliably identify scaffolding.
- **Frame parsing builds the entity registry** — parsing frame type definitions is the most robust way to produce a canonical list of top-tier entities.
- **`_RelStructure` and `_RefStructure` are noise for most consumers** — these are XML serialization artifacts. In TypeScript/JSON, collections are arrays and references are string IDs. Consider flattening or hiding these.
- **JAXB sidesteps the problem** — it generates classes for every type mechanically, and Java developers expect deep hierarchies. TypeScript/Python users expect a flatter, more curated surface.

## Documentation sources

- **Frame XSDs** — the normative, machine-readable source for frame membership
- **UML diagrams** in `xsd/NeTEx_UML/` — show conceptual entity relationships
- **CEN/TS 16614 parts 1-5** — formally classify entities (partially paywalled)
- **NeTEx GitHub** (`NeTEx-CEN/NeTEx`) — no single "top-tier entity" registry exists; frame membership is the closest equivalent
