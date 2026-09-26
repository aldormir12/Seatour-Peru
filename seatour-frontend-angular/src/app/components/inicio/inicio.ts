import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Component, inject, signal } from '@angular/core';
import { RutasInteractivas } from '../rutas-interactivas/rutas-interactivas';

@Component({
  selector: 'app-inicio',
  imports: [RutasInteractivas, RouterLink],
  templateUrl: './inicio.html',
  styleUrl: '../../app.css'
})
export class Inicio {
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