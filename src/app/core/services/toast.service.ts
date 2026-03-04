import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts = signal<Toast[]>([]);
  private nextId = 0;

  readonly toasts = this._toasts.asReadonly();

  success(message: string): void {
    this.add('success', message, 3000);
  }

  error(message: string): void {
    this.add('error', message, 5000);
  }

  dismiss(id: number): void {
    this._toasts.update((t) => t.filter((toast) => toast.id !== id));
  }

  private add(type: 'success' | 'error', message: string, duration: number): void {
    const id = this.nextId++;
    this._toasts.update((t) => [...t, { id, type, message }]);
    setTimeout(() => this.dismiss(id), duration);
  }
}
