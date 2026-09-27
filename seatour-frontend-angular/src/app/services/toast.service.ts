import { Injectable, OnDestroy, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';
export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService implements OnDestroy {
  private readonly items = signal<Toast[]>([]);
  readonly toasts = this.items.asReadonly();
  private sequence = 0;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  show(type: ToastType, message: string, duration = 6000): number {
    const id = ++this.sequence;
    this.items.update(items => [...items, { id, type, message }]);
    if (duration > 0) {
      this.timers.set(id, setTimeout(() => this.dismiss(id), duration));
    }
    return id;
  }

  success(message: string) { return this.show('success', message); }
  error(message: string) { return this.show('error', message, 9000); }
  warning(message: string) { return this.show('warning', message, 9000); }
  info(message: string) { return this.show('info', message); }

  dismiss(id: number): void {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    this.items.update(items => items.filter(item => item.id !== id));
  }

  clear(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.items.set([]);
  }

  ngOnDestroy(): void { this.clear(); }
}
