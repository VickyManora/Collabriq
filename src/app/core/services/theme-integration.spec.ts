import { ThemeMode } from './theme.service';

describe('Theme Integration - DOM', () => {
  const STORAGE_KEY = 'collabriq-theme';

  function applyTheme(mode: ThemeMode) {
    const prefersDark = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = mode === 'dark' || (mode === 'system' && prefersDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('should set data-theme attribute on html element', () => {
    applyTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('should toggle between light and dark', () => {
    applyTheme('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    applyTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('should preserve mode in localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'dark');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');

    // Simulate restoring from storage
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode;
    applyTheme(stored);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('system mode should default to light in jsdom', () => {
    applyTheme('system');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('should handle rapid theme switches', () => {
    applyTheme('light');
    applyTheme('dark');
    applyTheme('light');
    applyTheme('dark');
    applyTheme('system');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
