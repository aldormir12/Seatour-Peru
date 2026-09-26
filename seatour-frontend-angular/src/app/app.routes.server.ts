import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: 'salidas', renderMode: RenderMode.Client },
  { path: 'reservar/:salidaId', renderMode: RenderMode.Client },
  { path: 'mis-reservas', renderMode: RenderMode.Client },
  { path: 'gestion/reservas', renderMode: RenderMode.Client },
  { path: 'reservas/:id', renderMode: RenderMode.Client },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
