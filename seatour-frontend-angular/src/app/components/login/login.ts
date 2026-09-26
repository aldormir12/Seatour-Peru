import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule, RouterLink
  ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {

  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private readonly route = inject(ActivatedRoute);
  readonly sesionExpirada = this.route.snapshot.queryParamMap.get('sesion') === 'expirada';

  cargando = signal(false);
  error = signal<string | null>(null);

  formulario = this.fb.nonNullable.group({
    correo: [
      '',
      [
        Validators.required,
        Validators.email
      ]
    ],
    password: [
      '',
      [
        Validators.required,
        Validators.maxLength(1024)
      ]
    ]
  });

  iniciarSesion(): void {

    if (this.cargando()) return;
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.error.set(null);

    const {
      correo,
      password
    } = this.formulario.getRawValue();

    this.auth
      .login(correo, password)
      .subscribe({
        next: () => {
          this.cargando.set(false);

          const destino = this.route.snapshot.queryParamMap.get('returnUrl');
          void this.router.navigateByUrl(destino?.startsWith('/') && !destino.startsWith('//') ? destino : '/');
        },

        error: (error) => {
          this.cargando.set(false);

          this.error.set(error.status === 401
            ? 'Correo o contrase\u00f1a incorrectos'
            : 'No se pudo iniciar sesi\u00f3n. Int\u00e9ntalo nuevamente.');
        }
      });
  }
}