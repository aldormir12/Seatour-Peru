// Puntos costeros de referencia; Marine selecciona la celda de mar más cercana.
export const ZONAS_MARITIMAS = [
  { id: 'mancora', nombre: 'Máncora', latitud: -4.107, longitud: -81.05 },
  { id: 'los-organos', nombre: 'Los Órganos', latitud: -4.179, longitud: -81.131 },
  { id: 'el-nuro', nombre: 'El Ñuro', latitud: -4.213, longitud: -81.173 },
  { id: 'cabo-blanco', nombre: 'Cabo Blanco', latitud: -4.25, longitud: -81.231 },
  { id: 'talara', nombre: 'Talara', latitud: -4.58, longitud: -81.28 }
] as const;
export type ZonaMaritima = typeof ZONAS_MARITIMAS[number];
export const ZONA_STORAGE_KEY = 'seatour_zona_maritima';
