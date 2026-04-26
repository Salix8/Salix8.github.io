import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CharacterService } from '../../services/character.service';
import { CONDITION_ICONS } from '../../models/dnd-constants';
import { Defense } from '../../models/character.model';
import { generateId, formatModifier } from '../../utils/dnd-math';

@Component({
  selector: 'app-defense-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Add Defense</h2>
    <mat-dialog-content style="display: flex; flex-direction: column; gap: 0.5rem; padding-top: 1rem;">
      <mat-form-field appearance="fill">
        <mat-label>Type</mat-label>
        <mat-select [(ngModel)]="type">
          <mat-option value="resistance">Resistance</mat-option>
          <mat-option value="vulnerability">Vulnerability</mat-option>
          <mat-option value="immunity">Immunity</mat-option>
          <mat-option value="custom">Custom</mat-option>
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="fill">
        <mat-label>Value (e.g. Fire, Bludgeoning)</mat-label>
        <input matInput [(ngModel)]="value">
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" [mat-dialog-close]="{type, value}" [disabled]="!value">Add</button>
    </mat-dialog-actions>
  `
})
export class DefenseDialog {
  type: string = 'resistance';
  value: string = '';
}

@Component({
  selector: 'app-secondary-stats',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatInputModule, MatFormFieldModule, MatIconModule, MatButtonModule, MatSelectModule],
  templateUrl: './secondary-stats.html',
  styleUrls: ['./secondary-stats.scss']
})
export class SecondaryStats {
  characterService = inject(CharacterService);
  character = this.characterService.character;
  profBonus = this.characterService.proficiencyBonus;

  conditionList = Object.keys(CONDITION_ICONS);
  conditionIcons = CONDITION_ICONS;
  selectedCondition = '';

  constructor(private dialog: MatDialog) {}

  formatMod(n: number): string { return formatModifier(n); }

  updateSpeed(event: Event) {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    if (!isNaN(val)) this.characterService.updateCharacter({ speed: val });
  }

  updateHitDice(event: Event) {
    this.characterService.updateCharacter({ hitDice: (event.target as HTMLInputElement).value });
  }
  updateHitDiceSpent(event: Event) {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    if (!isNaN(val)) this.characterService.updateCharacter({ hitDiceSpent: val });
  }

  openAddDefense() {
    this.dialog.open(DefenseDialog, { width: '350px' }).afterClosed().subscribe(result => {
      if (result) {
        const d: Defense = { id: generateId(), type: result.type, value: result.value };
        this.characterService.updateCharacter({ defenses: [...this.character().defenses, d] });
      }
    });
  }
  removeDefense(id: string) {
    this.characterService.updateCharacter({ defenses: this.character().defenses.filter(d => d.id !== id) });
  }
  getDefenseLabel(type: string): string {
    const labels: Record<string, string> = { resistance: 'RES', vulnerability: 'VUL', immunity: 'IMM', custom: '' };
    return labels[type] || '';
  }

  addCondition() {
    if (!this.selectedCondition) return;
    let cond = this.selectedCondition;
    if (cond === 'Custom') {
      const val = prompt('Enter custom condition:');
      if (!val) return;
      cond = val;
    }
    if (!this.character().conditions.includes(cond)) {
      this.characterService.updateCharacter({ conditions: [...this.character().conditions, cond] });
    }
    this.selectedCondition = '';
  }
  removeCondition(c: string) {
    this.characterService.updateCharacter({ conditions: this.character().conditions.filter(x => x !== c) });
  }

  updateExhaustion(val: number) {
    this.characterService.updateCharacter({ exhaustion: val });
  }
  exhaustionLevels = [0,1,2,3,4,5,6];
}
