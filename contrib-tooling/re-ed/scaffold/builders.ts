/**
 * builders.ts — code generation functions for v2 scaffolder
 *
 * Each builder takes a ParseResult and returns a string of generated code
 * to be injected into templates via placeholder substitution.
 */

import type { ParseResult, InterfaceInfo, FieldInfo } from './parse.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toPascalCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// types.ts builder
// ---------------------------------------------------------------------------

function buildInterfaceDecl(info: InterfaceInfo): string {
  const lines: string[] = [];
  lines.push(`export interface ${info.name} {`);

  let lastSection = '';
  for (const f of info.fields) {
    if (f.section && f.section !== lastSection) {
      if (lastSection) lines.push('');
      lines.push(`  // ── ${f.section} ──`);
      lastSection = f.section;
    }
    const opt = f.optional ? '?' : '';
    lines.push(`  ${f.name}${opt}: ${f.tsType};`);
  }

  lines.push('}');
  return lines.join('\n');
}

export function buildTypeDeclarations(result: ParseResult): string {
  const parts: string[] = [];
  // Emit type aliases first (SimpleRef, enumerations, etc.)
  for (const alias of result.typeAliases) {
    parts.push(`export ${alias.text}`);
  }
  if (result.typeAliases.length > 0) parts.push('');
  parts.push(buildInterfaceDecl(result.main));
  for (const [, helper] of result.helpers) {
    parts.push('');
    parts.push(buildInterfaceDecl(helper));
  }
  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// validate.ts builder
// ---------------------------------------------------------------------------

export function buildValidateChecks(result: ParseResult): string {
  const lines: string[] = [];
  for (const f of result.main.fields) {
    switch (f.kind) {
      case 'primitive':
        if (f.primitiveType === 'boolean') {
          lines.push(
            `  if (obj.${f.name} != null && typeof obj.${f.name} !== 'boolean') errors.push('${f.name} must be a boolean');`
          );
        } else if (f.primitiveType === 'number') {
          lines.push(
            `  if (obj.${f.name} != null && typeof obj.${f.name} !== 'number') errors.push('${f.name} must be a number');`
          );
        } else {
          lines.push(
            `  if (obj.${f.name} != null && typeof obj.${f.name} !== 'string') errors.push('${f.name} must be a string');`
          );
        }
        break;
      case 'union-literal':
        lines.push(
          `  if (obj.${f.name} != null && ![${f.unionValues!.map(v => `'${v}'`).join(', ')}].includes(obj.${f.name})) errors.push('${f.name} must be one of: ${f.unionValues!.join(', ')}');`
        );
        break;
      case 'ref-array':
        lines.push(
          `  if (obj.${f.name} != null && !Array.isArray(obj.${f.name})) errors.push('${f.name} must be an array');`
        );
        break;
      case 'union-literal-array':
        lines.push(
          `  if (obj.${f.name} != null && !Array.isArray(obj.${f.name})) errors.push('${f.name} must be an array');`
        );
        break;
      case 'ref':
        lines.push(
          `  if (obj.${f.name} != null && typeof obj.${f.name} !== 'object') errors.push('${f.name} must be an object');`
        );
        break;
      case 'foreign-ref':
        lines.push(
          `  if (obj.${f.name} != null && typeof obj.${f.name} !== 'string') errors.push('${f.name} must be a string');`
        );
        break;
    }
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// normalize.ts builder
// ---------------------------------------------------------------------------

function buildHelperNormalizeFn(info: InterfaceInfo): string {
  const lines: string[] = [];
  lines.push(
    `function normalize${info.name}(src: Record<string, unknown>): Partial<${info.name}> {`
  );
  for (const f of info.fields) {
    const pascal = toPascalCase(f.name);
    lines.push(`  const ${f.name} = (() => {`);
    lines.push(`    const rawVal = src['${pascal}'] ?? src['${f.name}'];`);
    lines.push(`    if (rawVal == null) return undefined;`);

    if (f.kind === 'primitive' && f.primitiveType === 'boolean') {
      lines.push(`    if (typeof rawVal === 'boolean') return rawVal;`);
      lines.push(`    if (rawVal === 'true' || rawVal === '1') return true;`);
      lines.push(`    if (rawVal === 'false' || rawVal === '0') return false;`);
      lines.push(`    return Boolean(rawVal);`);
    } else if (f.kind === 'primitive' && f.primitiveType === 'number') {
      lines.push(
        `    const raw = typeof rawVal === 'object' && rawVal !== null && 'value' in (rawVal as Record<string, unknown>)`
      );
      lines.push(`      ? (rawVal as Record<string, unknown>).value`);
      lines.push(`      : rawVal;`);
      lines.push(`    if (typeof raw === 'number') return raw;`);
      lines.push(`    const n = Number(raw);`);
      lines.push(`    return Number.isNaN(n) ? undefined : n;`);
    } else if (f.kind === 'union-literal') {
      lines.push(`    const s = String(rawVal);`);
      lines.push(`    const allowed = [${f.unionValues!.map(v => `'${v}'`).join(', ')}] as const;`);
      lines.push(
        `    return (allowed as readonly string[]).includes(s) ? s as typeof allowed[number] : undefined;`
      );
    } else {
      lines.push(
        `    const raw = typeof rawVal === 'object' && rawVal !== null && 'value' in (rawVal as Record<string, unknown>)`
      );
      lines.push(`      ? (rawVal as Record<string, unknown>).value`);
      lines.push(`      : rawVal;`);
      lines.push(`    return String(raw);`);
    }
    lines.push(`  })();`);
  }
  lines.push('');
  lines.push('  return {');
  for (const f of info.fields) {
    lines.push(`    ...(${f.name} !== undefined ? { ${f.name} } : {}),`);
  }
  lines.push('  };');
  lines.push('}');
  return lines.join('\n');
}

export function buildHelperNormalizeFns(result: ParseResult): string {
  const parts: string[] = [];
  const used = new Set(usedHelperNames(result));
  for (const [name, helper] of result.helpers) {
    if (used.has(name)) {
      parts.push(buildHelperNormalizeFn(helper));
    }
  }
  return parts.join('\n\n');
}

export function buildNormalizeFieldAssignments(result: ParseResult): string {
  const lines: string[] = [];
  for (const f of result.main.fields) {
    const pascal = toPascalCase(f.name);
    switch (f.kind) {
      case 'primitive':
        if (f.primitiveType === 'boolean') {
          lines.push(`  const ${f.name} = (() => {`);
          lines.push(`    const rawVal = src['${pascal}'] ?? src['${f.name}'];`);
          lines.push(`    if (rawVal == null) return undefined;`);
          lines.push(`    if (typeof rawVal === 'boolean') return rawVal;`);
          lines.push(`    if (rawVal === 'true' || rawVal === '1') return true;`);
          lines.push(`    if (rawVal === 'false' || rawVal === '0') return false;`);
          lines.push(`    return Boolean(rawVal);`);
          lines.push(`  })();`);
        } else if (f.primitiveType === 'number') {
          lines.push(`  const ${f.name} = (() => {`);
          lines.push(`    const rawVal = src['${pascal}'] ?? src['${f.name}'];`);
          lines.push(`    if (rawVal == null) return undefined;`);
          lines.push(
            `    const raw = typeof rawVal === 'object' && rawVal !== null && 'value' in (rawVal as Record<string, unknown>)`
          );
          lines.push(`      ? (rawVal as Record<string, unknown>).value`);
          lines.push(`      : rawVal;`);
          lines.push(`    if (typeof raw !== 'number') {`);
          lines.push(`      const n = Number(raw);`);
          lines.push(`      if (!Number.isNaN(n)) return n;`);
          lines.push(`    }`);
          lines.push(`    return raw as number;`);
          lines.push(`  })();`);
        } else {
          // string
          lines.push(`  const ${f.name} = (() => {`);
          lines.push(`    const rawVal = src['${pascal}'] ?? src['${f.name}'];`);
          lines.push(`    if (rawVal == null) return undefined;`);
          lines.push(
            `    const raw = typeof rawVal === 'object' && rawVal !== null && 'value' in (rawVal as Record<string, unknown>)`
          );
          lines.push(`      ? (rawVal as Record<string, unknown>).value`);
          lines.push(`      : rawVal;`);
          lines.push(`    return String(raw);`);
          lines.push(`  })();`);
        }
        break;

      case 'union-literal':
        lines.push(`  const ${f.name} = (() => {`);
        lines.push(`    const rawVal = src['${pascal}'] ?? src['${f.name}'];`);
        lines.push(`    if (rawVal == null) return undefined;`);
        lines.push(`    const s = String(rawVal);`);
        lines.push(
          `    const allowed = [${f.unionValues!.map(v => `'${v}'`).join(', ')}] as const;`
        );
        lines.push(
          `    return (allowed as readonly string[]).includes(s) ? s as typeof allowed[number] : undefined;`
        );
        lines.push(`  })();`);
        break;

      case 'ref-array':
        lines.push(`  const ${f.name} = (() => {`);
        lines.push(`    const rawVal = src['${pascal}'] ?? src['${f.name}'];`);
        lines.push(`    if (rawVal == null) return undefined;`);
        lines.push(`    const arr = Array.isArray(rawVal) ? rawVal : [rawVal];`);
        lines.push(
          `    return arr.map(item => normalize${f.refTarget!}(typeof item === 'object' && item !== null ? item as Record<string, unknown> : {}));`
        );
        lines.push(`  })();`);
        break;

      case 'union-literal-array':
        lines.push(`  const ${f.name} = (() => {`);
        lines.push(`    const rawVal = src['${pascal}'] ?? src['${f.name}'];`);
        lines.push(`    if (rawVal == null) return undefined;`);
        lines.push(`    const arr = Array.isArray(rawVal) ? rawVal : [rawVal];`);
        lines.push(
          `    const allowed = [${f.unionValues!.map(v => `'${v}'`).join(', ')}] as const;`
        );
        lines.push(
          `    return arr.map(v => String(v)).filter(s => (allowed as readonly string[]).includes(s)) as typeof allowed[number][];`
        );
        lines.push(`  })();`);
        break;

      case 'ref':
        lines.push(`  const ${f.name} = (() => {`);
        lines.push(`    const rawVal = src['${pascal}'] ?? src['${f.name}'];`);
        lines.push(`    if (rawVal == null) return undefined;`);
        lines.push(
          `    return typeof rawVal === 'object' && rawVal !== null ? normalize${f.refTarget!}(rawVal as Record<string, unknown>) : undefined;`
        );
        lines.push(`  })();`);
        break;

      case 'foreign-ref':
        lines.push(`  const ${f.name} = (() => {`);
        lines.push(`    const rawVal = src['${pascal}'] ?? src['${f.name}'];`);
        lines.push(`    if (rawVal == null) return undefined;`);
        lines.push(
          `    const raw = typeof rawVal === 'object' && rawVal !== null && 'value' in (rawVal as Record<string, unknown>)`
        );
        lines.push(`      ? (rawVal as Record<string, unknown>).value`);
        lines.push(`      : rawVal;`);
        lines.push(`    return String(raw);`);
        lines.push(`  })();`);
        break;
    }
  }
  return lines.join('\n');
}

export function buildNormalizeResultFields(result: ParseResult): string {
  return result.main.fields
    .map(f => `    ...(${f.name} !== undefined ? { ${f.name} } : {}),`)
    .join('\n');
}

// ---------------------------------------------------------------------------
// serialize.ts builder
// ---------------------------------------------------------------------------

export function buildHelperSerializeFns(result: ParseResult): string {
  const parts: string[] = [];
  const used = new Set(usedHelperNames(result));
  for (const [name, helper] of result.helpers) {
    if (!used.has(name)) continue;
    const lines: string[] = [];
    lines.push(
      `function serialize${helper.name}(obj: Partial<${helper.name}>): Record<string, unknown> {`
    );
    lines.push(`  const out: Record<string, unknown> = {};`);
    for (const f of helper.fields) {
      const pascal = toPascalCase(f.name);
      lines.push(`  if (obj.${f.name} !== undefined) out['${pascal}'] = obj.${f.name};`);
    }
    lines.push(`  return out;`);
    lines.push(`}`);
    parts.push(lines.join('\n'));
  }
  return parts.join('\n\n');
}

export function buildSerializeMappings(result: ParseResult): string {
  const lines: string[] = [];
  for (const f of result.main.fields) {
    const pascal = toPascalCase(f.name);
    switch (f.kind) {
      case 'primitive':
        if (f.primitiveType === 'boolean') {
          lines.push(
            `    if (obj.${f.name} !== undefined) xmlObj['${pascal}'] = String(obj.${f.name});`
          );
        } else {
          lines.push(`    if (obj.${f.name} !== undefined) xmlObj['${pascal}'] = obj.${f.name};`);
        }
        break;
      case 'union-literal':
        lines.push(`    if (obj.${f.name} !== undefined) xmlObj['${pascal}'] = obj.${f.name};`);
        break;
      case 'ref-array':
        lines.push(
          `    if (obj.${f.name} !== undefined) xmlObj['${pascal}'] = obj.${f.name}.map(item => serialize${f.refTarget!}(item));`
        );
        break;
      case 'union-literal-array':
        lines.push(`    if (obj.${f.name} !== undefined) xmlObj['${pascal}'] = obj.${f.name};`);
        break;
      case 'ref':
        lines.push(
          `    if (obj.${f.name} !== undefined) xmlObj['${pascal}'] = serialize${f.refTarget!}(obj.${f.name});`
        );
        break;
      case 'foreign-ref':
        lines.push(`    if (obj.${f.name} !== undefined) xmlObj['${pascal}'] = obj.${f.name};`);
        break;
    }
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Editor.tsx builder — sections with fieldsets
// ---------------------------------------------------------------------------

function buildFieldJsx(f: FieldInfo): string {
  const label = toPascalCase(f.name);

  switch (f.kind) {
    case 'primitive':
      if (f.primitiveType === 'boolean') {
        return `        <div className="vte-field vte-field--checkbox">
          <label className="vte-label">
            <input
              className="vte-checkbox"
              type="checkbox"
              checked={!!value.${f.name}}
              onChange={(e) => onChange({ ...value, ${f.name}: e.target.checked })}
            />
            ${label}
          </label>
        </div>`;
      }
      if (f.primitiveType === 'number') {
        return `        <div className="vte-field">
          <label className="vte-label" htmlFor="vte-${f.name}">${label}</label>
          <input
            className="vte-input"
            id="vte-${f.name}"
            type="number"
            value={value.${f.name} != null ? String(value.${f.name}) : ''}
            onChange={(e) => {
              const n = e.target.value === '' ? undefined : Number(e.target.value);
              onChange({ ...value, ${f.name}: n });
            }}
          />
        </div>`;
      }
      // string
      return `        <div className="vte-field">
          <label className="vte-label" htmlFor="vte-${f.name}">${label}${f.annotation ? ` (${f.annotation})` : ''}</label>
          <input
            className="vte-input"
            id="vte-${f.name}"
            type="text"
            value={value.${f.name} ?? ''}
            onChange={(e) => onChange({ ...value, ${f.name}: e.target.value })}
          />
        </div>`;

    case 'union-literal':
      return `        <div className="vte-field">
          <label className="vte-label" htmlFor="vte-${f.name}">${label}</label>
          <select
            className="vte-select"
            id="vte-${f.name}"
            value={value.${f.name} ?? ''}
            onChange={(e) => onChange({ ...value, ${f.name}: (e.target.value || undefined) as ${f.tsType} })}
          >
            <option value="">—</option>
${f.unionValues!.map(v => `            <option value="${v}">${v}</option>`).join('\n')}
          </select>
        </div>`;

    case 'union-literal-array':
      return `        <div className="vte-field vte-field--wide">
          <label className="vte-label">${label}</label>
          <select
            className="vte-select"
            multiple
            value={value.${f.name} ?? []}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, o => o.value) as ${f.tsType};
              onChange({ ...value, ${f.name}: selected.length ? selected : undefined });
            }}
          >
${f.unionValues!.map(v => `            <option value="${v}">${v}</option>`).join('\n')}
          </select>
        </div>`;

    case 'ref-array':
      return buildRefArrayJsx(f);

    case 'ref':
      return buildRefJsx(f);

    case 'foreign-ref':
      return `        <div className="vte-field">
          <label className="vte-label">${label}</label>
          <button
            type="button"
            className="vte-btn-noop"
            disabled
            title="${f.refTarget ?? f.name}"
          >
            ${f.refTarget ?? label}
          </button>
        </div>`;
  }
}

function buildRefJsx(f: FieldInfo): string {
  const label = toPascalCase(f.name);
  const target = f.refTarget!;
  return `        <div className="vte-field vte-field--wide">
          <label className="vte-label">${label}</label>
          <div className="vte-sub-table">
            <${target}Row
              item={value.${f.name} ?? {}}
              onChange={(next) => onChange({ ...value, ${f.name}: next })}
            />
          </div>
        </div>`;
}

function buildRefArrayJsx(f: FieldInfo): string {
  const label = toPascalCase(f.name);
  const target = f.refTarget!;
  // We'll just use inline key/value fields based on what we know about the helper
  return `        <div className="vte-field vte-field--wide">
          <label className="vte-label">${label}</label>
          <div className="vte-sub-table">
            {(value.${f.name} ?? []).map((item, idx) => (
              <div key={idx} className="vte-sub-row">
                <span className="vte-sub-index">{idx + 1}</span>
                <${target}Row
                  item={item}
                  onChange={(next) => {
                    const arr = [...(value.${f.name} ?? [])];
                    arr[idx] = next;
                    onChange({ ...value, ${f.name}: arr });
                  }}
                />
                <button
                  type="button"
                  className="vte-btn-remove"
                  onClick={() => {
                    const arr = (value.${f.name} ?? []).filter((_, i) => i !== idx);
                    onChange({ ...value, ${f.name}: arr });
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className="vte-btn-add"
              onClick={() => onChange({ ...value, ${f.name}: [...(value.${f.name} ?? []), {}] })}
            >
              + Add ${target}
            </button>
          </div>
        </div>`;
}

export function buildRefRowComponents(result: ParseResult): string {
  const parts: string[] = [];
  // Find which helpers are used as ref or ref-array
  const usedHelpers = new Set<string>();
  for (const f of result.main.fields) {
    if ((f.kind === 'ref-array' || f.kind === 'ref') && f.refTarget) {
      usedHelpers.add(f.refTarget);
    }
  }

  for (const helperName of usedHelpers) {
    const helper = result.helpers.get(helperName);
    if (!helper) continue;

    const lines: string[] = [];
    lines.push(
      `function ${helperName}Row({ item, onChange }: { item: Partial<${helperName}>; onChange: (next: Partial<${helperName}>) => void }): React.JSX.Element {`
    );
    lines.push(`  return (`);
    lines.push(`    <div className="vte-sub-fields">`);
    for (const f of helper.fields) {
      if (f.kind === 'primitive' && f.primitiveType === 'boolean') {
        lines.push(`      <label className="vte-label">`);
        lines.push(`        <input`);
        lines.push(`          className="vte-checkbox"`);
        lines.push(`          type="checkbox"`);
        lines.push(`          checked={!!item.${f.name}}`);
        lines.push(
          `          onChange={(e) => onChange({ ...item, ${f.name}: e.target.checked })}`
        );
        lines.push(`        />`);
        lines.push(`        ${f.name}`);
        lines.push(`      </label>`);
      } else if (f.kind === 'primitive' && f.primitiveType === 'number') {
        lines.push(`      <input`);
        lines.push(`        className="vte-input vte-input--sub"`);
        lines.push(`        type="number"`);
        lines.push(`        placeholder="${f.name}"`);
        lines.push(`        value={item.${f.name} != null ? String(item.${f.name}) : ''}`);
        lines.push(
          `        onChange={(e) => onChange({ ...item, ${f.name}: e.target.value === '' ? undefined : Number(e.target.value) })}`
        );
        lines.push(`      />`);
      } else if (f.kind === 'union-literal') {
        lines.push(`      <select`);
        lines.push(`        className="vte-select vte-select--sub"`);
        lines.push(`        value={item.${f.name} ?? ''}`);
        lines.push(
          `        onChange={(e) => onChange({ ...item, ${f.name}: (e.target.value || undefined) as ${f.tsType} })}`
        );
        lines.push(`      >`);
        lines.push(`        <option value="">—</option>`);
        for (const v of f.unionValues!) {
          lines.push(`        <option value="${v}">${v}</option>`);
        }
        lines.push(`      </select>`);
      } else {
        lines.push(`      <input`);
        lines.push(`        className="vte-input vte-input--sub"`);
        lines.push(`        type="text"`);
        lines.push(`        placeholder="${f.name}"`);
        lines.push(`        value={item.${f.name} ?? ''}`);
        lines.push(`        onChange={(e) => onChange({ ...item, ${f.name}: e.target.value })}`);
        lines.push(`      />`);
      }
    }
    lines.push(`    </div>`);
    lines.push(`  );`);
    lines.push(`}`);
    parts.push(lines.join('\n'));
  }
  return parts.join('\n\n');
}

export function buildEditorSections(result: ParseResult): string {
  const { main } = result;

  if (main.sections.length === 0) {
    // No sections — flat list
    return main.fields.map(f => buildFieldJsx(f)).join('\n');
  }

  const parts: string[] = [];

  // Group fields by section
  const fieldsBySection = new Map<string, FieldInfo[]>();
  for (const f of main.fields) {
    const sec = f.section || '_unsectioned';
    if (!fieldsBySection.has(sec)) fieldsBySection.set(sec, []);
    fieldsBySection.get(sec)!.push(f);
  }

  for (const [section, fields] of fieldsBySection) {
    if (section === '_unsectioned') {
      for (const f of fields) {
        parts.push(buildFieldJsx(f));
      }
    } else {
      const inner = fields.map(f => buildFieldJsx(f)).join('\n');
      parts.push(`      <fieldset className="vte-section">
        <legend>${section}</legend>
${inner}
      </fieldset>`);
    }
  }

  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// Test builders
// ---------------------------------------------------------------------------

export function buildNormalizePascalTests(result: ParseResult): string {
  return result.main.fields
    .filter(f => (f.kind === 'primitive' && f.primitiveType === 'string') || f.kind === 'foreign-ref')
    .map(f => {
      const pascal = toPascalCase(f.name);
      return `  it('maps PascalCase ${pascal} → ${f.name}', () => {
    const result = normalize({ ${pascal}: 'hello' });
    expect(result.${f.name}).toBe('hello');
  });`;
    })
    .join('\n\n');
}

export function buildNormalizeCamelTests(result: ParseResult): string {
  return result.main.fields
    .filter(f => (f.kind === 'primitive' && f.primitiveType === 'string') || f.kind === 'foreign-ref')
    .map(f => {
      return `  it('passes through camelCase ${f.name}', () => {
    const result = normalize({ ${f.name}: 'world' });
    expect(result.${f.name}).toBe('world');
  });`;
    })
    .join('\n\n');
}

export function buildNormalizeBooleanTests(result: ParseResult): string {
  return result.main.fields
    .filter(f => f.kind === 'primitive' && f.primitiveType === 'boolean')
    .map(f => {
      const pascal = toPascalCase(f.name);
      return `  it('coerces string "true" to boolean for ${f.name}', () => {
    const result = normalize({ ${pascal}: 'true' });
    expect(result.${f.name}).toBe(true);
  });

  it('coerces string "false" to boolean for ${f.name}', () => {
    const result = normalize({ ${pascal}: 'false' });
    expect(result.${f.name}).toBe(false);
  });

  it('passes through boolean ${f.name}', () => {
    const result = normalize({ ${f.name}: true });
    expect(result.${f.name}).toBe(true);
  });`;
    })
    .join('\n\n');
}

export function buildNormalizeUnionTests(result: ParseResult): string {
  return result.main.fields
    .filter(f => f.kind === 'union-literal')
    .map(f => {
      const pascal = toPascalCase(f.name);
      const first = f.unionValues![0];
      return `  it('normalizes valid union value for ${f.name}', () => {
    const result = normalize({ ${pascal}: '${first}' });
    expect(result.${f.name}).toBe('${first}');
  });

  it('rejects invalid union value for ${f.name}', () => {
    const result = normalize({ ${pascal}: 'invalid_value_xyz' });
    expect(result.${f.name}).toBeUndefined();
  });`;
    })
    .join('\n\n');
}

export function buildNormalizeRefArrayTests(result: ParseResult): string {
  return result.main.fields
    .filter(f => f.kind === 'ref-array')
    .map(f => {
      const pascal = toPascalCase(f.name);
      const helper = result.helpers.get(f.refTarget!);
      const firstField = helper?.fields[0];
      const firstFieldPascal = firstField ? toPascalCase(firstField.name) : 'Value';
      const firstFieldName = firstField?.name ?? 'value';
      return `  it('normalizes ${f.name} array', () => {
    const result = normalize({ ${pascal}: [{ ${firstFieldPascal}: 'test' }] });
    expect(result.${f.name}).toHaveLength(1);
    expect(result.${f.name}![0].${firstFieldName}).toBe('test');
  });

  it('wraps single ${f.name} object in array', () => {
    const result = normalize({ ${pascal}: { ${firstFieldPascal}: 'solo' } });
    expect(result.${f.name}).toHaveLength(1);
    expect(result.${f.name}![0].${firstFieldName}).toBe('solo');
  });`;
    })
    .join('\n\n');
}

export function buildSerializeFieldTests(result: ParseResult): string {
  return result.main.fields
    .filter(f => (f.kind === 'primitive' && f.primitiveType === 'string') || f.kind === 'foreign-ref')
    .map(f => {
      const pascal = toPascalCase(f.name);
      return `  it('serializes ${f.name} as <${pascal}>', () => {
    const xml = serialize({ ${f.name}: 'test' });
    expect(xml).toContain('<${pascal}>test</${pascal}>');
  });`;
    })
    .join('\n\n');
}

export function buildSerializeBooleanTests(result: ParseResult): string {
  return result.main.fields
    .filter(f => f.kind === 'primitive' && f.primitiveType === 'boolean')
    .map(f => {
      const pascal = toPascalCase(f.name);
      return `  it('serializes boolean ${f.name} as string', () => {
    const xml = serialize({ ${f.name}: true });
    expect(xml).toContain('<${pascal}>true</${pascal}>');
  });`;
    })
    .join('\n\n');
}

export function buildSerializeRefArrayTests(result: ParseResult): string {
  return result.main.fields
    .filter(f => f.kind === 'ref-array')
    .map(f => {
      const pascal = toPascalCase(f.name);
      return `  it('serializes ${f.name} ref-array', () => {
    const xml = serialize({ ${f.name}: [{ value: 'a' }] });
    expect(xml).toContain('<${pascal}>');
  });`;
    })
    .join('\n\n');
}

export function buildSerializeAllVals(result: ParseResult): string {
  return result.main.fields
    .filter(f => f.kind === 'primitive' || f.kind === 'foreign-ref')
    .map(f => {
      if (f.kind === 'foreign-ref') return `${f.name}: 'roundtrip'`;
      switch (f.primitiveType) {
        case 'boolean':
          return `${f.name}: true`;
        case 'number':
          return `${f.name}: 42`;
        default:
          return `${f.name}: 'roundtrip'`;
      }
    })
    .join(', ');
}

export function buildValidateTypeTests(result: ParseResult): string {
  return result.main.fields
    .filter(f => f.kind === 'primitive' || f.kind === 'foreign-ref')
    .map(f => {
      let wrongVal: string;
      let wrongType: string;
      switch (f.primitiveType) {
        case 'boolean':
          wrongVal = `'not-a-bool' as never`;
          wrongType = 'string';
          break;
        case 'number':
          wrongVal = `'not-a-number' as never`;
          wrongType = 'string';
          break;
        default:
          wrongVal = `123 as never`;
          wrongType = 'number';
          break;
      }
      return `  it('fails when ${f.name} has wrong type (${wrongType})', () => {
    const result = validate({ ${f.name}: ${wrongVal} });
    expect(result.errors).toContain('${f.name} must be a ${f.primitiveType}');
  });`;
    })
    .join('\n\n');
}

export function buildValidateUnionTests(result: ParseResult): string {
  return result.main.fields
    .filter(f => f.kind === 'union-literal')
    .map(f => {
      const first = f.unionValues![0];
      return `  it('accepts valid union value for ${f.name}', () => {
    const result = validate({ ${f.name}: '${first}' });
    const ${f.name}Errors = result.errors.filter(e => e.includes('${f.name}'));
    expect(${f.name}Errors).toEqual([]);
  });

  it('rejects invalid union value for ${f.name}', () => {
    const result = validate({ ${f.name}: 'invalid_xyz' as never });
    expect(result.errors).toContain('${f.name} must be one of: ${f.unionValues!.join(', ')}');
  });`;
    })
    .join('\n\n');
}

export function buildValidateValidObj(result: ParseResult): string {
  return result.main.fields
    .filter(f => f.kind === 'primitive' || f.kind === 'foreign-ref')
    .map(f => {
      if (f.kind === 'foreign-ref') return `${f.name}: 'valid'`;
      switch (f.primitiveType) {
        case 'boolean':
          return `${f.name}: true`;
        case 'number':
          return `${f.name}: 42`;
        default:
          return `${f.name}: 'valid'`;
      }
    })
    .join(', ');
}

// ---------------------------------------------------------------------------
// Helper type imports for templates
// ---------------------------------------------------------------------------

/** Collect helper type names actually referenced by main entity fields. */
function usedHelperNames(result: ParseResult): string[] {
  const used = new Set<string>();
  for (const f of result.main.fields) {
    if ((f.kind === 'ref' || f.kind === 'ref-array') && f.refTarget) {
      used.add(f.refTarget);
    }
  }
  return [...used];
}

/** Collect type alias names used in Editor as casts (union-literal, union-literal-array fields). */
function usedTypeAliasNames(result: ParseResult): string[] {
  const aliasNames = new Set(result.typeAliases.map(a => a.name));
  const used = new Set<string>();
  for (const f of result.main.fields) {
    if (f.kind !== 'union-literal' && f.kind !== 'union-literal-array') continue;
    for (const name of aliasNames) {
      if (f.tsType.includes(name)) {
        used.add(name);
      }
    }
  }
  return [...used];
}

export function buildHelperImports(result: ParseResult): string {
  const names = usedHelperNames(result);
  if (names.length === 0) return '';
  return `import type { ${names.join(', ')} } from './types.js';`;
}

/** For normalize.ts / serialize.ts — only helper interfaces. */
export function buildHelperTypeImports(result: ParseResult): string {
  const names = usedHelperNames(result);
  if (names.length === 0) return '';
  return `, ${names.join(', ')}`;
}

/** For Editor.tsx — helper interfaces + type aliases used in tsType casts. */
export function buildEditorTypeImports(result: ParseResult): string {
  const names = [...usedHelperNames(result), ...usedTypeAliasNames(result)];
  if (names.length === 0) return '';
  return `, ${names.join(', ')}`;
}
