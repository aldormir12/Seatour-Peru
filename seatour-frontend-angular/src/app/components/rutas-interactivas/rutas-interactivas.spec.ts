import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { RutasInteractivas } from './rutas-interactivas';

describe('RutasInteractivas', () => {
  let component: RutasInteractivas;
  let fixture: ComponentFixture<RutasInteractivas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RutasInteractivas],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(RutasInteractivas);
    component = fixture.componentInstance;
    TestBed.inject(HttpTestingController).expectOne('http://localhost:8080/api/tours').flush([]);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('dibuja brillos e iconos solo en destinos y conserva sus etiquetas y coordenadas', () => {
    const marcadores = fixture.nativeElement.querySelectorAll('.punto-interactivo');
    component.puntos.forEach((punto, index) => {
      const marcador = marcadores[index];
      expect(marcador.querySelector('text').textContent).toContain(punto.nombre);
      if (punto.rol === 'destino') {
        const brillo = marcador.querySelector('.destino-marcador');
        expect(Number(brillo.getAttribute('x')) + 10).toBe(punto.x);
        expect(Number(brillo.getAttribute('y')) + 10).toBe(punto.y);
        expect(brillo.getAttribute('width')).toBe('20');
        expect(marcador.querySelector('.destino-estrella')).toBeTruthy();
        expect(marcador.querySelector('.punto-anillo')).toBeNull();
        marcador.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(component.tourSeleccionado.puntoLlegada).toBe(punto.id);
        fixture.detectChanges();
        expect(marcador.querySelector('.destino-icono').getAttribute('data-icono')).toBe(punto.icono);
        expect(marcador.querySelector('.destino-icono path')).toBeTruthy();
        expect(marcador.querySelector('.destino-icono-marco')).toBeTruthy();
        expect(brillo.classList.contains('destino-seleccionado')).toBe(true);
        expect(fixture.nativeElement.querySelectorAll('.destino-icono').length).toBe(1);
      } else {
        expect(marcador.querySelector('.destino-marcador')).toBeNull();
        expect(!!marcador.querySelector('.punto-anillo')).toBe(punto.rol === 'puerto');
        expect(!!marcador.querySelector('.interes-marcador')).toBe(punto.rol === 'interes');
      }
    });
  });

  it('elige el simbolo por icono y mantiene el brillo cuando no hay icono', () => {
    const destino = component.puntos.find(punto => punto.rol === 'destino')!;
    const index = component.puntos.indexOf(destino);
    component.seleccionarPunto(destino);
    destino.icono = 'arrecife';
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    const marcador = fixture.nativeElement.querySelectorAll('.punto-interactivo')[index];
    expect(marcador.querySelector('.destino-icono-coral')).toBeTruthy();
    delete destino.icono;
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    expect(marcador.querySelector('.destino-icono')).toBeNull();
    expect(marcador.querySelector('.destino-estrella')).toBeTruthy();
    expect(marcador.querySelector('text').textContent).toContain(destino.nombre);
  });

  it('define puertos de salida y destinos con iconos semanticos', () => {
    for (const tour of component.tours) {
      const salida = component.puntos.find(punto => punto.id === tour.puntoSalida)!;
      const llegada = component.puntos.find(punto => punto.id === tour.puntoLlegada)!;
      expect(salida.rol).toBe('puerto');
      expect(salida.tipo).toBe('costa');
      expect(llegada.rol).toBe('destino');
      expect(llegada.tipo).toBe('mar');
    }
    expect(Object.fromEntries(component.puntos
      .filter(punto => punto.rol === 'destino')
      .map(punto => [punto.id, punto.icono]))).toEqual({
        ballenas: 'ballena', tortugas: 'tortuga', 'isla-foca': 'pez', arrecifes: 'arrecife'
      });
  });

  it('oculta iconos y resaltado en destinos no seleccionados al cambiar de tour', () => {
    for (const tour of component.tours) {
      component.seleccionarTour(tour);
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      const marcadores = fixture.nativeElement.querySelectorAll('.punto-interactivo');
      component.puntos.forEach((punto, index) => {
        if (punto.rol !== 'destino') return;
        const seleccionado = punto.id === tour.puntoLlegada;
        expect(!!marcadores[index].querySelector('.destino-icono')).toBe(seleccionado);
        expect(!!marcadores[index].querySelector('.destino-seleccionado')).toBe(seleccionado);
        expect(marcadores[index].querySelector('.destino-estrella')).toBeTruthy();
      });
    }
  });

  it('distingue el rol de interes de la ubicacion costera sin alterar la ruta', () => {
    const salida = component.puntos.find(punto => punto.id === component.tourSeleccionado.puntoSalida)!;
    const ruta = component.rutaSeleccionada;
    salida.rol = 'interes';
    expect(component.puntoEstaActivo(salida)).toBe(false);
    expect(component.rutaSeleccionada).toBe(ruta);
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    const marcador = fixture.nativeElement.querySelector('.punto-interactivo');
    expect(marcador.querySelector('.interes-marcador')).toBeTruthy();
    expect(marcador.querySelector('.punto-anillo')).toBeNull();
    expect(marcador.getAttribute('display')).toBe('none');
  });

  it('muestra solo los intereses referenciados por la ruta seleccionada', () => {
    const intereses = component.puntos.filter(punto => punto.rol === 'interes');
    expect(intereses.length).toBe(1);
    const punto = intereses[0];
    const index = component.puntos.indexOf(punto);
    for (const tour of component.tours) {
      component.seleccionarTour(tour);
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      const marcador = fixture.nativeElement.querySelectorAll('.punto-interactivo')[index];
      const visible = tour.ruta.puntosInteres?.includes(punto.id) ?? false;
      expect(marcador.getAttribute('display')).toBe(visible ? null : 'none');
      expect(marcador.querySelector('.interes-marcador').getAttribute('width')).toBe('10');
      expect(marcador.querySelector('.destino-icono')).toBeNull();
    }
    const ruta = component.tours[0].ruta;
    expect(ruta.puntosInteres).toEqual([punto.id]);
    const inicio = ruta.intermedios[0].hasta;
    const tramo = ruta.intermedios[1];
    expect(punto.x).toBe((inicio[0] + 3 * tramo.control1[0] + 3 * tramo.control2[0] + tramo.hasta[0]) / 8);
    expect(punto.y).toBe((inicio[1] + 3 * tramo.control1[1] + 3 * tramo.control2[1] + tramo.hasta[1]) / 8);
  });

  it('reutiliza intereses entre rutas sin asociarlos a un tourId', () => {
    const punto = component.puntos.find(punto => punto.rol === 'interes')!;
    const compartido = component.tours[1];
    compartido.ruta.puntosInteres = [punto.id];
    component.seleccionarTour(compartido);
    const ruta = component.rutaSeleccionada;
    expect(component.puntoEstaVisible(punto)).toBe(true);
    component.seleccionarPunto(punto);
    expect(component.tourSeleccionado).toBe(compartido);
    expect(component.rutaSeleccionada).toBe(ruta);
    component.seleccionarTour(component.tours[2]);
    component.seleccionarPunto(punto);
    expect(component.tourSeleccionado).toBe(component.tours[0]);
    compartido.ruta.puntosInteres = [];
    component.seleccionarTour(compartido);
    expect(component.puntoEstaVisible(punto)).toBe(false);
    expect(punto).not.toHaveProperty('tourId');
  });

  it('permite destinos sin icono y cambiar su icono sin afectar seleccion ni ruta', () => {
    const tour = component.tours[1];
    const destino = component.puntos.find(punto => punto.id === tour.puntoLlegada)!;
    delete destino.icono;
    component.seleccionarPunto(destino);
    expect(component.tourSeleccionado).toBe(tour);
    const ruta = component.rutaSeleccionada;
    destino.icono = 'pez';
    expect(component.rutaSeleccionada).toBe(ruta);
    expect(component.puntoEstaActivo(destino)).toBe(false);
  });

  it('selecciona un tour desde cualquiera de sus extremos', () => {
    for (const tour of component.tours) {
      for (const id of [tour.puntoSalida, tour.puntoLlegada]) {
        const punto = component.puntos.find(punto => punto.id === id);
        if (!punto) continue;
        component.seleccionarTour(component.tours.find(otro => otro !== tour)!);
        component.seleccionarPunto(punto);
        expect(component.tourSeleccionado).toBe(tour);
      }
    }
  });

  it('conserva el tour seleccionado al pulsar un punto compartido', () => {
    const compartido = { ...component.tours[0], id: 99 };
    component.tours.push(compartido);
    component.seleccionarTour(compartido);
    const salida = component.puntos.find(punto => punto.id === compartido.puntoSalida)!;
    component.seleccionarPunto(salida);
    expect(component.tourSeleccionado).toBe(compartido);
    expect(component.puntoEstaActivo(salida)).toBe(true);

    component.seleccionarTour(component.tours[1]);
    component.seleccionarPunto(salida);
    expect(component.tourSeleccionado).toBe(component.tours[0]);
  });

  it('resalta solo los extremos costeros del tour seleccionado', () => {
    for (const tour of component.tours) {
      component.seleccionarTour(tour);
      for (const punto of component.puntos) {
        expect(component.puntoEstaActivo(punto)).toBe(
          punto.tipo === 'costa' &&
          [tour.puntoSalida, tour.puntoLlegada].includes(punto.id)
        );
      }
    }
  });

  it('ignora puntos que no son extremos de ningun tour', () => {
    const anterior = component.tourSeleccionado;
    const punto = { id: 'sin-tour', nombre: 'Libre', x: 0, y: 0, tipo: 'costa' as const, rol: 'puerto' as const };
    component.seleccionarPunto(punto);
    expect(component.tourSeleccionado).toBe(anterior);
    expect(component.puntoEstaActivo(punto)).toBe(false);
  });

  it('actualiza todos los paths al mover los extremos de cada tour', () => {
    for (const tour of component.tours) {
      component.seleccionarTour(tour);
      const salida = component.puntos.find(punto => punto.id === tour.puntoSalida)!;
      const llegada = component.puntos.find(punto => punto.id === tour.puntoLlegada)!;
      salida.x += 17;
      salida.y += 23;
      llegada.x -= 31;
      llegada.y -= 19;
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();

      const paths = fixture.nativeElement.querySelectorAll('.ruta-brillo, .ruta-mascara, .ruta-principal');
      expect(paths.length).toBe(4);
      for (const path of paths) {
        const d = path.getAttribute('d');
        expect(d.startsWith(`M${salida.x} ${salida.y} C`)).toBe(true);
        expect(d.endsWith(` ${llegada.x} ${llegada.y}`)).toBe(true);
      }
    }
  });

  it('conserva los controles y puntos intermedios originales', () => {
    expect(component.rutaSeleccionada).toBe(
      'M1160 138 C1120 170 1010 220 920 310 C850 380 755 385 690 330 C620 270 650 190 735 145'
    );
  });

  it('admite nuevos tours y puntos sin tramos intermedios', () => {
    component.puntos.push(
      { id: 'salida-nueva', nombre: 'Salida', x: 100, y: 200, tipo: 'costa', rol: 'puerto' },
      { id: 'llegada-nueva', nombre: 'Llegada', x: 300, y: 400, tipo: 'mar', rol: 'destino' }
    );
    const tour = {
      ...component.tours[0],
      id: 99,
      puntoSalida: 'salida-nueva',
      puntoLlegada: 'llegada-nueva',
      ruta: { intermedios: [], final: component.tours[0].ruta.final }
    };
    component.tours.push(tour);
    component.seleccionarTour(tour);
    expect(component.rutaSeleccionada).toBe('M100 200 C620 270 650 190 300 400');

    component.puntos = component.puntos.filter(punto => punto.id !== 'llegada-nueva');
    expect(component.rutaSeleccionada).toBe('');
  });
});
