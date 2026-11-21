// T-006 App shell: header + content container
import { AppBar, Box, Container, Link, Toolbar, Typography } from '@mui/material';
import { Link as RouterLink, Outlet } from 'react-router-dom';

export function AppLayout() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="static"
        color="primary"
        elevation={0}
        component="header"
        className="no-print"
      >
        <Toolbar sx={{ minHeight: 56, gap: 2 }}>
          <Link
            component={RouterLink}
            to="/"
            color="inherit"
            underline="none"
            sx={{ display: 'inline-flex', alignItems: 'center', minHeight: 44 }}
          >
            <Typography variant="h3" component="span">
              Kropelka
            </Typography>
          </Link>
          <Typography variant="body1" sx={{ display: { xs: 'none', sm: 'block' }, opacity: 0.9 }}>
            Sprawdź wodę na swojej działce
          </Typography>
        </Toolbar>
      </AppBar>
      <Container component="main" maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 3 } }}>
        <Outlet />
      </Container>
    </Box>
  );
}
