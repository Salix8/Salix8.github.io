import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CharacterService } from '../../services/character.service';

@Component({
  selector: 'app-add-competency-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Add {{ category }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="fill" style="width: 100%; margin-top: 1rem;">
        <mat-label>Name</mat-label>
        <input matInput [(ngModel)]="name" placeholder="e.g. Elvish">
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" [mat-dialog-close]="name" [disabled]="!name">Add</button>
    </mat-dialog-actions>
  `
})
export class AddCompetencyDialog {
  characterService = inject(CharacterService);
  name = '';
  category = 'Competency';
}

@Component({
  selector: 'app-competencies-section',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule],
  templateUrl: './competencies-section.html',
  styleUrls: ['./competencies-section.scss']
})
export class CompetenciesSection {
  characterService = inject(CharacterService);
  competencies = this.characterService.character().competencies;

  categories = [
    { id: 'weapons', label: 'Weapons', icon: 'colorize' },
    { id: 'armor', label: 'Armor', icon: 'security' },
    { id: 'tools', label: 'Tools', icon: 'build' },
    { id: 'languages', label: 'Languages', icon: 'translate' },
    { id: 'extras', label: 'Extras', icon: 'star' }
  ];

  constructor(
    private dialog: MatDialog
  ) {}

  getCategoryItems(categoryId: string): string[] {
    return (this.characterService.character().competencies as any)[categoryId] || [];
  }

  addCompetency(category: string, label: string) {
    const dialogRef = this.dialog.open(AddCompetencyDialog, { width: '350px' });
    dialogRef.componentInstance.category = label;

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const current = this.characterService.character().competencies;
        const currentArray = current[category as keyof typeof current] as string[];
        
        this.characterService.updateNested('competencies', {
          [category]: [...currentArray, result]
        });
      }
    });
  }

  removeCompetency(category: string, item: string) {
    const current = this.characterService.character().competencies;
    const currentArray = current[category as keyof typeof current] as string[];
    
    this.characterService.updateNested('competencies', {
      [category]: currentArray.filter(i => i !== item)
    });
  }
}
