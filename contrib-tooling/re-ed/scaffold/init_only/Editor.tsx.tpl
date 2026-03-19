import type React from 'react';
import type { {{TITLE}}{{EDITOR_TYPE_IMPORTS}} } from './generated/types.js';
import './Editor.css';

export interface EditorProps {
  value: Partial<{{TITLE}}>;
  onChange: (next: Partial<{{TITLE}}>) => void;
}

{{REF_ROW_COMPONENTS}}

export function Editor({ value, onChange }: EditorProps): React.JSX.Element {
  return (
    <div className="vte-editor">
{{SECTIONS}}
    </div>
  );
}
