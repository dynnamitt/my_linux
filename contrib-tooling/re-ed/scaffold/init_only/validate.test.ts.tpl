import { describe, it, expect } from 'vitest';
import { validate } from '../src/generated/validate.js';

describe('validate', () => {
{{TYPE_TESTS}}

{{UNION_TESTS}}

  it('passes with all valid primitive fields', () => {
    const result = validate({ {{VALID_OBJ}} });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('passes with empty object (all optional)', () => {
    const result = validate({});
    expect(result.valid).toBe(true);
  });
});
