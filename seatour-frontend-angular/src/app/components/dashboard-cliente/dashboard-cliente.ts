import { Component, DestroyRef, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, switchMap, tap } from 'rxjs';
import { OceanService, CondicionesOpenMeteo, estadoClima } from '../../services/ocean.service';
import { ZONAS_MARITIMAS, ZONA_STORAGE_KEY, ZonaMaritima } from './zonas-maritimas';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CategoriasService } from '../../services/categorias.service';

interface FeatureItem {
  titulo: string;
  descripcion: string;
  ruta: string;
  icono: 'rutas' | 'tours' | 'reservas';
}

interface CampoBusqueda {
  etiqueta: string;
  tipo: 'date' | 'number' | 'select';
  valor: string | number;
  opciones?: { label: string; value: string }[];
}

interface CondicionMetrica {
  id: string;
  label: string;
  valor: string;
  icono: 'oleaje' | 'viento' | 'visibilidad' | 'temperatura';
  variacion?: 'up' | 'down' | 'stable';
}

interface CondicionActual {
  ubicacion: string;
  actualizado: string;
  temperatura: string;
  estado: string;
  climaIcono: 'sol' | 'otro';
  metricas: CondicionMetrica[];
}

@Component({
  selector: 'app-dashboard-cliente',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard-cliente.html',
  styleUrl: './dashboard-cliente.css'
})
export class DashboardClienteComponent {
  private readonly auth = inject(AuthService);
  private readonly categorias = inject(CategoriasService);
  readonly opcionesIntereses = signal<{ label: string; value: string }[]>([
    { label: 'Todos', value: '' }
  ]);
  readonly errorCategorias = signal('');

  readonly usuario = computed(() => this.auth.usuario());

  readonly hero = {
    eyebrow: 'EL MAR TE ESPERA',
    tituloPrincipal: 'Más que un',
    palabraResaltada: 'tour',
    tituloSecundario: 'una experiencia real',
    descripcion:
      'Descubre, planifica y vive las mejores experiencias marítimas con información real y una experiencia hecha para ti.'
  };

  readonly features: FeatureItem[] = [
    {
      titulo: 'Rutas marítimas',
      descripcion: 'Explora nuestros recorridos',
      ruta: '/app/rutas',
      icono: 'rutas'
    },
    {
      titulo: 'Tours disponibles',
      descripcion: 'Encuentra próximas salidas',
      ruta: '/app/tours',
      icono: 'tours'
    },
    {
      titulo: 'Mis reservas',
      descripcion: 'Gestiona tus experiencias',
      ruta: '/app/mis-reservas',
      icono: 'reservas'
    }
  ];

  readonly camposBusqueda: CampoBusqueda[] = [
    {
      etiqueta: 'Fecha',
      tipo: 'date',
      valor: '2026-09-26'
    },
    {
      etiqueta: 'Personas',
      tipo: 'number',
      valor: 2
    },
    {
      etiqueta: 'Horario',
      tipo: 'select',
      valor: '',
      opciones: [
        { label: 'Cualquiera', value: '' },
        { label: 'Mañana', value: 'manana' },
        { label: 'Tarde', value: 'tarde' }
      ]
    },
    {
      etiqueta: 'Intereses',
      tipo: 'select',
      valor: '',
    }
  ];

  readonly zonas = ZONAS_MARITIMAS;
  private readonly navegador = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly ocean = inject(OceanService);
  private readonly destroyRef = inject(DestroyRef);
  readonly zona = signal<ZonaMaritima>(this.restaurarZona());
  readonly cargando = signal(false);
  readonly condicionActual = signal<CondicionActual>(this.presentar(null, null));
  private readonly cambiosZona = new BehaviorSubject(this.zona());

  constructor() {
    if (!this.navegador) return;
    this.categorias.listarActivas().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: categorias => this.opcionesIntereses.set([
        { label: 'Todos', value: '' },
        ...categorias.filter(categoria => categoria.activo).map(categoria => ({
          label: categoria.nombre, value: String(categoria.id)
        }))
      ]),
      error: () => this.errorCategorias.set('No se pudieron cargar los intereses.')
    });
    this.cambiosZona.pipe(
      tap(() => {
        this.cargando.set(true);
        this.condicionActual.set(this.presentar(null, null));
      }),
      switchMap(zona => this.ocean.consultar(zona)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(({ weather, marine }) => {
      this.condicionActual.set(this.presentar(weather, marine));
      this.cargando.set(false);
    });
  }

  cambiarZona(id: string): void {
    const zona = this.zonas.find(z => z.id === id);
    if (!zona || zona.id === this.zona().id) return;
    this.zona.set(zona);
    if (this.navegador) {
      try { localStorage.setItem(ZONA_STORAGE_KEY, zona.id); } catch { /* Storage puede estar bloqueado. */ }
    }
    this.cambiosZona.next(zona);
  }

  private restaurarZona(): ZonaMaritima {
    if (this.navegador) {
      try {
        return this.zonas.find(z => z.id === localStorage.getItem(ZONA_STORAGE_KEY)) ?? this.zonas[0];
      } catch { /* Usar la primera zona cuando storage no es accesible. */ }
    }
    return this.zonas[0];
  }

  private presentar(weather: CondicionesOpenMeteo | null, marine: CondicionesOpenMeteo | null): CondicionActual {
    const w = weather?.current;
    const m = marine?.current;
    const valor = (dato: unknown, unidad: string, divisor = 1) =>
      typeof dato === 'number' && Number.isFinite(dato)
        ? `${new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1 }).format(dato / divisor)} ${unidad}`
        : 'No disponible';
    const horas = [w?.time, m?.time].filter((t): t is string => typeof t === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(t));
    return {
      ubicacion: this.zona().nombre,
      actualizado: horas.length ? horas.sort()[0].replace('T', ' ') : 'No disponible',
      temperatura: valor(w?.['temperature_2m'], '\u00b0C'),
      estado: estadoClima(w?.['weather_code']),
      climaIcono: w?.['weather_code'] === 0 || w?.['weather_code'] === 1 ? 'sol' : 'otro',
      metricas: [
        { id: 'oleaje', label: 'Oleaje', valor: valor(m?.['wave_height'], 'm'), icono: 'oleaje' },
        { id: 'viento', label: 'Viento', valor: valor(w?.['wind_speed_10m'], 'km/h'), icono: 'viento' },
        { id: 'visibilidad', label: 'Visibilidad', valor: valor(w?.['visibility'], 'km', 1000), icono: 'visibilidad' },
        { id: 'temperatura-mar', label: 'Temp. del mar', valor: valor(m?.['sea_surface_temperature'], '\u00b0C'), icono: 'temperatura' }
      ]
    };
  }

  buscarExperiencias(): void {
    console.log('Búsqueda lista para conectarse con filtros reales');
  }
  menuZonaAbierto = false;
}
