import { Component, signal } from '@angular/core';
import { RutasInteractivas } from './components/rutas-interactivas/rutas-interactivas';

@Component({
  selector: 'app-root',
  imports: [RutasInteractivas],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
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