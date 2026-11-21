// T-084 Accessibility statement template (structure of the Polish act on digital accessibility); [do uzupełnienia] = content from the owner
import { Box, Link, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

import { srOnly } from '@/app/a11yStyles';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box component="section">
      <Typography variant="h2" component="h2" sx={{ mb: 1.5 }}>
        {title}
      </Typography>
      <Stack spacing={1.5}>{children}</Stack>
    </Box>
  );
}

export function A11yStatementPage() {
  return (
    <Stack spacing={4} sx={{ maxWidth: 900 }}>
      <Typography variant="h1" component="h1">
        Deklaracja dostępności
      </Typography>
      <Typography>
        Zespół HackNation zobowiązuje się zapewnić dostępność aplikacji Kropelka zgodnie z
        wytycznymi WCAG 2.1 na poziomie AA. Deklaracja dotyczy aplikacji internetowej Kropelka.
      </Typography>
      <Box component="dl" sx={{ m: 0, '& dt': { fontWeight: 700 }, '& dd': { m: 0, mb: 1.5 } }}>
        <dt>Data publikacji aplikacji</dt>
        <dd>2026-11-22</dd>
        <dt>Data ostatniej istotnej aktualizacji</dt>
        <dd>2026-11-22</dd>
        <dt>Data sporządzenia deklaracji</dt>
        <dd>2026-11-21 (samoocena zespołu i test automatyczny axe-core)</dd>
      </Box>

      <Section title="Status pod względem zgodności">
        <Typography>
          Aplikacja jest częściowo zgodna z WCAG 2.1 AA z powodu niezgodności wymienionych poniżej.
        </Typography>
      </Section>

      <Section title="Treści niedostępne">
        <Box component="ul" sx={{ m: 0, pl: 3 }}>
          <li>
            Mapa działki (OpenStreetMap i zdjęcia satelitarne) nie jest w pełni dostępna dla
            czytników ekranu. Te same informacje (numer, gmina, powierzchnia) są podane tekstem obok
            mapy.
          </li>
          <li>
            Wykres bilansu wodnego ma opis tekstowy i podpis z najważniejszą wartością, ale nie ma
            tabeli z danymi dzień po dniu.
          </li>
          <li>[do uzupełnienia po audycie ręcznym]</li>
        </Box>
      </Section>

      <Section title="Ułatwienia w aplikacji">
        <Box component="ul" sx={{ m: 0, pl: 3 }}>
          <li>Trzy rozmiary tekstu i tryb wysokiego kontrastu na pasku u góry każdej strony.</li>
          <li>Link „Przejdź do treści” i obsługa całej aplikacji z klawiatury.</li>
          <li>Tekst łatwy do czytania i mapa strony.</li>
          <li>
            Aplikacja respektuje systemowe ustawienia wysokiego kontrastu i ograniczenia ruchu.
          </li>
        </Box>
      </Section>

      <Section title="Informacje zwrotne i dane kontaktowe">
        <Typography>
          Problemy z dostępnością prosimy zgłaszać: [imię i nazwisko osoby kontaktowej – do
          uzupełnienia], e-mail: [adres – do uzupełnienia], telefon: [numer – do uzupełnienia].
        </Typography>
        <Typography>
          Każdy ma prawo wystąpić z żądaniem zapewnienia dostępności cyfrowej aplikacji albo jej
          elementu. Odpowiadamy niezwłocznie, nie później niż w ciągu 7 dni od otrzymania żądania.
        </Typography>
      </Section>

      <Section title="Procedura odwoławcza">
        <Typography>
          Jeżeli żądanie zostanie odrzucone, można złożyć skargę do [podmiot – do uzupełnienia], a
          po wyczerpaniu tej procedury wniosek do{' '}
          <Link
            href="https://www.rpo.gov.pl/"
            target="_blank"
            rel="noopener noreferrer"
            underline="always"
          >
            Rzecznika Praw Obywatelskich
            <Box component="span" sx={srOnly}>
              {' '}
              (otwiera się w nowej karcie)
            </Box>
          </Link>
          .
        </Typography>
      </Section>
    </Stack>
  );
}
