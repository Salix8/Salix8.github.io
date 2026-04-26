import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CharacterTheme } from '../models/character.model';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  applyTheme(theme?: CharacterTheme) {
    if (!isPlatformBrowser(this.platformId)) return;

    const root = document.documentElement;
    
    if (theme) {
      if (theme.bg) root.style.setProperty('--bg-primary', theme.bg);
      if (theme.text) root.style.setProperty('--text-primary', theme.text);
      if (theme.accent) root.style.setProperty('--accent-1', theme.accent);
      if (theme.accent2) root.style.setProperty('--accent-2', theme.accent2);
      if (theme.text2) root.style.setProperty('--text-secondary', theme.text2);
      if (theme.text3) root.style.setProperty('--text-muted', theme.text3);
      if (theme.input) root.style.setProperty('--bg-input', theme.input);
      if (theme.glass) root.style.setProperty('--bg-glass', theme.glass);
      if (theme.skill) root.style.setProperty('--bg-skill-odd', theme.skill);
      if (theme.font) {
        root.style.setProperty('--font-body', theme.font);
        root.style.setProperty('--font-display', theme.font);
      }
    } else {
      // Clear inline styles to revert to CSS variables defaults
      root.style.removeProperty('--bg-primary');
      root.style.removeProperty('--text-primary');
      root.style.removeProperty('--accent-1');
      root.style.removeProperty('--accent-2');
      root.style.removeProperty('--text-secondary');
      root.style.removeProperty('--text-muted');
      root.style.removeProperty('--bg-input');
      root.style.removeProperty('--bg-glass');
      root.style.removeProperty('--bg-skill-odd');
      root.style.removeProperty('--font-body');
      root.style.removeProperty('--font-display');
    }
  }
}
