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
import { CharacterService } from '../../services/character.service';
import { SPELL_PRESET_TAGS, CUSTOM_SPELL_TAG_COLOR, getSpellLevelColor, ABILITY_ABBR } from '../../models/dnd-constants';
import { generateId } from '../../utils/dnd-math';
import { Spell, SpellGroup } from '../../models/character.model';

@Component({
  selector: 'app-spell-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Edit' : 'Add' }} Spell</h2>
    <mat-dialog-content class="dialog-content">
      <mat-form-field appearance="fill" style="width: 100%; margin-top: 1rem;">
        <mat-label>Spell Name</mat-label>
        <input matInput [(ngModel)]="data.name" placeholder="e.g. Fireball">
      </mat-form-field>

      <mat-form-field appearance="fill" style="width: 100%;">
        <mat-label>Description (Optional)</mat-label>
        <textarea matInput [(ngModel)]="data.description" rows="3"></textarea>
      </mat-form-field>

      <div class="tags-section">
        <label>Tags</label>
        <div class="tags-container">
          <div class="tag" 
               *ngFor="let tag of availableTags" 
               [class.active]="hasTag(tag.id)" 
               [style.borderColor]="tag.color"
               (click)="toggleTag(tag.id)">
            {{ tag.label }}
          </div>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" [mat-dialog-close]="data" [disabled]="!data.name">Save</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-content { display: flex; flex-direction: column; gap: 0.5rem; }
    .tags-section { margin-top: 1rem; }
    .tags-section label { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem; display: block; }
    .tags-container { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .tag { padding: 0.25rem 0.75rem; border-radius: 16px; border: 1px solid var(--border-glass); cursor: pointer; transition: all 0.2s; font-size: 0.85rem; color: var(--text-secondary); }
    .tag.active { background: hsla(0,0%,100%,0.1); color: var(--text-primary); }
  `]
})
export class SpellDialog {
  characterService = inject(CharacterService);
  isEdit: boolean;
  availableTags = SPELL_PRESET_TAGS;

  constructor(@Inject(MAT_DIALOG_DATA) public data: Spell & { isEdit?: boolean }) {
    this.isEdit = !!data.isEdit;
    if (!this.data.tags) this.data.tags = [];
  }

  hasTag(tagId: string): boolean {
    return this.data.tags.includes(tagId);
  }

  toggleTag(tagId: string) {
    if (this.hasTag(tagId)) {
      this.data.tags = this.data.tags.filter(t => t !== tagId);
    } else {
      this.data.tags.push(tagId);
    }
  }
}

@Component({
  selector: 'app-spell-group-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Add Spell Group</h2>
    <mat-dialog-content class="dialog-content">
      <mat-form-field appearance="fill" style="width: 100%; margin-top: 1rem;">
        <mat-label>Group Type</mat-label>
        <mat-select [(ngModel)]="type">
          <mat-option value="cantrip">Cantrips</mat-option>
          <mat-option value="level">Level X Spells</mat-option>
          <mat-option value="custom">Custom (e.g. Magic Item)</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="fill" style="width: 100%;" *ngIf="type === 'level'">
        <mat-label>Spell Level</mat-label>
        <input matInput type="number" min="1" [(ngModel)]="level">
      </mat-form-field>

      <mat-form-field appearance="fill" style="width: 100%;" *ngIf="type === 'level'">
        <mat-label>Total Spell Slots</mat-label>
        <input matInput type="number" min="0" [(ngModel)]="totalSlots">
      </mat-form-field>

      <mat-form-field appearance="fill" style="width: 100%;" *ngIf="type === 'custom'">
        <mat-label>Group Label (e.g. Warlock Invocations)</mat-label>
        <input matInput [(ngModel)]="label">
      </mat-form-field>

      <mat-form-field appearance="fill" style="width: 100%;" *ngIf="type === 'custom'">
        <mat-label>Uses (Optional)</mat-label>
        <input matInput type="number" min="0" [(ngModel)]="uses">
      </mat-form-field>
      
      <mat-form-field appearance="fill" style="width: 100%;" *ngIf="type === 'custom'">
        <mat-label>Recharge (e.g. Long Rest)</mat-label>
        <input matInput [(ngModel)]="recharge">
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" [mat-dialog-close]="{type, level, totalSlots, label, uses, recharge}" [disabled]="!isValid()">Save</button>
    </mat-dialog-actions>
  `,
  styles: [`.dialog-content { display: flex; flex-direction: column; gap: 0.5rem; }`]
})
export class SpellGroupDialog {
  characterService = inject(CharacterService);
  type: 'cantrip'|'level'|'custom' = 'cantrip';
  level = 1;
  totalSlots = 0;
  label = '';
  uses = null;
  recharge = '';

  isValid() {
    if (this.type === 'custom' && !this.label) return false;
    return true;
  }
}

@Component({
  selector: 'app-spells-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatIconModule, MatButtonModule, MatSelectModule, MatFormFieldModule],
  templateUrl: './spells-tab.html',
  styleUrls: ['./spells-tab.scss']
})
export class SpellsTab {
  characterService = inject(CharacterService);
  character = this.characterService.character;
  spellDC = this.characterService.spellDC;
  spellAttack = this.characterService.spellAttack;

  presetTags = SPELL_PRESET_TAGS;
  customColor = CUSTOM_SPELL_TAG_COLOR;
  
  activeFilter: string | null = null;
  abilities = Object.keys(ABILITY_ABBR).map(k => ({ id: k, label: ABILITY_ABBR[k as keyof typeof ABILITY_ABBR] }));

  constructor(
    private dialog: MatDialog
  ) {}

  get focus() {
    return this.character().spellcasting?.focus || null;
  }

  set focus(val: string | null) {
    this.characterService.updateNested('spellcasting', { focus: val });
  }

  get groups() {
    return this.character().spellcasting?.groups || [];
  }

  getSpells(group: SpellGroup) {
    if (!this.activeFilter) return group.spells;
    return group.spells.filter(s => s.tags.includes(this.activeFilter!));
  }

  getGroupColor(group: SpellGroup): string {
    if (group.type === 'cantrip') return getSpellLevelColor(0);
    if (group.type === 'level' && group.level) return getSpellLevelColor(group.level);
    return 'var(--accent-2)';
  }

  getGroupTitle(group: SpellGroup): string {
    if (group.type === 'cantrip') return 'Cantrips';
    if (group.type === 'level') return `Level ${group.level} Spells`;
    return group.label || 'Custom Spells';
  }

  getTagColor(tagId: string): string {
    const preset = this.presetTags.find(t => t.id === tagId);
    return preset ? preset.color : this.customColor;
  }

  getTagLabel(tagId: string): string {
    const preset = this.presetTags.find(t => t.id === tagId);
    if (preset) return preset.label;
    
    const custom = this.character().spellcasting?.customTags?.find(t => t === tagId);
    return custom ? custom : tagId;
  }

  toggleFilter(tagId: string) {
    if (this.activeFilter === tagId) {
      this.activeFilter = null;
    } else {
      this.activeFilter = tagId;
    }
  }

  openGroupDialog() {
    const dialogRef = this.dialog.open(SpellGroupDialog, { width: '400px' });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const newGroup: SpellGroup = {
          id: generateId(),
          type: result.type,
          level: result.level,
          totalSlots: result.totalSlots,
          usedSlots: 0,
          label: result.label,
          uses: result.uses,
          recharge: result.recharge,
          spells: []
        };
        const currentGroups = this.character().spellcasting?.groups || [];
        const updatedGroups = [...currentGroups, newGroup];
        
        // Sort groups: Cantrips first, then by level, then custom
        updatedGroups.sort((a, b) => {
          if (a.type === 'cantrip' && b.type !== 'cantrip') return -1;
          if (b.type === 'cantrip' && a.type !== 'cantrip') return 1;
          if (a.type === 'level' && b.type === 'level') return (a.level || 0) - (b.level || 0);
          if (a.type === 'level' && b.type !== 'level') return -1;
          if (b.type === 'level' && a.type !== 'level') return 1;
          return 0;
        });

        this.characterService.updateNested('spellcasting', { groups: updatedGroups });
      }
    });
  }

  deleteGroup(id: string) {
    if (confirm('Delete this entire spell group and its spells?')) {
      const current = this.character().spellcasting?.groups || [];
      this.characterService.updateNested('spellcasting', { groups: current.filter(g => g.id !== id) });
    }
  }

  updateSlots(groupId: string, index: number, used: boolean) {
    const currentGroups = [...(this.character().spellcasting?.groups || [])];
    const groupIndex = currentGroups.findIndex(g => g.id === groupId);
    if (groupIndex === -1) return;

    const group = { ...currentGroups[groupIndex] };
    
    // Toggle slot state
    if (used) {
      // Uncheck it and everything after it
      group.usedSlots = index;
    } else {
      // Check it and everything before it
      group.usedSlots = index + 1;
    }

    currentGroups[groupIndex] = group;
    this.characterService.updateNested('spellcasting', { groups: currentGroups });
  }

  getSlotArray(total: number): number[] {
    return Array(total || 0).fill(0).map((x, i) => i);
  }

  openAddSpellDialog(groupId: string) {
    const dialogRef = this.dialog.open(SpellDialog, {
      width: '450px',
      data: { name: '', description: '', tags: [] }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const newSpell: Spell = {
          ...result,
          id: generateId()
        };
        
        const currentGroups = [...(this.character().spellcasting?.groups || [])];
        const groupIndex = currentGroups.findIndex(g => g.id === groupId);
        if (groupIndex !== -1) {
          const group = { ...currentGroups[groupIndex] };
          group.spells = [...group.spells, newSpell];
          currentGroups[groupIndex] = group;
          this.characterService.updateNested('spellcasting', { groups: currentGroups });
        }
      }
    });
  }

  openEditSpellDialog(groupId: string, spell: Spell) {
    const dialogRef = this.dialog.open(SpellDialog, {
      width: '450px',
      data: { ...spell, isEdit: true }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const currentGroups = [...(this.character().spellcasting?.groups || [])];
        const groupIndex = currentGroups.findIndex(g => g.id === groupId);
        if (groupIndex !== -1) {
          const group = { ...currentGroups[groupIndex] };
          const spellIndex = group.spells.findIndex(s => s.id === spell.id);
          if (spellIndex !== -1) {
            group.spells = [...group.spells];
            group.spells[spellIndex] = { ...result, id: spell.id };
            currentGroups[groupIndex] = group;
            this.characterService.updateNested('spellcasting', { groups: currentGroups });
          }
        }
      }
    });
  }

  deleteSpell(groupId: string, spellId: string, event: Event) {
    event.stopPropagation();
    if (confirm('Delete this spell?')) {
      const currentGroups = [...(this.character().spellcasting?.groups || [])];
      const groupIndex = currentGroups.findIndex(g => g.id === groupId);
      if (groupIndex !== -1) {
        const group = { ...currentGroups[groupIndex] };
        group.spells = group.spells.filter(s => s.id !== spellId);
        currentGroups[groupIndex] = group;
        this.characterService.updateNested('spellcasting', { groups: currentGroups });
      }
    }
  }
}
