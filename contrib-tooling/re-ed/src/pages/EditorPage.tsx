import { Component, useState } from 'react';
import type { ReactNode } from 'react';
import { useParams, Link } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import type { EditorEntry } from '../App';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

class EditorErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <Alert severity="error" sx={{ mt: 2 }}>
          <Typography variant="subtitle2">Editor failed to load</Typography>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>{this.state.error.message}</pre>
        </Alert>
      );
    }
    return this.props.children;
  }
}

export default function EditorPage({ editors }: { editors: EditorEntry[] }) {
  const { slug } = useParams<{ slug: string }>();
  const entry = editors.find((e) => e.slug === slug);
  const [value, setValue] = useState<Record<string, unknown>>({});

  if (!entry) {
    return (
      <>
        <Alert severity="warning" sx={{ mt: 2 }}>
          No editor found for <strong>{slug}</strong>
        </Alert>
        <Button component={Link} to="/" sx={{ mt: 1 }}>
          Back to list
        </Button>
      </>
    );
  }

  const EditorComponent = entry.Component;

  return (
    <>
      <Typography variant="h5" sx={{ mb: 2 }}>
        {entry.slug}
      </Typography>
      <EditorErrorBoundary>
        <EditorComponent value={value} onChange={setValue as (v: unknown) => void} />
      </EditorErrorBoundary>
      <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
        Debug state
      </Typography>
      <pre
        style={{
          background: '#f5f5f5',
          padding: '12px',
          borderRadius: '4px',
          fontSize: '0.8rem',
          overflow: 'auto',
          maxHeight: '300px',
        }}
      >
        {JSON.stringify(value, null, 2)}
      </pre>
    </>
  );
}
