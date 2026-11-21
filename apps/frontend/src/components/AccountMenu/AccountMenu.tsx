// UI-C-015 AccountMenu: header login button or account menu (switch account, account name link to /konto, Mój profil link to /konto/profil, logout); verifies session via API-009
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { Box, Button, Divider, ListSubheader, Menu, MenuItem, Typography } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';

import { useMeQuery } from '@/api/auth';
import { ApiError } from '@/api/client';
import { useSessionStore } from '@/store/session';

export function AccountMenu() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const { token, user, accounts, activeAccountId, setAccounts, setUser, setActiveAccount, logout } =
    useSessionStore();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const me = useMeQuery(token);

  useEffect(() => {
    if (me.data) {
      setUser(me.data.user);
      setAccounts(me.data.accounts);
    }
  }, [me.data, setUser, setAccounts]);

  useEffect(() => {
    if (me.error instanceof ApiError && me.error.status === 401) logout();
  }, [me.error, logout]);

  const handleLogout = () => {
    setAnchor(null);
    logout();
    queryClient.removeQueries({ queryKey: ['accounts'] });
    queryClient.removeQueries({ queryKey: ['auth'] });
  };

  if (!token || !user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return (
      <Button
        component={RouterLink}
        to={`/logowanie?next=${next}`}
        color="inherit"
        sx={{ ml: 'auto', minHeight: 44, minWidth: 44 }}
      >
        Zaloguj
      </Button>
    );
  }

  const active = accounts.find((account) => account.id === activeAccountId) ?? accounts[0];
  const label = active?.name ?? user.name;

  return (
    <Box sx={{ ml: 'auto', minWidth: 0 }}>
      <Button
        color="inherit"
        onClick={(event) => setAnchor(event.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={anchor ? 'true' : undefined}
        aria-label={`Konto: ${label}`}
        startIcon={<AccountCircleIcon />}
        sx={{
          minHeight: 44,
          minWidth: 44,
          maxWidth: { xs: 44, sm: 200, md: 280 },
          // phones: icon only (farm name is in aria-label and in the menu), so long names
          // like "Gospodarstwo Jan Kowalski" never push the page wider than 390 px (T-068)
          px: { xs: 0, sm: 1 },
          '& .MuiButton-startIcon': { mr: { xs: 0, sm: 1 }, ml: { xs: 0, sm: -0.5 } },
        }}
      >
        <Typography
          variant="body1"
          component="span"
          noWrap
          sx={{ display: { xs: 'none', sm: 'block' } }}
        >
          {label}
        </Typography>
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <ListSubheader sx={{ lineHeight: 1.4, py: 1, color: 'text.primary' }}>
          <Typography component="span" sx={{ display: 'block', fontWeight: 700 }}>
            {user.name}
          </Typography>
          <Typography component="span" variant="body2" sx={{ display: 'block' }}>
            {user.email}
          </Typography>
        </ListSubheader>
        {accounts.map((account) => (
          <MenuItem
            key={account.id}
            role="menuitemradio"
            aria-checked={account.id === active?.id}
            selected={account.id === active?.id}
            sx={{ minHeight: 44 }}
            onClick={() => {
              setActiveAccount(account.id);
              setAnchor(null);
            }}
          >
            {account.name}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem
          component={RouterLink}
          to="/konto"
          sx={{ minHeight: 44 }}
          onClick={() => setAnchor(null)}
        >
          {active ? `Panel: ${active.name}` : 'Panel gospodarstwa'}
        </MenuItem>
        <MenuItem
          component={RouterLink}
          to="/konto/profil"
          sx={{ minHeight: 48 }}
          onClick={() => setAnchor(null)}
        >
          Mój profil
        </MenuItem>
        <MenuItem sx={{ minHeight: 48 }} onClick={handleLogout}>
          Wyloguj
        </MenuItem>
      </Menu>
    </Box>
  );
}
