import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CharacterService } from '../../services/character.service';

@Component({
  selector: 'app-char-header',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './char-header.html',
  styleUrls: ['./char-header.scss']
})
export class CharHeader {
  characterService = inject(CharacterService);
  character = this.characterService.character;

  

  updateName(name: string) {
    this.characterService.updateCharacter({ name });
  }

  updateClass(className: string) {
    this.characterService.updateCharacter({ class: className });
  }

  updateRace(race: string) {
    this.characterService.updateCharacter({ race });
  }

  updateLevel(levelStr: string) {
    const level = parseInt(levelStr, 10);
    if (!isNaN(level) && level >= 1 && level <= 20) {
      this.characterService.updateCharacter({ level });
    }
  }

  updateBackground(background: string) {
    this.characterService.updateCharacter({ background });
  }
}
