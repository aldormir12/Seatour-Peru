import { isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, ElementRef, OnDestroy, OnInit, PLATFORM_ID, ViewChild, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { RemoteTrack, Room } from 'livekit-client';
import { API_URL } from '../../services/auth.service';

interface LiveSalida {
  id: number;
  tour: { id: number; nombre: string };
  embarcacion: { id: number; nombre: string };
  operador: { id: number; nombre: string } | null;
}

interface LiveToken {
  url: string;
  token: string;
  room: string;
  identity: string;
}

@Component({
  selector: 'app-cliente-live',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="live-contenido" aria-label="SeaTour Live">
      <h1>SeaTour Live</h1>
      <a routerLink="/app/dashboard">Volver al inicio</a>
      <button type="button" (click)="cargar()" [disabled]="cargando()">Actualizar salidas</button>
      @if (cargando()) { <p role="status">Cargando salidas en curso...</p> }
      @if (errorLista()) { <p role="alert">{{ errorLista() }}</p> }
      @if (!cargando() && !errorLista() && !salidas().length) {
        <p>No hay salidas EN_CURSO.</p>
      }
      <ul class="live-salidas">
        @for (salida of salidas(); track salida.id) {
          <li>
            {{ salida.tour.nombre }} — {{ salida.embarcacion.nombre }}
            <button type="button" (click)="ver(salida)">Ver transmisión</button>
          </li>
        }
      </ul>
      @if (seleccionada(); as salida) {
        <h2>{{ salida.tour.nombre }}</h2>
        <button type="button" (click)="salir()">Salir de la transmisión</button>
        <p role="status" aria-live="polite">{{ estado() }}</p>
      }
      @if (error()) { <p role="alert">{{ error() }}</p> }
      @if (audioBloqueado()) {
        <button type="button" (click)="activarAudio()">Activar audio</button>
      }
      <div #reproductor class="live-reproductor" aria-label="Video y audio del operador"></div>
    </main>
  `,
  styles: [`
    :host { display: block; color: #102d41; font-family: 'DM Sans', sans-serif; }
    .live-contenido { padding: 24px; border: 1px solid #dce5eb; border-radius: 8px; background: white; }
    h1 { margin: 0 0 16px; font-size: 26px; font-weight: 600; }
    h2 { margin-top: 24px; font-size: 20px; font-weight: 600; }
    a { color: #075985; text-decoration: underline; margin-right: 16px; }
    button { padding: 8px 12px; margin: 4px; border: 1px solid #b9cbd6; border-radius: 4px; cursor: pointer; }
    button:disabled { opacity: .6; cursor: default; }
    button:focus-visible, a:focus-visible { outline: 2px solid #075985; outline-offset: 3px; }
    p { margin-block: 16px; }
    .live-salidas { list-style: none; padding: 0; margin-block: 20px; }
    .live-salidas li { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding-block: 12px; border-bottom: 1px solid #e2e8f0; }
    .live-reproductor { margin-top: 16px; }
    [role="alert"] { color: #991b1b; }
    @media (max-width: 600px) { .live-contenido { padding: 16px; } }
  `]
})
export class ClienteLive implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly navegador = isPlatformBrowser(inject(PLATFORM_ID));
  @ViewChild('reproductor', { static: true }) private reproductor!: ElementRef<HTMLDivElement>;
  private room?: Room;
  private intento = 0;
  private destruido = false;
  private readonly pistas = new Map<RemoteTrack, HTMLMediaElement>();
  readonly salidas = signal<LiveSalida[]>([]);
  readonly cargando = signal(false);
  readonly errorLista = signal('');
  readonly seleccionada = signal<LiveSalida | null>(null);
  readonly estado = signal('');
  readonly error = signal('');
  readonly audioBloqueado = signal(false);

  ngOnInit(): void { if (this.navegador) this.cargar(); }

  cargar(): void {
    if (this.cargando() || this.destruido) return;
    this.cargando.set(true);
    this.errorLista.set('');
    this.http.get<LiveSalida[]>(`${API_URL}/live/salidas`)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: salidas => { this.salidas.set(salidas); this.cargando.set(false); },
        error: error => { this.errorLista.set(this.mensaje(error)); this.cargando.set(false); }
      });
  }

  async ver(salida: LiveSalida): Promise<void> {
    if (!this.navegador || this.destruido) return;
    const intento = ++this.intento;
    const anterior = this.room;
    this.room = undefined;
    this.limpiarPistas();
    this.seleccionada.set(salida);
    this.error.set('');
    this.audioBloqueado.set(false);
    this.estado.set('Conectando a la transmisión...');
    let room: Room | undefined;
    try {
      if (anterior) await this.cerrar(anterior);
      if (intento !== this.intento) return;
      const datos = await firstValueFrom(this.http.post<LiveToken>(
        `${API_URL}/live/salidas/${salida.id}/token`, {}
      ).pipe(takeUntilDestroyed(this.destroyRef)));
      if (intento !== this.intento) return;
      if (!datos.url || !datos.token || !datos.room || !datos.identity) {
        throw new Error('Respuesta Live incompleta');
      }
      const { Room, RoomEvent, Track } = await import('livekit-client');
      if (intento !== this.intento) return;
      room = new Room();
      this.room = room;
      const sesion = room;
      const vigente = () => this.room === sesion && intento === this.intento;
      const actualizar = () => {
        if (!vigente()) return;
        const video = [...this.pistas.keys()].some(p => p.kind === Track.Kind.Video &&
          !p.isMuted && p.streamState !== Track.StreamState.Paused);
        this.estado.set(video ? 'Reproduciendo transmisión del operador.' :
          'Sin señal: el operador no ha iniciado la transmisión o dejó de enviar video.');
      };
      room.on(RoomEvent.TrackSubscribed, (track, _publicacion, participante) => {
        if (!vigente() || !salida.operador ||
            participante.identity !== `usuario-${salida.operador.id}-salida-${salida.id}` ||
            (track.kind !== Track.Kind.Video && track.kind !== Track.Kind.Audio)) return;
        if (this.pistas.has(track)) return;
        const elemento = track.attach();
        elemento.autoplay = true;
        if (elemento instanceof HTMLVideoElement) {
          elemento.playsInline = true;
          elemento.controls = true;
          elemento.style.maxWidth = '100%';
        }
        this.pistas.set(track, elemento);
        this.reproductor.nativeElement.appendChild(elemento);
        actualizar();
      });
      room.on(RoomEvent.TrackUnsubscribed, track => {
        if (!vigente()) return;
        this.quitarPista(track);
        actualizar();
      });
      room.on(RoomEvent.TrackMuted, actualizar);
      room.on(RoomEvent.TrackUnmuted, actualizar);
      room.on(RoomEvent.TrackStreamStateChanged, actualizar);
      room.on(RoomEvent.ParticipantDisconnected, actualizar);
      room.on(RoomEvent.TrackSubscriptionFailed, () => {
        if (vigente()) this.error.set('No se pudo recibir la transmisión. Intenta abrirla nuevamente.');
      });
      room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
        if (vigente()) this.audioBloqueado.set(!sesion.canPlaybackAudio);
      });
      room.on(RoomEvent.Reconnecting, () => {
        if (vigente()) this.estado.set('Sin señal. Reconectando...');
      });
      room.on(RoomEvent.Reconnected, actualizar);
      room.on(RoomEvent.Disconnected, () => {
        if (!vigente()) return;
        this.room = undefined;
        this.limpiarPistas();
        this.audioBloqueado.set(false);
        this.estado.set('Sin señal. La conexión terminó; puedes abrir la transmisión nuevamente.');
        sesion.removeAllListeners();
      });
      // Cliente receptor: suscripcion remota, sin capturar ni publicar pistas locales.
      await room.connect(datos.url, datos.token, { autoSubscribe: true });
      if (!vigente()) { await this.cerrar(room); return; }
      if (room.name !== datos.room || room.localParticipant.identity !== datos.identity) {
        throw new Error('Sesion Live incorrecta');
      }
      this.audioBloqueado.set(!room.canPlaybackAudio);
      actualizar();
    } catch (error) {
      if (intento === this.intento) {
        this.room = undefined;
        this.limpiarPistas();
        this.audioBloqueado.set(false);
        this.estado.set('No se pudo abrir la transmisión.');
        this.error.set(this.mensaje(error));
      }
      if (room) await this.cerrar(room);
    }
  }

  async activarAudio(): Promise<void> {
    const room = this.room;
    if (!room) return;
    try {
      await room.startAudio();
      if (this.room === room) this.audioBloqueado.set(!room.canPlaybackAudio);
    } catch {
      if (this.room === room) this.error.set('No se pudo reproducir el audio. Intenta activarlo nuevamente.');
    }
  }

  async salir(): Promise<void> {
    ++this.intento;
    const room = this.room;
    this.room = undefined;
    this.limpiarPistas();
    this.seleccionada.set(null);
    this.estado.set('');
    this.error.set('');
    this.audioBloqueado.set(false);
    if (room) await this.cerrar(room);
  }

  ngOnDestroy(): void { this.destruido = true; void this.salir(); }

  private quitarPista(track: RemoteTrack): void {
    const elemento = this.pistas.get(track);
    if (elemento) {
      track.detach(elemento);
      elemento.pause();
      elemento.srcObject = null;
      elemento.remove();
      this.pistas.delete(track);
    }
  }

  private limpiarPistas(): void {
    for (const track of this.pistas.keys()) this.quitarPista(track);
  }

  private async cerrar(room: Room): Promise<void> {
    room.removeAllListeners();
    try { await room.disconnect(); } catch { /* Reproductor ya liberado. */ }
  }

  private mensaje(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 0: return 'No se pudo contactar con el backend.';
        case 401: return 'Tu sesión expiró. Vuelve a iniciar sesión.';
        case 403: return 'No tienes permiso para acceder a SeaTour Live.';
        case 404: return 'La salida ya no está disponible.';
        case 409: return 'La salida ya no está EN_CURSO. Actualiza la lista.';
        case 503: return 'SeaTour Live no está configurado en el servidor.';
      }
    }
    // No mostrar errores del SDK: pueden incluir datos de conexion o acceso.
    return 'No se pudo cargar SeaTour Live. Revisa tu conexión e intenta nuevamente.';
  }
}
