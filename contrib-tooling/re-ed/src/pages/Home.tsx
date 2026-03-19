import { Link } from 'react-router-dom';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import type { EditorEntry } from '../App';

export default function Home({ editors }: { editors: EditorEntry[] }) {
  if (editors.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ mt: 4, textAlign: 'center' }}>
        No editor packages found. Run the scaffolder to generate one.
      </Typography>
    );
  }

  return (
    <>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Editor packages
      </Typography>
      <List>
        {editors.map((e) => (
          <ListItemButton key={e.slug} component={Link} to={`/${e.slug}`}>
            <ListItemText primary={e.slug} secondary={e.path} />
          </ListItemButton>
        ))}
      </List>
    </>
  );
}
