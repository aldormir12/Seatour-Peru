import { inject } from '@angular/core';
import { RedirectFunction, Router, Routes } from '@angular/router';

import { RegistroComponent } from './components/registro/registro';
import { LoginComponent } from './components/login/login';
import { Inicio } from './components/inicio/inicio';

import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

import { AuthService } from './services/auth.service';

import { inicioPorRol, reservasPorRol } from './navigation';

import {
  PrivateLayout,
  PublicLayout,
  RoleLayout
} from './layouts/layouts';

import { ClienteShell } from './layouts/cliente-shell/cliente-shell';

import { AdminLayout } from './layouts/admin-layout/admin-layout';
import { OperatorLayout } from './layouts/operator-layout/operator-layout';


const area = () =>
  import('./components/area/area')
    .then(m => m.AreaComponent);

const adminDashboard = () =>
  import('./components/admin-dashboard/admin-dashboard')
    .then(m => m.AdminDashboard);

const adminCategorias = () =>
  import('./components/admin-categorias/admin-categorias')
    .then(m => m.AdminCategorias);

const adminTours = () =>
  import('./components/admin-tours/admin-tours')
    .then(m => m.AdminTours);

const adminUsuarios = () =>
  import('./components/admin-usuarios/admin-usuarios')
    .then(m => m.AdminUsuarios);

const adminEmbarcaciones = () =>
  import('./components/admin-embarcaciones/admin-embarcaciones')
    .then(m => m.AdminEmbarcaciones);

const adminSalidas = () =>
  import('./components/admin-salidas/admin-salidas')
    .then(m => m.AdminSalidas);

const reservas = () =>
  import('./components/reservas/reservas-lista')
    .then(m => m.ReservasListaComponent);

const detalle = () =>
  import('./components/reservas/reserva-detalle')
    .then(m => m.ReservaDetalleComponent);


const inicio: RedirectFunction = () =>
  inicioPorRol(inject(AuthService).usuario()?.rol);


function antigua(destino: string): RedirectFunction {
  return ({ params, queryParams, fragment }) =>
    inject(Router).createUrlTree(
      [
        destino.replace(
          ':salidaId',
          params['salidaId'] ?? ''
        )
      ],
      {
        queryParams,
        fragment: fragment ?? undefined
      }
    );
}


const reservasAnteriores: RedirectFunction = ({
  params,
  queryParams
}) => {

  if (inject(AuthService).usuario()?.rol === 'ADMIN') return '/app/admin';

  const base = reservasPorRol(
    inject(AuthService).usuario()?.rol ?? 'CLIENTE'
  );

  const query =
    new URLSearchParams(queryParams).toString();

  return `${base}${params['id']
    ? '/' + params['id']
    : ''
  }${query
    ? '?' + query
    : ''
  }`;
};


function gestion(admin: boolean): Routes {
  return [

    {
      path: '',
      pathMatch: 'full',
      loadComponent: admin ? adminDashboard : area,
      data: {
        titulo: admin
          ? 'Administración'
          : 'Operador',
        panel: true
      }
    },

    {
      path: 'salidas',
      loadComponent: adminSalidas
    },

    ...(admin ? [] : [
    {
      path: 'reservas',
      loadComponent: reservas,
      data: {
        gestion: true
      }
    },

    {
      path: 'reservas/:id',
      loadComponent: detalle
    }
    ]),

    ...(
      admin
        ? [
            'usuarios',
            'tours',
            'categorias',
            'embarcaciones'
          ]
        : [
            'embarcaciones'
          ]
    ).map(path => ({

      path,

      loadComponent: admin && path === 'tours'
        ? adminTours
        : admin && path === 'categorias'
          ? adminCategorias
          : admin && path === 'embarcaciones'
            ? adminEmbarcaciones
            : admin && path === 'usuarios'
              ? adminUsuarios
              : area,

      data: {
        titulo:
          path === 'categorias'
            ? 'Categorías'
            : path.charAt(0).toUpperCase()
              + path.slice(1)
      }

    }))
  ];
}


export const routes: Routes = [

  // =========================
  // PÚBLICO
  // =========================

  {
    path: '',
    component: PublicLayout,
    children: [

      {
        path: '',
        pathMatch: 'full',
        component: Inicio
      },

      {
        path: 'login',
        component: LoginComponent
      },

      {
        path: 'registro',
        component: RegistroComponent
      },

      {
        path: 'sin-acceso',
        loadComponent: () =>
          import(
            './components/reservas/sin-acceso'
          )
            .then(m => m.SinAccesoComponent)
      }

    ]
  },


  // =========================
  // ÁREA PRIVADA
  // =========================

  {
    path: 'app',

    canActivate: [
      authGuard
    ],

    canActivateChild: [
      authGuard
    ],

    children: [

      // -------------------------
      // REDIRECCIÓN SEGÚN ROL
      // -------------------------

      {
        path: '',
        pathMatch: 'full',
        redirectTo: inicio
      },


      // =========================
      // ADMIN
      // =========================

      {
        path: 'admin',

        component: AdminLayout,

        canActivate: [
          roleGuard
        ],

        canActivateChild: [
          roleGuard
        ],

        data: {
          roles: [
            'ADMIN'
          ]
        },

        children: gestion(true)
      },


      // =========================
      // OPERADOR
      // =========================

      {
        path: 'operador',
        component: OperatorLayout,
        canActivate: [roleGuard],
        canActivateChild: [roleGuard],
        data: { roles: ['OPERADOR'] },
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () => import('./components/operador-hoy/operador-hoy')
              .then(m => m.OperadorHoy)
          },
          {
            path: 'mis-salidas',
            loadComponent: () => import('./components/operador-mis-salidas/operador-mis-salidas')
              .then(m => m.OperadorMisSalidas)
          },
          {
            path: 'mis-salidas/:id',
            loadComponent: () => import('./components/operador-salida-detalle/operador-salida-detalle')
              .then(m => m.OperadorSalidaDetalle)
          }
        ]
      },

      // =========================
      // CLIENTE
      // =========================

      {
        path: '',

        component: PrivateLayout,

        children: [

          // -------------------------
          // CLIENTE
          // -------------------------

          {
            path: '',

            component: RoleLayout,

            canActivate: [
              roleGuard
            ],

            canActivateChild: [
              roleGuard
            ],

            data: {
              roles: [
                'CLIENTE'
              ]
            },

            children: [

              {
                path: '',
                component: ClienteShell,
                children: [
                  {
                    path: 'dashboard',
                    loadComponent: () => import('./components/dashboard-cliente/dashboard-cliente')
                      .then(m => m.DashboardClienteComponent)
                  },
                  {
                    path: 'live',
                    loadComponent: () => import('./components/cliente-live/cliente-live')
                      .then(m => m.ClienteLive)
                  },
                  {
                    path: 'mis-reservas',
                    loadComponent: reservas
                  }
                ]
              },

              {
                path: 'tours',
                loadComponent: () =>
                  import('./components/tours-cliente/tours-cliente')
                    .then(m => m.ToursCliente)
              },

              {
                path: 'tours/:id',
                loadComponent: () =>
                  import('./components/tour-detalle/tour-detalle')
                    .then(m => m.TourDetalle)
              },

              {
                path: 'rutas',
                pathMatch: 'full',
                redirectTo: '/app/tours'
              },

              {
                path: 'mis-reservas/:id',
                loadComponent: detalle
              },

              {
                path: 'reservar/:salidaId',

                loadComponent: () =>
                  import(
                    './components/reservas/reservar'
                  )
                    .then(
                      m => m.ReservarComponent
                    )
              }

            ]
          }

        ]
      }

    ]
  },


  // =========================
  // REDIRECCIONES ANTIGUAS
  // =========================

  {
    path: 'salidas',
    redirectTo: antigua('/app/tours')
  },

  {
    path: 'reservar/:salidaId',
    redirectTo: antigua(
      '/app/reservar/:salidaId'
    )
  },

  {
    path: 'mis-reservas',
    redirectTo: antigua(
      '/app/mis-reservas'
    )
  },

  {
    path: 'gestion/reservas',
    redirectTo: reservasAnteriores
  },

  {
    path: 'reservas/:id',
    redirectTo: reservasAnteriores
  },


  // =========================
  // FALLBACK
  // =========================

  {
    path: '**',
    redirectTo: '/'
  }

];
