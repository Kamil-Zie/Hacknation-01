// T-084 Site map: every screen of the app, grouped; screens that need an account are marked
import { Box, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const GROUPS: { title: string; links: { to: string; label: string; note?: string }[] }[] = [
  {
    title: 'Sprawdzanie działki',
    links: [
      { to: '/', label: 'Znajdź działkę', note: 'wymaga logowania' },
      { to: '/konto', label: 'Panel gospodarstwa', note: 'wymaga logowania' },
      { to: '/pole/nowe', label: 'Nowe pole z kilku działek', note: 'wymaga logowania' },
    ],
  },
  {
    title: 'Konto',
    links: [
      { to: '/logowanie', label: 'Logowanie i zakładanie konta' },
      { to: '/konto/profil', label: 'Mój profil', note: 'wymaga logowania' },
    ],
  },
  {
    title: 'Dostępność',
    links: [
      { to: '/tekst-latwy-do-czytania', label: 'Tekst łatwy do czytania' },
      { to: '/deklaracja-dostepnosci', label: 'Deklaracja dostępności' },
      { to: '/mapa-strony', label: 'Mapa strony' },
    ],
  },
];

export function SitemapPage() {
  return (
    <Stack spacing={4} sx={{ maxWidth: 800 }}>
      <Typography variant="h1" component="h1">
        Mapa strony
      </Typography>
      {GROUPS.map((group) => (
        <Box component="section" key={group.title}>
          <Typography variant="h2" component="h2" sx={{ mb: 1 }}>
            {group.title}
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 3 }}>
            {group.links.map((item) => (
              <Box component="li" key={item.to} sx={{ mb: 0.5 }}>
                <Link
                  component={RouterLink}
                  to={item.to}
                  underline="always"
                  sx={{
                    fontSize: '1.125rem',
                    minHeight: 44,
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  {item.label}
                </Link>
                {item.note && (
                  <Typography component="span" sx={{ color: 'text.secondary', ml: 1 }}>
                    ({item.note})
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </Stack>
  );
}
