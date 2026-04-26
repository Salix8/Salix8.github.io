import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CharacterService } from '../../services/character.service';
import { formatModifier } from '../../utils/dnd-math';

@Component({
  selector: 'app-combat-stats',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatInputModule, MatFormFieldModule, MatIconModule, MatButtonModule],
  templateUrl: './combat-stats.html',
  styleUrls: ['./combat-stats.scss']
})
export class CombatStats {
  characterService = inject(CharacterService);
  character = this.characterService.character;
  initiative = this.characterService.initiative;
  ac = this.characterService.armorClass;

  

  formatMod(mod: number): string {
    return formatModifier(mod);
  }

  updateAC(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.value === '') {
      this.characterService.updateCharacter({ armorClass: null });
    } else {
      const val = parseInt(input.value, 10);
      if (!isNaN(val)) {
        this.characterService.updateCharacter({ armorClass: val });
      }
    }
  }

  updateSpeed(event: Event) {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    if (!isNaN(val)) {
      this.characterService.updateCharacter({ speed: val });
    }
  }

  updateHPMax(event: Event) {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    if (!isNaN(val)) {
      this.characterService.updateNested('hitPoints', { max: val });
    }
  }

  handleHPMath(event: Event, type: 'current' | 'temporary') {
    const input = event.target as HTMLInputElement;
    const value = input.value.trim();
    if (!value) return;

    let currentVal = this.character().hitPoints[type];
    let newVal = currentVal;

    if (value.startsWith('+') || value.startsWith('-')) {
      const modifier = parseInt(value, 10);
      if (!isNaN(modifier)) {
        newVal += modifier;
      }
    } else {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed)) {
        newVal = parsed;
      }
    }

    if (type === 'current' && newVal > this.character().hitPoints.max) {
      newVal = this.character().hitPoints.max;
    }
    if (newVal < 0) newVal = 0;

    this.characterService.updateNested('hitPoints', { [type]: newVal });
    
    // Reset input so it shows the new calculated value
    input.value = newVal.toString();
  }

  updateHitDice(event: Event) {
    this.characterService.updateCharacter({ hitDice: (event.target as HTMLInputElement).value });
  }

  updateHitDiceSpent(event: Event) {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    if (!isNaN(val)) {
      this.characterService.updateCharacter({ hitDiceSpent: val });
    }
  }

  updateExhaustion(event: Event) {
    let val = parseInt((event.target as HTMLInputElement).value, 10);
    if (isNaN(val)) val = 0;
    if (val < 0) val = 0;
    if (val > 6) val = 6;
    this.characterService.updateCharacter({ exhaustion: val });
  }
}
