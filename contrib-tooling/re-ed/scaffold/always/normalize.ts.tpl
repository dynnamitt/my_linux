import type { {{TITLE}}{{HELPER_TYPE_IMPORTS}} } from './generated/types.js';

{{HELPER_NORMALIZE_FNS}}

/**
 * Normalize parsed XML (PascalCase keys, possible {value} wrappers)
 * or a plain object into a clean {{TITLE}}.
 */
export function normalize(src: Record<string, unknown>): Partial<{{TITLE}}> {
{{FIELD_ASSIGNMENTS}}

  return {
{{RESULT_FIELDS}}
  };
}
