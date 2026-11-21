// T-001 Empty placeholder page (replaced by UI-S screens)
import { Container, Typography } from '@mui/material';

export function HomePage() {
  return (
    <Container sx={{ py: { xs: 3, md: 6 } }}>
      <Typography variant="h4" component="h1">
        Kropla
      </Typography>
    </Container>
  );
}
