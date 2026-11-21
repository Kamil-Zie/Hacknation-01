// UI-C-012 Expandable: animated expand/collapse (MUI Collapse ~220 ms, none with prefers-reduced-motion); print shows all open
import { Box, Collapse, useMediaQuery } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { useId, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';

export interface ExpandableProps {
  /** Always visible part; clicking it toggles the details */
  header: ReactNode;
  children: ReactNode;
  /** Styles of the clickable header */
  headerSx?: SxProps<Theme>;
  /** Styles of the outer wrapper */
  sx?: SxProps<Theme>;
  /** Id of the outer wrapper (anchor) */
  id?: string;
  className?: string;
  /** Receives the open state, e.g. to render the MoreButton */
  renderHeader?: (open: boolean) => ReactNode;
}

const DURATION_MS = 220;

export function Expandable({
  header,
  children,
  headerSx,
  sx,
  id,
  className,
  renderHeader,
}: ExpandableProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  const toggle = () => setOpen((value) => !value);
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggle();
    }
  };

  return (
    <Box id={id} className={className} sx={sx}>
      <Box
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
        onKeyDown={onKeyDown}
        sx={[
          (theme) => ({
            cursor: 'pointer',
            '&:focus-visible': {
              outline: `3px solid ${theme.palette.primary.main}`,
              outlineOffset: 2,
            },
          }),
          ...(Array.isArray(headerSx) ? headerSx : headerSx ? [headerSx] : []),
        ]}
      >
        {renderHeader ? renderHeader(open) : header}
      </Box>
      <Collapse in={open} timeout={reduceMotion ? 0 : DURATION_MS} id={panelId}>
        {children}
      </Collapse>
    </Box>
  );
}
