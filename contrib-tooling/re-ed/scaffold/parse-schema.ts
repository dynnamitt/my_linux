/**
 * parse-schema.ts — JSON Schema → ParseResult converter
 *
 * Produces the same IR as parse.ts (TypeScript parser), allowing
 * schema-driven.ts to reuse all v2 builders and templates.
 */

import { readFileSync } from 'node:fs';
import { basename, extname } from 'node:path';
import type { ParseResult, InterfaceInfo, FieldInfo, TypeAliasInfo } from './parse.ts';

export type { ParseResult, InterfaceInfo, FieldInfo, TypeAliasInfo };

// ---------------------------------------------------------------------------
// JSON Schema types (minimal, no external dependency)
// ---------------------------------------------------------------------------

interface SchemaNode {
  title?: string;
  type?: string;
  properties?: Record<string, SchemaNode>;
  required?: string[];
  enum?: string[];
  items?: SchemaNode;
  $ref?: string;
  $defs?: Record<string, SchemaNode>;
  definitions?: Record<string, SchemaNode>;
  format?: string;
  allOf?: SchemaNode[];
  'x-netex-role'?: string;
  'x-scaffold-ref'?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SKIP_FIELDS = new Set([
  'id',
  'version',
  'created',
  'changed',
  'modification',
  'status',
  'derivedFromVersionRef',
  'compatibleWithVersionFrameVersionRef',
  'derivedFromObjectRef',
  '__typename',
]);

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

function resolveRef(
  ref: string,
  defs: Record<string, SchemaNode>,
): { name: string; schema: SchemaNode } | undefined {
  const match = ref.match(/^#\/(\$defs|definitions)\/(.+)$/);
  if (!match) return undefined;
  const name = match[2];
  const schema = defs[name];
  return schema ? { name, schema } : undefined;
}

/** Extract a $ref target name from a JSON pointer. */
function deref(ref: string): string | undefined {
  const match = ref.match(/^#\/(\$defs|definitions)\/(.+)$/);
  return match?.[2];
}

// ---------------------------------------------------------------------------
// allOf flattening (modeled on schema-viewer-fns.ts flattenAllOf)
// ---------------------------------------------------------------------------

/**
 * Walk the allOf inheritance chain for a definition, merging all properties
 * and required arrays from the entire chain. Returns the flattened result.
 */
function flattenProperties(
  name: string,
  defs: Record<string, SchemaNode>,
  visited?: Set<string>,
): { properties: Record<string, SchemaNode>; required: string[] } {
  const properties: Record<string, SchemaNode> = {};
  const required: string[] = [];
  if (!visited) visited = new Set();

  function walk(n: string): void {
    if (visited!.has(n)) return;
    visited!.add(n);
    const def = defs[n];
    if (!def) return;

    // Pure $ref alias — follow it
    if (def.$ref) {
      const target = deref(def.$ref);
      if (target) walk(target);
      return;
    }

    // allOf chain — walk refs and merge inline properties
    if (def.allOf) {
      for (const entry of def.allOf) {
        if (entry.$ref) {
          const target = deref(entry.$ref);
          if (target) walk(target);
        }
        if (entry.properties) {
          Object.assign(properties, entry.properties);
        }
        if (entry.required) {
          required.push(...entry.required);
        }
      }
    }

    // Own properties (highest priority — overwrite inherited)
    if (def.properties) {
      Object.assign(properties, def.properties);
    }
    if (def.required) {
      required.push(...def.required);
    }
  }

  walk(name);
  return { properties, required };
}

// ---------------------------------------------------------------------------
// Field classification
// ---------------------------------------------------------------------------

/**
 * Resolve a $ref target to its effective shape, classifying primitive wrappers,
 * enums, arrays, and empty stubs instead of defaulting everything to 'ref'.
 */
function resolveRefToField(
  resolved: { name: string; schema: SchemaNode },
  defs: Record<string, SchemaNode>,
  base: { name: string; optional: boolean; section: string; annotation?: string },
  prop?: SchemaNode,
): FieldInfo | undefined {
  const { name: refName, schema: refSchema } = resolved;

  // Foreign ref: x-scaffold-ref on property or x-netex-role: "reference" on definition
  if (prop?.['x-scaffold-ref'] || refSchema['x-netex-role'] === 'reference') {
    return { ...base, kind: 'foreign-ref', tsType: 'string', refTarget: refName };
  }

  // Enum
  if (refSchema.enum) {
    return {
      ...base,
      kind: 'union-literal',
      tsType: refName,
      unionValues: refSchema.enum,
    };
  }

  // Primitive number (e.g. LengthType, WeightType)
  if (refSchema.type === 'number' || refSchema.type === 'integer') {
    return { ...base, kind: 'primitive', tsType: 'number', primitiveType: 'number' };
  }

  // Primitive boolean
  if (refSchema.type === 'boolean') {
    return { ...base, kind: 'primitive', tsType: 'boolean', primitiveType: 'boolean' };
  }

  // Primitive string with no structure (e.g. ObjectIdType)
  if (
    refSchema.type === 'string' &&
    !refSchema.properties &&
    !refSchema.allOf
  ) {
    return { ...base, kind: 'primitive', tsType: 'string', primitiveType: 'string' };
  }

  // Array with items → re-classify recursively (e.g. PropulsionTypeListOfEnumerations)
  if (refSchema.type === 'array' && refSchema.items) {
    return classifyField(base.name, refSchema, defs, base.optional, base.section);
  }

  // Has properties or allOf or is explicitly object → ref
  if (refSchema.properties || refSchema.allOf || refSchema.type === 'object') {
    return { ...base, kind: 'ref', tsType: refName, refTarget: refName };
  }

  // Empty stub (e.g. DeckPlanRef, VehicleTypeRefStructure — no type, no properties)
  // Treat as string primitive
  return { ...base, kind: 'primitive', tsType: 'string', primitiveType: 'string' };
}

function classifyField(
  name: string,
  prop: SchemaNode,
  defs: Record<string, SchemaNode>,
  optional: boolean,
  section: string,
): FieldInfo {
  const base = { name, optional, section, annotation: prop.format };

  // allOf unwrap: if prop has allOf but no direct $ref, extract the first $ref
  let effectiveProp = prop;
  if (!prop.$ref && prop.allOf) {
    const refEntry = prop.allOf.find((e) => e.$ref);
    if (refEntry) {
      effectiveProp = { ...prop, $ref: refEntry.$ref, allOf: undefined };
    }
  }

  // $ref → resolve with careful type inspection
  if (effectiveProp.$ref) {
    const resolved = resolveRef(effectiveProp.$ref, defs);
    if (resolved) {
      const result = resolveRefToField(resolved, defs, base, prop);
      if (result) return result;
    }
  }

  // Array
  if (effectiveProp.type === 'array' && effectiveProp.items) {
    const { items } = effectiveProp;

    // items with allOf unwrap
    let effectiveItems = items;
    if (!items.$ref && items.allOf) {
      const refEntry = items.allOf.find((e) => e.$ref);
      if (refEntry) {
        effectiveItems = { ...items, $ref: refEntry.$ref, allOf: undefined };
      }
    }

    if (effectiveItems.$ref) {
      const resolved = resolveRef(effectiveItems.$ref, defs);
      if (resolved) {
        if (resolved.schema.enum) {
          return {
            ...base,
            kind: 'union-literal-array',
            tsType: `${resolved.name}[]`,
            unionValues: resolved.schema.enum,
          };
        }
        return {
          ...base,
          kind: 'ref-array',
          tsType: `${resolved.name}[]`,
          refTarget: resolved.name,
        };
      }
    }

    if (effectiveItems.enum) {
      const tsType = `(${effectiveItems.enum.map((v) => `'${v}'`).join(' | ')})[]`;
      return { ...base, kind: 'union-literal-array', tsType, unionValues: effectiveItems.enum };
    }
  }

  // Inline enum
  if (effectiveProp.enum) {
    const tsType = effectiveProp.enum.map((v) => `'${v}'`).join(' | ');
    return { ...base, kind: 'union-literal', tsType, unionValues: effectiveProp.enum };
  }

  // Boolean
  if (effectiveProp.type === 'boolean') {
    return { ...base, kind: 'primitive', tsType: 'boolean', primitiveType: 'boolean' };
  }

  // Number / integer
  if (effectiveProp.type === 'number' || effectiveProp.type === 'integer') {
    return { ...base, kind: 'primitive', tsType: 'number', primitiveType: 'number' };
  }

  // Default: string
  return { ...base, kind: 'primitive', tsType: 'string', primitiveType: 'string' };
}

// ---------------------------------------------------------------------------
// Object schema parsing (with allOf flattening support)
// ---------------------------------------------------------------------------

function parseObjectSchema(
  name: string,
  schema: SchemaNode,
  defs: Record<string, SchemaNode>,
  skipStandardFields: boolean,
): InterfaceInfo {
  // If the schema uses allOf, flatten the inheritance chain
  let properties: Record<string, SchemaNode>;
  let requiredNames: string[];

  if (schema.allOf) {
    // Find this definition's name in defs to use flattenProperties
    const defName = Object.entries(defs).find(([, v]) => v === schema)?.[0];
    if (defName) {
      const flat = flattenProperties(defName, defs);
      properties = flat.properties;
      requiredNames = flat.required;
    } else {
      // Inline allOf (not a named definition) — merge manually
      properties = {};
      requiredNames = [];
      for (const entry of schema.allOf) {
        if (entry.$ref) {
          const target = deref(entry.$ref);
          if (target) {
            const flat = flattenProperties(target, defs);
            Object.assign(properties, flat.properties);
            requiredNames.push(...flat.required);
          }
        }
        if (entry.properties) Object.assign(properties, entry.properties);
        if (entry.required) requiredNames.push(...entry.required);
      }
      // Also include own properties
      if (schema.properties) Object.assign(properties, schema.properties);
      if (schema.required) requiredNames.push(...schema.required);
    }
  } else {
    properties = schema.properties ?? {};
    requiredNames = schema.required ?? [];
  }

  const requiredSet = new Set(requiredNames);
  const fields: FieldInfo[] = [];

  for (const [propName, propSchema] of Object.entries(properties)) {
    if (skipStandardFields && SKIP_FIELDS.has(propName)) continue;
    const optional = !requiredSet.has(propName);
    fields.push(classifyField(propName, propSchema, defs, optional, ''));
  }

  return { name, fields, sections: [] };
}

function titleFromFilename(filePath: string): string {
  const stem = basename(filePath, extname(filePath));
  const beforeDot = stem.includes('.') ? stem.slice(0, stem.indexOf('.')) : stem;
  return beforeDot
    .split(/[-_]/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function parse(schemaPath: string): ParseResult {
  const raw = readFileSync(schemaPath, 'utf-8');
  const schema: SchemaNode = JSON.parse(raw);
  const defs = schema.$defs ?? schema.definitions ?? {};

  // Resolve root $ref if present
  let rootName: string | undefined;
  let rootSchema: SchemaNode | undefined;

  if (schema.$ref) {
    const resolved = resolveRef(schema.$ref, defs);
    if (!resolved) {
      console.error(`\nError: root $ref "${schema.$ref}" could not be resolved.\n`);
      process.exit(1);
    }
    rootName = resolved.name;
    rootSchema = resolved.schema;
  }

  // For root $ref schemas, flatten the inheritance chain for the main entity
  let mainProperties: Record<string, SchemaNode> | undefined;
  let mainRequired: string[] | undefined;

  if (rootName) {
    const flat = flattenProperties(rootName, defs);
    mainProperties = flat.properties;
    mainRequired = flat.required;
  }

  // Guard: need either root properties, root $ref, or schema.properties
  if (!schema.properties && !rootName) {
    const defNames = Object.keys(defs);
    console.error(
      `\nError: schema has no top-level "properties" or "$ref".\n` +
        `The schema only contains definitions:\n` +
        defNames.map((n) => `  - ${n}`).join('\n') +
        '\n',
    );
    process.exit(1);
  }

  const title = schema.title ?? rootName ?? titleFromFilename(schemaPath);

  // Build helpers and type aliases from $defs
  const helpers = new Map<string, InterfaceInfo>();
  const typeAliases: TypeAliasInfo[] = [];

  for (const [defName, defSchema] of Object.entries(defs)) {
    if (defSchema.enum) {
      const text = `type ${defName} = ${defSchema.enum.map((v) => `'${v}'`).join(' | ')};`;
      typeAliases.push({ name: defName, text });
    } else if (defSchema.type === 'object' || defSchema.properties || defSchema.allOf) {
      helpers.set(defName, parseObjectSchema(defName, defSchema, defs, false));
    }
  }

  // Parse main interface (skip standard framework fields)
  let main: InterfaceInfo;

  if (mainProperties) {
    // Root $ref with flattened properties
    const requiredSet = new Set(mainRequired ?? []);
    const fields: FieldInfo[] = [];
    for (const [propName, propSchema] of Object.entries(mainProperties)) {
      if (SKIP_FIELDS.has(propName)) continue;
      const optional = !requiredSet.has(propName);
      fields.push(classifyField(propName, propSchema, defs, optional, ''));
    }
    main = { name: title, fields, sections: [] };
  } else {
    main = parseObjectSchema(title, schema, defs, true);
  }

  return { main, helpers, typeAliases };
}
