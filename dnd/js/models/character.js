// character.js — Character model, factory, and D&D 5e mappings

// character.js — Character model, factory, and D&D 5e mappings

/** Skill → governing ability */
const SKILL_ABILITIES = {
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

/** Skill display names */
const SKILL_NAMES = {
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

/** Ability abbreviations */
const ABILITY_ABBR = {
  strength: 'STR',
  dexterity: 'DEX',
  constitution: 'CON',
  intelligence: 'INT',
  wisdom: 'WIS',
  charisma: 'CHA'
};

/** Ability display order */
const ABILITY_ORDER = [
  'strength', 'dexterity', 'constitution',
  'intelligence', 'wisdom', 'charisma'
];

/** Module Types and Grouping */
const MODULE_GROUPS = {
  actions: ['action', 'bonus_action', 'reaction', 'free_action'],
  features: ['class_feature', 'race_feature', 'background_feature', 'other']
};

const MODULE_TYPES = {
  action: { label: 'Action', color: 'hsl(140, 60%, 50%)', shape: 'circle' },
  bonus_action: { label: 'Bonus Action', color: 'hsl(30, 90%, 55%)', shape: 'triangle' },
  reaction: { label: 'Reaction', color: 'hsl(320, 80%, 60%)', shape: 'star' },
  free_action: { label: 'Free Action', color: 'var(--text-primary)', shape: 'none' },
  class_feature: { label: 'Class Feature', color: 'var(--accent-2)', shape: 'none' },
  race_feature: { label: 'Race Feature', color: 'var(--accent-2)', shape: 'none' },
  background_feature: { label: 'Background Feature', color: 'var(--accent-2)', shape: 'none' },
  other: { label: 'Other', color: 'var(--text-muted)', shape: 'none' }
};

/**
 * Create a new character with default values
 * @param {Object} overrides - Optional field overrides
 * @returns {Object} Character object
 */
function createCharacter(overrides = {}) {
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

    armorClass: null, // null = auto (10 + DEX mod)
    speed: 30,
    hitDice: 'd8',

    hitPoints: { max: 10, current: 10, temporary: 0 },
    deathSaves: { successes: 0, failures: 0 },

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

    modules: [],
    inventory: [],
    customTags: [],
    spellcasting: {
      focus: null,       // null | 'intelligence' | 'wisdom' | 'charisma'
      groups: [],        // { id, type, level?, label?, uses?, recharge?, spells: [] }
      customTags: []     // custom spell tags
    },
    competencies: {
      weapons: [],
      armor: [],
      tools: [],
      languages: [],
      extras: []
    },
    notes: '',
    ...overrides
  };
}

/** Preset inventory tags */
const INVENTORY_PRESET_TAGS = [
  { id: 'equipable',    label: 'Equipable',    color: 'hsl(200, 80%, 55%)' },
  { id: 'weapon',       label: 'Weapon',       color: 'hsl(0, 70%, 55%)' },
  { id: 'attunement',   label: 'Attunement',   color: 'hsl(280, 70%, 60%)' },
  { id: 'magic_object', label: 'Magic Object', color: 'hsl(45, 90%, 55%)' }
];

const CUSTOM_TAG_COLOR = 'hsl(160, 50%, 45%)';

/** Calculate AC (auto or manual override) */
function calcAC(character) {
  if (character.armorClass !== null) return character.armorClass;
  return 10 + calcModifier(character.attributes.dexterity);
}

/** Calculate initiative (DEX modifier) */
function calcInitiative(character) {
  return calcModifier(character.attributes.dexterity);
}

/** Calculate a saving throw modifier */
function calcSaveModifier(character, ability) {
  const mod = calcModifier(character.attributes[ability]);
  const prof = calcProficiencyBonus(character.level);
  return character.savingThrows[ability] === 'proficient' ? mod + prof : mod;
}

/** Calculate a skill modifier (handles expertise) */
function calcSkillModifier(character, skill) {
  const ability = SKILL_ABILITIES[skill];
  const mod = calcModifier(character.attributes[ability]);
  const prof = calcProficiencyBonus(character.level);
  const level = character.skills[skill];
  if (level === 'expertise') return mod + prof * 2;
  if (level === 'proficient') return mod + prof;
  return mod;
}

/** Spell level colors — chromatic gradient */
const SPELL_LEVEL_COLORS = {
  0: 'hsl(200, 50%, 55%)',  // Cantrips - soft blue
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

/** Get spell level color — falls back to gold for levels > 9 */
function getSpellLevelColor(level) {
  return SPELL_LEVEL_COLORS[level] || 'hsl(45, 90%, 45%)';
}

/** Preset spell tags */
const SPELL_PRESET_TAGS = [
  { id: 'concentration', label: 'Concentration', color: 'hsl(30, 80%, 50%)' },
  { id: 'ritual',        label: 'Ritual',        color: 'hsl(180, 60%, 45%)' },
  { id: 'damage',        label: 'Damage',        color: 'hsl(0, 65%, 55%)' },
  { id: 'healing',       label: 'Healing',       color: 'hsl(140, 60%, 45%)' },
  { id: 'utility',       label: 'Utility',       color: 'hsl(260, 50%, 55%)' },
  { id: 'buff',          label: 'Buff',          color: 'hsl(80, 60%, 45%)' },
  { id: 'debuff',        label: 'Debuff',        color: 'hsl(320, 60%, 50%)' },
  { id: 'control',       label: 'Control',       color: 'hsl(200, 70%, 50%)' }
];

const CUSTOM_SPELL_TAG_COLOR = 'hsl(160, 50%, 45%)';

/** Calculate Spell Save DC = 8 + ability modifier + proficiency bonus */
function calcSpellDC(character) {
  const focus = character.spellcasting && character.spellcasting.focus;
  if (!focus) return null;
  const mod = calcModifier(character.attributes[focus]);
  const prof = calcProficiencyBonus(character.level);
  return 8 + mod + prof;
}

/** Calculate Spell Attack modifier = ability modifier + proficiency bonus */
function calcSpellAttack(character) {
  const focus = character.spellcasting && character.spellcasting.focus;
  if (!focus) return null;
  const mod = calcModifier(character.attributes[focus]);
  const prof = calcProficiencyBonus(character.level);
  return mod + prof;
}

