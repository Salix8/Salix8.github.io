import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { CharacterService } from '../../services/character.service';

@Component({
  selector: 'app-unit-converter',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatIconModule, MatSelectModule],
  template: `
    <div class="converter-body">
      <h4>Distance</h4>
      <div class="conv-row">
        <mat-form-field appearance="outline" class="conv-field">
          <mat-label>Feet (ft)</mat-label>
          <input matInput type="number" [(ngModel)]="feet" (ngModelChange)="ftToM($event)">
        </mat-form-field>
        <mat-icon inline>swap_horiz</mat-icon>
        <mat-form-field appearance="outline" class="conv-field">
          <mat-label>Meters (m)</mat-label>
          <input matInput type="number" [(ngModel)]="meters" (ngModelChange)="mToFt($event)">
        </mat-form-field>
      </div>

      <div class="conv-row">
        <mat-form-field appearance="outline" class="conv-field">
          <mat-label>Miles (mi)</mat-label>
          <input matInput type="number" [(ngModel)]="miles" (ngModelChange)="miToKm($event)">
        </mat-form-field>
        <mat-icon inline>swap_horiz</mat-icon>
        <mat-form-field appearance="outline" class="conv-field">
          <mat-label>Kilometers (km)</mat-label>
          <input matInput type="number" [(ngModel)]="km" (ngModelChange)="kmToMi($event)">
        </mat-form-field>
      </div>

      <h4>Weight</h4>
      <div class="conv-row">
        <mat-form-field appearance="outline" class="conv-field">
          <mat-label>Pounds (lbs)</mat-label>
          <input matInput type="number" [(ngModel)]="lbs" (ngModelChange)="lbsToKg($event)">
        </mat-form-field>
        <mat-icon inline>swap_horiz</mat-icon>
        <mat-form-field appearance="outline" class="conv-field">
          <mat-label>Kilograms (kg)</mat-label>
          <input matInput type="number" [(ngModel)]="kg" (ngModelChange)="kgToLbs($event)">
        </mat-form-field>
      </div>

      <h4>Volume</h4>
      <div class="conv-row">
        <mat-form-field appearance="outline" class="conv-field">
          <mat-label>Gallons (gal)</mat-label>
          <input matInput type="number" [(ngModel)]="gallons" (ngModelChange)="galToL($event)">
        </mat-form-field>
        <mat-icon inline>swap_horiz</mat-icon>
        <mat-form-field appearance="outline" class="conv-field">
          <mat-label>Liters (L)</mat-label>
          <input matInput type="number" [(ngModel)]="liters" (ngModelChange)="lToGal($event)">
        </mat-form-field>
      </div>

      <h4>Jump Distance</h4>
      <div class="jump-section">
        <mat-form-field appearance="outline" style="width: 100%;">
          <mat-label>Based on</mat-label>
          <mat-select [(ngModel)]="jumpStat">
            <mat-option value="str">Strength</mat-option>
            <mat-option value="dex">Dexterity</mat-option>
          </mat-select>
        </mat-form-field>
        <div class="jump-grid">
          <div class="jump-card">
            <div class="jump-label">Long Jump</div>
            <div class="jump-val">{{ getLongJump() }} ft</div>
            <div class="jump-sub">Standing: {{ getLongJump() / 2 }} ft</div>
          </div>
          <div class="jump-card">
            <div class="jump-label">High Jump</div>
            <div class="jump-val">{{ getHighJump() }} ft</div>
            <div class="jump-sub">Standing: {{ getHighJump() / 2 }} ft</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .converter-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem; overflow-y: auto; height: 100%; }
    h4 { margin: 0.5rem 0 0.25rem; color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid var(--border-glass); padding-bottom: 0.25rem; }
    .conv-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
    .conv-field { flex: 1; }
    .conv-field ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }
    mat-icon { color: var(--text-muted); }
    .jump-section { display: flex; flex-direction: column; gap: 0.5rem; }
    .jump-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .jump-card { background: var(--bg-glass); border: 1px solid var(--border-glass); padding: 0.75rem; text-align: center; border-radius: var(--radius-sm); }
    .jump-label { font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.25rem; }
    .jump-val { font-size: 1.5rem; font-family: var(--font-display); font-weight: 700; color: var(--accent-1); margin-bottom: 0.25rem; }
    .jump-sub { font-size: 0.75rem; color: var(--text-secondary); }
  `]
})
export class UnitConverter {
  characterService = inject(CharacterService);
  character = this.characterService.character;

  feet: number | null = null;
  meters: number | null = null;
  miles: number | null = null;
  km: number | null = null;
  lbs: number | null = null;
  kg: number | null = null;
  gallons: number | null = null;
  liters: number | null = null;

  jumpStat: 'str' | 'dex' = 'str';

  ftToM(val: number) { this.meters = val != null ? parseFloat((val * 0.3048).toFixed(2)) : null; }
  mToFt(val: number) { this.feet = val != null ? parseFloat((val / 0.3048).toFixed(2)) : null; }
  miToKm(val: number) { this.km = val != null ? parseFloat((val * 1.60934).toFixed(2)) : null; }
  kmToMi(val: number) { this.miles = val != null ? parseFloat((val / 1.60934).toFixed(2)) : null; }
  lbsToKg(val: number) { this.kg = val != null ? parseFloat((val * 0.453592).toFixed(2)) : null; }
  kgToLbs(val: number) { this.lbs = val != null ? parseFloat((val / 0.453592).toFixed(2)) : null; }
  galToL(val: number) { this.liters = val != null ? parseFloat((val * 3.78541).toFixed(2)) : null; }
  lToGal(val: number) { this.gallons = val != null ? parseFloat((val / 3.78541).toFixed(2)) : null; }

  getScore(): number {
    return this.jumpStat === 'str' ? this.character().attributes.strength : this.character().attributes.dexterity;
  }
  
  getMod(): number {
    return Math.floor((this.getScore() - 10) / 2);
  }

  getLongJump(): number {
    return this.getScore();
  }

  getHighJump(): number {
    return Math.max(0, 3 + this.getMod());
  }
}
