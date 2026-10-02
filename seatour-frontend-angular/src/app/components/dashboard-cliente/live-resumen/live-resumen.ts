import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  OnInit,
  OnDestroy,
  PLATFORM_ID,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  ClienteLiveSalidasService,
  LiveSalida
} from '../../../services/cliente-live-salidas.service';

@Component({
  selector: 'app-live-resumen',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './live-resumen.html'
})
export class LiveResumen implements OnInit, OnDestroy {
  private refresco?: ReturnType<typeof setInterval>;
  private solicitudPendiente = false;

  private readonly servicio = inject(ClienteLiveSalidasService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly navegador = isPlatformBrowser(inject(PLATFORM_ID));

  readonly salidas = signal<LiveSalida[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly imagenesFallidas = signal(new Set<number>());

  ngOnInit(): void {
    if (!this.navegador) return;
    this.consultar();
    this.refresco = setInterval(() => this.consultar(), 5_000);
  }

  ngOnDestroy(): void { clearInterval(this.refresco); }

  private consultar(): void {
    if (this.solicitudPendiente) return;
    this.solicitudPendiente = true;
    this.servicio
      .listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: salidas => {
          this.solicitudPendiente = false;
          this.error.set('');
          this.salidas.set(salidas);
          this.cargando.set(false);
        },
        error: () => {
          this.solicitudPendiente = false;
          this.salidas.set([]);
          this.error.set('No se pudieron consultar las salidas en vivo.');
          this.cargando.set(false);
        }
      });
  }

  imagenFallida(id: number): void {
    this.imagenesFallidas.update(
      ids => new Set([...ids, id])
    );
  }

  zona(zona: string | null): string {
    const nombres: Record<string, string> = {
      MANCORA: 'Máncora',
      LOS_ORGANOS: 'Los Órganos',
      CABO_BLANCO: 'Cabo Blanco',
      TALARA: 'Talara'
    };

    return zona
      ? nombres[zona] ?? zona.replaceAll('_', ' ')
      : 'Zona no disponible';
  }

  hora(inicio: string | null): string {
    if (!inicio) return 'No disponible';

    const fecha = new Date(
      /(?:Z|[+-]\d{2}:\d{2})$/.test(inicio)
        ? inicio
        : `${inicio}-05:00`
    );

    if (Number.isNaN(fecha.getTime())) {
      return 'No disponible';
    }

    return new Intl.DateTimeFormat('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Lima'
    }).format(fecha);
  }
}
