/**
 * parse.ts — TS entity file parser using ts-morph
 *
 * Reads a pre-flattened .ts file containing one main interface and zero or more
 * helper interfaces. Produces an intermediate representation (IR) used by the
 * code-generation builders.
 */

import { Project, type InterfaceDeclaration } from 'ts-morph';

// ---------------------------------------------------------------------------
// IR types
// ---------------------------------------------------------------------------

export type FieldKind = 'primitive' | 'union-literal' | 'union-literal-array' | 'ref' | 'ref-array' | 'foreign-ref';

export interface FieldInfo {
  name: string;
  optional: boolean;
  kind: FieldKind;
  tsType: string;
  primitiveType?: 'string' | 'number' | 'boolean';
  annotation?: string;
  unionValues?: string[];
  refTarget?: string;
  section: string;
}

export interface InterfaceInfo {
  name: string;
  fields: FieldInfo[];
  sections: string[];
}

export interface TypeAliasInfo {
  name: string;
  text: string;
}

export interface ParseResult {
  main: InterfaceInfo;
  helpers: Map<string, InterfaceInfo>;
  typeAliases: TypeAliasInfo[];
}

// ---------------------------------------------------------------------------
// Section comment regex: matches  // ── SectionName ──
// ---------------------------------------------------------------------------

const SECTION_RE = /\/\/\s*──\s*(.+?)\s*──/;
const ANNOTATION_RE = /\/\*\s*(.+?)\s*\*\//;

// ---------------------------------------------------------------------------
// Parser implementation
// ---------------------------------------------------------------------------

function parseInterface(decl: InterfaceDeclaration, knownInterfaces: Set<string>): InterfaceInfo {
  const fields: FieldInfo[] = [];
  const sections: string[] = [];
  let currentSection = '';

  for (const prop of decl.getProperties()) {
    // Check for section comment in leading comments
    const leadingComments = prop.getLeadingCommentRanges();
    for (const c of leadingComments) {
      const text = c.getText();
      const match = SECTION_RE.exec(text);
      if (match) {
        currentSection = match[1];
        if (!sections.includes(currentSection)) {
          sections.push(currentSection);
        }
      }
    }

    // Check for inline annotation in trailing comments
    let annotation: string | undefined;
    const trailingComments = prop.getTrailingCommentRanges();
    for (const c of trailingComments) {
      const text = c.getText();
      const match = ANNOTATION_RE.exec(text);
      if (match) {
        annotation = match[1];
      }
    }

    const name = prop.getName();
    const optional = prop.hasQuestionToken();
    const type = prop.getType();
    const tsType = prop.getTypeNode()?.getText() ?? type.getText();

    const field = classifyField(
      name,
      optional,
      type,
      tsType,
      knownInterfaces,
      annotation,
      currentSection
    );
    fields.push(field);
  }

  return { name: decl.getName(), fields, sections };
}

function classifyField(
  name: string,
  optional: boolean,
  type: import('ts-morph').Type,
  tsType: string,
  knownInterfaces: Set<string>,
  annotation: string | undefined,
  section: string
): FieldInfo {
  const base: Pick<FieldInfo, 'name' | 'optional' | 'tsType' | 'annotation' | 'section'> = {
    name,
    optional,
    tsType,
    annotation,
    section,
  };

  // Boolean (TS represents `boolean` as `true | false` union internally)
  if (type.isBoolean() || type.isBooleanLiteral()) {
    return { ...base, kind: 'primitive', primitiveType: 'boolean' };
  }

  // Union — check if all non-undefined members are string literals
  if (type.isUnion()) {
    const members = type.getUnionTypes().filter(t => !t.isUndefined());

    // boolean union (true | false)
    if (members.length === 2 && members.every(t => t.isBooleanLiteral())) {
      return { ...base, kind: 'primitive', primitiveType: 'boolean' };
    }

    if (members.length > 0 && members.every(t => t.isStringLiteral())) {
      const values = members.map(t => t.getLiteralValue() as string);
      return { ...base, kind: 'union-literal', unionValues: values };
    }
  }

  // Array — check element type
  if (type.isArray()) {
    const elementType = type.getArrayElementTypeOrThrow();
    const elementName = elementType.getSymbol()?.getName();
    if (elementName && knownInterfaces.has(elementName)) {
      return { ...base, kind: 'ref-array', refTarget: elementName };
    }
    // Array of union literals (e.g. PropulsionTypeEnumeration[])
    const litValues = extractUnionLiteralValues(elementType);
    if (litValues) {
      return { ...base, kind: 'union-literal-array', unionValues: litValues };
    }
  }

  // Also handle Type[] written as non-union but optional (T[] | undefined manifests as union)
  if (type.isUnion()) {
    const members = type.getUnionTypes().filter(t => !t.isUndefined());
    if (members.length === 1 && members[0].isArray()) {
      const elementType = members[0].getArrayElementTypeOrThrow();
      const elementName = elementType.getSymbol()?.getName();
      if (elementName && knownInterfaces.has(elementName)) {
        return { ...base, kind: 'ref-array', refTarget: elementName };
      }
      // Array of union literals (e.g. PropulsionTypeEnumeration[] | undefined)
      const litValues = extractUnionLiteralValues(elementType);
      if (litValues) {
        return { ...base, kind: 'union-literal-array', unionValues: litValues };
      }
    }
  }

  // Object reference to a known interface
  const typeName = type.getSymbol()?.getName() ?? type.getAliasSymbol()?.getName();
  if (typeName && knownInterfaces.has(typeName)) {
    return { ...base, kind: 'ref', refTarget: typeName };
  }

  // Primitives
  if (type.isString()) {
    return { ...base, kind: 'primitive', primitiveType: 'string' };
  }
  if (type.isNumber()) {
    return { ...base, kind: 'primitive', primitiveType: 'number' };
  }

  // Check union with undefined for optional primitives/refs (T | undefined)
  if (type.isUnion()) {
    const members = type.getUnionTypes().filter(t => !t.isUndefined());
    if (members.length === 1) {
      const inner = members[0];
      if (inner.isString()) return { ...base, kind: 'primitive', primitiveType: 'string' };
      if (inner.isNumber()) return { ...base, kind: 'primitive', primitiveType: 'number' };
      if (inner.isBoolean()) return { ...base, kind: 'primitive', primitiveType: 'boolean' };
      // Singular ref (e.g. PrivateCodeStructure | undefined)
      const innerName = inner.getSymbol()?.getName() ?? inner.getAliasSymbol()?.getName();
      if (innerName && knownInterfaces.has(innerName)) {
        return { ...base, kind: 'ref', refTarget: innerName };
      }
    }
  }

  // Fallback: treat as string
  return { ...base, kind: 'primitive', primitiveType: 'string' };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract deduplicated string-literal values from a union type, or null. */
function extractUnionLiteralValues(type: import('ts-morph').Type): string[] | null {
  if (type.isStringLiteral()) {
    return [type.getLiteralValue() as string];
  }
  if (type.isUnion()) {
    const members = type.getUnionTypes().filter(t => !t.isUndefined());
    if (members.length > 0 && members.every(t => t.isStringLiteral())) {
      return [...new Set(members.map(t => t.getLiteralValue() as string))];
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function parse(filePath: string, mainName?: string): ParseResult {
  const project = new Project({ compilerOptions: { strict: true } });
  const sourceFile = project.addSourceFileAtPath(filePath);

  const interfaces = sourceFile.getInterfaces();
  if (interfaces.length === 0) {
    throw new Error(`No interfaces found in ${filePath}`);
  }

  // Collect all interface names for ref detection
  const knownInterfaces = new Set(interfaces.map(i => i.getName()));

  // Determine main interface
  const mainDecl = mainName ? interfaces.find(i => i.getName() === mainName) : interfaces[0];

  if (!mainDecl) {
    throw new Error(
      `Interface "${mainName}" not found. Available: ${interfaces.map(i => i.getName()).join(', ')}`
    );
  }

  const main = parseInterface(mainDecl, knownInterfaces);
  const helpers = new Map<string, InterfaceInfo>();

  for (const decl of interfaces) {
    if (decl.getName() !== main.name) {
      helpers.set(decl.getName(), parseInterface(decl, knownInterfaces));
    }
  }

  // Collect type aliases (type SimpleRef = string, type Enum = 'a' | 'b', etc.)
  const typeAliases: TypeAliasInfo[] = [];
  for (const alias of sourceFile.getTypeAliases()) {
    typeAliases.push({ name: alias.getName(), text: alias.getText() });
  }

  return { main, helpers, typeAliases };
}
