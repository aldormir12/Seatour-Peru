import { inicioPorRol, reservasPorRol } from '../../navigation';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Component, inject, signal } from '@angular/core';

@Component({
  selector: 'app-inicio',
  imports: [RouterLink],
  templateUrl: './inicio.html',
  styleUrl: '../../app.css'
})
export class Inicio {
  readonly inicioPorRol = inicioPorRol;
  readonly reservasPorRol = reservasPorRol;
  readonly auth = inject(AuthService);
  protected readonly title = signal('seatour-frontend-angular');

  ensureVideoPlays(event: Event): void {
    const video = event.target as HTMLVideoElement;

    video.muted = true;
    video.loop = true;

    video.play().catch(() => {});
  }

  restartVideo(event: Event): void {
    const video = event.target as HTMLVideoElement;

    video.currentTime = 0;
    video.play().catch(() => {});
  }
}