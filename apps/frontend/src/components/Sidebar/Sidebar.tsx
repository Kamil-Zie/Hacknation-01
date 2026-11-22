// UI-C-016 T-085 Sidebar: search box and "Menu gospodarstwa" links (fixed panel on desktop, drawer content on phones) (T-104 view-only roles)
import AddLocationAltIcon from '@mui/icons-material/AddLocationAlt';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DashboardIcon from '@mui/icons-material/Dashboard';
import GroupsIcon from '@mui/icons-material/Groups';
import LandscapeIcon from '@mui/icons-material/Landscape';
import MapIcon from '@mui/icons-material/Map';
import OpacityIcon from '@mui/icons-material/Opacity';
import {
  Box,
  Link,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import type { ReactNode } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';

import { srOnly } from '@/app/a11yStyles';
import { ParcelSearchBox } from '@/components/ParcelSearchBox/ParcelSearchBox';
import { useCanEdit } from '@/store/session';

interface SidebarLink {
  label: string;
  to: string;
  icon: ReactNode;
  // Pathname prefixes that mark the link as current
  match: string[];
  // T-104 hidden for member and guest (view only)
  edits?: boolean;
}

const LINKS: SidebarLink[] = [
  { label: 'Pulpit', to: '/konto', icon: <DashboardIcon aria-hidden />, match: ['/konto'] },
  {
    label: 'Dodaj działkę',
    to: '/dodaj-dzialke',
    icon: <AddCircleOutlineIcon aria-hidden />,
    match: ['/dodaj-dzialke'],
    edits: true,
  },
  { label: 'Moje działki', to: '/dzialki', icon: <MapIcon aria-hidden />, match: ['/dzialki'] },
  {
    label: 'Utwórz pole',
    to: '/pole/nowe',
    icon: <AddLocationAltIcon aria-hidden />,
    match: ['/pole/nowe'],
    edits: true,
  },
  { label: 'Moje pola', to: '/pola', icon: <LandscapeIcon aria-hidden />, match: ['/pola'] },
  { label: 'Wspólnicy', to: '/wspolnicy', icon: <GroupsIcon aria-hidden />, match: ['/wspolnicy'] },
];

function isActive(pathname: string, link: SidebarLink): boolean {
  return link.match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export interface SidebarProps {
  // Called after navigation, so the mobile drawer can close
  onNavigate?: () => void;
  /** T-103 desktop: the Kropelka logo sits on top of the panel and stays with it while scrolling */
  showLogo?: boolean;
  /** T-103 desktop: shown at the bottom left of the panel (the account / profile menu) */
  footer?: ReactNode;
}

export function Sidebar({ onNavigate, showLogo = false, footer }: SidebarProps) {
  const canEdit = useCanEdit();
  const { pathname } = useLocation();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, minHeight: '100%' }}>
      {showLogo && (
        <Link
          component={RouterLink}
          to="/konto"
          underline="none"
          color="inherit"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1.25,
            minHeight: 48,
            px: 0.5,
            borderRadius: 2,
            color: 'primary.main',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <OpacityIcon aria-hidden sx={{ fontSize: 36 }} />
          <Typography
            component="span"
            sx={{ fontWeight: 800, fontSize: '1.75rem', color: 'text.primary' }}
          >
            Kropelka
          </Typography>
          <Box component="span" sx={srOnly}>
            {' '}
            – pulpit
          </Box>
        </Link>
      )}
      <ParcelSearchBox onNavigate={onNavigate} />
      <Box component="nav" aria-label="Menu gospodarstwa">
        <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {LINKS.filter((link) => canEdit || !link.edits).map((link) => {
            const active = isActive(pathname, link);
            return (
              <li key={link.to}>
                <ListItemButton
                  component={RouterLink}
                  to={link.to}
                  aria-current={active ? 'page' : undefined}
                  onClick={onNavigate}
                  sx={{
                    minHeight: 48,
                    borderRadius: 1,
                    borderLeft: 6,
                    borderColor: active ? 'primary.main' : 'transparent',
                    bgcolor: active ? 'secondary.light' : 'transparent',
                    color: 'text.primary',
                    '&:hover': { bgcolor: active ? 'secondary.light' : 'action.hover' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 44, color: 'primary.main' }}>
                    {link.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={link.label}
                    slotProps={{
                      primary: {
                        sx: { fontSize: '1.125rem', fontWeight: active ? 800 : 500 },
                      },
                    }}
                  />
                </ListItemButton>
              </li>
            );
          })}
        </List>
      </Box>
      {footer && <Box sx={{ mt: 'auto', pt: 1 }}>{footer}</Box>}
    </Box>
  );
}
