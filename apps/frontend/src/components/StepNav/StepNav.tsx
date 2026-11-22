// T-026 UI-S-001 UI-S-002 StepNav: 3-step progress tiles under the header (Kropla design), active step derived from the route
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Box, ButtonBase } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { Link as RouterLink, matchPath, useLocation } from 'react-router-dom';

import { useSelectionStore } from '@/store/selection';

interface StepDef {
  label: string;
  shortLabel: string;
}

const STEPS: StepDef[] = [
  { label: 'Działka', shortLabel: 'Działka' },
  { label: 'Co rośnie i kiedy', shortLabel: 'Uprawa' },
  { label: 'Raport o wodzie', shortLabel: 'Raport' },
];

function activeStep(pathname: string): number | null {
  if (matchPath('/', pathname)) return 1;
  // T-103: the add-parcel flow is step 1 too (then /parcel/:id?z=dodaj → crop → report)
  if (matchPath('/dodaj-dzialke', pathname)) return 1;
  if (matchPath('/parcel/:parcelId', pathname)) return 2;
  if (matchPath('/report/:id', pathname)) return 3;
  return null;
}

export function StepNav() {
  const { pathname, search } = useLocation();
  // came from „Dodaj działkę”: step 1 goes back there, not to the start page
  const isAddFlow =
    matchPath('/dodaj-dzialke', pathname) !== null ||
    new URLSearchParams(search).get('z') === 'dodaj';
  const storedParcel = useSelectionStore((state) => state.parcel);
  const active = activeStep(pathname);
  if (active === null) return null;

  const parcelId =
    matchPath('/parcel/:parcelId', pathname)?.params.parcelId ??
    (storedParcel ? encodeURIComponent(storedParcel.id) : null);
  const links: (string | null)[] = [
    isAddFlow ? '/dodaj-dzialke' : '/',
    parcelId ? `/parcel/${parcelId}${isAddFlow ? '?z=dodaj' : ''}` : null,
    null,
  ];

  return (
    <Box
      component="nav"
      aria-label="Kroki"
      className="no-print"
      sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'kropla.line' }}
    >
      <Box
        component="ol"
        sx={{
          listStyle: 'none',
          m: 0,
          mx: 'auto',
          p: 0,
          px: { xs: 1.5, md: 4 },
          py: { xs: 1.5, md: 2.5 },
          maxWidth: 1344,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: { xs: 1, md: 2 },
        }}
      >
        {STEPS.map((step, index) => {
          const number = index + 1;
          const state = number < active ? 'done' : number === active ? 'active' : 'pending';
          const href = state === 'done' ? links[index] : null;
          return (
            <Box component="li" key={step.label} sx={{ display: 'flex', minWidth: 0 }}>
              <StepTile
                number={number}
                step={step}
                state={state}
                href={href}
                isCurrent={state === 'active'}
              />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

interface StepTileProps {
  number: number;
  step: StepDef;
  state: 'done' | 'active' | 'pending';
  href: string | null;
  isCurrent: boolean;
}

function StepTile({ number, step, state, href, isCurrent }: StepTileProps) {
  const isActive = state === 'active';
  const isDone = state === 'done';
  const sx = (theme: Theme) => ({
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    display: 'flex',
    flexDirection: { xs: 'column', md: 'row' },
    alignItems: 'center',
    justifyContent: { xs: 'center', md: 'flex-start' },
    textAlign: { xs: 'center', md: 'left' },
    gap: { xs: 0.5, md: 1.75 },
    px: { xs: 0.5, md: 2.25 },
    py: { xs: 1, md: 1.75 },
    borderRadius: '12px',
    border: 2,
    borderColor: isDone
      ? theme.palette.kropla.iconMuted
      : isActive
        ? 'transparent'
        : theme.palette.kropla.line,
    background: isActive ? theme.palette.kropla.ctaGradient : theme.palette.background.paper,
    color: isActive ? theme.palette.kropla.ctaText : theme.palette.text.primary,
    '&:focus-visible': { outline: `3px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
  });
  const content = (
    <>
      {isDone ? (
        <CheckCircleIcon
          aria-hidden
          sx={{ fontSize: { xs: 28, md: 44 }, color: 'kropla.iconMuted', flexShrink: 0 }}
        />
      ) : (
        <Box
          component="span"
          aria-hidden
          sx={{
            width: { xs: 28, md: 44 },
            height: { xs: 28, md: 44 },
            flexShrink: 0,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: { xs: '1rem', md: '1.375rem' },
            bgcolor: isActive ? 'background.paper' : 'transparent',
            color: isActive ? 'primary.main' : 'text.secondary',
            border: isActive ? 0 : 2,
            borderColor: 'text.secondary',
          }}
        >
          {number}
        </Box>
      )}
      <Box component="span" sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Box
          component="span"
          sx={{
            fontWeight: isActive || isDone ? 700 : 600,
            fontSize: { xs: '0.9375rem', md: '1.25rem' },
            lineHeight: 1.2,
          }}
        >
          <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>
            {step.label}
          </Box>
          <Box component="span" sx={{ display: { xs: 'inline', md: 'none' } }}>
            {step.shortLabel}
          </Box>
        </Box>
        {isDone && (
          <Box
            component="span"
            sx={{
              color: 'text.secondary',
              fontSize: { xs: '0.8125rem', md: '0.9375rem' },
              display: { xs: 'none', sm: 'inline' },
            }}
          >
            Gotowe · zmień
          </Box>
        )}
      </Box>
    </>
  );
  if (isDone && href) {
    return (
      <ButtonBase component={RouterLink} to={href} sx={sx}>
        {content}
      </ButtonBase>
    );
  }
  return (
    <Box
      aria-current={isCurrent ? 'step' : undefined}
      sx={(theme) => ({ ...sx(theme), display: 'flex' })}
    >
      {content}
    </Box>
  );
}
