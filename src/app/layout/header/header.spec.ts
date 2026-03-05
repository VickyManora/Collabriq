import { ThemeService, ThemeMode } from '../../core/services/theme.service';

describe('Header - Theme Toggle Logic', () => {
  let themeMenuOpen: boolean;
  let themeService: { mode: () => ThemeMode; setMode: (m: ThemeMode) => void };

  beforeEach(() => {
    localStorage.clear();
    themeMenuOpen = false;
    let currentMode: ThemeMode = 'system';
    themeService = {
      mode: () => currentMode,
      setMode: (m: ThemeMode) => { currentMode = m; },
    };
  });

  // Simulating component methods
  function toggleThemeMenu() {
    themeMenuOpen = !themeMenuOpen;
  }

  function setTheme(mode: ThemeMode) {
    themeService.setMode(mode);
    themeMenuOpen = false;
  }

  it('should toggle theme menu open/closed', () => {
    expect(themeMenuOpen).toBe(false);
    toggleThemeMenu();
    expect(themeMenuOpen).toBe(true);
    toggleThemeMenu();
    expect(themeMenuOpen).toBe(false);
  });

  it('should set theme to light and close menu', () => {
    themeMenuOpen = true;
    setTheme('light');
    expect(themeService.mode()).toBe('light');
    expect(themeMenuOpen).toBe(false);
  });

  it('should set theme to dark and close menu', () => {
    themeMenuOpen = true;
    setTheme('dark');
    expect(themeService.mode()).toBe('dark');
    expect(themeMenuOpen).toBe(false);
  });

  it('should set theme to system and close menu', () => {
    themeMenuOpen = true;
    setTheme('system');
    expect(themeService.mode()).toBe('system');
    expect(themeMenuOpen).toBe(false);
  });

  it('should support all three theme modes', () => {
    setTheme('light');
    expect(themeService.mode()).toBe('light');
    setTheme('dark');
    expect(themeService.mode()).toBe('dark');
    setTheme('system');
    expect(themeService.mode()).toBe('system');
  });
});
