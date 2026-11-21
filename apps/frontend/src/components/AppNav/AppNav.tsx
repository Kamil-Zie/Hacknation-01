// T-058 AppNav: header navigation (Panel, Szukaj działki, Dodaj działkę; menu on phones) and the report "Wstecz" button
import AddLocationAltIcon from '@mui/icons-material/AddLocationAlt';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import { Box, Button, IconButton, Menu, MenuItem, ListItemIcon } from '@mui/material';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Link as RouterLink, useMatch, useNavigate } from 'react-router-dom';

import { useReportQuery } from '@/api/analyses';
import { useSelectionStore } from '@/store/selection';
import { useSessionStore } from '@/store/session';

interface NavItem {
  label: string;
  icon: ReactNode;
  onSelect: () => void;
}

export function AppNav() {
  const navigate = useNavigate();
  const token = useSessionStore((state) => state.token);
  const setParcel = useSelectionStore((state) => state.setParcel);
  const setIsExample = useSelectionStore((state) => state.setIsExample);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const items: NavItem[] = [
    {
      label: 'Panel',
      icon: <DashboardIcon aria-hidden />,
      onSelect: () => navigate(token ? '/konto' : '/logowanie?next=%2Fkonto'),
    },
    { label: 'Szukaj działki', icon: <SearchIcon aria-hidden />, onSelect: () => navigate('/') },
    {
      label: 'Dodaj działkę',
      icon: <AddLocationAltIcon aria-hidden />,
      onSelect: () => {
        setParcel(null);
        setIsExample(false);
        navigate('/', { state: { resetAt: Date.now() } });
      },
    },
  ];

  return (
    <Box
      component="nav"
      aria-label="Menu główne"
      className="no-print"
      sx={{
        flexGrow: 1,
        justifyContent: 'flex-end',
        display: 'flex',
        alignItems: 'center',
        minWidth: 0,
      }}
    >
      <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.5 }}>
        {items.map((item) => (
          <Button
            key={item.label}
            color="inherit"
            startIcon={item.icon}
            onClick={item.onSelect}
            sx={{ minHeight: 44, fontSize: '1.0625rem', whiteSpace: 'nowrap' }}
          >
            {item.label}
          </Button>
        ))}
      </Box>
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        <IconButton
          color="inherit"
          aria-label="Menu"
          aria-haspopup="menu"
          aria-controls="menu-glowne"
          aria-expanded={anchor ? 'true' : 'false'}
          onClick={(event) => setAnchor(event.currentTarget)}
          sx={{ width: 44, height: 44 }}
        >
          <MenuIcon />
        </IconButton>
        <Menu
          id="menu-glowne"
          anchorEl={anchor}
          open={Boolean(anchor)}
          onClose={() => setAnchor(null)}
        >
          {items.map((item) => (
            <MenuItem
              key={item.label}
              sx={{ minHeight: 48 }}
              onClick={() => {
                setAnchor(null);
                item.onSelect();
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              {item.label}
            </MenuItem>
          ))}
        </Menu>
      </Box>
    </Box>
  );
}

/** "Wstecz" on the report: back to the parcel step of that report's parcel */
export function ReportBackButton() {
  const match = useMatch('/report/:id');
  const { data } = useReportQuery(match?.params.id);
  if (!match || !data) return null;
  return (
    <Button
      component={RouterLink}
      to={`/parcel/${encodeURIComponent(data.parcel.id)}`}
      variant="outlined"
      color="inherit"
      startIcon={<ArrowBackIcon aria-hidden />}
      className="no-print"
      sx={{ minHeight: 48, mb: 2, borderColor: 'text.secondary' }}
    >
      Wstecz
    </Button>
  );
}
