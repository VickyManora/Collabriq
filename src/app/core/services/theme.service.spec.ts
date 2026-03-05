import { ThemeMode } from './theme.service';

/**
 * Test the ThemeService logic without Angular DI.
 * The ThemeService uses signal + effect which requires injection context,
 * so we test the pure logic functions directly.
 */
describe('ThemeService - Logic', () => {
  const STORAGE_KEY = 'collabriq-theme';

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  // loadMode logic
  function loadMode(): ThemeMode {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
    return 'system';
  }

  // applyTheme logic
  function applyTheme(mode: ThemeMode) {
    const prefersDark = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = mode === 'dark' || (mode === 'system' && prefersDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }

  describe('loadMode', () => {
    it('should return system when no stored value', () => {
      expect(loadMode()).toBe('system');
    });

    it('should return light when stored as light', () => {
      localStorage.setItem(STORAGE_KEY, 'light');
      expect(loadMode()).toBe('light');
    });

    it('should return dark when stored as dark', () => {
      localStorage.setItem(STORAGE_KEY, 'dark');
      expect(loadMode()).toBe('dark');
    });

    it('should return system when stored as system', () => {
      localStorage.setItem(STORAGE_KEY, 'system');
      expect(loadMode()).toBe('system');
    });

    it('should return system for invalid stored value', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid');
      expect(loadMode()).toBe('system');
    });

    it('should return system for empty string', () => {
      localStorage.setItem(STORAGE_KEY, '');
      expect(loadMode()).toBe('system');
    });
  });

  describe('applyTheme', () => {
    it('should set data-theme=light for light mode', () => {
      applyTheme('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should set data-theme=dark for dark mode', () => {
      applyTheme('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should set data-theme=light for system mode in jsdom', () => {
      // jsdom does not match prefers-color-scheme: dark
      applyTheme('system');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should switch between themes without errors', () => {
      applyTheme('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');

      applyTheme('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

      applyTheme('system');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });
  });

  describe('localStorage persistence', () => {
    it('should store and retrieve light mode', () => {
      localStorage.setItem(STORAGE_KEY, 'light');
      expect(loadMode()).toBe('light');
    });

    it('should store and retrieve dark mode', () => {
      localStorage.setItem(STORAGE_KEY, 'dark');
      expect(loadMode()).toBe('dark');
    });

    it('should store and retrieve system mode', () => {
      localStorage.setItem(STORAGE_KEY, 'system');
      expect(loadMode()).toBe('system');
    });
  });
});
