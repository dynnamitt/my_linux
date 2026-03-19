import { describe, it, expect } from 'vitest';
import { normalize } from '../src/normalize.js';

describe('normalize', () => {
{{PASCAL_TESTS}}

{{CAMEL_TESTS}}

{{BOOLEAN_TESTS}}

{{UNION_TESTS}}

{{REF_ARRAY_TESTS}}

  it('returns empty object for empty input', () => {
    const result = normalize({});
    expect(result).toEqual({});
  });
});
