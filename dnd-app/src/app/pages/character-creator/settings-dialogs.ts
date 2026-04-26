import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CharacterTheme } from '../../models/character.model';
import { ThemeService } from '../../services/theme.service';
import { CharacterService } from '../../services/character.service';

@Component({
  selector: 'app-settings-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <div class="panel-body">
      <div class="color-form">
        <div class="color-row" *ngFor="let field of colorFields">
          <label>{{ field.label }}</label>
          <div class="color-input-wrapper">
            <input type="color" [ngModel]="getColor(field.key)" (ngModelChange)="setColor(field.key, $event)">
            <input type="text" class="color-text" [ngModel]="getColor(field.key)" (ngModelChange)="setColor(field.key, $event)" placeholder="#000000">
          </div>
        </div>
        <div class="color-row">
          <label>Font Family</label>
          <input type="text" class="font-input" [ngModel]="theme.font || ''" (ngModelChange)="setColor('font', $event)" placeholder="e.g. Inter, Roboto">
        </div>
      </div>
      <div class="panel-actions">
        <button mat-flat-button color="warn" style="width: 100%" (click)="resetTheme()">Reset to Default</button>
      </div>
    </div>
  `,
  styles: [`
    .panel-body { padding: 1.5rem; display: flex; flex-direction: column; height: 100%; gap: 1rem; }
    .color-form { display: flex; flex-direction: column; gap: 0.75rem; flex: 1; }
    .color-row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
    .color-row label { font-size: 0.9rem; color: var(--text-secondary); min-width: 120px; }
    .color-input-wrapper { display: flex; align-items: center; gap: 0.5rem; }
    input[type="color"] { width: 36px; height: 36px; border: none; cursor: pointer; background: none; padding: 0; }
    .color-text { width: 140px; padding: 0.4rem 0.5rem; background: var(--bg-input); border: 1px solid var(--border-glass); border-radius: var(--radius-sm); color: var(--text-primary); font-size: 0.85rem; font-family: monospace; }
    .font-input { flex: 1; padding: 0.4rem 0.5rem; background: var(--bg-input); border: 1px solid var(--border-glass); border-radius: var(--radius-sm); color: var(--text-primary); font-size: 0.85rem; }
    .panel-actions { margin-top: auto; padding-top: 1rem; border-top: 1px solid var(--border-glass); }
  `]
})
export class SettingsPanel {
  characterService = inject(CharacterService);
  themeService = inject(ThemeService);

  colorFields = [
    { key: 'bg',      label: 'Background' },
    { key: 'text',    label: 'Text' },
    { key: 'accent',  label: 'Accent 1' },
    { key: 'accent2', label: 'Accent 2' },
    { key: 'text2',   label: 'Secondary Text' },
    { key: 'text3',   label: 'Muted Text' },
    { key: 'input',   label: 'Input Background' },
    { key: 'glass',   label: 'Glass Background' },
    { key: 'skill',   label: 'Skill Row Alt' }
  ];

  get theme(): CharacterTheme {
    return this.characterService.character().theme || {};
  }

  getColor(key: string): string {
    return (this.theme as any)[key] || '';
  }

  setColor(key: string, value: string) {
    const updated: CharacterTheme = { ...this.theme, [key]: value };
    this.characterService.updateCharacter({ theme: updated });
    this.themeService.applyTheme(updated);
  }

  resetTheme() {
    this.characterService.updateCharacter({ theme: undefined });
    this.themeService.applyTheme(undefined);
  }
}
