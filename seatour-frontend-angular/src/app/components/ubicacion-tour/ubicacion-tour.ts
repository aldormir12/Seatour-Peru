import { Component, Input } from '@angular/core';
import { ZonaMaritimaTour } from '../../services/tours';
import { ClimaTour } from './clima-tour';

@Component({
  selector: 'app-ubicacion-tour',
  standalone: true,
  imports: [ClimaTour],
  template: `<span class="mt-1 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-600" aria-label="Ubicación del tour">{{ zonaMaritima ? etiquetas[zonaMaritima] : 'Ubicación pendiente' }}</span><app-clima-tour [zonaMaritima]="zonaMaritima" [fechaHora]="fechaHora" />`
})
export class UbicacionTour {
  @Input() fechaHora: string | null | undefined;
  @Input() zonaMaritima: ZonaMaritimaTour | null | undefined;
  readonly etiquetas: Record<ZonaMaritimaTour, string> = {
    MANCORA: 'Máncora', LOS_ORGANOS: 'Los Órganos', CABO_BLANCO: 'Cabo Blanco', TALARA: 'Talara'
  };
}
