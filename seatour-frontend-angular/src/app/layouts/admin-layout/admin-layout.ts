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

import { ModoDemoService } from '../../services/modo-demo.service';
import { ConfirmacionService } from '../../services/confirmacion.service';
import { ToastService } from '../../services/toast.service';
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
  readonly demo = inject(ModoDemoService);
  private readonly confirmacion = inject(ConfirmacionService);
  private readonly toast = inject(ToastService);
  private sincronizacionDemo?: ReturnType<typeof setInterval>;

  async cambiarModoDemo(): Promise<void> {
    if (!this.demo.disponible() || this.demo.cambiando()) return;
    const activar = !this.demo.activo();
    const aceptado = await this.confirmacion.confirmar({
      titulo: activar ? 'Activar Modo Demo' : 'Desactivar Modo Demo',
      mensaje: activar
        ? 'Las nuevas salidas serán DEMO.\n\nPara crear: se omiten fecha futura, horizonte de 45 días, horario de 06:00 a 19:00 y solapamientos de embarcación (buffer de 60 minutos) y operador.\n\nPara iniciar: se omiten pasajeros obligatorios, límites del intervalo programado, solapamientos y otra salida en curso en la embarcación.\n\nSe mantienen recursos válidos y activos, capacidad, autenticación, roles y transiciones. Edición y cierre mantienen sus validaciones.\n\nADMIN configura la salida y el OPERADOR asignado puede verla, iniciar/completar y transmitir. CLIENTE solo la verá en SeaTour Live con transmisión real activa. Se excluye de Activas, Historial, Intelligence y recomendaciones normales.'
        : 'Se bloquearán nuevas acciones demo y se ocultarán sus salidas. Las nuevas salidas volverán a usar todas las validaciones normales. Las salidas demo existentes conservarán su marca y no se convertirán en salidas normales.',
      variante: 'warning',
      textoConfirmar: activar ? 'Activar Modo Demo' : 'Desactivar Modo Demo'
    });
    if (!aceptado) return;
    this.demo.cambiando.set(true);
    this.demo.cambiar(activar).subscribe({
      next: () => {
        this.demo.cambiando.set(false);
        this.toast.success(activar ? 'Modo Demo activado.' : 'Modo Demo desactivado.');
      },
      error: () => {
        this.demo.cambiando.set(false);
        this.demo.consultar();
        this.toast.error('No se pudo cambiar Modo Demo.');
      }
    });
  }

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
    this.demo.consultar();
    this.sincronizacionDemo = setInterval(() => this.demo.consultar(), 15_000);
    this.reloj = setInterval(() => {
      this.ahora.set(new Date());
    }, 1_000);
  }

  ngOnDestroy(): void {
    clearInterval(this.sincronizacionDemo);
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
