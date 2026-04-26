import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-unit-converter',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatIconModule],
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
    </div>
  `,
  styles: [`
    .converter-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem; }
    h4 { margin: 0.5rem 0 0.25rem; color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; }
    .conv-row { display: flex; align-items: center; gap: 0.75rem; }
    .conv-field { flex: 1; }
    .conv-field ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }
    mat-icon { color: var(--text-muted); }
  `]
})
export class UnitConverter {
  feet: number | null = null;
  meters: number | null = null;
  lbs: number | null = null;
  kg: number | null = null;
  gallons: number | null = null;
  liters: number | null = null;

  ftToM(val: number) { this.meters = val != null ? parseFloat((val * 0.3048).toFixed(2)) : null; }
  mToFt(val: number) { this.feet = val != null ? parseFloat((val / 0.3048).toFixed(2)) : null; }
  lbsToKg(val: number) { this.kg = val != null ? parseFloat((val * 0.453592).toFixed(2)) : null; }
  kgToLbs(val: number) { this.lbs = val != null ? parseFloat((val / 0.453592).toFixed(2)) : null; }
  galToL(val: number) { this.liters = val != null ? parseFloat((val * 3.78541).toFixed(2)) : null; }
  lToGal(val: number) { this.gallons = val != null ? parseFloat((val / 3.78541).toFixed(2)) : null; }
}
