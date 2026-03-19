import { XMLBuilder } from 'fast-xml-parser';
import type { {{TITLE}}{{HELPER_TYPE_IMPORTS}} } from './generated/types.js';

const builder = new XMLBuilder({
  format: true,
  indentBy: '  ',
});

{{HELPER_SERIALIZE_FNS}}

/**
 * Serialize a {{TITLE}} object to an XML string.
 */
export function serialize(obj: Partial<{{TITLE}}>): string {
  const xmlObj: Record<string, unknown> = {};
{{MAPPINGS}}
  return builder.build({ {{TITLE}}: xmlObj }) as string;
}
