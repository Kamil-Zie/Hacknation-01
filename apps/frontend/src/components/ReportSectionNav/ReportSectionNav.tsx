// UI-S-003 Report section navigation (chips on xs/md, vertical list on lg)
import { Box, Chip, List, ListItemButton, ListItemText } from '@mui/material';
import { useState } from 'react';

export const REPORT_SECTIONS = [
  { id: 'co-zrobic', label: 'Co zrobić' },
  { id: 'podatnosc', label: 'Podatność i przyczyny' },
  { id: 'stan-wody', label: 'Stan wody' },
  { id: 'zrodla', label: 'Źródła i ograniczenia' },
] as const;

export function ReportSectionNav() {
  const [activeId, setActiveId] = useState<string>(REPORT_SECTIONS[0].id);

  return (
    <Box component="nav" aria-label="Spis sekcji raportu" className="no-print">
      <Box
        sx={{
          display: { xs: 'flex', lg: 'none' },
          gap: 1,
          overflowX: 'auto',
          py: 0.5,
          maxWidth: '100%',
          // Scrollbar hidden: the cut-off last chip already signals horizontal scroll.
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {REPORT_SECTIONS.map((section) => (
          <Chip
            key={section.id}
            component="a"
            href={`#${section.id}`}
            clickable
            onClick={() => setActiveId(section.id)}
            aria-current={activeId === section.id ? 'location' : undefined}
            label={section.label}
            variant={activeId === section.id ? 'filled' : 'outlined'}
            color={activeId === section.id ? 'primary' : 'default'}
            sx={{ minHeight: 44, flexShrink: 0, fontWeight: 600 }}
          />
        ))}
      </Box>
      <List sx={{ display: { xs: 'none', lg: 'block' } }} disablePadding>
        {REPORT_SECTIONS.map((section) => (
          <ListItemButton
            key={section.id}
            component="a"
            href={`#${section.id}`}
            selected={activeId === section.id}
            aria-current={activeId === section.id ? 'location' : undefined}
            onClick={() => setActiveId(section.id)}
            sx={{ minHeight: 44, borderRadius: 2 }}
          >
            <ListItemText primary={section.label} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
}
