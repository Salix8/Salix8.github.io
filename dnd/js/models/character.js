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
