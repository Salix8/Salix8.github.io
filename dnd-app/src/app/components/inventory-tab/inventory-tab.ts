import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CharacterService } from '../../services/character.service';
import { INVENTORY_PRESET_TAGS, CUSTOM_TAG_COLOR } from '../../models/dnd-constants';
import { generateId } from '../../utils/dnd-math';
import { InventoryItem } from '../../models/character.model';

@Component({
  selector: 'app-item-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Edit' : 'Add' }} Item</h2>
    <mat-dialog-content class="dialog-content">
      <mat-form-field appearance="fill" style="width: 100%;">
        <mat-label>Item Name</mat-label>
        <input matInput [(ngModel)]="data.title" placeholder="e.g. Longsword">
      </mat-form-field>

      <div style="display: flex; gap: 1rem;">
        <mat-form-field appearance="fill" style="flex: 1;">
          <mat-label>Quantity</mat-label>
          <input matInput type="number" min="1" [(ngModel)]="data.quantity" (focus)="$event.target.select()">
        </mat-form-field>
        <mat-form-field appearance="fill" style="flex: 1;">
          <mat-label>Weight (lbs)</mat-label>
          <input matInput type="number" min="0" step="0.5" [(ngModel)]="data.weight" (focus)="$event.target.select()">
        </mat-form-field>
      </div>

      <mat-form-field appearance="fill" style="width: 100%;">
        <mat-label>Description</mat-label>
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
      <button mat-flat-button color="primary" [mat-dialog-close]="data" [disabled]="!data.title">Save</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-content { display: flex; flex-direction: column; gap: 0.5rem; padding-top: 1rem; }
    .tags-section { margin-top: 1rem; }
    .tags-section label { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem; display: block; }
    .tags-container { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .tag { padding: 0.25rem 0.75rem; border-radius: 16px; border: 1px solid var(--border-glass); cursor: pointer; transition: all 0.2s; font-size: 0.85rem; color: var(--text-secondary); }
    .tag.active { background: hsla(0,0%,100%,0.1); color: var(--text-primary); }
  `]
})
export class ItemDialog {
  characterService = inject(CharacterService);
  isEdit: boolean;
  availableTags = INVENTORY_PRESET_TAGS;

  constructor(@Inject(MAT_DIALOG_DATA) public data: InventoryItem & { isEdit?: boolean }) {
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
  selector: 'app-inventory-tab',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule],
  templateUrl: './inventory-tab.html',
  styleUrls: ['./inventory-tab.scss']
})
export class InventoryTab {
  characterService = inject(CharacterService);
  character = this.characterService.character;
  presetTags = INVENTORY_PRESET_TAGS;
  customColor = CUSTOM_TAG_COLOR;
  
  activeFilter: string | null = null;

  constructor(
    private dialog: MatDialog
  ) {}

  get inventory(): InventoryItem[] {
    let items = this.character().inventory;
    if (this.activeFilter) {
      items = items.filter(item => item.tags.includes(this.activeFilter!));
    }
    return items;
  }

  get totalWeight(): number {
    return this.character().inventory.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
  }

  getTagColor(tagId: string): string {
    const preset = this.presetTags.find(t => t.id === tagId);
    return preset ? preset.color : this.customColor;
  }

  getTagLabel(tagId: string): string {
    const preset = this.presetTags.find(t => t.id === tagId);
    if (preset) return preset.label;
    
    // For custom tags, find the label in the character's customTags
    const custom = this.character().customTags?.find(t => t === tagId);
    return custom ? custom : tagId;
  }

  toggleFilter(tagId: string) {
    if (this.activeFilter === tagId) {
      this.activeFilter = null;
    } else {
      this.activeFilter = tagId;
    }
  }

  openAddDialog() {
    const dialogRef = this.dialog.open(ItemDialog, {
      width: '450px',
      data: { title: '', description: '', quantity: 1, weight: 0, tags: [] }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const newItem: InventoryItem = {
          ...result,
          id: generateId()
        };
        const updated = [...this.character().inventory, newItem];
        this.characterService.updateCharacter({ inventory: updated });
      }
    });
  }

  openEditDialog(item: InventoryItem) {
    const dialogRef = this.dialog.open(ItemDialog, {
      width: '450px',
      // Clone the array so we don't accidentally mutate the state before save
      data: { ...item, tags: [...item.tags], isEdit: true }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const current = this.character().inventory;
        const index = current.findIndex(i => i.id === item.id);
        if (index !== -1) {
          const updated = [...current];
          updated[index] = { ...result };
          this.characterService.updateCharacter({ inventory: updated });
        }
      }
    });
  }

  deleteItem(id: string, event: Event) {
    event.stopPropagation();
    if (confirm('Delete this item?')) {
      const updated = this.character().inventory.filter(i => i.id !== id);
      this.characterService.updateCharacter({ inventory: updated });
    }
  }

  updateQuantity(id: string, delta: number, event: Event) {
    event.stopPropagation();
    const current = this.character().inventory;
    const index = current.findIndex(i => i.id === id);
    if (index !== -1) {
      const item = current[index];
      let newQty = item.quantity + delta;
      if (newQty < 1) return; // Don't allow less than 1, they should delete it
      
      const updated = [...current];
      updated[index] = { ...item, quantity: newQty };
      this.characterService.updateCharacter({ inventory: updated });
    }
  }
}
