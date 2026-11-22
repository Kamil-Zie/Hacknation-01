// T-026 T-084 T-085 App shell: skip link, accessibility bar, Kropla header (blue gradient), step navigation, sidebar panel/drawer (UI-C-016), main#tresc, footer
import MenuIcon from '@mui/icons-material/Menu';
import OpacityIcon from '@mui/icons-material/Opacity';
import {
  AppBar,
  Box,
  Button,
  Container,
  Drawer,
  Link,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material';
import type { Theme } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom';

import { srOnly } from '@/app/a11yStyles';
import { A11yBar } from '@/components/A11yBar/A11yBar';
import { AccountMenu } from '@/components/AccountMenu/AccountMenu';
import { ReportBackButton } from '@/components/AppNav/AppNav';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { StepNav } from '@/components/StepNav/StepNav';
import { useSessionStore } from '@/store/session';

// Unique document title per page (WCAG 2.4.2)
const TITLES: [RegExp, string][] = [
  [/^\/$/, 'Znajdź działkę'],
  [/^\/parcel\//, 'Uprawa i data analizy'],
  [/^\/report\//, 'Raport o wodzie'],
  [/^\/logowanie/, 'Logowanie'],
  [/^\/konto\/profil/, 'Mój profil'],
  [/^\/konto/, 'Pulpit'],
  [/^\/dodaj-dzialke/, 'Dodaj działkę'],
  [/^\/dzialki/, 'Moje działki'],
  [/^\/szybki-raport/, 'Szybki raport'],
  [/^\/pola/, 'Moje grupy działek'],
  [/^\/wspolnicy/, 'Wspólnicy'],
  [/^\/pole\/nowe/, 'Nowa grupa działek'],
  [/^\/pole\/.+\/raport/, 'Raport grupy działek'],
  [/^\/tekst-latwy-do-czytania/, 'Tekst łatwy do czytania'],
  [/^\/deklaracja-dostepnosci/, 'Deklaracja dostępności'],
  [/^\/mapa-strony/, 'Mapa strony'],
];

// T-103: how much of the accessibility bar above the side panel is still on screen, so the
// sticky panel ends exactly at the bottom of the window (account menu visible at the bottom)
function useVisibleHeight(ref: React.RefObject<HTMLElement | null>): number {
  const [visible, setVisible] = useState(0);
  useEffect(() => {
    const update = () => {
      const element = ref.current;
      setVisible(element ? Math.max(0, element.getBoundingClientRect().bottom) : 0);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    const observer = new ResizeObserver(update);
    if (ref.current) observer.observe(ref.current);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      observer.disconnect();
    };
  }, [ref]);
  return visible;
}

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
  // T-103 dashboard: tiles use the full width next to the sidebar, with a narrow side gutter
  const isDashboard = pathname === '/konto';
  const token = useSessionStore((state) => state.token);
  // T-103: the side panel also on the report (step 3); the print view has its own route outside this layout
  const showSidebar = Boolean(token) && !isLogin;
  const isDesktop = useMediaQuery((theme: Theme) => theme.breakpoints.up('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const topBarRef = useRef<HTMLDivElement>(null);
  const topBarVisible = useVisibleHeight(topBarRef);
  const closeDrawer = () => {
    setDrawerOpen(false);
    menuButtonRef.current?.focus();
  };
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
      <Box ref={topBarRef}>
        <A11yBar />
      </Box>
      {/* T-103: desktop with the side panel has no header bar (logo and profile live in the panel) */}
      {!(showSidebar && isDesktop) && (
        <AppBar
          position="static"
          elevation={0}
          component="header"
          className="no-print"
          sx={{ background: (theme) => theme.palette.kropla.headerGradient, color: 'common.white' }}
        >
          <Toolbar sx={{ minHeight: { xs: 64, md: 80 }, gap: 2, px: { xs: 2, md: 4 } }}>
            {/* T-103: logged in → the dashboard (Pulpit), otherwise the start page; on desktop
              with the side panel the logo lives on top of the panel instead */}
            {!(showSidebar && isDesktop) && (
              <Link
                component={RouterLink}
                to={token ? '/konto' : '/'}
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
                  sx={{
                    display: { xs: 'none', md: 'inline' },
                    opacity: 0.95,
                    fontSize: '1.125rem',
                  }}
                >
                  Woda na Twojej działce
                </Typography>
                <Box component="span" sx={srOnly}>
                  {' '}
                  {token ? '– pulpit' : '– strona główna'}
                </Box>
              </Link>
            )}
            <Box sx={{ flexGrow: 1 }} />
            {showSidebar && !isDesktop && (
              <Button
                ref={menuButtonRef}
                color="inherit"
                className="no-print"
                startIcon={<MenuIcon aria-hidden />}
                aria-haspopup="dialog"
                aria-expanded={drawerOpen ? 'true' : 'false'}
                onClick={() => setDrawerOpen(true)}
                sx={{ minHeight: 48, fontSize: '1.125rem', fontWeight: 700 }}
              >
                Menu
              </Button>
            )}
            {!isLogin && <AccountMenu />}
          </Toolbar>
        </AppBar>
      )}
      <Box sx={{ display: 'flex', flexGrow: 1, alignItems: 'flex-start', minWidth: 0 }}>
        {showSidebar && isDesktop && (
          <Box
            component="aside"
            className="no-print"
            sx={{
              width: 280,
              flexShrink: 0,
              // T-099 panel background runs to the bottom of the page; only the menu itself is sticky
              alignSelf: 'stretch',
              borderRight: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            {/* full screen height, so the account menu sits at the bottom left */}
            <Box
              sx={{
                position: 'sticky',
                top: 0,
                height: `calc(100vh - ${topBarVisible}px)`,
                overflowY: 'auto',
              }}
            >
              <Sidebar showLogo footer={<AccountMenu inSidebar />} />
            </Box>
          </Box>
        )}
        <Box
          sx={{
            flexGrow: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            alignSelf: 'stretch',
          }}
        >
          <StepNav />
          <Container
            component="main"
            id="tresc"
            tabIndex={-1}
            maxWidth={false}
            sx={{
              flexGrow: 1,
              width: '100%',
              maxWidth: isDashboard ? 'none' : isWide ? 1600 : 1536,
              py: { xs: 2, md: 4 },
              px: isDashboard ? { xs: 2, md: 2 } : { xs: 2, md: 4 },
            }}
          >
            <ReportBackButton />
            <Outlet />
          </Container>
        </Box>
      </Box>
      {showSidebar && !isDesktop && (
        <Drawer
          anchor="left"
          open={drawerOpen}
          onClose={closeDrawer}
          className="no-print"
          slotProps={{ paper: { sx: { width: 'min(320px, 88vw)' }, 'aria-label': 'Menu' } }}
        >
          <Sidebar onNavigate={() => setDrawerOpen(false)} />
        </Drawer>
      )}
    </Box>
  );
}
