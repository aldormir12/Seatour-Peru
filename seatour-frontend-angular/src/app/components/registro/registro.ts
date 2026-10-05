import { inicioPorRol } from '../../navigation';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, LoginTrasRegistroError } from '../../services/auth.service';

@Component({
  selector: 'app-registro', standalone: true, imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './registro.html', styleUrl: '../login/login.css'
})
export class RegistroComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly cuentaCreada = signal(false);
  readonly mostrarPassword = signal(false);

  alternarPassword(): void {
    this.mostrarPassword.update(visible => !visible);
  }

  readonly formulario = inject(FormBuilder).nonNullable.group({
    nombre: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]],
    apellido: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]],
    correo: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(1024),
      Validators.pattern(/^(?=[\s\S]*\p{L})(?=[\s\S]*[0-9])[\s\S]*$/u)]],
    confirmacion: ['', Validators.required]
  }, { validators: control => control.get('password')?.value === control.get('confirmacion')?.value
      ? null : { contrasenasDistintas: true } });

  registrar(): void {
    if (this.cargando() || this.cuentaCreada()) return;
    if (this.formulario.invalid) { this.formulario.markAllAsTouched(); return; }
    this.cargando.set(true);
    this.error.set(null);
    const { confirmacion, ...datos } = this.formulario.getRawValue();
    this.auth.registrar(datos).subscribe({
      next: usuario => { this.cargando.set(false); void this.router.navigateByUrl(inicioPorRol(usuario.rol)); },
      error: error => {
        this.cargando.set(false);
        if (error instanceof LoginTrasRegistroError) {
          this.cuentaCreada.set(true);
          this.error.set('Tu cuenta fue creada. Inicia sesión para continuar.');
        } else {
          this.error.set(error.status === 409 ? 'Este correo ya está registrado. Inicia sesión o usa otro correo.'
            : error.status === 400 ? 'Revisa los datos del formulario.' : 'No se pudo registrar la cuenta. Inténtalo nuevamente.');
        }
      }
    });
  }
}
