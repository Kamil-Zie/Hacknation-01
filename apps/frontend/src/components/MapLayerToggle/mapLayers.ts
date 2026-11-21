// UI-C-002 ParcelMap: base map layers (OSM / Esri satellite) and remembered choice
import { useState } from 'react';

export type MapLayer = 'map' | 'satellite';

const STORAGE_KEY = 'kropelka-map-layer';

export const MAP_LAYERS: Record<MapLayer, { url: string; attribution: string; maxZoom: number }> = {
  map: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
  },
};

function readLayer(): MapLayer {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'satellite' ? 'satellite' : 'map';
  } catch {
    return 'map';
  }
}

export function useMapLayer(): [MapLayer, (layer: MapLayer) => void] {
  const [layer, setLayerState] = useState<MapLayer>(readLayer);
  function setLayer(next: MapLayer) {
    setLayerState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage unavailable: the choice just is not remembered
    }
  }
  return [layer, setLayer];
}
