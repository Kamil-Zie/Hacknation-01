// UI-S-009 DashboardEmpty: first view after sign-up (no parcels yet): welcome, "Dodaj pierwszą działkę" CTA, 3 steps, preview of the dashboard tiles, where to find "Dodaj działkę" in the menu
import AddLocationAltIcon from '@mui/icons-material/AddLocationAlt';
import AgricultureOutlinedIcon from '@mui/icons-material/AgricultureOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { Box, Button, Card, CardContent, Chip, Stack, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import type { DroughtClass } from '@/api/types';
import { StatusBadge } from '@/components/StatusBadge/StatusBadge';
import { DROUGHT_WORDS } from '@/components/ThreatMap/ThreatMap';

const STEPS: { icon: ReactNode; title: string; text: string }[] = [
  {
    icon: <SearchIcon aria-hidden />,
    title: 'Znajdź działkę',
    text: 'Po numerze, adresie, GPS albo kliknięciem na mapie.',
  },
  {
    icon: <AgricultureOutlinedIcon aria-hidden />,
    title: 'Wybierz uprawę i datę',
    text: 'Policzymy wodę dla tego, co rośnie na działce.',
  },
  {
    icon: <DescriptionOutlinedIcon aria-hidden />,
    title: 'Dostaniesz raport',
    text: 'Stan suszy, przyczyny i co zrobić: najpierw zatrzymać wodę, potem nawadniać.',
  },
];

// sample values for the preview tiles (clearly marked „Przykład”, not the user's data)
const SAMPLE_COUNTS: [DroughtClass, number][] = [
  ['severe', 1],
  ['moderate', 2],
  ['none', 3],
];
const SAMPLE_DOTS: { x: number; y: number; value: DroughtClass }[] = [
  { x: 22, y: 30, value: 'none' },
  { x: 48, y: 52, value: 'severe' },
  { x: 66, y: 28, value: 'moderate' },
  { x: 35, y: 72, value: 'moderate' },
  { x: 78, y: 66, value: 'none' },
  { x: 58, y: 80, value: 'none' },
];

function PreviewTile({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card variant="outlined" sx={{ minWidth: 0, borderStyle: 'dashed', bgcolor: 'transparent' }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack
          direction="row"
          sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}
        >
          <Typography component="h3" sx={{ fontWeight: 700, fontSize: '1.125rem' }}>
            {title}
          </Typography>
          <Chip label="Przykład" size="small" variant="outlined" />
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

export interface DashboardEmptyProps {
  /** owner / partner: may add parcels; member / guest only see a short note */
  canEdit: boolean;
}

export function DashboardEmpty({ canEdit }: DashboardEmptyProps) {
  const { palette } = useTheme();

  if (!canEdit) {
    return (
      <Card variant="outlined">
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Typography variant="h2" component="h2" sx={{ mb: 1 }}>
            Tu pojawią się działki gospodarstwa
          </Typography>
          <Typography sx={{ fontSize: '1.125rem' }}>
            W tym gospodarstwie nie ma jeszcze działek, które możesz oglądać. Gdy właściciel je
            doda, zobaczysz tu mapę, stan suszy i bilans wody.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Stack spacing={3}>
      {/* welcome + main call to action */}
      <Card
        component="section"
        aria-labelledby="witaj-title"
        sx={{
          background: `linear-gradient(135deg, ${alpha(palette.primary.main, 0.14)}, ${alpha(
            palette.primary.main,
            0.03,
          )})`,
          border: 1,
          borderColor: alpha(palette.primary.main, 0.25),
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, md: 4 }, '&:last-child': { pb: { xs: 2.5, md: 4 } } }}>
          <Typography id="witaj-title" variant="h2" component="h2" sx={{ mb: 1 }}>
            Witaj w Kropelce! Dodaj swoją pierwszą działkę
          </Typography>
          <Typography
            sx={{ fontSize: { xs: '1.125rem', md: '1.25rem' }, maxWidth: 720, mb: 2.5 }}
            color="text.secondary"
          >
            Sprawdzimy, ile wody ma Twoja działka i czy grozi jej susza. Wystarczy numer działki
            albo kliknięcie na mapie.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button
              component={RouterLink}
              to="/dodaj-dzialke"
              variant="contained"
              size="large"
              startIcon={<AddLocationAltIcon aria-hidden />}
              sx={{ minHeight: 56, px: 3.5, fontSize: '1.25rem', fontWeight: 700 }}
            >
              Dodaj pierwszą działkę
            </Button>
            <Button
              component={RouterLink}
              to="/"
              variant="outlined"
              size="large"
              sx={{ minHeight: 56, px: 3, fontSize: '1.125rem' }}
            >
              Najpierw tylko sprawdź działkę
            </Button>
          </Stack>
          <Typography sx={{ mt: 2, fontSize: '1rem' }} color="text.secondary">
            Działkę dodasz też w każdej chwili w menu po lewej: <b>Dodaj działkę</b> (na telefonie
            pod przyciskiem <b>Menu</b> u góry).
          </Typography>
        </CardContent>
      </Card>

      {/* how it works */}
      <Box
        component="section"
        aria-labelledby="jak-to-dziala-title"
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(3, minmax(0, 1fr))' },
        }}
      >
        <Typography
          id="jak-to-dziala-title"
          variant="h2"
          component="h2"
          sx={{ gridColumn: '1 / -1' }}
        >
          Jak to działa
        </Typography>
        {STEPS.map((step, index) => (
          <Card key={step.title} variant="outlined">
            <CardContent sx={{ display: 'flex', gap: 1.5, p: 2, '&:last-child': { pb: 2 } }}>
              <Box
                aria-hidden
                sx={{
                  flexShrink: 0,
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: alpha(palette.primary.main, 0.12),
                  color: 'primary.main',
                }}
              >
                {step.icon}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '1.125rem' }}>
                  {index + 1}. {step.title}
                </Typography>
                <Typography sx={{ fontSize: '1rem' }} color="text.secondary">
                  {step.text}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* what the dashboard will show (sample data, marked) */}
      <Box component="section" aria-labelledby="podglad-title">
        <Typography id="podglad-title" variant="h2" component="h2" sx={{ mb: 0.5 }}>
          Co zobaczysz tutaj po dodaniu działek
        </Typography>
        <Typography sx={{ fontSize: '1rem', mb: 1.5 }} color="text.secondary">
          Poniżej przykład – Twoje dane pojawią się tu po pierwszym raporcie.
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(3, minmax(0, 1fr))' },
          }}
        >
          <PreviewTile title="Mapa zagrożonych działek">
            <Box
              role="img"
              aria-label="Przykładowa mapa: kropki działek w kolorach suszy"
              sx={{
                position: 'relative',
                height: 140,
                borderRadius: 2,
                bgcolor: alpha(palette.primary.main, 0.06),
                backgroundImage: `linear-gradient(${alpha(palette.text.primary, 0.06)} 1px, transparent 1px), linear-gradient(90deg, ${alpha(palette.text.primary, 0.06)} 1px, transparent 1px)`,
                backgroundSize: '28px 28px',
              }}
            >
              {SAMPLE_DOTS.map((dot) => (
                <Box
                  key={`${dot.x}-${dot.y}`}
                  sx={{
                    position: 'absolute',
                    left: `${dot.x}%`,
                    top: `${dot.y}%`,
                    width: 16,
                    height: 16,
                    ml: '-8px',
                    mt: '-8px',
                    borderRadius: '50%',
                    border: '3px solid #fff',
                    bgcolor: palette.drought[dot.value],
                    boxShadow: 1,
                  }}
                />
              ))}
            </Box>
          </PreviewTile>
          <PreviewTile title="Stan suszy">
            <Stack spacing={1}>
              {SAMPLE_COUNTS.map(([value, count]) => (
                <Stack
                  key={value}
                  direction="row"
                  sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
                >
                  <StatusBadge kind="drought" value={value} label={DROUGHT_WORDS[value]} />
                  <Typography sx={{ fontSize: '1.125rem' }}>{count}</Typography>
                </Stack>
              ))}
            </Stack>
          </PreviewTile>
          <PreviewTile title="Bilans wody">
            <Box
              component="svg"
              viewBox="0 0 200 100"
              role="img"
              aria-label="Przykładowy wykres bilansu wody w ciągu 60 dni"
              sx={{ width: '100%', height: 140, display: 'block' }}
            >
              <path
                d="M0 40 C40 30 60 50 100 45 S160 30 200 38 L200 75 C160 80 140 70 100 78 S40 85 0 72 Z"
                fill={alpha(palette.primary.main, 0.15)}
              />
              <path
                d="M0 55 C30 50 60 62 100 66 S150 80 200 88"
                fill="none"
                stroke={palette.drought.severe}
                strokeWidth={3}
                strokeLinecap="round"
              />
              <path
                d="M0 56 C40 52 60 60 100 60 S160 52 200 56"
                fill="none"
                stroke={palette.primary.main}
                strokeWidth={2}
                strokeDasharray="6 5"
              />
            </Box>
          </PreviewTile>
        </Box>
      </Box>
    </Stack>
  );
}
