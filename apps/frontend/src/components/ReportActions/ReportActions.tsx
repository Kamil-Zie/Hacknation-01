// UI-C-010 ReportActions
import AddIcon from '@mui/icons-material/Add';
import LinkIcon from '@mui/icons-material/Link';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PrintIcon from '@mui/icons-material/Print';
import { Alert, Box, Button, Paper, Snackbar, TextField } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface ReportActionsProps {
  reportId: string;
}

export function ReportActions({ reportId }: ReportActionsProps) {
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  const printPath = `/report/${encodeURIComponent(reportId)}/print`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setFallbackUrl(null);
      setMessage('Skopiowano link do raportu');
    } catch {
      setFallbackUrl(window.location.href);
      setMessage('Skopiuj link ręcznie');
    }
  };

  const buttonSx = { minHeight: 44 };
  const secondarySx = { ...buttonSx, display: { xs: 'none', md: 'inline-flex' } };

  return (
    <>
      <Paper
        component="nav"
        aria-label="Akcje raportu"
        square
        elevation={0}
        className="no-print"
        sx={{
          display: 'flex',
          gap: 1,
          flexWrap: 'wrap',
          position: { xs: 'fixed', md: 'static' },
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: (theme) => theme.zIndex.appBar,
          px: { xs: 2, md: 0 },
          pt: { xs: 1, md: 0 },
          pb: { xs: 'calc(8px + env(safe-area-inset-bottom))', md: 0 },
          borderTop: { xs: 1, md: 0 },
          borderColor: 'divider',
          bgcolor: { xs: 'background.paper', md: 'transparent' },
          '& > button': { flex: { xs: 1, md: '0 0 auto' } },
        }}
      >
        <Button
          variant="contained"
          startIcon={<PictureAsPdfIcon />}
          onClick={() => navigate(`${printPath}?pdf=1`)}
          sx={buttonSx}
        >
          Pobierz PDF
        </Button>
        <Button
          variant="outlined"
          startIcon={<PrintIcon />}
          onClick={() => navigate(printPath)}
          sx={buttonSx}
        >
          Drukuj
        </Button>
        <Button variant="outlined" startIcon={<LinkIcon />} onClick={copyLink} sx={secondarySx}>
          Kopiuj link
        </Button>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => navigate('/')}
          sx={secondarySx}
        >
          Nowa analiza
        </Button>
      </Paper>
      <Snackbar
        open={message !== null}
        autoHideDuration={fallbackUrl ? null : 3000}
        onClose={(_, reason) => reason !== 'clickaway' && setMessage(null)}
        sx={{ bottom: { xs: 88, md: 24 } }}
      >
        <Alert severity="success" onClose={() => setMessage(null)} sx={{ width: '100%' }}>
          {message}
          {fallbackUrl && (
            <Box sx={{ mt: 1 }}>
              <TextField
                size="small"
                fullWidth
                value={fallbackUrl}
                onFocus={(e) => e.target.select()}
                slotProps={{ htmlInput: { readOnly: true, 'aria-label': 'Link do raportu' } }}
              />
            </Box>
          )}
        </Alert>
      </Snackbar>
    </>
  );
}
