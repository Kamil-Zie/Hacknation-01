// T-084 Easy-to-read text (ETR): what Kropelka is and how to use it, in short sentences
import { Box, Stack, Typography } from '@mui/material';

const SECTIONS: { title: string; lines: string[] }[] = [
  {
    title: 'Co to jest Kropelka?',
    lines: [
      'Kropelka to strona internetowa dla rolników.',
      'Kropelka sprawdza, czy na Twojej działce jest dość wody.',
      'Kropelka mówi, co możesz zrobić, żeby woda została na polu.',
    ],
  },
  {
    title: 'Jak sprawdzić działkę?',
    lines: [
      'Zaloguj się albo załóż konto.',
      'Wpisz numer działki. Numer jest na wypisie z rejestru gruntów.',
      'Możesz też kliknąć swoją działkę na mapie.',
      'Wybierz, co rośnie na działce.',
      'Wybierz dzień.',
      'Kliknij „Pokaż raport o wodzie”.',
    ],
  },
  {
    title: 'Co jest w raporcie?',
    lines: [
      'Raport mówi, czy jest susza.',
      'Raport mówi, ile wody brakuje w glebie.',
      'Raport podpowiada, co zrobić najpierw.',
      'Raport możesz wydrukować albo zapisać jako PDF.',
    ],
  },
  {
    title: 'Jak ułatwić sobie czytanie?',
    lines: [
      'Na górze strony są przyciski A A A.',
      'Kliknij większe A, żeby powiększyć tekst.',
      'Kliknij „Wysoki kontrast”, żeby tekst był bardziej wyraźny.',
    ],
  },
];

export function EasyReadPage() {
  return (
    <Stack spacing={4} sx={{ maxWidth: 800 }}>
      <Typography variant="h1" component="h1">
        Tekst łatwy do czytania
      </Typography>
      {SECTIONS.map((section) => (
        <Box component="section" key={section.title}>
          <Typography variant="h2" component="h2" sx={{ mb: 1.5 }}>
            {section.title}
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 3, '& li': { fontSize: '1.25rem', mb: 1 } }}>
            {section.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </Box>
        </Box>
      ))}
    </Stack>
  );
}
