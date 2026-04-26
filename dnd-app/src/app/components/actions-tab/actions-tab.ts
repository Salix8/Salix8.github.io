import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CharacterService } from '../../services/character.service';
import { MODULE_GROUPS, MODULE_TYPES } from '../../models/dnd-constants';
import { generateId } from '../../utils/dnd-math';
import { Module } from '../../models/character.model';

@Component({
  selector: 'app-module-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Edit' : 'Add' }} {{ isAction ? 'Action' : 'Feature' }}</h2>
    <mat-dialog-content class="dialog-content">
      <mat-form-field appearance="fill" style="width: 100%;">
        <mat-label>Title</mat-label>
        <input matInput [(ngModel)]="data.title" placeholder="e.g. Action Surge">
      </mat-form-field>

      <mat-form-field appearance="fill" style="width: 100%;">
        <mat-label>Type</mat-label>
        <mat-select [(ngModel)]="data.type">
          <mat-option *ngFor="let t of availableTypes" [value]="t.id">{{ t.label }}</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="fill" style="width: 100%;">
        <mat-label>Description</mat-label>
        <textarea matInput [(ngModel)]="data.description" rows="3"></textarea>
      </mat-form-field>

      <div class="checkbox-row" *ngIf="isAction">
        <mat-checkbox [(ngModel)]="data.dealsDamage">Deals Damage / Effect</mat-checkbox>
      </div>

      <ng-container *ngIf="data.dealsDamage && isAction">
        <mat-form-field appearance="fill" style="width: 100%;">
          <mat-label>Attack Bonus (e.g. +5)</mat-label>
          <input matInput [(ngModel)]="data.attackBonus">
        </mat-form-field>

        <mat-form-field appearance="fill" style="width: 100%;">
          <mat-label>Damage/Effect (e.g. 1d8 + 3 Slashing)</mat-label>
          <input matInput [(ngModel)]="data.damageOrEffect">
        </mat-form-field>
      </ng-container>

      <div class="checkbox-row">
        <mat-checkbox [(ngModel)]="data.usesEnabled">Has limited uses</mat-checkbox>
      </div>

      <ng-container *ngIf="data.usesEnabled">
        <div style="display: flex; gap: 1rem;">
          <mat-form-field appearance="fill" style="flex: 1;">
            <mat-label>Current Uses</mat-label>
            <input matInput type="number" [(ngModel)]="data.usesCurrent">
          </mat-form-field>
          <mat-form-field appearance="fill" style="flex: 1;">
            <mat-label>Max Uses</mat-label>
            <input matInput type="number" [(ngModel)]="data.usesMax">
          </mat-form-field>
        </div>
        <mat-form-field appearance="fill" style="width: 100%;">
          <mat-label>Recharge (e.g. Short Rest)</mat-label>
          <input matInput [(ngModel)]="data.usesRecharge">
        </mat-form-field>
      </ng-container>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" [mat-dialog-close]="data" [disabled]="!data.title || !data.type">Save</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-content { display: flex; flex-direction: column; gap: 0.5rem; padding-top: 1rem; }
    .checkbox-row { margin-bottom: 1rem; }
  `]
})
export class ModuleDialog {
  characterService = inject(CharacterService);
  isEdit: boolean;
  isAction: boolean;
  availableTypes: { id: string, label: string }[];

  constructor(@Inject(MAT_DIALOG_DATA) public data: Module & { isEdit?: boolean, isAction?: boolean }) {
    this.isEdit = !!data.isEdit;
    this.isAction = !!data.isAction;
    
    const typesGroup = this.isAction ? MODULE_GROUPS['actions'] : MODULE_GROUPS['features'];
    this.availableTypes = typesGroup.map(id => ({ id, label: MODULE_TYPES[id].label }));
  }
}

@Component({
  selector: 'app-actions-tab',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule],
  templateUrl: './actions-tab.html',
  styleUrls: ['./actions-tab.scss']
})
export class ActionsTab {
  characterService = inject(CharacterService);
  character = this.characterService.character;
  moduleTypes = MODULE_TYPES;

  constructor(
    private dialog: MatDialog
  ) {}

  get actions(): Module[] {
    return this.character().modules.filter(m => MODULE_GROUPS['actions'].includes(m.type));
  }

  getModuleColor(type: string): string {
    return this.moduleTypes[type]?.color || 'var(--text-muted)';
  }

  openAddDialog() {
    const dialogRef = this.dialog.open(ModuleDialog, {
      width: '500px',
      data: { isAction: true, title: '', type: 'action', description: '' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const newModule: Module = {
          ...result,
          id: generateId(),
          isAction: true
        };
        const updated = [...this.character().modules, newModule];
        this.characterService.updateCharacter({ modules: updated });
      }
    });
  }

  openEditDialog(module: Module) {
    const dialogRef = this.dialog.open(ModuleDialog, {
      width: '500px',
      data: { ...module, isEdit: true, isAction: true }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const current = this.character().modules;
        const index = current.findIndex(m => m.id === module.id);
        if (index !== -1) {
          const updated = [...current];
          updated[index] = { ...result };
          this.characterService.updateCharacter({ modules: updated });
        }
      }
    });
  }

  deleteModule(id: string, event: Event) {
    event.stopPropagation();
    if (confirm('Delete this action?')) {
      const updated = this.character().modules.filter(m => m.id !== id);
      this.characterService.updateCharacter({ modules: updated });
    }
  }

  updateUses(id: string, delta: number, event: Event) {
    event.stopPropagation();
    const current = this.character().modules;
    const index = current.findIndex(m => m.id === id);
    if (index !== -1) {
      const module = current[index];
      let newUses = (module.usesCurrent || 0) + delta;
      if (newUses < 0) newUses = 0;
      if (module.usesMax && newUses > module.usesMax) newUses = module.usesMax;
      
      const updated = [...current];
      updated[index] = { ...module, usesCurrent: newUses };
      this.characterService.updateCharacter({ modules: updated });
    }
  }
}
