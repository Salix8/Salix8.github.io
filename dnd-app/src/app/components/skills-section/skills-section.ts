import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CharacterService } from '../../services/character.service';
import { SKILL_NAMES, SKILL_ABILITIES, ABILITY_ABBR } from '../../models/dnd-constants';
import { formatModifier, generateId } from '../../utils/dnd-math';
import { CustomSkill, ProficiencyLevel } from '../../models/character.model';

@Component({
  selector: 'app-skill-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Add Custom Skill</h2>
    <mat-dialog-content>
      <mat-form-field appearance="fill" style="width: 100%; margin-top: 1rem;">
        <mat-label>Skill Name</mat-label>
        <input matInput [(ngModel)]="name" placeholder="e.g. Sailing">
      </mat-form-field>
      <mat-form-field appearance="fill" style="width: 100%;">
        <mat-label>Governing Ability</mat-label>
        <mat-select [(ngModel)]="ability">
          <mat-option *ngFor="let a of abilities" [value]="a.id">{{ a.label }}</mat-option>
        </mat-select>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" [mat-dialog-close]="{name, ability}" [disabled]="!name || !ability">Save</button>
    </mat-dialog-actions>
  `
})
export class SkillDialog {
  characterService = inject(CharacterService);
  name = '';
  ability = '';
  abilities = Object.keys(ABILITY_ABBR).map(k => ({ id: k, label: ABILITY_ABBR[k as keyof typeof ABILITY_ABBR] }));
}

@Component({
  selector: 'app-skills-section',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule, MatDialogModule],
  templateUrl: './skills-section.html',
  styleUrls: ['./skills-section.scss']
})
export class SkillsSection {
  characterService = inject(CharacterService);
  character = this.characterService.character;
  skillMods = this.characterService.skillsMods;
  customMods = this.characterService.customSkillsMods;

  skillKeys = Object.keys(SKILL_NAMES);
  skillNames = SKILL_NAMES;
  skillAbilities = SKILL_ABILITIES;
  abbr = ABILITY_ABBR;

  constructor(
    private dialog: MatDialog
  ) {}

  formatMod(mod: number): string {
    return formatModifier(mod);
  }

  getSkillLevel(key: string): string {
    return (this.character().skills as any)[key];
  }

  toggleSkill(skill: string) {
    const currentMap = this.character().skills;
    const current = this.character().skills[skill as keyof typeof currentMap];
    const nextMap: Record<ProficiencyLevel, ProficiencyLevel> = {
      'none': 'proficient',
      'proficient': 'expertise',
      'expertise': 'none'
    };
    this.characterService.updateNested('skills', { [skill]: nextMap[current] });
  }

  toggleCustomSkill(id: string) {
    const current = this.character().customSkills;
    const index = current.findIndex(s => s.id === id);
    if (index === -1) return;

    const nextMap: Record<ProficiencyLevel, ProficiencyLevel> = {
      'none': 'proficient',
      'proficient': 'expertise',
      'expertise': 'none'
    };
    
    const updated = [...current];
    updated[index] = { ...updated[index], level: nextMap[updated[index].level] };
    this.characterService.updateCharacter({ customSkills: updated });
  }

  deleteCustomSkill(id: string) {
    const current = this.character().customSkills;
    this.characterService.updateCharacter({ customSkills: current.filter(s => s.id !== id) });
  }

  openCustomSkillDialog() {
    const dialogRef = this.dialog.open(SkillDialog, { width: '400px' });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const newSkill: CustomSkill = {
          id: generateId(),
          name: result.name,
          ability: result.ability,
          level: 'none'
        };
        const updated = [...this.character().customSkills, newSkill];
        this.characterService.updateCharacter({ customSkills: updated });
      }
    });
  }
}
