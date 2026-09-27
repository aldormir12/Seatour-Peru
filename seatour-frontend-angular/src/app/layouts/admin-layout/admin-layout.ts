import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { ToastContainer } from '../../components/toast-container/toast-container';
import { ConfirmacionModal } from '../../components/confirmacion-modal/confirmacion-modal';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    ToastContainer,
    ConfirmacionModal,
    RouterOutlet,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminLayout implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly ahora = signal(new Date());
  readonly usuario = this.auth.usuario;

  readonly nombre = computed(
    () => this.usuario()?.nombre?.trim() || 'Administrador'
  );

  readonly iniciales = computed(() => {
    const nombre = this.usuario()?.nombre?.trim() ?? '';
    const partes = nombre.split(/\s+/).filter(Boolean);

    return partes
      .slice(0, 2)
      .map((parte: string) => parte.charAt(0).toUpperCase())
      .join('') || 'AD';
  });

  private reloj?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.reloj = setInterval(() => {
      this.ahora.set(new Date());
    }, 1_000);
  }

  ngOnDestroy(): void {
    if (this.reloj) {
      clearInterval(this.reloj);
    }
  }

  fecha(): string {
    return new Intl.DateTimeFormat('es-PE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(this.ahora());
  }

  hora(): string {
    return new Intl.DateTimeFormat('es-PE', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(this.ahora());
  }

  salir(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/');
  }
}
