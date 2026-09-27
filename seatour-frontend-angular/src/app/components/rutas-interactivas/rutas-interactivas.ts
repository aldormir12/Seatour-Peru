import { Component, DestroyRef, inject, signal } from '@angular/core';
import { Tour, Tours } from '../../services/tours';
import { CategoriasService } from '../../services/categorias.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

type Coordenadas = [x: number, y: number];

interface ControlesCurva {
  control1: Coordenadas;
  control2: Coordenadas;
}

interface RutaMapa {
  puntosInteres?: PuntoMapa['id'][];
  intermedios: (ControlesCurva & { hasta: Coordenadas })[];
  final: ControlesCurva;
}

interface RecorridoMapa {
  puntoSalida: PuntoMapa['id'];
  puntoLlegada: PuntoMapa['id'];
  ruta: RutaMapa;
}
type RolPuntoMapa = 'puerto' | 'interes' | 'destino';
type IconoDestino = 'ballena' | 'tortuga' | 'pez' | 'arrecife';

interface PuntoMapa {
  id: string;
  nombre: string;

  x: number;
  y: number;

  tipo: 'costa' | 'mar';
  rol: RolPuntoMapa;
  icono?: IconoDestino;
}

@Component({
  selector: 'app-rutas-interactivas',
  imports: [RouterLink],
  templateUrl: './rutas-interactivas.html',
  styleUrl: './rutas-interactivas.css'
})
export class RutasInteractivas {

  private readonly servicio = inject(Tours);
  private readonly categoriasService = inject(CategoriasService);
  private readonly destroyRef = inject(DestroyRef);
  readonly tours = signal<Tour[]>([]);
  readonly seleccionado = signal<Tour | null>(null);
  readonly cargando = signal(true);
  readonly errorCarga = signal('');
  readonly categorias = signal<Record<number, string>>({});
  urlImagen(ruta: string): string { return this.servicio.urlImagen(ruta); }

  recorridos: RecorridoMapa[] = [
    {

      puntoSalida: 'mancora',
      puntoLlegada: 'ballenas',
      ruta: {
        puntosInteres: ['observacion-marina'],
        intermedios: [
          { control1: [1120, 170], control2: [1010, 220], hasta: [920, 310] },
          { control1: [850, 380], control2: [755, 385], hasta: [690, 330] }
        ],
        final: { control1: [620, 270], control2: [650, 190] }
      }
    },

    {

      puntoSalida: 'organos',
      puntoLlegada: 'arrecifes',
      ruta: {
        intermedios: [
          { control1: [1110, 290], control2: [1010, 340], hasta: [930, 415] }
        ],
        final: { control1: [865, 470], control2: [805, 485] }
      }
    },

    {

      puntoSalida: 'cabo-blanco',
      puntoLlegada: 'isla-foca',
      ruta: {
        intermedios: [
          { control1: [1025, 520], control2: [965, 555], hasta: [910, 610] }
        ],
        final: { control1: [870, 650], control2: [825, 660] }
      }
    },
    {

  puntoSalida: 'nuro',
  puntoLlegada: 'tortugas',

  ruta: {
    intermedios: [],
    final: {
      control1: [980, 400],
      control2: [900, 420]
    }
  }
}
  ];

  puntos: PuntoMapa[] = [

    /* COSTA */

    {
      id: 'mancora',
      nombre: 'Máncora',
      x: 1160,
      y: 138,
      tipo: 'costa',
      rol: 'puerto'
    },

    {
      id: 'organos',
      nombre: 'Los Órganos',
      x: 1100,
      y: 280,
      tipo: 'costa',
      rol: 'puerto'
    },

    {
      id: 'nuro',
      nombre: 'El Ñuro',
      x: 1070,
      y: 385,
      tipo: 'costa',
      rol: 'puerto'
    },

    {
      id: 'cabo-blanco',
      nombre: 'Cabo Blanco',
      x: 960,
      y: 550,
      tipo: 'costa',
      rol: 'puerto'
    },

    /* MAR */

    {
      id: 'observacion-marina',
      nombre: 'Observación marina',
      // Mitad de la segunda curva Bézier de la ruta de avistamiento.
      x: 803.125,
      y: 366.875,
      tipo: 'mar',
      rol: 'interes'
    },

    {
      id: 'tortugas',
      nombre: 'Zona de tortugas',
      x: 850,
      y: 385,
      tipo: 'mar',
      rol: 'destino',
      icono: 'tortuga'
    },

    {
      id: 'ballenas',
      nombre: 'Zona de avistamiento',
      x: 735,
      y: 145,
      tipo: 'mar',
      rol: 'destino',
      icono: 'ballena'
    },

    {
      id: 'arrecifes',
      nombre: 'Arrecifes naturales',
      x: 760,
      y: 455,
      tipo: 'mar',
      rol: 'destino',
      icono: 'arrecife'
    },

    {
      id: 'isla-foca',
      nombre: 'Isla Foca',
      x: 790,
      y: 630,
      tipo: 'mar',
      rol: 'destino',
      icono: 'pez'
    }
  ];

  recorridoSeleccionado = this.recorridos[0];

  get rutaSeleccionada(): string {
    const tour = this.recorridoSeleccionado;
    const salida = this.puntos.find(punto => punto.id === tour.puntoSalida);
    const llegada = this.puntos.find(punto => punto.id === tour.puntoLlegada);

    if (!salida || !llegada) {
      return '';
    }

    // Solo los controles e intermedios son fijos; los extremos vienen del mapa.
    const tramos = [
      ...tour.ruta.intermedios,
      { ...tour.ruta.final, hasta: [llegada.x, llegada.y] }
    ];

    return `M${salida.x} ${salida.y} ` + tramos.map(tramo =>
      `C${tramo.control1.join(' ')} ${tramo.control2.join(' ')} ${tramo.hasta.join(' ')}`
    ).join(' ');
  }

  constructor() {
    this.cargarToursBackend();
  }
cargarToursBackend(): void {
  this.cargando.set(true);
  this.errorCarga.set('');
  this.servicio.listarActivos().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
    next: tours => {
      const visibles = tours.filter(tour => tour.activo).slice(0, 4);
      this.tours.set(visibles);
      this.seleccionado.set(visibles[0] ?? null);
      this.recorridoSeleccionado = this.recorridos[0];
      this.cargando.set(false);
    },
    error: () => {
      this.tours.set([]);
      this.seleccionado.set(null);
      this.errorCarga.set('No se pudieron cargar los tours.');
      this.cargando.set(false);
    }
  });
  this.categoriasService.listarActivas().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
    next: categorias => this.categorias.set(Object.fromEntries(categorias.map(c => [c.id, c.nombre]))),
    error: () => this.categorias.set({})
  });
}
formatearDuracion(minutos: number): string {
  if (minutos % 60 === 0) {
    const horas = minutos / 60;

    return horas === 1
      ? '1 hora'
      : `${horas} horas`;
  }

  const horas = Math.floor(minutos / 60);
  const minutosRestantes = minutos % 60;

  if (horas === 0) {
    return `${minutosRestantes} min`;
  }

  return `${horas} h ${minutosRestantes} min`;
}

  seleccionarTour(tour: Tour): void {
    const indice = this.tours().findIndex(item => item.id === tour.id);
    if (indice < 0 || !this.recorridos[indice]) return;
    this.seleccionado.set(tour);
    // Asociación visual temporal por posición, sin modificar los datos del tour.
    this.recorridoSeleccionado = this.recorridos[indice];
  }

  seleccionarPunto(punto: PuntoMapa): void {
    const utilizaPunto = (tour: RecorridoMapa) =>
      tour.puntoSalida === punto.id || tour.puntoLlegada === punto.id ||
      (punto.rol === 'interes' && (tour.ruta.puntosInteres?.includes(punto.id) ?? false));

    // Un punto compartido no debe cambiar un tour que ya lo utiliza.
    const tour = utilizaPunto(this.recorridoSeleccionado)
      ? this.recorridoSeleccionado
      : this.recorridos.find(utilizaPunto);

    if (tour) {
      this.recorridoSeleccionado = tour;
      this.seleccionado.set(this.tours()[this.recorridos.indexOf(tour)] ?? null);
    }
  }

  puntoEstaActivo(punto: PuntoMapa): boolean {
    return (
      punto.rol === 'puerto' &&
      (punto.id === this.recorridoSeleccionado.puntoSalida ||
        punto.id === this.recorridoSeleccionado.puntoLlegada)
    );
  }

  puntoEstaVisible(punto: PuntoMapa): boolean {
    return punto.rol !== 'interes' ||
      (this.recorridoSeleccionado.ruta.puntosInteres?.includes(punto.id) ?? false);
  }
}
