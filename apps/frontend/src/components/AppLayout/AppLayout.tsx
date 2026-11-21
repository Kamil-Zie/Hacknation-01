// T-026 App shell: Kropla header (blue gradient), step navigation and content container
import OpacityIcon from '@mui/icons-material/Opacity';
import { AppBar, Box, Container, Link, Toolbar, Typography } from '@mui/material';
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom';

import { AccountMenu } from '@/components/AccountMenu/AccountMenu';
import { AppNav, ReportBackButton } from '@/components/AppNav/AppNav';
import { StepNav } from '@/components/StepNav/StepNav';

export function AppLayout() {
  const { pathname } = useLocation();
  const isLogin = pathname === '/logowanie';
  const isWide = pathname.startsWith('/report/');
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
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
            aria-label="Kropelka – strona główna"
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
          </Link>
          {isLogin ? <Box sx={{ flexGrow: 1 }} /> : <AppNav />}
          {!isLogin && <AccountMenu />}
        </Toolbar>
      </AppBar>
      <StepNav />
      <Container
        component="main"
        maxWidth={false}
        sx={{
          maxWidth: isWide ? 1600 : 1536,
          py: { xs: 2, md: 4 },
          px: { xs: 2, md: 4 },
        }}
      >
        <ReportBackButton />
        <Outlet />
      </Container>
    </Box>
  );
}
