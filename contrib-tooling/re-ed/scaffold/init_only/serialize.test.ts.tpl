import { describe, it, expect } from 'vitest';
import { serialize } from '../src/serialize.js';
import { normalize } from '../src/normalize.js';
import { XMLParser } from 'fast-xml-parser';

describe('serialize', () => {
{{FIELD_TESTS}}

{{BOOLEAN_TESTS}}

{{REF_ARRAY_TESTS}}

  it('wraps output in <{{TITLE}}>', () => {
    const xml = serialize({ id: 'test' });
    expect(xml).toContain('<{{TITLE}}>');
    expect(xml).toContain('</{{TITLE}}>');
  });

  it('roundtrips primitives through normalize', () => {
    const original = { {{ALL_VALS}} };
    const xml = serialize(original);
    const parser = new XMLParser();
    const parsed = parser.parse(xml);
    const restored = normalize(parsed.{{TITLE}});
    expect(restored).toMatchObject(original);
  });
});
