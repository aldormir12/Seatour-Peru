import { isPlatformBrowser } from '@angular/common';

import {
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';

import {
  HttpClient,
  HttpErrorResponse
} from '@angular/common/http';

import {
  takeUntilDestroyed
} from '@angular/core/rxjs-interop';

import {
  ActivatedRoute,
  RouterLink
} from '@angular/router';

import {
  firstValueFrom
} from 'rxjs';

import type {
  RemoteTrack,
  Room
} from 'livekit-client';

import {
  API_URL
} from '../../services/auth.service';

import {
  ClienteLiveSalidasService,
  LiveSalida
} from '../../services/cliente-live-salidas.service';


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
  templateUrl: './cliente-live.html'
})
export class ClienteLive implements OnInit, OnDestroy {

  private readonly http =
    inject(HttpClient);

  private readonly listado =
    inject(ClienteLiveSalidasService);

  private readonly destroyRef =
    inject(DestroyRef);

  private readonly navegador =
    isPlatformBrowser(
      inject(PLATFORM_ID)
    );


  private salidaInicial = Number(
    inject(ActivatedRoute)
      .snapshot
      .queryParamMap
      .get('salida')
  );


  @ViewChild('reproductor')
  private reproductor?:
    ElementRef<HTMLDivElement>;


  @ViewChild('pantallaCompleta')
  private contenedorPantallaCompleta?:
    ElementRef<HTMLDivElement>;


  private room?: Room;

  private intento = 0;

  private destruido = false;


  private readonly pistas =
    new Map<
      RemoteTrack,
      HTMLMediaElement
    >();


  readonly salidas =
    signal<LiveSalida[]>([]);

  readonly cargando =
    signal(false);

  readonly errorLista =
    signal('');

  readonly seleccionada =
    signal<LiveSalida | null>(null);

  readonly estado =
    signal('');

  readonly error =
    signal('');

  readonly audioBloqueado =
    signal(false);


  readonly senalActiva = computed(
    () =>
      this.estado() ===
        'Transmisión en vivo' &&
      !this.error()
  );


  ngOnInit(): void {
    if (this.navegador) {
      this.cargar();
    }
  }


  cargar(): void {

    if (
      this.cargando() ||
      this.destruido
    ) {
      return;
    }


    this.cargando.set(true);

    this.errorLista.set('');


    this.listado
      .listar()
      .pipe(
        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe({

        next: salidas => {

          this.salidas.set(
            salidas
          );

          this.cargando.set(
            false
          );


          const id =
            this.salidaInicial;

          this.salidaInicial = 0;


          if (
            Number.isSafeInteger(id) &&
            id > 0
          ) {

            const salida =
              salidas.find(
                item =>
                  item.id === id
              );


            if (salida) {

              void this.ver(
                salida
              );

            } else {

              this.errorLista.set(
                'La transmisión seleccionada ya no está disponible.'
              );

            }

          }

        },


        error: error => {

          this.errorLista.set(
            this.mensaje(error)
          );

          this.cargando.set(
            false
          );

        }

      });
  }


  async ver(
    salida: LiveSalida
  ): Promise<void> {

    if (
      !this.navegador ||
      this.destruido
    ) {
      return;
    }


    const intento =
      ++this.intento;

    const anterior =
      this.room;


    this.room =
      undefined;

    this.limpiarPistas();


    this.seleccionada.set(
      salida
    );

    this.error.set('');

    this.audioBloqueado.set(
      false
    );

    this.estado.set(
      'Conectando a la transmisión...'
    );


    let room:
      Room | undefined;


    try {

      if (anterior) {
        await this.cerrar(
          anterior
        );
      }


      if (
        intento !==
        this.intento
      ) {
        return;
      }


      const datos =
        await firstValueFrom(

          this.http
            .post<LiveToken>(
              `${API_URL}/live/salidas/${salida.id}/token`,
              {}
            )
            .pipe(
              takeUntilDestroyed(
                this.destroyRef
              )
            )

        );


      if (
        intento !==
        this.intento
      ) {
        return;
      }


      if (
        !datos.url ||
        !datos.token ||
        !datos.room ||
        !datos.identity
      ) {
        throw new Error(
          'Respuesta Live incompleta'
        );
      }


      const {
        Room,
        RoomEvent,
        Track
      } =
        await import(
          'livekit-client'
        );


      if (
        intento !==
        this.intento
      ) {
        return;
      }


      room =
        new Room();

      this.room =
        room;


      const sesion =
        room;


      const vigente =
        () =>
          this.room ===
            sesion &&
          intento ===
            this.intento;


      const actualizar =
        () => {

          if (!vigente()) {
            return;
          }


          const video =
            [...this.pistas.keys()]
              .some(
                pista =>
                  pista.kind ===
                    Track.Kind.Video &&

                  !pista.isMuted &&

                  pista.streamState !==
                    Track.StreamState.Paused
              );


          this.estado.set(
            video
              ? 'Transmisión en vivo'
              : 'Esperando señal del operador...'
          );

        };


      room.on(
        RoomEvent.TrackSubscribed,

        (
          track,
          _publicacion,
          participante
        ) => {

          if (
            !vigente() ||

            !salida.operador ||

            participante.identity !==
              `usuario-${salida.operador.id}-salida-${salida.id}` ||

            (
              track.kind !==
                Track.Kind.Video &&

              track.kind !==
                Track.Kind.Audio
            )
          ) {
            return;
          }


          if (
            this.pistas.has(
              track
            )
          ) {
            return;
          }


          const elemento =
            track.attach();


          elemento.autoplay =
            true;


          if (
            elemento instanceof
            HTMLVideoElement
          ) {

            elemento.playsInline =
              true;

            elemento.controls =
              false;


            elemento.style.width =
              '100%';

            elemento.style.height =
              '100%';

            elemento.style.objectFit =
              'contain';

            elemento.style.display =
              'block';

          }


          if (
            elemento instanceof
            HTMLAudioElement
          ) {

            elemento.style.display =
              'none';

          }


          this.pistas.set(
            track,
            elemento
          );


          const contenedor =
            this.reproductor
              ?.nativeElement;


          if (contenedor) {

            contenedor.appendChild(
              elemento
            );

          }


          actualizar();

        }
      );


      room.on(
        RoomEvent.TrackUnsubscribed,

        track => {

          if (!vigente()) {
            return;
          }


          this.quitarPista(
            track
          );

          actualizar();

        }
      );


      room.on(
        RoomEvent.TrackMuted,
        actualizar
      );


      room.on(
        RoomEvent.TrackUnmuted,
        actualizar
      );


      room.on(
        RoomEvent.TrackStreamStateChanged,
        actualizar
      );


      room.on(
        RoomEvent.ParticipantDisconnected,
        actualizar
      );


      room.on(
        RoomEvent.TrackSubscriptionFailed,

        () => {

          if (vigente()) {

            this.error.set(
              'No se pudo recibir la transmisión.'
            );

          }

        }
      );


      room.on(
        RoomEvent.AudioPlaybackStatusChanged,

        () => {

          if (vigente()) {

            this.audioBloqueado.set(
              !sesion.canPlaybackAudio
            );

          }

        }
      );


      room.on(
        RoomEvent.Reconnecting,

        () => {

          if (vigente()) {

            this.estado.set(
              'Reconectando transmisión...'
            );

          }

        }
      );


      room.on(
        RoomEvent.Reconnected,
        actualizar
      );


      room.on(
        RoomEvent.Disconnected,

        () => {

          if (!vigente()) {
            return;
          }


          this.room =
            undefined;


          this.limpiarPistas();


          this.audioBloqueado.set(
            false
          );


          this.estado.set(
            'La transmisión terminó.'
          );


          sesion.removeAllListeners();

        }
      );


      await room.connect(
        datos.url,
        datos.token,
        {
          autoSubscribe: true
        }
      );


      if (!vigente()) {

        await this.cerrar(
          room
        );

        return;

      }


      if (
        room.name !==
          datos.room ||

        room.localParticipant
          .identity !==
          datos.identity
      ) {

        throw new Error(
          'Sesión Live incorrecta'
        );

      }


      this.audioBloqueado.set(
        !room.canPlaybackAudio
      );


      actualizar();

    } catch (error) {


      if (
        intento ===
        this.intento
      ) {

        this.room =
          undefined;


        this.limpiarPistas();


        this.audioBloqueado.set(
          false
        );


        this.estado.set(
          'No se pudo abrir la transmisión.'
        );


        this.error.set(
          this.mensaje(error)
        );

      }


      if (room) {

        await this.cerrar(
          room
        );

      }

    }
  }


  async pantallaCompleta():
    Promise<void> {

    if (!this.navegador) {
      return;
    }


    const contenedor =
      this.contenedorPantallaCompleta
        ?.nativeElement;


    if (!contenedor) {
      return;
    }


    try {

      if (
        !document.fullscreenElement
      ) {

        await contenedor
          .requestFullscreen();

      } else {

        await document
          .exitFullscreen();

      }

    } catch {

      this.error.set(
        'No se pudo activar la pantalla completa.'
      );

    }
  }


  horaInicio(
    valor?: string | null
  ): string {

    if (!valor) {
      return '';
    }


    /*
     * El backend actualmente entrega
     * LocalDateTime sin zona:
     *
     * 2026-10-02T11:52:01.985453
     *
     * Solo necesitamos mostrar la hora
     * sin reinterpretarla por timezone.
     */

    const coincidencia =
      valor.match(
        /T(\d{2}):(\d{2})/
      );


    if (!coincidencia) {
      return valor;
    }


    const hora24 =
      Number(
        coincidencia[1]
      );

    const minutos =
      coincidencia[2];


    const periodo =
      hora24 >= 12
        ? 'p. m.'
        : 'a. m.';


    const hora12 =
      hora24 % 12 || 12;


    return (
      `${hora12}:${minutos} ${periodo}`
    );
  }


  async activarAudio():
    Promise<void> {

    const room =
      this.room;


    if (!room) {
      return;
    }


    try {

      await room.startAudio();


      if (
        this.room === room
      ) {

        this.audioBloqueado.set(
          !room.canPlaybackAudio
        );

      }

    } catch {

      if (
        this.room === room
      ) {

        this.error.set(
          'No se pudo reproducir el audio.'
        );

      }

    }
  }


  async salir():
    Promise<void> {

    ++this.intento;


    const room =
      this.room;


    this.room =
      undefined;


    this.limpiarPistas();


    this.seleccionada.set(
      null
    );

    this.estado.set('');

    this.error.set('');

    this.audioBloqueado.set(
      false
    );


    if (room) {

      await this.cerrar(
        room
      );

    }
  }


  ngOnDestroy(): void {

    this.destruido =
      true;


    void this.salir();

  }


  private quitarPista(
    track: RemoteTrack
  ): void {

    const elemento =
      this.pistas.get(
        track
      );


    if (!elemento) {
      return;
    }


    track.detach(
      elemento
    );


    elemento.pause();

    elemento.srcObject =
      null;

    elemento.remove();


    this.pistas.delete(
      track
    );
  }


  private limpiarPistas():
    void {

    for (
      const track of
      this.pistas.keys()
    ) {

      this.quitarPista(
        track
      );

    }
  }


  private async cerrar(
    room: Room
  ): Promise<void> {

    room.removeAllListeners();


    try {

      await room.disconnect();

    } catch {

      // La conexión ya estaba cerrada.

    }
  }


  private mensaje(
    error: unknown
  ): string {

    if (
      error instanceof
      HttpErrorResponse
    ) {

      switch (
        error.status
      ) {

        case 0:
          return (
            'No se pudo contactar con el backend.'
          );


        case 401:
          return (
            'Tu sesión expiró. Vuelve a iniciar sesión.'
          );


        case 403:
          return (
            'No tienes permiso para acceder a SeaTour Live.'
          );


        case 404:
          return (
            'La transmisión ya no está disponible.'
          );


        case 409:
          return (
            'La salida ya no está en curso. Actualiza la lista.'
          );


        case 503:
          return (
            'SeaTour Live no está disponible temporalmente.'
          );

      }

    }


    return (
      'No se pudo cargar SeaTour Live. Revisa tu conexión e intenta nuevamente.'
    );
  }
}