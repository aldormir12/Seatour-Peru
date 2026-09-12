import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface TourVisual {
  id: number;
  nombre: string;
  duracion: string;
  origen: string;
  precio: number;
  descripcion: string;
  imagen: string;

  ruta: string;
  puntoActivo: string;
}
interface TourBackend {
  id: number;
  nombre: string;
  descripcion: string;
  duracionMinutos: number;
  precioBase: number;
  activo: boolean;
}
interface PuntoMapa {
  id: string;
  nombre: string;

  x: number;
  y: number;

  tipo: 'costa' | 'mar';

  tourId: number;
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

      ruta:
        'M1260 180 C1120 170 1010 220 920 310 C850 380 755 385 690 330 C620 270 650 190 735 145',

      puntoActivo:
        'ballenas'
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

      ruta:
        'M1215 280 C1110 290 1010 340 930 415 C865 470 805 485 760 455',

      puntoActivo:
        'arrecifes'
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

      ruta:
        'M1105 510 C1025 520 965 555 910 610 C870 650 825 660 790 630',

      puntoActivo:
        'isla-foca'
    }
  ];

  puntos: PuntoMapa[] = [

    /* COSTA */

    {
      id: 'mancora',
      nombre: 'Máncora',
      x: 1260,
      y: 180,
      tipo: 'costa',
      tourId: 1
    },

    {
      id: 'organos',
      nombre: 'Los Órganos',
      x: 1215,
      y: 280,
      tipo: 'costa',
      tourId: 2
    },

    {
      id: 'nuro',
      nombre: 'El Ñuro',
      x: 1165,
      y: 385,
      tipo: 'costa',
      tourId: 2
    },

    {
      id: 'cabo-blanco',
      nombre: 'Cabo Blanco',
      x: 1105,
      y: 510,
      tipo: 'costa',
      tourId: 3
    },

    /* MAR */

    {
      id: 'ballenas',
      nombre: 'Zona de avistamiento',
      x: 735,
      y: 145,
      tipo: 'mar',
      tourId: 1
    },

    {
      id: 'arrecifes',
      nombre: 'Arrecifes naturales',
      x: 760,
      y: 455,
      tipo: 'mar',
      tourId: 2
    },

    {
      id: 'isla-foca',
      nombre: 'Isla Foca',
      x: 790,
      y: 630,
      tipo: 'mar',
      tourId: 3
    }
  ];

  tourSeleccionado = this.tours[0];

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
    const tour = this.tours.find(
      tour => tour.id === punto.tourId
    );

    if (tour) {
      this.seleccionarTour(tour);
    }
  }

  puntoEstaActivo(punto: PuntoMapa): boolean {
    return (
      punto.id === this.tourSeleccionado.puntoActivo ||
      punto.tourId === this.tourSeleccionado.id
    );
  }
}