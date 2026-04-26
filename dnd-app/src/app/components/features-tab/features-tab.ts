import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { CharacterService } from '../../services/character.service';
import { MODULE_GROUPS, MODULE_TYPES } from '../../models/dnd-constants';
import { generateId } from '../../utils/dnd-math';
import { Module } from '../../models/character.model';
import { ModuleDialog } from '../actions-tab/actions-tab';

@Component({
  selector: 'app-features-tab',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule],
  templateUrl: './features-tab.html',
  styleUrls: ['./features-tab.scss']
})
export class FeaturesTab {
  characterService = inject(CharacterService);
  character = this.characterService.character;
  moduleTypes = MODULE_TYPES;

  constructor(
    private dialog: MatDialog
  ) {}

  get features(): Module[] {
    return this.character().modules.filter(m => MODULE_GROUPS['features'].includes(m.type));
  }

  getModuleColor(type: string): string {
    return this.moduleTypes[type]?.color || 'var(--text-muted)';
  }

  openAddDialog() {
    const dialogRef = this.dialog.open(ModuleDialog, {
      width: '500px',
      data: { isAction: false, title: '', type: 'class_feature', description: '' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const newModule: Module = {
          ...result,
          id: generateId(),
          isAction: false
        };
        const updated = [...this.character().modules, newModule];
        this.characterService.updateCharacter({ modules: updated });
      }
    });
  }

  openEditDialog(module: Module) {
    const dialogRef = this.dialog.open(ModuleDialog, {
      width: '500px',
      data: { ...module, isEdit: true, isAction: false }
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
    if (confirm('Delete this feature?')) {
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
