import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { CharacterService } from '../../services/character.service';
import { formatModifier } from '../../utils/dnd-math';

@Component({
  selector: 'app-combat-stats',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatInputModule, MatFormFieldModule, MatIconModule],
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

    const hp = this.character().hitPoints;
    let currentHP = hp.current;
    let tempHP = hp.temporary;

    if (value.startsWith('+')) {
      const amount = parseInt(value, 10);
      if (!isNaN(amount)) {
        if (type === 'current') {
          currentHP = Math.min(currentHP + amount, hp.max);
        } else {
          tempHP += amount;
        }
      }
    } else if (value.startsWith('-')) {
      let damage = Math.abs(parseInt(value, 10));
      if (!isNaN(damage)) {
        if (type === 'current') {
          // Drain temp HP first
          if (tempHP > 0) {
            const absorbed = Math.min(tempHP, damage);
            tempHP -= absorbed;
            damage -= absorbed;
          }
          currentHP = Math.max(0, currentHP - damage);
        } else {
          tempHP = Math.max(0, tempHP - damage);
        }
      }
    } else {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed)) {
        if (type === 'current') {
          currentHP = Math.min(Math.max(0, parsed), hp.max);
        } else {
          tempHP = Math.max(0, parsed);
        }
      }
    }

    this.characterService.updateNested('hitPoints', { current: currentHP, temporary: tempHP });
    input.value = type === 'current' ? currentHP.toString() : tempHP.toString();
  }

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

  updateExhaustion(event: Event) {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    if (!isNaN(val)) this.characterService.updateCharacter({ exhaustion: val });
  }
}
