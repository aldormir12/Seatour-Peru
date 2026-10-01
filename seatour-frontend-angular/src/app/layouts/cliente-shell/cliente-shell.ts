import { afterEveryRender, Component, DestroyRef, ElementRef, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { IntelligenceOnboarding } from '../../components/intelligence-onboarding/intelligence-onboarding';
import { ToastContainer } from '../../components/toast-container/toast-container';

@Component({
  selector: 'app-cliente-shell',
  imports: [RouterOutlet, IntelligenceOnboarding, ToastContainer],
  host: { '[class.cliente-sin-hero]': 'sinHero()' },
  template: `
    @if (!sinHero()) {
      <div class="cliente-hero" aria-hidden="true"></div>
    }
    <router-outlet />
    @if (auth.usuario()?.rol === 'CLIENTE') {
      <app-intelligence-onboarding />
      <app-toast-container />
    }
  `,
  styleUrl: './cliente-shell.css'
})
export class ClienteShell {
  private readonly route = inject(ActivatedRoute);
  readonly sinHero = toSignal(inject(Router).events.pipe(
    filter(event => event instanceof NavigationEnd),
    startWith(null),
    map(() => this.route.firstChild?.snapshot.data['sinHero'] === true)
  ), { initialValue: false });
  readonly auth = inject(AuthService);

  constructor() {
    const host = inject(ElementRef<HTMLElement>).nativeElement;
    let observed: Element | null = null;
    let observer: ResizeObserver | undefined;

    // Preserve the dashboard's actual hero crop, including responsive content height.
    afterEveryRender(() => {
      const hero = host.querySelector('.hero');
      if (hero === observed) return;
      observer?.disconnect();
      observed = hero;
      if (!hero) return;
      const resize = () => host.style.setProperty('--cliente-hero-height', `${hero.getBoundingClientRect().height}px`);
      resize();
      if (typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(resize);
        observer.observe(hero);
      }
    });
    inject(DestroyRef).onDestroy(() => observer?.disconnect());
  }
}
