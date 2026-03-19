// Auto-generated from entity file — do not edit manually
import type { {{TITLE}} } from './types.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validate(obj: Partial<{{TITLE}}>): ValidationResult {
  const errors: string[] = [];
{{CHECKS}}
  return { valid: errors.length === 0, errors };
}
