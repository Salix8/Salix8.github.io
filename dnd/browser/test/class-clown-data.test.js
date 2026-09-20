"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {Omnidexer} = require("../js/omnidexer.js");

const classIndex = require("../data/class/index.json");
const clownData = require("../data/class/class-clown.json");
const searchIndex = Omnidexer.decompressIndex(require("../search/index.json"));

const clown = clownData.class.find(it => it.name === "Payaso" && it.source === "Himo");

assert(clown, "The Himo Payaso class must exist.");
assert.strictEqual(classIndex.clown, "class-clown.json");
assert.strictEqual(clown.classFeatures.length, 20);
assert.strictEqual(Object.hasOwn(clown, "proficiencyBonusProgression"), false);
assert.strictEqual(clown.casterProgression, "artificer");
assert.strictEqual(clown.spellcastingAbility, "cha");
assert.deepStrictEqual(clown.cantripProgression, [1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3]);

const jokeTable = clown.classTableGroups[0];
const spellTable = clown.classTableGroups[1];
assert.strictEqual(jokeTable.title, undefined);
assert.deepStrictEqual(jokeTable.colLabels, ["Bromas", "Cantrips Known"]);
assert.deepStrictEqual(jokeTable.rows.map(it => it[0]), [2, 2, 3, 3, 5, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 12, 12, 13, 14]);
assert.deepStrictEqual(jokeTable.rows.map(it => it[1]), clown.cantripProgression);
assert.strictEqual(spellTable.title, "Spell Slots per Spell Level");
assert.deepStrictEqual(spellTable.colLabels, ["Lv 1", "Lv 2", "Lv 3", "Lv 4", "Lv 5"]);
assert.deepStrictEqual(
	spellTable.rows,
	[
		[2, "-", "-", "-", "-"], [2, "-", "-", "-", "-"], [3, "-", "-", "-", "-"], [3, "-", "-", "-", "-"],
		[4, 2, "-", "-", "-"], [4, 2, "-", "-", "-"], [4, 3, "-", "-", "-"], [4, 3, "-", "-", "-"],
		[4, 3, 2, "-", "-"], [4, 3, 2, "-", "-"], [4, 3, 3, "-", "-"], [4, 3, 3, "-", "-"],
		[4, 3, 3, 1, "-"], [4, 3, 3, 1, "-"], [4, 3, 3, 2, "-"], [4, 3, 3, 2, "-"],
		[4, 3, 3, 3, 1], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2]
	]
);

assert.deepStrictEqual(
	clown.classFeatures.map(level => level.map(feature => feature.name)),
	[
		["Spellcasting", "Experto"],
		["Bromas", "Prestidigitador"],
		["Batuta Irascible", "Circo"],
		["Ability Score Improvement"],
		["Miradas a Mi", "Bromas", "Experto"],
		["Circo"],
		["Evasión", "Cantrip"],
		["Ability Score Improvement"],
		["Bolsillo de Payaso"],
		["Circo"],
		["Backstage", "Bromas"],
		["Ability Score Improvement"],
		[],
		["Mente Incomprensible"],
		["Circo", "Cantrip"],
		["Ability Score Improvement"],
		[],
		["Experto", "Herramientas de Chiste"],
		["Ability Score Improvement"],
		["Experto Bromista"]
	]
);

for (const level of [4, 8, 12, 16, 19]) {
	const feature = clown.classFeatures[level - 1].find(it => it.name === "Ability Score Improvement");
	assert(feature, `Level ${level} must contain Ability Score Improvement.`);
	assert(feature.entries[0].includes(`${level}th level`));
	assert(feature.entries[1].includes("{@5etools feat|feats.html}"));
}

for (const level of [3, 6, 10, 15]) {
	const feature = clown.classFeatures[level - 1].find(it => it.name === "Circo");
	assert(feature?.gainSubclassFeature, `Level ${level} must grant a Circo feature.`);
	assert(feature.entries.length, `Circo at level ${level} must explain its advancement.`);
}

assert.deepStrictEqual(clown.classFeatures[12], []);
assert.deepStrictEqual(clown.classFeatures[16], []);
assert(clown.classFeatures[6].find(it => it.name === "Evasión").entries[0].startsWith("Beginning at 7th level"));
assert(clown.classFeatures[6].find(it => it.name === "Cantrip").entries[0].includes("cantrip adicional"));
assert(clown.classFeatures[14].find(it => it.name === "Cantrip").entries[0].includes("cantrip adicional"));

const expectedSubclasses = ["Circo de Sangre", "Circo de la Locura", "Circo de Bufones", "Circo de las Maravillas"];
assert.deepStrictEqual(clown.subclasses.map(it => it.name), expectedSubclasses);
assert(clown.subclasses.every(it => it.subclassFeatures.length === 4));

const expectedTricks = {
	"Circo de Sangre": ["Bruto", "Acoso"],
	"Circo de la Locura": ["Mil y una risas", "Repetidor de Locura"],
	"Circo de Bufones": ["¿Seguro?", "¡Que le corten la cabeza!"],
	"Circo de las Maravillas": ["Pasar por el aro", "Malabares"]
};

const collectByType = (value, type) => {
	const out = [];
	const visit = current => {
		if (Array.isArray(current)) return current.forEach(visit);
		if (!current || typeof current !== "object") return;
		if (current.type === type) out.push(current);
		Object.values(current).forEach(visit);
	};
	visit(value);
	return out;
};

for (const subclass of clown.subclasses) {
	assert.strictEqual(subclass.subclassSpells.length, 10, `${subclass.name} must grant ten spells.`);
	assert.deepStrictEqual(Object.keys(subclass.additionalSpells[0].prepared), ["3", "5", "9", "13", "17"]);
	const tables = collectByType(subclass, "table");
	assert.strictEqual(tables.length, 1, `${subclass.name} must contain one spell table.`);
	assert.strictEqual(tables[0].rows.length, 5);
	const serialized = JSON.stringify(subclass.subclassFeatures[0]);
	for (const trick of expectedTricks[subclass.name]) assert(serialized.includes(trick), `${subclass.name} must include the ${trick} trick.`);
}

const spellsDir = path.join(__dirname, "..", "data", "spells");
const availableSpells = new Set();
for (const filename of fs.readdirSync(spellsDir).filter(it => /^spells-.*\.json$/.test(it))) {
	const data = JSON.parse(fs.readFileSync(path.join(spellsDir, filename), "utf8"));
	for (const spell of data.spell || []) availableSpells.add(`${spell.name.toLowerCase()}|${spell.source.toLowerCase()}`);
}
const normalizeSpell = value => {
	if (typeof value === "string") {
		const [name, source = "PHB"] = value.split("|");
		return `${name.toLowerCase()}|${source.toLowerCase()}`;
	}
	return `${value.name.toLowerCase()}|${(value.source || "PHB").toLowerCase()}`;
};

assert.strictEqual(clown.classSpells.length, 92);
assert.strictEqual(new Set(clown.classSpells.map(normalizeSpell)).size, clown.classSpells.length, "The Payaso spell list must not contain duplicates.");
for (const spell of clown.classSpells) assert(availableSpells.has(normalizeSpell(spell)), `Unknown class spell: ${normalizeSpell(spell)}`);
for (const subclass of clown.subclasses) {
	for (const spell of subclass.subclassSpells) assert(availableSpells.has(normalizeSpell(spell)), `Unknown ${subclass.name} spell: ${normalizeSpell(spell)}`);
}
assert(clown.classSpells.some(it => it.name === "Otiluke's Resilient Sphere" && it.source === "PHB"));
assert(clown.classSpells.flat().some(it => it.name === "Otiluke's Resilient Sphere" && it.source === "PHB"));

for (const [category, name] of [[5, "Payaso"], ...expectedSubclasses.map(name => [40, `${name} (Payaso)`])]) {
	const matches = searchIndex.filter(it => it.c === category && it.s === "Himo" && it.n === name);
	assert.strictEqual(matches.length, 1, `${name} must appear once in the general search index.`);
}

console.log("PASS: Payaso class, spell progression, Bromas, and Circos are valid.");
