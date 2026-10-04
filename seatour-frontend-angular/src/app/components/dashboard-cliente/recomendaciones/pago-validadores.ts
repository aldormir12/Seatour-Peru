import { AbstractControl, ValidationErrors } from '@angular/forms';

export function validarLuhn(
  control: AbstractControl
): ValidationErrors | null {

  const numero =
    String(control.value ?? '')
      .replace(/\s/g, '');

  if (!/^\d{13,19}$/.test(numero)) {
    return { tarjeta: true };
  }

  let suma = 0;
  let duplicar = false;

  for (
    let i = numero.length - 1;
    i >= 0;
    i--
  ) {

    let digito = Number(numero[i]);

    if (duplicar) {
      digito *= 2;

      if (digito > 9) {
        digito -= 9;
      }
    }

    suma += digito;
    duplicar = !duplicar;
  }

  return suma % 10 === 0
    ? null
    : { luhn: true };
}
