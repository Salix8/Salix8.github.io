import { generateId } from '../utils/dnd-math';

export type ProficiencyLevel = 'none' | 'proficient' | 'expertise';

export interface AbilityScores {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface SavingThrows {
  strength: ProficiencyLevel;
  dexterity: ProficiencyLevel;
  constitution: ProficiencyLevel;
  intelligence: ProficiencyLevel;
  wisdom: ProficiencyLevel;
  charisma: ProficiencyLevel;
}

export interface Skills {
  acrobatics: ProficiencyLevel;
  animalHandling: ProficiencyLevel;
  arcana: ProficiencyLevel;
  athletics: ProficiencyLevel;
  deception: ProficiencyLevel;
  history: ProficiencyLevel;
  insight: ProficiencyLevel;
  intimidation: ProficiencyLevel;
  investigation: ProficiencyLevel;
  medicine: ProficiencyLevel;
  nature: ProficiencyLevel;
  perception: ProficiencyLevel;
  performance: ProficiencyLevel;
  persuasion: ProficiencyLevel;
  religion: ProficiencyLevel;
  sleightOfHand: ProficiencyLevel;
  stealth: ProficiencyLevel;
  survival: ProficiencyLevel;
}

export interface CustomSkill {
  id: string;
  name: string;
  ability: string;
  level: ProficiencyLevel;
}

export interface HitPoints {
  max: number;
  current: number;
  temporary: number;
}

export interface Module {
  id: string;
  type: string;
  title: string;
  description: string;
  dealsDamage?: boolean;
  attackBonus?: string;
  damageOrEffect?: string;
  calcType?: string;
  calcAbility?: string;
  isAction?: boolean;
  actionType?: string;
  usesEnabled?: boolean;
  usesCurrent?: number;
  usesMax?: number;
  usesRecharge?: string;
}

export interface InventoryItem {
  id: string;
  title: string;
  description: string;
  quantity: number;
  weight: number;
  tags: string[];
  isAction?: boolean;
  actionType?: string;
  usesEnabled?: boolean;
  usesCurrent?: number;
  usesMax?: number;
  usesRecharge?: string;
}

export interface Spell {
  id: string;
  name: string;
  description: string;
  tags: string[];
}

export interface SpellGroup {
  id: string;
  type: 'cantrip' | 'level' | 'custom';
  level?: number;
  totalSlots?: number;
  usedSlots?: number;
  uses?: number;
  recharge?: string;
  label?: string;
  spells: Spell[];
}

export interface Spellcasting {
  focus: string | null;
  groups: SpellGroup[];
  customTags: string[];
}

export interface Competencies {
  weapons: string[];
  armor: string[];
  tools: string[];
  languages: string[];
  extras: string[];
}

export interface Defense {
  id: string;
  type: 'resistance' | 'vulnerability' | 'immunity' | 'custom';
  value: string;
}

export interface CharacterTheme {
  bg?: string;
  text?: string;
  accent?: string;
  accent2?: string;
  font?: string;
  text2?: string;
  text3?: string;
  input?: string;
  glass?: string;
  skill?: string;
}

export interface Character {
  id: string;
  name: string;
  race: string;
  class: string;
  background: string;
  level: number;
  createdAt: string;
  updatedAt: string;

  attributes: AbilityScores;
  armorClass: number | null;
  acOverride?: number | null; // Added for UI binding mapping
  speed: number;
  hitDice: string;
  hitDiceSpent?: number; // From creator.js logic

  hitPoints: HitPoints;

  savingThrows: SavingThrows;
  skills: Skills;
  customSkills: CustomSkill[];

  modules: Module[];
  inventory: InventoryItem[];
  customTags: string[];
  
  spellcasting: Spellcasting;
  competencies: Competencies;
  defenses: Defense[];
  conditions: string[];
  exhaustion: number;
  notes: string;
  theme?: CharacterTheme;
}

export function createCharacter(overrides: Partial<Character> = {}): Character {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name: '',
    race: '',
    class: '',
    background: '',
    level: 1,
    createdAt: now,
    updatedAt: now,

    attributes: {
      strength: 10, dexterity: 10, constitution: 10,
      intelligence: 10, wisdom: 10, charisma: 10
    },

    armorClass: null,
    acOverride: null,
    speed: 30,
    hitDice: 'd8',
    hitDiceSpent: 0,

    hitPoints: { max: 10, current: 10, temporary: 0 },

    savingThrows: {
      strength: 'none', dexterity: 'none', constitution: 'none',
      intelligence: 'none', wisdom: 'none', charisma: 'none'
    },

    skills: {
      acrobatics: 'none', animalHandling: 'none', arcana: 'none',
      athletics: 'none', deception: 'none', history: 'none',
      insight: 'none', intimidation: 'none', investigation: 'none',
      medicine: 'none', nature: 'none', perception: 'none',
      performance: 'none', persuasion: 'none', religion: 'none',
      sleightOfHand: 'none', stealth: 'none', survival: 'none'
    },
    customSkills: [],

    modules: [],
    inventory: [],
    customTags: [],
    spellcasting: {
      focus: null,
      groups: [],
      customTags: []
    },
    competencies: {
      weapons: [],
      armor: [],
      tools: [],
      languages: [],
      extras: []
    },
    defenses: [],
    conditions: [],
    exhaustion: 0,
    notes: '',
    ...overrides
  };
}
