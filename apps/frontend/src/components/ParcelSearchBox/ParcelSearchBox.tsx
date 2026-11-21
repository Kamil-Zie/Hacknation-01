// UI-C-018 Parcel search with history hints for the sidebar [T-087] (stub from coord-1, owner T-087 fills it in)
export interface ParcelSearchBoxProps {
  // Called after navigation, so the mobile drawer can close
  onNavigate?: () => void;
}

export function ParcelSearchBox({ onNavigate }: ParcelSearchBoxProps) {
  void onNavigate;
  return null;
}
