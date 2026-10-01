export interface Opcion {
  valor: string;
  titulo: string;
  descripcion: string;
  icono: string;
}

export const horarios: Opcion[] = [
    {
      valor: 'MANANA',
      titulo: 'Mañana',
      descripcion: 'Prefiero comenzar temprano.',
      icono: 'sunrise'
    },
    {
      valor: 'MEDIODIA',
      titulo: 'Mediodía',
      descripcion: 'Sin madrugar demasiado.',
      icono: 'sun'
    },
    {
      valor: 'TARDE',
      titulo: 'Tarde',
      descripcion: 'Prefiero salir después del almuerzo.',
      icono: 'cloud-sun'
    },
    {
      valor: 'ATARDECER',
      titulo: 'Atardecer',
      descripcion: 'Busco las últimas horas de luz.',
      icono: 'sunset'
    },
    {
      valor: 'CUALQUIERA',
      titulo: 'Cualquier horario',
      descripcion: 'Elige la mejor opción por mí.',
      icono: 'clock'
    }
  ];

export const actividades: Opcion[] = [
    {
      valor: 'TRANQUILO',
      titulo: 'Tranquilo',
      descripcion: 'Relajarme y disfrutar el paisaje.',
      icono: 'feather'
    },
    {
      valor: 'MODERADO',
      titulo: 'Moderado',
      descripcion: 'Un poco de actividad y exploración.',
      icono: 'compass'
    },
    {
      valor: 'INTENSO',
      titulo: 'Intenso',
      descripcion: 'Busco aventura y movimiento.',
      icono: 'zap'
    }
  ];

export const grupos: Opcion[] = [
    {
      valor: 'SOLO',
      titulo: 'Solo',
      descripcion: 'Viajo por mi cuenta.',
      icono: 'user'
    },
    {
      valor: 'PAREJA',
      titulo: 'Pareja',
      descripcion: 'Una experiencia para dos.',
      icono: 'heart'
    },
    {
      valor: 'FAMILIA',
      titulo: 'Familia',
      descripcion: 'Viajo con mi familia.',
      icono: 'users'
    },
    {
      valor: 'AMIGOS',
      titulo: 'Amigos',
      descripcion: 'Viajo con un grupo de amigos.',
      icono: 'party'
    }
  ];

export const opcionesPrioridad = [
    'Fauna marina',
    'Paisajes',
    'Fotografía',
    'Precio',
    'Comodidad',
    'Aventura',
    'Relajación',
    'Experiencias exclusivas'
  ];

export const opcionesRestriccion = [
    'Mar movido',
    'Madrugar',
    'Sol intenso',
    'Actividad física',
    'Grupos grandes',
    'Viajes largos'
  ];

