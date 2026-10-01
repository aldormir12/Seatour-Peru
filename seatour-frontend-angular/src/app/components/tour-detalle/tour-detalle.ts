import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, Subscription } from 'rxjs';
import { Tour, Tours } from '../../services/tours';
import { UbicacionTour } from '../ubicacion-tour/ubicacion-tour';
import { CategoriasService } from '../../services/categorias.service';
import { SalidaProgramada, SalidasService } from '../../services/salidas.service';

@Component({
  selector: 'app-tour-detalle',
  imports: [CurrencyPipe, DatePipe, RouterLink, UbicacionTour],
  templateUrl: './tour-detalle.html',
  styleUrl: './tour-detalle.css'
})
export class TourDetalle {
  readonly toursService = inject(Tours);
  private readonly categoriasService = inject(CategoriasService);
  private readonly salidasService = inject(SalidasService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private peticion?: Subscription;
  private peticionSalidas?: Subscription;
  private id = 0;
  readonly tour = signal<Tour | null>(null);
  readonly categoria = signal('');
  readonly cargando = signal(false);
  readonly error = signal('');
  readonly imagenFallida = signal(false);
  readonly salidas = signal<SalidaProgramada[]>([]);
  readonly cargandoSalidas = signal(false);
  readonly errorSalidas = signal('');

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.id = Number(params.get('id'));
      this.cargar();
    });
  }

  cargar(): void {
    this.peticion?.unsubscribe();
    this.peticionSalidas?.unsubscribe();
    this.tour.set(null);
    this.salidas.set([]);
    this.error.set('');
    this.errorSalidas.set('');
    this.imagenFallida.set(false);
    this.cargando.set(false);
    this.cargandoSalidas.set(false);
    if (!Number.isSafeInteger(this.id) || this.id <= 0) {
      this.error.set('El identificador del tour no es válido.');
      return;
    }
    this.cargando.set(true);
    this.peticion = forkJoin({
      tours: this.toursService.listarActivos(),
      categorias: this.categoriasService.listarActivas()
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: datos => {
        const tour = datos.tours.find(t => t.id === this.id && t.activo) ?? null;
        this.tour.set(tour);
        this.categoria.set(tour
          ? datos.categorias.find(c => c.id === tour.categoriaId)?.nombre ?? `Categoría ${tour.categoriaId}`
          : '');
        this.cargando.set(false);
        if (tour) this.cargarSalidas();
      },
      error: () => {
        this.error.set('No pudimos cargar el tour. Inténtalo nuevamente.');
        this.cargando.set(false);
      }
    });
  }

  cargarSalidas(): void {
    const tour = this.tour();
    if (!tour || this.cargandoSalidas()) return;
    this.peticionSalidas?.unsubscribe();
    this.cargandoSalidas.set(true);
    this.errorSalidas.set('');
    this.peticionSalidas = this.salidasService.listarDisponiblesPorTour(tour.id)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: salidas => {
          this.salidas.set([...salidas].sort((a, b) =>
            `${a.fecha}T${a.horaSalida}`.localeCompare(`${b.fecha}T${b.horaSalida}`)));
          this.cargandoSalidas.set(false);
        },
        error: () => {
          this.errorSalidas.set('No pudimos consultar las salidas disponibles. Inténtalo nuevamente.');
          this.cargandoSalidas.set(false);
        }
      });
  }
}
