// UI-C-010 ReportActions
import LinkIcon from '@mui/icons-material/Link';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PrintIcon from '@mui/icons-material/Print';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import {
  Alert,
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  TextField,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface ReportActionsProps {
  reportId: string;
}

export function ReportActions({ reportId }: ReportActionsProps) {
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  const printPath = `/report/${encodeURIComponent(reportId)}/print`;

  const copyLink = async () => {
    try {
      if (!navigator.clipboard) throw new Error('clipboard unavailable');
      // T-083 writeText can hang without a browser permission answer: give up after 1.5 s and show the link
      await Promise.race([
        navigator.clipboard.writeText(window.location.href),
        new Promise<never>((_, reject) =>
          window.setTimeout(() => reject(new Error('clipboard timeout')), 1500),
        ),
      ]);
      setFallbackUrl(null);
      setMessage('Skopiowano link do raportu');
    } catch {
      setFallbackUrl(window.location.href);
      setMessage('Skopiuj link ręcznie');
    }
  };

  // Desktop: three outlined buttons (hover = filled primary); phone: bottom bar with PDF + print + menu
  const outlinedSx = (theme: Theme) => ({
    minHeight: { xs: 56, md: 54 },
    borderRadius: '12px',
    borderColor: theme.palette.kropla.iconMuted,
    bgcolor: 'background.paper',
    color: 'text.primary',
    fontSize: '1.0625rem',
    '&:hover': {
      bgcolor: 'primary.main',
      borderColor: 'primary.main',
      color: theme.palette.common.white,
    },
  });
  const desktopOnlySx = { display: { xs: 'none', md: 'inline-flex' } };

  return (
    <>
      <Paper
        role="toolbar"
        aria-label="Akcje raportu"
        square
        elevation={0}
        className="no-print"
        sx={{
          display: 'flex',
          gap: 1.25,
          flexWrap: 'wrap',
          justifyContent: { md: 'flex-end' },
          position: { xs: 'fixed', md: 'static' },
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: (theme) => theme.zIndex.appBar,
          px: { xs: 2, md: 0 },
          pt: { xs: 1.25, md: 0 },
          pb: { xs: 'calc(10px + env(safe-area-inset-bottom))', md: 0 },
          borderTop: { xs: 1, md: 0 },
          borderColor: 'divider',
          bgcolor: { xs: 'background.paper', md: 'transparent' },
          // Labels stay on one line on 360 px (two buttons + "Więcej" in the bottom bar).
          '& > .MuiButton-root': {
            flex: { xs: 1, md: '0 0 auto' },
            whiteSpace: 'nowrap',
            px: { xs: 1, md: 2 },
          },
        }}
      >
        <Button
          variant="contained"
          startIcon={<PictureAsPdfIcon />}
          onClick={() => navigate(`${printPath}?pdf=1`)}
          sx={{ minHeight: 56, borderRadius: '12px', display: { md: 'none' } }}
        >
          Pobierz PDF
        </Button>
        <Button
          variant="outlined"
          startIcon={<PictureAsPdfIcon />}
          onClick={() => navigate(`${printPath}?pdf=1`)}
          sx={[outlinedSx, desktopOnlySx]}
        >
          Pobierz PDF
        </Button>
        <Button
          variant="outlined"
          startIcon={<PrintIcon />}
          onClick={() => navigate(printPath)}
          sx={outlinedSx}
        >
          Drukuj
        </Button>
        <Button
          variant="outlined"
          startIcon={<LinkIcon />}
          onClick={copyLink}
          sx={[outlinedSx, desktopOnlySx]}
        >
          Wyślij link
        </Button>
        <IconButton
          aria-label="Więcej akcji"
          aria-haspopup="menu"
          onClick={(e) => setMenuAnchor(e.currentTarget)}
          sx={{ display: { xs: 'inline-flex', md: 'none' }, width: 56, height: 56, flexShrink: 0 }}
        >
          <MoreVertIcon />
        </IconButton>
      </Paper>
      <Menu anchorEl={menuAnchor} open={menuAnchor !== null} onClose={() => setMenuAnchor(null)}>
        <MenuItem
          sx={{ minHeight: 48 }}
          onClick={() => {
            setMenuAnchor(null);
            void copyLink();
          }}
        >
          Wyślij link
        </MenuItem>
        <MenuItem
          sx={{ minHeight: 48 }}
          onClick={() => {
            setMenuAnchor(null);
            navigate('/');
          }}
        >
          Sprawdź inną działkę
        </MenuItem>
      </Menu>
      <Snackbar
        open={message !== null}
        autoHideDuration={fallbackUrl ? null : 3000}
        onClose={(_, reason) => reason !== 'clickaway' && setMessage(null)}
        sx={{ bottom: { xs: 88, md: 24 } }}
      >
        <Alert
          severity={fallbackUrl ? 'info' : 'success'}
          onClose={() => setMessage(null)}
          sx={{ width: '100%' }}
        >
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
