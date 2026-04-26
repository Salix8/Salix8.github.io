import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CharacterService } from '../../services/character.service';

@Component({
  selector: 'app-notes-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule],
  templateUrl: './notes-tab.html',
  styleUrls: ['./notes-tab.scss']
})
export class NotesTab {
  characterService = inject(CharacterService);
  character = this.characterService.character;

  

  updateNotes(notes: string) {
    this.characterService.updateCharacter({ notes });
  }
}
