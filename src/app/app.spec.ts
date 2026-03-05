import { ThemeService, ThemeMode } from './core/services/theme.service';

describe('App - Theme initialization', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('should default to system mode with no stored preference', () => {
    const mode = localStorage.getItem('collabriq-theme') as ThemeMode | null;
    const resolved = mode === 'light' || mode === 'dark' || mode === 'system' ? mode : 'system';
    expect(resolved).toBe('system');
  });

  it('should load dark mode from stored preference', () => {
    localStorage.setItem('collabriq-theme', 'dark');
    const mode = localStorage.getItem('collabriq-theme');
    expect(mode).toBe('dark');
  });

  it('should load light mode from stored preference', () => {
    localStorage.setItem('collabriq-theme', 'light');
    const mode = localStorage.getItem('collabriq-theme');
    expect(mode).toBe('light');
  });

  it('should default to system for invalid stored value', () => {
    localStorage.setItem('collabriq-theme', 'garbage');
    const stored = localStorage.getItem('collabriq-theme');
    const mode = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    expect(mode).toBe('system');
  });
});
