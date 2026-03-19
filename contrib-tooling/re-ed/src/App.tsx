import { lazy, Suspense } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import CircularProgress from '@mui/material/CircularProgress';
import Home from './pages/Home';
import EditorPage from './pages/EditorPage';

const editorModules = import.meta.glob([
  '../packages/*/src/index.ts',
  '!../packages/*@*/src/index.ts',
]);

export interface EditorEntry {
  slug: string;
  path: string;
  Component: React.LazyExoticComponent<React.ComponentType<{ value: unknown; onChange: (v: unknown) => void }>>;
}

const editors: EditorEntry[] = Object.entries(editorModules).map(([path, loader]) => {
  const slug = path.match(/\.\.\/packages\/(.+?)\/src\/index\.ts/)![1];
  const Component = lazy(() =>
    loader().then((m) => ({ default: (m as Record<string, never>).Editor })),
  );
  return { slug, path: `packages/${slug}/`, Component };
});

export default function App() {
  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component={Link} to="/" sx={{ color: 'inherit', textDecoration: 'none' }}>
            re-ed
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ mt: 3 }}>
        <Suspense fallback={<CircularProgress sx={{ display: 'block', mx: 'auto', mt: 4 }} />}>
          <Routes>
            <Route path="/" element={<Home editors={editors} />} />
            <Route path="/:slug" element={<EditorPage editors={editors} />} />
          </Routes>
        </Suspense>
      </Container>
    </>
  );
}
