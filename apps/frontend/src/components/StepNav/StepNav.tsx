// T-026 UI-S-001 UI-S-002 StepNav: 3-step progress line under the header (circles joined by a line, labels below; T-103: not tab-like), active step derived from the route
import CheckIcon from '@mui/icons-material/Check';
import { Box, Link } from '@mui/material';
import { Link as RouterLink, matchPath, useLocation } from 'react-router-dom';

import { srOnly } from '@/app/a11yStyles';
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

// circle diameter (px) on phones / desktop; the joining line runs through the circle centres
const CIRCLE = { xs: 32, md: 40 } as const;
const LINE = 3;

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

  // T-115 matchPath returns the decoded id; parcel ids often contain "/" (e.g. 192/12), so encode it again
  const matchedId = matchPath('/parcel/:parcelId', pathname)?.params.parcelId;
  const rawId = matchedId ?? storedParcel?.id ?? null;
  const parcelId = rawId ? encodeURIComponent(rawId) : null;
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
      // T-103: stays at the top of the screen while the page scrolls
      sx={{
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'kropla.line',
        position: 'sticky',
        top: 0,
        // above page toolbars that use the app-bar level (e.g. the report's PDF / Drukuj / link bar)
        zIndex: (theme) => theme.zIndex.appBar + 2,
      }}
    >
      <Box
        component="ol"
        sx={{
          listStyle: 'none',
          m: 0,
          mx: 'auto',
          p: 0,
          px: { xs: 1, md: 4 },
          py: { xs: 1.25, md: 1.75 },
          maxWidth: 880,
          display: 'flex',
        }}
      >
        {STEPS.map((step, index) => {
          const number = index + 1;
          const state = number < active ? 'done' : number === active ? 'active' : 'pending';
          const href = state === 'done' ? links[index] : null;
          return (
            <StepItem
              key={step.label}
              number={number}
              step={step}
              state={state}
              href={href}
              // the line into this step is coloured once this step is reached
              isLineDone={number <= active}
              isFirst={index === 0}
            />
          );
        })}
      </Box>
    </Box>
  );
}

interface StepItemProps {
  number: number;
  step: StepDef;
  state: 'done' | 'active' | 'pending';
  href: string | null;
  isLineDone: boolean;
  isFirst: boolean;
}

function StepItem({ number, step, state, href, isLineDone, isFirst }: StepItemProps) {
  const isActive = state === 'active';
  const isDone = state === 'done';
  const stateText = isDone ? 'zrobione' : isActive ? 'teraz' : 'następny';
  return (
    <Box
      component="li"
      aria-current={isActive ? 'step' : undefined}
      sx={{
        position: 'relative',
        flex: '1 1 0',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 0.5,
        // line from the previous circle to this one, through the circle centres
        ...(!isFirst && {
          '&::before': {
            content: '""',
            position: 'absolute',
            top: { xs: CIRCLE.xs / 2 - LINE / 2, md: CIRCLE.md / 2 - LINE / 2 },
            left: {
              xs: `calc(-50% + ${CIRCLE.xs / 2 + 6}px)`,
              md: `calc(-50% + ${CIRCLE.md / 2 + 8}px)`,
            },
            right: {
              xs: `calc(50% + ${CIRCLE.xs / 2 + 6}px)`,
              md: `calc(50% + ${CIRCLE.md / 2 + 8}px)`,
            },
            height: LINE,
            borderRadius: LINE,
            bgcolor: isLineDone ? 'primary.main' : 'kropla.line',
          },
        }),
      }}
    >
      <Box
        component="span"
        aria-hidden
        sx={{
          width: { xs: CIRCLE.xs, md: CIRCLE.md },
          height: { xs: CIRCLE.xs, md: CIRCLE.md },
          flexShrink: 0,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          fontWeight: 800,
          fontSize: { xs: '1rem', md: '1.1875rem' },
          border: 3,
          borderColor: isActive || isDone ? 'primary.main' : 'kropla.line',
          bgcolor: isDone ? 'primary.main' : 'background.paper',
          color: isDone ? 'primary.contrastText' : isActive ? 'primary.main' : 'text.secondary',
          // current step: a soft halo so it reads as "you are here", not as a button
          boxShadow: (theme) => (isActive ? `0 0 0 5px ${theme.palette.action.selected}` : 'none'),
        }}
      >
        {isDone ? <CheckIcon sx={{ fontSize: { xs: 20, md: 24 } }} /> : number}
      </Box>
      <Box
        component="span"
        sx={{
          fontWeight: isActive ? 800 : 600,
          fontSize: { xs: '0.9375rem', md: '1.125rem' },
          lineHeight: 1.2,
          color: isActive ? 'text.primary' : 'text.secondary',
          maxWidth: '100%',
          overflowWrap: 'anywhere',
        }}
      >
        <Box component="span" sx={srOnly}>
          Krok {number}, {stateText}:{' '}
        </Box>
        <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>
          {step.label}
        </Box>
        <Box component="span" sx={{ display: { xs: 'inline', md: 'none' } }}>
          {step.shortLabel}
        </Box>
      </Box>
      {/* a finished step can be changed: a plain text link, so it does not look like a tab */}
      {isDone && href && (
        <Link
          component={RouterLink}
          to={href}
          sx={{ fontSize: { xs: '0.875rem', md: '1rem' }, fontWeight: 600, lineHeight: 1.3 }}
        >
          zmień
          <Box component="span" sx={srOnly}>
            {' '}
            krok {number}: {step.label}
          </Box>
        </Link>
      )}
    </Box>
  );
}
