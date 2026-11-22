// UI-C-016 T-085 Sidebar: search box and "Menu gospodarstwa" links (fixed panel on desktop, drawer content on phones) (T-104 view-only roles; guest: account links shown disabled + login box)
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AddLocationAltIcon from '@mui/icons-material/AddLocationAlt';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DashboardIcon from '@mui/icons-material/Dashboard';
import GroupsIcon from '@mui/icons-material/Groups';
import LandscapeIcon from '@mui/icons-material/Landscape';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LoginIcon from '@mui/icons-material/Login';
import MapIcon from '@mui/icons-material/Map';
import OpacityIcon from '@mui/icons-material/Opacity';
import {
  Box,
  Button,
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
import { useCanEdit, useSessionStore } from '@/store/session';

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
    label: 'Dodaj grupę działek',
    to: '/pole/nowe',
    icon: <AddLocationAltIcon aria-hidden />,
    match: ['/pole/nowe'],
    edits: true,
  },
  {
    label: 'Moje grupy działek',
    to: '/pola',
    icon: <LandscapeIcon aria-hidden />,
    match: ['/pola'],
  },
  { label: 'Wspólnicy', to: '/wspolnicy', icon: <GroupsIcon aria-hidden />, match: ['/wspolnicy'] },
];

// guest mode: the profile lives in the account menu for a logged-in user, for a guest it is listed (disabled)
const GUEST_LINKS: SidebarLink[] = [
  ...LINKS,
  {
    label: 'Profil',
    to: '/konto/profil',
    icon: <AccountCircleIcon aria-hidden />,
    match: ['/konto/profil'],
  },
];

const itemSx = { minHeight: 48, borderRadius: 1, borderLeft: 6 } as const;
const labelSx = { fontSize: '1.125rem' } as const;

// guest mode: account features stay visible but clearly unusable (greyed out, lock, not focusable)
function GuestLinks() {
  return (
    <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {GUEST_LINKS.map((link) => (
        <li key={link.to}>
          <ListItemButton
            component="div"
            disabled
            aria-disabled="true"
            sx={{ ...itemSx, borderColor: 'transparent' }}
          >
            <ListItemIcon sx={{ minWidth: 44, color: 'text.secondary' }}>{link.icon}</ListItemIcon>
            <ListItemText
              primary={link.label}
              secondary="Wymaga zalogowania"
              slotProps={{ primary: { sx: { ...labelSx, fontWeight: 500 } } }}
            />
            <LockOutlinedIcon aria-hidden fontSize="small" sx={{ color: 'text.secondary' }} />
          </ListItemButton>
        </li>
      ))}
    </List>
  );
}

function GuestLogin({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname, search } = useLocation();
  const next = encodeURIComponent(pathname + search);
  return (
    <Box
      sx={{ p: 2, borderRadius: 2, bgcolor: 'secondary.light', color: 'text.primary' }}
      role="note"
    >
      <Typography sx={{ fontWeight: 700, fontSize: '1.125rem' }}>Jesteś gościem</Typography>
      <Typography sx={{ mt: 0.5, mb: 1.5 }}>
        Możesz sprawdzić każdą działkę i zobaczyć jej raport. Zaloguj się, aby zapisywać działki,
        tworzyć grupy i zapraszać wspólników.
      </Typography>
      <Button
        component={RouterLink}
        to={`/logowanie?next=${next}`}
        variant="contained"
        fullWidth
        startIcon={<LoginIcon aria-hidden />}
        onClick={onNavigate}
        sx={{ minHeight: 48, fontSize: '1.125rem', fontWeight: 700 }}
      >
        Zaloguj się
      </Button>
    </Box>
  );
}

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
  const isGuest = !useSessionStore((state) => state.token);
  const { pathname } = useLocation();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, minHeight: '100%' }}>
      {showLogo && (
        <Link
          component={RouterLink}
          to={isGuest ? '/' : '/konto'}
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
            {isGuest ? ' – strona główna' : ' – pulpit'}
          </Box>
        </Link>
      )}
      <ParcelSearchBox onNavigate={onNavigate} />
      <Box component="nav" aria-label="Menu gospodarstwa">
        {isGuest ? (
          <GuestLinks />
        ) : (
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
        )}
      </Box>
      {isGuest ? (
        <Box sx={{ mt: 'auto', pt: 1 }}>
          <GuestLogin onNavigate={onNavigate} />
        </Box>
      ) : (
        footer && <Box sx={{ mt: 'auto', pt: 1 }}>{footer}</Box>
      )}
    </Box>
  );
}
