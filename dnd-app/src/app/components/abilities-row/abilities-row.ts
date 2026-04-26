import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { CharacterService } from '../../services/character.service';
import { ABILITY_ORDER, ABILITY_ABBR } from '../../models/dnd-constants';
import { formatModifier, calcModifier } from '../../utils/dnd-math';

@Component({
  selector: 'app-abilities-row',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  templateUrl: './abilities-row.html',
  styleUrls: ['./abilities-row.scss']
})
export class AbilitiesRow {
  characterService = inject(CharacterService);
  abilities = ABILITY_ORDER;
  abbr = ABILITY_ABBR;

  character = this.characterService.character;
  saveMods = this.characterService.savingThrowsMods;

  

  getModifier(score: number): string {
    return formatModifier(calcModifier(score));
  }

  getSaveModifier(ability: string): string {
    const mod = (this.saveMods() as any)[ability];
    return formatModifier(mod);
  }

  updateScore(ability: string, event: Event) {
    const input = event.target as HTMLInputElement;
    let val = parseInt(input.value, 10);
    if (isNaN(val)) val = 10;
    if (val < 1) val = 1;
    if (val > 30) val = 30;
    
    this.characterService.updateAbility(ability, val);
  }

  getAbilityScore(ability: string): number {
    return (this.character().attributes as any)[ability];
  }

  getSaveLevel(ability: string): string {
    return (this.character().savingThrows as any)[ability];
  }

  toggleSave(ability: string) {
    const currentThrows = this.character().savingThrows;
    const current = (currentThrows as any)[ability];
    const next = current === 'none' ? 'proficient' : 'none';
    this.characterService.updateNested('savingThrows', { [ability]: next });
  }
}
