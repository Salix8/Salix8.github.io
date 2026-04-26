import { Injectable, computed, signal } from '@angular/core';
import { Character, createCharacter } from '../models/character.model';
import { calcAC, calcCustomSkillModifier, calcInitiative, calcProficiencyBonus, calcSaveModifier, calcSkillModifier, calcSpellAttack, calcSpellDC } from '../utils/dnd-math';

@Injectable({
  providedIn: 'root'
})
export class CharacterService {
  // Main state signal
  private readonly _character = signal<Character>(createCharacter());

  // Public readonly access to the signal
  readonly character = this._character.asReadonly();

  // Computed derived values based on current character state
  readonly proficiencyBonus = computed(() => calcProficiencyBonus(this._character().level));
  
  readonly initiative = computed(() => calcInitiative(this._character()));
  
  readonly armorClass = computed(() => calcAC(this._character()));

  readonly spellDC = computed(() => calcSpellDC(this._character()));
  readonly spellAttack = computed(() => calcSpellAttack(this._character()));

  // Computed objects for easier UI binding
  readonly savingThrowsMods = computed(() => ({
    strength: calcSaveModifier(this._character(), 'strength'),
    dexterity: calcSaveModifier(this._character(), 'dexterity'),
    constitution: calcSaveModifier(this._character(), 'constitution'),
    intelligence: calcSaveModifier(this._character(), 'intelligence'),
    wisdom: calcSaveModifier(this._character(), 'wisdom'),
    charisma: calcSaveModifier(this._character(), 'charisma')
  }));

  readonly skillsMods = computed(() => {
    const char = this._character();
    const result: Record<string, number> = {};
    for (const key of Object.keys(char.skills)) {
      result[key] = calcSkillModifier(char, key);
    }
    return result;
  });

  readonly customSkillsMods = computed(() => {
    const char = this._character();
    const result: Record<string, number> = {};
    for (const skill of char.customSkills) {
      result[skill.id] = calcCustomSkillModifier(char, skill);
    }
    return result;
  });

  constructor() {}

  // Methods to update state
  loadCharacter(character: Character) {
    this._character.set(character);
  }

  updateCharacter(updates: Partial<Character>) {
    this._character.update(char => ({ ...char, ...updates }));
  }

  updateNested<K extends keyof Character>(key: K, nestedUpdates: Partial<Character[K]>) {
    this._character.update(char => ({
      ...char,
      [key]: { ...(char[key] as any), ...nestedUpdates }
    }));
  }

  updateAbility(ability: string, score: number) {
    this._character.update(char => ({
      ...char,
      attributes: {
        ...char.attributes,
        [ability]: score
      }
    }));
  }
}
