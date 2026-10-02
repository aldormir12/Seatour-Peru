import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { tap } from 'rxjs';
import { API_URL } from './auth.service';

interface EstadoDemo { activo: boolean; }

@Injectable({ providedIn: 'root' })
export class ModoDemoService {
  private readonly http = inject(HttpClient);
  private readonly estado = signal(false);
  readonly activo = this.estado.asReadonly();
  readonly disponible = signal(false);
  readonly cambiando = signal(false);
  private revision = 0;

  consultar(): void {
    if (this.cambiando()) return;
    const revision = ++this.revision;
    this.http.get<EstadoDemo>(`${API_URL}/admin/modo-demo`).subscribe({
      next: estado => {
        if (revision !== this.revision || this.cambiando()) return;
        this.estado.set(estado.activo);
        this.disponible.set(true);
      },
      error: () => {
        if (revision !== this.revision || this.cambiando()) return;
        this.disponible.set(false);
      }
    });
  }

  cambiar(activo: boolean) {
    ++this.revision;
    return this.http.put<EstadoDemo>(`${API_URL}/admin/modo-demo`, { activo }).pipe(
      tap(estado => this.estado.set(estado.activo))
    );
  }
}
