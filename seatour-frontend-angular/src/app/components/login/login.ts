import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {

  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

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
        Validators.minLength(6)
      ]
    ]
  });

  iniciarSesion(): void {

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

          this.router.navigate([
            '/'
          ]);
        },

        error: () => {
          this.cargando.set(false);

          this.error.set(
            'Correo o contraseña incorrectos'
          );
        }
      });
  }
}