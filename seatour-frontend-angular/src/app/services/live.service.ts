import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, OnDestroy, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { Room } from 'livekit-client';
import { API_URL } from './auth.service';
import type { SalidaProgramada } from './salidas.service';

interface LiveTokenRespuesta {
  url: string;
  token: string;
  room: string;
  identity: string;
  expiresAt: string;
}

// Una instancia por panel operador: no conserva tokens ni sesiones entre pantallas.
@Injectable()
export class LiveService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private room?: Room;
  private intento = 0;
  readonly conectando = signal(false);
  readonly transmitiendo = signal(false);
  readonly reconectando = signal(false);
  readonly preview = signal<MediaStream | null>(null);
  readonly error = signal('');

  async iniciar(salida: SalidaProgramada): Promise<void> {
    if (salida.estado !== 'EN_CURSO') {
      this.error.set('Solo puedes transmitir una salida EN_CURSO.');
      return;
    }
    if (this.conectando() || this.room) return;
    const intento = ++this.intento;
    let room: Room | undefined;
    this.conectando.set(true);
    this.error.set('');
    try {
      if (!globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('La cámara y el micrófono requieren HTTPS o localhost y un navegador compatible.');
      }
      const datos = await firstValueFrom(this.http.post<LiveTokenRespuesta>(
        `${API_URL}/live/salidas/${salida.id}/token`, {}
      ));
      if (intento !== this.intento) return;
      if (!datos.url || !datos.token || !datos.room || !datos.identity) {
        throw new Error('El backend no devolvió los datos necesarios para SeaTour Live.');
      }
      const { Room, RoomEvent, Track } = await import('livekit-client');
      if (intento !== this.intento) return;
      room = new Room();
      this.room = room;
      const sesion = room;
      room.on(RoomEvent.Disconnected, () => {
        if (this.room !== sesion) return;
        ++this.intento;
        this.liberar(sesion);
        this.room = undefined;
        this.limpiar();
        this.error.set('La transmisión se desconectó. Puedes iniciarla nuevamente.');
      });
      room.on(RoomEvent.Reconnecting, () => {
        if (this.room === sesion) this.reconectando.set(true);
      });
      room.on(RoomEvent.Reconnected, () => {
        if (this.room === sesion) this.reconectando.set(false);
      });
      await room.connect(datos.url, datos.token, { autoSubscribe: false });
      if (intento !== this.intento) { await this.cerrar(room); return; }
      if (room.name !== datos.room || room.localParticipant.identity !== datos.identity) {
        throw new Error('La sesión Live no corresponde a la salida solicitada.');
      }
      // Estas APIs capturan y publican las pistas locales en la room.
      await room.localParticipant.setCameraEnabled(true, { facingMode: 'environment' });
      if (intento !== this.intento) { await this.cerrar(room); return; }
      await room.localParticipant.setMicrophoneEnabled(true);
      if (intento !== this.intento) { await this.cerrar(room); return; }
      const video = room.localParticipant.getTrackPublication(Track.Source.Camera)?.videoTrack;
      if (!video || !room.localParticipant.isMicrophoneEnabled) {
        throw new Error('No se pudieron publicar la cámara y el micrófono.');
      }
      this.preview.set(new MediaStream([video.mediaStreamTrack]));
      this.transmitiendo.set(true);
    } catch (error) {
      if (intento === this.intento) {
        this.room = undefined;
        this.limpiar();
        this.error.set(this.mensajeError(error));
      }
      if (room) await this.cerrar(room);
    } finally {
      if (intento === this.intento) this.conectando.set(false);
    }
  }

  async finalizar(): Promise<void> {
    ++this.intento;
    const room = this.room;
    this.room = undefined;
    this.limpiar();
    if (room) await this.cerrar(room);
  }

  ngOnDestroy(): void { void this.finalizar(); }

  private limpiar(): void {
    this.preview.set(null);
    this.transmitiendo.set(false);
    this.conectando.set(false);
    this.reconectando.set(false);
  }

  private liberar(room: Room): void {
    for (const publicacion of room.localParticipant.trackPublications.values()) {
      publicacion.track?.detach();
      publicacion.track?.stop();
    }
  }

  private async cerrar(room: Room): Promise<void> {
    this.liberar(room);
    try { await room.disconnect(true); } catch { /* Las pistas locales ya se detuvieron. */ }
    this.liberar(room);
    room.removeAllListeners();
  }

  private mensajeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 0: return 'No se pudo contactar con el backend.';
        case 401: return 'Tu sesión expiró. Vuelve a iniciar sesión.';
        case 403: return 'No tienes permiso para transmitir esta salida.';
        case 404: return 'La salida no está disponible.';
        case 409: return 'La salida ya no está EN_CURSO. Actualiza la página.';
        case 503: return 'SeaTour Live no está configurado en el servidor.';
        default: return 'No se pudo obtener el acceso a SeaTour Live.';
      }
    }
    if (error instanceof Error) {
      if (['NotAllowedError', 'PermissionDeniedError', 'SecurityError'].includes(error.name)) {
        return 'Permite el acceso a la cámara y al micrófono para transmitir.';
      }
      if (['NotFoundError', 'DevicesNotFoundError'].includes(error.name)) {
        return 'No se encontró una cámara o un micrófono.';
      }
      if (['NotReadableError', 'TrackStartError'].includes(error.name)) {
        return 'No se pudo abrir la cámara o el micrófono. Comprueba si otra aplicación los está usando.';
      }
      // Solo mostramos mensajes propios; los errores del SDK pueden contener datos de conexión.
      if (error.message.startsWith('La cámara') || error.message.startsWith('El backend') ||
          error.message.startsWith('La sesión Live') || error.message.startsWith('No se pudieron publicar')) {
        return error.message;
      }
    }
    return 'No se pudo iniciar la transmisión. Revisa tu conexión y los permisos de cámara y micrófono.';
  }
}
