.vte-editor {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 16px;
  padding: 16px;
}

.vte-section {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 12px 16px;
  margin: 0;
}

.vte-section legend {
  grid-column: 1 / -1;
  font-size: 0.8rem;
  font-weight: 600;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0 6px;
}

.vte-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.vte-field--checkbox {
  flex-direction: row;
  align-items: center;
}

.vte-field--checkbox .vte-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

/* Wide fields span both columns */
.vte-field--wide {
  grid-column: 1 / -1;
}

.vte-label {
  font-size: 0.875rem;
  font-weight: 500;
}

.vte-input,
.vte-select {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.875rem;
  background: white;
  width: 100%;
  box-sizing: border-box;
}

.vte-input:focus,
.vte-select:focus {
  outline: none;
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
}

.vte-checkbox {
  width: 16px;
  height: 16px;
}

.vte-sub-table {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  background: #fafafa;
  border: 1px solid #eee;
  border-radius: 4px;
}

.vte-sub-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.vte-sub-index {
  font-size: 0.75rem;
  color: #999;
  min-width: 20px;
  text-align: center;
}

.vte-sub-fields {
  display: flex;
  gap: 4px;
  flex: 1;
  flex-wrap: wrap;
}

.vte-input--sub,
.vte-select--sub {
  flex: 1 1 120px;
  padding: 4px 6px;
  font-size: 0.8rem;
}

.vte-btn-add,
.vte-btn-remove {
  padding: 4px 10px;
  font-size: 0.8rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}

.vte-btn-add:hover {
  background: #f0f0f0;
}

.vte-btn-remove {
  color: #d32f2f;
  border-color: #d32f2f;
}

.vte-btn-remove:hover {
  background: #fce4ec;
}

.vte-btn-noop {
  padding: 8px 12px;
  font-size: 0.8rem;
  border: 1px dashed #bbb;
  border-radius: 4px;
  background: #f5f5f5;
  color: #888;
  cursor: default;
  width: 100%;
  text-align: left;
  box-sizing: border-box;
}
