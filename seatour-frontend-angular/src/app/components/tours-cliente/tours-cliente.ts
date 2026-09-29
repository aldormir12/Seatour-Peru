import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { Tour, Tours } from '../../services/tours';
import { CategoriasService } from '../../services/categorias.service';

@Component({
  selector: 'app-tours-cliente',
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './tours-cliente.html',
  styleUrl: './tours-cliente.css'
})
export class ToursCliente {
  readonly servicio = inject(Tours);
  private readonly categoriasService = inject(CategoriasService);
  private readonly destroyRef = inject(DestroyRef);
  readonly tours = signal<Tour[]>([]);
  readonly categorias = signal<Partial<Record<number, string>>>({});
  readonly cargando = signal(false);
  readonly error = signal('');
  readonly imagenesFallidas = signal<Set<number>>(new Set());

  constructor() { this.cargar(); }

  cargar(): void {
    if (this.cargando()) return;
    this.cargando.set(true);
    this.error.set('');
    forkJoin({
      tours: this.servicio.listarActivos(),
      categorias: this.categoriasService.listarActivas()
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: datos => {
        this.tours.set(datos.tours.filter(tour => tour.activo));
        this.categorias.set(Object.fromEntries(datos.categorias.map(c => [c.id, c.nombre])));
        this.imagenesFallidas.set(new Set());
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No pudimos cargar los tours. Inténtalo nuevamente.');
        this.cargando.set(false);
      }
    });
  }

  imagenFallida(id: number): void {
    this.imagenesFallidas.update(ids => new Set([...ids, id]));
  }
}
