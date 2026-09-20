"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {Omnidexer} = require("../js/omnidexer.js");

const classIndex = require("../data/class/index.json");
const lexarchData = require("../data/class/class-lexarch.json");
const sorcerer = require("../data/class/class-sorcerer.json").class[0];
const searchIndex = Omnidexer.decompressIndex(require("../search/index.json"));
const lexarch = lexarchData.class.find(it => it.name === "Lexarca" && it.source === "Himo");

assert(lexarch, "The Himo Lexarca class must exist.");
assert.strictEqual(classIndex.lexarch, "class-lexarch.json");
assert.strictEqual(lexarch.classFeatures.length, 20);
assert.strictEqual(Object.hasOwn(lexarch, "proficiencyBonusProgression"), false);
assert.strictEqual(lexarch.casterProgression, "full");
assert.strictEqual(lexarch.spellcastingAbility, "cha");
assert.deepStrictEqual(lexarch.cantripProgression, [3,3,3,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5]);

const spellcasting = lexarch.classTableGroups.find(it => it.title === "Spellcasting");
const slots = lexarch.classTableGroups.find(it => it.title === "Spell Slots per Spell Level");
assert.deepStrictEqual(spellcasting.colLabels, ["Words", "Cantrips Known", "Spells Known"]);
assert.deepStrictEqual(spellcasting.rows.map(it => it[0]), [0,2,2,2,4,4,4,6,6,7,7,7,9,9,9,12,12,12,14,16]);
assert.deepStrictEqual(spellcasting.rows.map(it => it[1]), lexarch.cantripProgression);
assert.deepStrictEqual(spellcasting.rows.map(it => it[2]), [2,3,4,5,6,7,8,9,10,11,12,12,13,13,14,14,15,15,15,15]);
assert.deepStrictEqual(slots.rows, sorcerer.classTableGroups.find(it => it.title === "Spell Slots per Spell Level").rows);
assert.deepStrictEqual(slots.rowsSpellProgression, slots.rows);

assert.deepStrictEqual(
	lexarch.classFeatures.map(level => level.map(feature => feature.name)),
	[
		["Supernal", "Spellcasting", "Ente Imponente"],
		["Palabras de Poder", "Variación de Poder"],
		["Especialización de Lengua"],
		["Ability Score Improvement"],
		[],
		["Especialización de Lengua"],
		["Palabras de Poder"],
		["Ability Score Improvement"],
		["Especialización de Lengua"],
		["Nombres de Poder"],
		[],
		["Ability Score Improvement"],
		["Palabras de Poder"],
		["Especialización de Lengua"],
		[],
		["Ability Score Improvement"],
		["Palabras de Poder"],
		["Especialización de Lengua"],
		["Ability Score Improvement"],
		["True Name"]
	]
);

for (const level of [4, 8, 12, 16, 19]) {
	const feature = lexarch.classFeatures[level - 1].find(it => it.name === "Ability Score Improvement");
	assert(feature, `Level ${level} must contain Ability Score Improvement.`);
	assert(feature.entries[0].includes(`${level}th level`));
	assert(feature.entries[1].includes("{@5etools feat|feats.html}"));
}

for (const level of [3, 6, 9, 14, 18]) {
	const feature = lexarch.classFeatures[level - 1].find(it => it.name === "Especialización de Lengua");
	assert(feature?.gainSubclassFeature, `Level ${level} must advance Especialización de Lengua.`);
	assert(feature.entries.length);
}

const expectedSubclasses = ["Lengua de Plata", "Lengua de Oro", "Lengua de Serpiente", "Lengua de Sangre"];
assert.deepStrictEqual(lexarch.subclasses.map(it => it.name), expectedSubclasses);
assert(lexarch.subclasses.every(it => it.subclassFeatures.length === 5));
assert(JSON.stringify(lexarch.subclasses.find(it => it.name === "Lengua de Sangre")).includes('"name":"Lengua de Plata"'));

const spellsDir = path.join(__dirname, "..", "data", "spells");
const availableSpells = new Set();
for (const filename of fs.readdirSync(spellsDir).filter(it => /^spells-.*\.json$/.test(it))) {
	const data = JSON.parse(fs.readFileSync(path.join(spellsDir, filename), "utf8"));
	for (const spell of data.spell || []) availableSpells.add(`${spell.name.toLowerCase()}|${spell.source.toLowerCase()}`);
}
const normalizeSpell = value => {
	const [name, source = "PHB"] = value.split("|");
	return `${name.toLowerCase()}|${source.toLowerCase()}`;
};
assert.strictEqual(lexarch.classSpells.length, 173);
assert.strictEqual(new Set(lexarch.classSpells.map(normalizeSpell)).size, 173);
for (const spell of lexarch.classSpells) assert(availableSpells.has(normalizeSpell(spell)), `Unknown Lexarca spell: ${spell}`);

const serialized = JSON.stringify(lexarch);
for (const link of [
	"{@spell Comprehend Languages|PHB|Comprender Idiomas}",
	"{@spell Heroism|PHB|Heroísmo}",
	"{@spell Tasha's Hideous Laughter|PHB|Tasha's Laughter}",
	"{@spell Otiluke's Resilient Sphere|PHB|Otiluke}",
	"{@spell Teleportation Circle|PHB|Círculo de TP}",
	"{@spell Bones of the Earth|XGE|Bones of Earth}"
]) assert(serialized.includes(link), `Missing canonical spell link: ${link}`);
assert(!serialized.includes("{@spell True Name"));
assert(serialized.includes("{@filter Palabras de Poder|optionalfeatures|feature type=PW|source=Himo}"));
assert(!serialized.includes("El suelo se abre bajo los pies"), "Power-word descriptions must not be duplicated in the class data.");

for (const [category, name] of [[5, "Lexarca"], ...expectedSubclasses.map(name => [40, `${name} (Lexarca)`])]) {
	const matches = searchIndex.filter(it => it.c === category && it.s === "Himo" && it.n === name);
	assert.strictEqual(matches.length, 1, `${name} must appear once in the general search index.`);
}

console.log("PASS: Lexarca progression, spell list, and language specializations are valid.");
