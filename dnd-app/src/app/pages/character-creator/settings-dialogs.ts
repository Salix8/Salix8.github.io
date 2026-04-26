import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CharacterTheme } from '../../models/character.model';
import { ThemeService } from '../../services/theme.service';
import { CharacterService } from '../../services/character.service';

@Component({
  selector: 'app-settings-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Page Settings</h2>
    <mat-dialog-content>
      <div class="color-picker-grid">
        <div class="color-swatch" *ngFor="let color of colors" 
             [style.background]="color.main" 
             [class.active]="currentBg === color.bg"
             (click)="selectColor(color)">
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .color-picker-grid { display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 1rem; }
    .color-swatch { width: 40px; height: 40px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; transition: transform 0.2s; }
    .color-swatch:hover { transform: scale(1.1); }
    .color-swatch.active { border-color: white; box-shadow: 0 0 10px rgba(255,255,255,0.5); }
  `]
})
export class SettingsDialog {
  characterService = inject(CharacterService);
  colors: (CharacterTheme & {main: string})[] = [
    { main: '#9d4edd', bg: 'hsla(273, 65%, 15%, 1)', text: 'hsla(0, 0%, 100%, 0.85)', accent: 'hsla(273, 100%, 65%, 1)', accent2: 'hsla(300, 100%, 75%, 1)' },
    { main: '#3a86ff', bg: 'hsla(220, 65%, 15%, 1)', text: 'hsla(0, 0%, 100%, 0.85)', accent: 'hsla(220, 100%, 65%, 1)', accent2: 'hsla(200, 100%, 75%, 1)' },
    { main: '#06d6a0', bg: 'hsla(160, 65%, 15%, 1)', text: 'hsla(0, 0%, 100%, 0.85)', accent: 'hsla(160, 100%, 45%, 1)', accent2: 'hsla(180, 100%, 65%, 1)' },
    { main: '#ef476f', bg: 'hsla(340, 65%, 15%, 1)', text: 'hsla(0, 0%, 100%, 0.85)', accent: 'hsla(340, 100%, 65%, 1)', accent2: 'hsla(350, 100%, 75%, 1)' },
    { main: '#fca311', bg: 'hsla(30, 65%, 15%, 1)', text: 'hsla(0, 0%, 100%, 0.85)', accent: 'hsla(30, 100%, 55%, 1)', accent2: 'hsla(45, 100%, 65%, 1)' }
  ];
  
  get currentBg() {
    return this.characterService.character().theme?.bg;
  }

  constructor(
    private themeService: ThemeService,
    ) {}

  selectColor(color: CharacterTheme & {main: string}) {
    const themeObj: CharacterTheme = {
      bg: color.bg,
      text: color.text,
      accent: color.accent,
      accent2: color.accent2
    };
    this.themeService.applyTheme(themeObj);
    this.characterService.updateCharacter({ theme: themeObj });
  }
}

@Component({
  selector: 'app-unit-converter-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Unit Converter</h2>
    <mat-dialog-content style="padding-top: 1rem; display: flex; flex-direction: column; gap: 1rem;">
      <div style="display: flex; gap: 1rem; align-items: center;">
        <mat-form-field appearance="outline" style="flex: 1;">
          <mat-label>Feet (ft)</mat-label>
          <input matInput type="number" [(ngModel)]="feet" (ngModelChange)="ftToM($event)">
        </mat-form-field>
        <span>=</span>
        <mat-form-field appearance="outline" style="flex: 1;">
          <mat-label>Meters (m)</mat-label>
          <input matInput type="number" [(ngModel)]="meters" (ngModelChange)="mToFt($event)">
        </mat-form-field>
      </div>

      <div style="display: flex; gap: 1rem; align-items: center;">
        <mat-form-field appearance="outline" style="flex: 1;">
          <mat-label>Pounds (lbs)</mat-label>
          <input matInput type="number" [(ngModel)]="lbs" (ngModelChange)="lbsToKg($event)">
        </mat-form-field>
        <span>=</span>
        <mat-form-field appearance="outline" style="flex: 1;">
          <mat-label>Kilograms (kg)</mat-label>
          <input matInput type="number" [(ngModel)]="kg" (ngModelChange)="kgToLbs($event)">
        </mat-form-field>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `
})
export class UnitConverterDialog {
  characterService = inject(CharacterService);
  feet: number | null = null;
  meters: number | null = null;
  lbs: number | null = null;
  kg: number | null = null;

  ftToM(val: number) {
    if (val == null) { this.meters = null; return; }
    this.meters = parseFloat((val * 0.3048).toFixed(2));
  }

  mToFt(val: number) {
    if (val == null) { this.feet = null; return; }
    this.feet = parseFloat((val / 0.3048).toFixed(2));
  }

  lbsToKg(val: number) {
    if (val == null) { this.kg = null; return; }
    this.kg = parseFloat((val * 0.453592).toFixed(2));
  }

  kgToLbs(val: number) {
    if (val == null) { this.lbs = null; return; }
    this.lbs = parseFloat((val / 0.453592).toFixed(2));
  }
}
