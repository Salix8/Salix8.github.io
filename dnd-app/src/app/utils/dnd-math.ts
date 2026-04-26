import { SKILL_ABILITIES } from '../models/dnd-constants';
import { Character, CustomSkill } from '../models/character.model';

export function generateId(): string {
  return crypto.randomUUID();
}

export function calcModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function calcProficiencyBonus(level: number): number {
  return Math.floor((level - 1) / 4) + 2;
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function calcAC(character: Character): number {
  if (character.armorClass !== null) return character.armorClass;
  return 10 + calcModifier(character.attributes.dexterity);
}

export function calcInitiative(character: Character): number {
  return calcModifier(character.attributes.dexterity);
}

export function calcSaveModifier(character: Character, ability: string): number {
  const mod = calcModifier(character.attributes[ability as keyof typeof character.attributes]);
  const prof = calcProficiencyBonus(character.level);
  return character.savingThrows[ability as keyof typeof character.savingThrows] === 'proficient' ? mod + prof : mod;
}

export function calcSkillModifier(character: Character, skill: string): number {
  const ability = SKILL_ABILITIES[skill];
  const mod = calcModifier(character.attributes[ability as keyof typeof character.attributes]);
  const prof = calcProficiencyBonus(character.level);
  const level = character.skills[skill as keyof typeof character.skills];
  if (level === 'expertise') return mod + prof * 2;
  if (level === 'proficient') return mod + prof;
  return mod;
}

export function calcCustomSkillModifier(character: Character, customSkill: CustomSkill): number {
  const ability = customSkill.ability;
  const mod = calcModifier(character.attributes[ability as keyof typeof character.attributes]);
  const prof = calcProficiencyBonus(character.level);
  const level = customSkill.level;
  if (level === 'expertise') return mod + prof * 2;
  if (level === 'proficient') return mod + prof;
  return mod;
}

export function calcSpellDC(character: Character): number | null {
  const focus = character.spellcasting?.focus;
  if (!focus) return null;
  const mod = calcModifier(character.attributes[focus as keyof typeof character.attributes]);
  const prof = calcProficiencyBonus(character.level);
  return 8 + mod + prof;
}

export function calcSpellAttack(character: Character): number | null {
  const focus = character.spellcasting?.focus;
  if (!focus) return null;
  const mod = calcModifier(character.attributes[focus as keyof typeof character.attributes]);
  const prof = calcProficiencyBonus(character.level);
  return mod + prof;
}
