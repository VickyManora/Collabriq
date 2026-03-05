import { Injectable, signal, effect } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'collabriq-theme';
  readonly mode = signal<ThemeMode>(this.loadMode());

  constructor() {
    effect(() => {
      const mode = this.mode();
      localStorage.setItem(this.STORAGE_KEY, mode);
      this.applyTheme(mode);
    });

    // Listen for OS preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.mode() === 'system') {
        this.applyTheme('system');
      }
    });
  }

  setMode(mode: ThemeMode) {
    this.mode.set(mode);
  }

  private loadMode(): ThemeMode {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
    return 'system';
  }

  private applyTheme(mode: ThemeMode) {
    const isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }
}
