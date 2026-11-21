// T-052 UI-S-001 ExampleParcelButton: one click searches the demo parcel (Bronowice)
import { Button } from '@mui/material';

export const EXAMPLE_PARCEL_ID = '061409_2.0009.612';

interface ExampleParcelButtonProps {
  disabled?: boolean;
  onSelect: (parcelId: string) => void;
}

export function ExampleParcelButton({ disabled = false, onSelect }: ExampleParcelButtonProps) {
  return (
    <Button
      variant="text"
      disabled={disabled}
      onClick={() => onSelect(EXAMPLE_PARCEL_ID)}
      sx={{ minHeight: 44, alignSelf: 'flex-start' }}
    >
      Wypróbuj na przykładowej działce
    </Button>
  );
}
