import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

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

interface TourVisual {
  id: number;
  nombre: string;
  duracion: string;
  origen: string;
  precio: number;
  descripcion: string;
  imagen: string;

  puntoSalida: PuntoMapa['id'];
  puntoLlegada: PuntoMapa['id'];
  ruta: RutaMapa;
}
interface TourBackend {
  id: number;
  nombre: string;
  descripcion: string;
  duracionMinutos: number;
  precioBase: number;
  activo: boolean;
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
  imports: [],
  templateUrl: './rutas-interactivas.html',
  styleUrl: './rutas-interactivas.css'
})
export class RutasInteractivas {

  private http = inject(HttpClient);

  tours: TourVisual[] = [
    {
      id: 1,
      nombre: 'Avistamiento de ballenas',
      duracion: '3 horas',
      origen: 'Máncora',
      precio: 150,

      descripcion:
        'Vive la experiencia de observar ballenas jorobadas en las aguas del norte peruano.',

      imagen:
        '/images/tours/ballena.jpg',

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
      id: 2,
      nombre: 'Ruta costera',
      duracion: '4 horas',
      origen: 'Los Órganos',
      precio: 220,

      descripcion:
        'Recorre algunos de los paisajes marítimos más representativos de la costa norte.',

      imagen:
        '/images/tours/ruta-costera.jpg',

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
      id: 3,
      nombre: 'Pesca recreativa',
      duracion: '5 horas',
      origen: 'Cabo Blanco',
      precio: 350,

      descripcion:
        'Una experiencia marítima orientada a la pesca recreativa frente al litoral.',

      imagen:
        '/images/tours/pesca.jpg',

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
  id: 4,
  nombre: 'Nado con tortugas',
  duracion: '3 horas',
  origen: 'El Ñuro',
  precio: 180,

  descripcion:
    'Disfruta una experiencia marítima de observación y nado con tortugas frente a las costas de El Ñuro.',

  imagen:
    '/images/tours/tortugas.jpg',

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

  tourSeleccionado = this.tours[0];

  get rutaSeleccionada(): string {
    const tour = this.tourSeleccionado;
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
  this.http
    .get<TourBackend[]>('http://localhost:8080/api/tours')
    .subscribe({
      next: (respuesta) => {

        console.log('Tours desde Spring Boot:', respuesta);

        respuesta.forEach((tourBackend) => {

          const tourVisual = this.tours.find(
            tour => tour.id === tourBackend.id
          );

          if (tourVisual) {
            tourVisual.nombre = tourBackend.nombre;
            tourVisual.descripcion = tourBackend.descripcion;
            tourVisual.duracion =
              this.formatearDuracion(tourBackend.duracionMinutos);
            tourVisual.precio = tourBackend.precioBase;
          }

        });

        this.tourSeleccionado = this.tours[0];
      },

      error: (error) => {
        console.error('Error al cargar tours:', error);
      }
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

  seleccionarTour(tour: TourVisual): void {
    this.tourSeleccionado = tour;
  }

  seleccionarPunto(punto: PuntoMapa): void {
    const utilizaPunto = (tour: TourVisual) =>
      tour.puntoSalida === punto.id || tour.puntoLlegada === punto.id ||
      (punto.rol === 'interes' && (tour.ruta.puntosInteres?.includes(punto.id) ?? false));

    // Un punto compartido no debe cambiar un tour que ya lo utiliza.
    const tour = utilizaPunto(this.tourSeleccionado)
      ? this.tourSeleccionado
      : this.tours.find(utilizaPunto);

    if (tour) {
      this.seleccionarTour(tour);
    }
  }

  puntoEstaActivo(punto: PuntoMapa): boolean {
    return (
      punto.rol === 'puerto' &&
      (punto.id === this.tourSeleccionado.puntoSalida ||
        punto.id === this.tourSeleccionado.puntoLlegada)
    );
  }

  puntoEstaVisible(punto: PuntoMapa): boolean {
    return punto.rol !== 'interes' ||
      (this.tourSeleccionado.ruta.puntosInteres?.includes(punto.id) ?? false);
  }
}
