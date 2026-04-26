export const SKILL_ABILITIES: Record<string, string> = {
  acrobatics: 'dexterity',
  animalHandling: 'wisdom',
  arcana: 'intelligence',
  athletics: 'strength',
  deception: 'charisma',
  history: 'intelligence',
  insight: 'wisdom',
  intimidation: 'charisma',
  investigation: 'intelligence',
  medicine: 'wisdom',
  nature: 'intelligence',
  perception: 'wisdom',
  performance: 'charisma',
  persuasion: 'charisma',
  religion: 'intelligence',
  sleightOfHand: 'dexterity',
  stealth: 'dexterity',
  survival: 'wisdom'
};

export const SKILL_NAMES: Record<string, string> = {
  acrobatics: 'Acrobatics',
  animalHandling: 'Animal Handling',
  arcana: 'Arcana',
  athletics: 'Athletics',
  deception: 'Deception',
  history: 'History',
  insight: 'Insight',
  intimidation: 'Intimidation',
  investigation: 'Investigation',
  medicine: 'Medicine',
  nature: 'Nature',
  perception: 'Perception',
  performance: 'Performance',
  persuasion: 'Persuasion',
  religion: 'Religion',
  sleightOfHand: 'Sleight of Hand',
  stealth: 'Stealth',
  survival: 'Survival'
};

export const ABILITY_ABBR: Record<string, string> = {
  strength: 'STR',
  dexterity: 'DEX',
  constitution: 'CON',
  intelligence: 'INT',
  wisdom: 'WIS',
  charisma: 'CHA'
};

export const ABILITY_ORDER = [
  'strength', 'dexterity', 'constitution',
  'intelligence', 'wisdom', 'charisma'
];

export const MODULE_GROUPS: Record<string, string[]> = {
  actions: ['action', 'bonus_action', 'reaction', 'free_action'],
  features: ['class_feature', 'race_feature', 'background_feature', 'other']
};

export interface ModuleTypeDef {
  label: string;
  color: string;
  shape: string;
}

export const MODULE_TYPES: Record<string, ModuleTypeDef> = {
  action: { label: 'Action', color: 'hsl(140, 60%, 50%)', shape: 'circle' },
  bonus_action: { label: 'Bonus Action', color: 'hsl(30, 90%, 55%)', shape: 'triangle' },
  reaction: { label: 'Reaction', color: 'hsl(320, 80%, 60%)', shape: 'star' },
  free_action: { label: 'Free Action', color: 'var(--text-primary)', shape: 'none' },
  class_feature: { label: 'Class Feature', color: 'var(--accent-2)', shape: 'none' },
  race_feature: { label: 'Race Feature', color: 'var(--accent-2)', shape: 'none' },
  background_feature: { label: 'Background Feature', color: 'var(--accent-2)', shape: 'none' },
  other: { label: 'Other', color: 'var(--text-muted)', shape: 'none' }
};

export interface TagDef {
  id: string;
  label: string;
  color: string;
}

export const INVENTORY_PRESET_TAGS: TagDef[] = [
  { id: 'equipable',    label: 'Equipable',    color: 'hsl(200, 80%, 55%)' },
  { id: 'weapon',       label: 'Weapon',       color: 'hsl(0, 70%, 55%)' },
  { id: 'attunement',   label: 'Attunement',   color: 'hsl(280, 70%, 60%)' },
  { id: 'magic_object', label: 'Magic Object', color: 'hsl(45, 90%, 55%)' }
];

export const CUSTOM_TAG_COLOR = 'hsl(160, 50%, 45%)';

export const SPELL_LEVEL_COLORS: Record<number, string> = {
  0: 'hsl(200, 50%, 55%)',
  1: 'hsl(220, 70%, 60%)',
  2: 'hsl(260, 65%, 60%)',
  3: 'hsl(290, 60%, 55%)',
  4: 'hsl(320, 65%, 55%)',
  5: 'hsl(350, 65%, 55%)',
  6: 'hsl(20, 75%, 55%)',
  7: 'hsl(40, 80%, 50%)',
  8: 'hsl(55, 85%, 48%)',
  9: 'hsl(45, 90%, 45%)'
};

export function getSpellLevelColor(level: number): string {
  return SPELL_LEVEL_COLORS[level] || 'hsl(45, 90%, 45%)';
}

export const SPELL_PRESET_TAGS: TagDef[] = [
  { id: 'concentration', label: 'Concentration', color: 'hsl(30, 80%, 50%)' },
  { id: 'ritual',        label: 'Ritual',        color: 'hsl(180, 60%, 45%)' },
  { id: 'damage',        label: 'Damage',        color: 'hsl(0, 65%, 55%)' },
  { id: 'healing',       label: 'Healing',       color: 'hsl(140, 60%, 45%)' },
  { id: 'utility',       label: 'Utility',       color: 'hsl(260, 50%, 55%)' },
  { id: 'buff',          label: 'Buff',          color: 'hsl(80, 60%, 45%)' },
  { id: 'debuff',        label: 'Debuff',        color: 'hsl(320, 60%, 50%)' },
  { id: 'control',       label: 'Control',       color: 'hsl(200, 70%, 50%)' }
];

export const CUSTOM_SPELL_TAG_COLOR = 'hsl(160, 50%, 45%)';

export const CONDITION_ICONS: Record<string, string> = {
  Blinded: '🙈',
  Charmed: '💖',
  Deafened: '🔇',
  Frightened: '😨',
  Grappled: '🤼',
  Incapacitated: '💫',
  Invisible: '👻',
  Paralyzed: '⚡',
  Petrified: '🪨',
  Poisoned: '☠️',
  Prone: '🔻',
  Restrained: '⛓️',
  Stunned: '💥',
  Unconscious: '😴'
};
