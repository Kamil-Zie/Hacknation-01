// T-026 T-084 App shell: skip link, accessibility bar, Kropla header (blue gradient), step navigation, main#tresc, footer
import OpacityIcon from '@mui/icons-material/Opacity';
import { AppBar, Box, Container, Link, Toolbar, Typography } from '@mui/material';
import { useEffect } from 'react';
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom';

import { srOnly } from '@/app/a11yStyles';
import { A11yBar } from '@/components/A11yBar/A11yBar';
import { AccountMenu } from '@/components/AccountMenu/AccountMenu';
import { AppFooter } from '@/components/AppFooter/AppFooter';
import { AppNav, ReportBackButton } from '@/components/AppNav/AppNav';
import { StepNav } from '@/components/StepNav/StepNav';

// Unique document title per page (WCAG 2.4.2)
const TITLES: [RegExp, string][] = [
  [/^\/$/, 'Znajdź działkę'],
  [/^\/parcel\//, 'Uprawa i data analizy'],
  [/^\/report\//, 'Raport o wodzie'],
  [/^\/logowanie/, 'Logowanie'],
  [/^\/konto\/profil/, 'Mój profil'],
  [/^\/konto/, 'Pulpit'],
  [/^\/dzialki/, 'Moje działki'],
  [/^\/pola/, 'Moje pola'],
  [/^\/wspolnicy/, 'Wspólnicy'],
  [/^\/pole\/nowe/, 'Nowe pole'],
  [/^\/pole\/.+\/raport/, 'Raport pola'],
  [/^\/tekst-latwy-do-czytania/, 'Tekst łatwy do czytania'],
  [/^\/deklaracja-dostepnosci/, 'Deklaracja dostępności'],
  [/^\/mapa-strony/, 'Mapa strony'],
];

function pageTitle(pathname: string): string {
  const match = TITLES.find(([pattern]) => pattern.test(pathname));
  return `${match ? match[1] : 'Nie znaleziono strony'} – Kropelka`;
}

export function AppLayout() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = pageTitle(pathname);
  }, [pathname]);
  const isLogin = pathname === '/logowanie';
  const isWide = pathname.startsWith('/report/');
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Link
        href="#tresc"
        className="no-print"
        sx={{
          position: 'absolute',
          left: 8,
          top: -100,
          zIndex: 2000,
          bgcolor: '#0B2545',
          color: 'common.white',
          px: 2,
          py: 1.5,
          borderRadius: 1,
          fontWeight: 700,
          fontSize: '1.125rem',
          '&:focus': { top: 8 },
        }}
      >
        Przejdź do treści
      </Link>
      <A11yBar />
      <AppBar
        position="static"
        elevation={0}
        component="header"
        className="no-print"
        sx={{ background: (theme) => theme.palette.kropla.headerGradient, color: 'common.white' }}
      >
        <Toolbar sx={{ minHeight: { xs: 64, md: 80 }, gap: 2, px: { xs: 2, md: 4 } }}>
          <Link
            component={RouterLink}
            to="/"
            color="inherit"
            underline="none"
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, minHeight: 44 }}
          >
            <OpacityIcon aria-hidden sx={{ fontSize: { xs: 30, md: 36 } }} />
            <Typography
              component="span"
              sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.75rem' } }}
            >
              Kropelka
            </Typography>
            <Typography
              component="span"
              sx={{ display: { xs: 'none', md: 'inline' }, opacity: 0.95, fontSize: '1.125rem' }}
            >
              Woda na Twojej działce
            </Typography>
            <Box component="span" sx={srOnly}>
              {' '}
              – strona główna
            </Box>
          </Link>
          {isLogin ? <Box sx={{ flexGrow: 1 }} /> : <AppNav />}
          {!isLogin && <AccountMenu />}
        </Toolbar>
      </AppBar>
      <StepNav />
      <Container
        component="main"
        id="tresc"
        tabIndex={-1}
        maxWidth={false}
        sx={{
          flexGrow: 1,
          width: '100%',
          maxWidth: isWide ? 1600 : 1536,
          py: { xs: 2, md: 4 },
          px: { xs: 2, md: 4 },
        }}
      >
        <ReportBackButton />
        <Outlet />
      </Container>
      <AppFooter />
    </Box>
  );
}
