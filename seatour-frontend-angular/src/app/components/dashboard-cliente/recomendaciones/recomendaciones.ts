import { Component, DestroyRef, PLATFORM_ID, inject, signal } from '@angular/core';
import { CurrencyPipe, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { TourDestacado, Tours } from '../../../services/tours';
import { SalidaProgramada, SalidasService } from '../../../services/salidas.service';

interface TourDestacadoConSalida extends TourDestacado {
  proximaSalida: SalidaProgramada | null;
  errorSalida: boolean;
}

@Component({
  selector: 'app-recomendaciones',
  standalone: true,
  imports: [RouterLink, CurrencyPipe],
  templateUrl: './recomendaciones.html',
  styleUrl: './recomendaciones.css'
})
export class RecomendacionesComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly navegador = isPlatformBrowser(inject(PLATFORM_ID));
  readonly toursService = inject(Tours);
  private readonly salidasService = inject(SalidasService);
  readonly toursDestacados = signal<TourDestacadoConSalida[]>([]);
  readonly cargandoTours = signal(false);
  readonly errorTours = signal('');
  readonly imagenesToursFallidas = signal<Set<number>>(new Set());

  constructor() {
    if (!this.navegador) return;
    this.cargarToursDestacados();
  }

  cargarToursDestacados(): void {
    if (this.cargandoTours()) return;
    this.cargandoTours.set(true);
    this.errorTours.set('');
    this.toursService.listarDestacados().pipe(
      switchMap(tours => tours.length === 0 ? of<TourDestacadoConSalida[]>([]) : forkJoin(
        tours.map(tour => this.salidasService.listarDisponiblesPorTour(tour.id).pipe(
          map((salidas): TourDestacadoConSalida => ({
            ...tour,
            proximaSalida: [...salidas].sort((a, b) =>
              `${a.fecha}T${a.horaSalida}`.localeCompare(`${b.fecha}T${b.horaSalida}`)
            )[0] ?? null,
            errorSalida: false
          })),
          catchError(() => of<TourDestacadoConSalida>({
            ...tour, proximaSalida: null, errorSalida: true
          }))
        ))
      )),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: tours => {
        this.toursDestacados.set(tours);
        this.imagenesToursFallidas.set(new Set());
        this.cargandoTours.set(false);
      },
      error: () => {
        this.errorTours.set('No pudimos cargar los tours. Inténtalo nuevamente.');
        this.cargandoTours.set(false);
      }
    });
  }

  marcarImagenTourFallida(id: number): void {
    this.imagenesToursFallidas.update(ids => new Set([...ids, id]));
  }

}
