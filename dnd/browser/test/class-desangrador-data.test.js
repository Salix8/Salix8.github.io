"use strict";
async function main () {

const assert = require("assert");
const fs = require("fs");
const path = require("path");
require("../js/omnidexer.js");
DataUtil.loadJSON = async url => JSON.parse(fs.readFileSync(path.join(__dirname, "..", url), "utf8"));
const {Omnidexer} = require("../js/omnidexer.js");
Object.assign(global, require("../js/utils-ui.js"));


const classIndex = require("../data/class/index.json");
const desangradorData = require("../data/class/class-desangrador.json");
const searchIndex = Omnidexer.decompressIndex(require("../search/index.json"));

const desangrador = desangradorData.class.find(it => it.name === "Desangrador" && it.source === "Himo");

assert(desangrador, "The Himo Desangrador class must exist.");
assert.strictEqual(classIndex.desangrador, "class-desangrador.json");
assert.strictEqual(desangrador.classFeatures.length, 20);
assert.strictEqual(Object.hasOwn(desangrador, "proficiencyBonusProgression"), false);
assert.strictEqual(Object.hasOwn(desangrador, "casterProgression"), false);
assert.strictEqual(Object.hasOwn(desangrador, "cantripProgression"), false);
assert.strictEqual(desangrador.spellcastingAbility, "con");
assert.strictEqual(desangrador.preparedSpells, "<$level$>");

const bloodMagicTable = desangrador.classTableGroups[0];
assert.deepStrictEqual(bloodMagicTable.colLabels, ["{@filter Slot máx|spells|class=Desangrador}", "PtS máx"]);
assert.deepStrictEqual(bloodMagicTable.rows.map(it => it[0]), [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5]);
assert.deepStrictEqual(bloodMagicTable.rows.map(it => it[1]), [2, 3, 4, 5, 7, 8, 9, 10, 12, 13, 14, 15, 17, 18, 19, 20, 22, 24, 26, 28]);

assert.deepStrictEqual(
	desangrador.classFeatures.map(level => level.map(feature => feature.name)),
	[
		["Puntos de Sangre", "Blood Magic", "Estilo de Lucha"],
		["Protección Sanguina", "Filo Sangriento"],
		["Ritos de Sangre"],
		["Ability Score Improvement"],
		["Multiataque"],
		["Ritos de Sangre"],
		["Regeneración Vascular"],
		["Ability Score Improvement"],
		["Heridas Vigorizantes"],
		["Ritos de Sangre"],
		["Transfusión", "Hostigador"],
		["Ability Score Improvement"],
		[],
		["Ritos de Sangre"],
		["Renacido"],
		["Ability Score Improvement"],
		[],
		["Sed de Sangre"],
		["Ability Score Improvement"],
		["Vigor Sanguíneo"]
	]
);

for (const level of [3, 6, 10, 14]) {
	const feature = desangrador.classFeatures[level - 1].find(it => it.name === "Ritos de Sangre");
	assert(feature?.gainSubclassFeature, `Level ${level} must advance Ritos de Sangre.`);
	assert(feature.entries.length, `Ritos de Sangre at level ${level} must explain its advancement.`);
}

for (const level of [4, 8, 12, 16, 19]) {
	const feature = desangrador.classFeatures[level - 1].find(it => it.name === "Ability Score Improvement");
	assert(feature, `Level ${level} must contain Ability Score Improvement.`);
	assert(feature.entries[0].includes(`${level}th level`));
	assert(feature.entries[1].includes("{@5etools feat|feats.html}"));
}

assert.deepStrictEqual(
	desangrador.classFeatures[4][0].entries,
	["Beginning at 5th level, you can attack twice, instead of once, whenever you take the {@action Attack} action on your turn."]
);

const expectedSubclasses = ["Rito del Flagelante", "Rito del Quebrantahuesos", "Rito Vampírico", "Rito Pagano", "Rito Delirante"];
assert.deepStrictEqual(desangrador.subclasses.map(it => it.name), expectedSubclasses);
assert(desangrador.subclasses.every(it => it.subclassFeatures.length === 4));

const boneTable = desangrador.subclasses
	.find(it => it.shortName === "Quebrantahuesos")
	.subclassFeatures[2][0].entries.find(it => it.type === "table");
assert.strictEqual(boneTable.rows.length, 8);

assert.strictEqual(desangrador.classSpells, undefined);
const pagan = desangrador.subclasses.find(it => it.shortName === "Pagano");
assert.strictEqual(pagan.subclassSpells, undefined);
assert(pagan.additionalSpells.some(block => block.prepared?.[3]?.includes("Hex|PHB")));
const serialized = JSON.stringify(desangrador);
assert(serialized.includes("escuela de ncantamiento"));
assert.strictEqual((serialized.match(/Con un éxito/g) || []).length >= 2, true);

const futureNecromancySpell = {name: "Future Necromancy Spell", source: "TEST", school: "N", level: 5, classes: {fromClassList: []}};
Renderer.spell.initClasses(futureNecromancySpell);
assert.deepStrictEqual(futureNecromancySpell.classes.fromClassList, [], "New spells require explicit assignments");

const spells = await DataUtil.spell.pLoadAll();
const actualSpellCases = [
	{name: "Inflict Wounds", type: "class"},
	{name: "Guiding Bolt", subclass: "Flagelante"},
	{name: "Thunderous Smite", subclass: "Quebrantahuesos"},
	{name: "Charm Person", subclass: "Vampírico"},
	{name: "Misty Step", subclass: "Pagano"},
	{name: "Detect Evil and Good", subclass: "Delirante"}
];
for (const spellCase of actualSpellCases) {
	const spell = MiscUtil.copy(spells.find(it => it.name === spellCase.name));
	assert(spell, `Missing representative spell ${spellCase.name}.`);
	if (spellCase.type === "class") assert(spell.classes.fromClassList.some(it => it.name === "Desangrador"));
	else assert(spell.classes.fromSubclass.some(it => it.class.name === "Desangrador" && it.subclass.name === spellCase.subclass));
}

for (const [category, name] of [[5, "Desangrador"], ...expectedSubclasses.map(name => [40, `${name} (Desangrador)`])]) {
	const matches = searchIndex.filter(it => it.c === category && it.s === "Himo" && it.n === name);
	assert.strictEqual(matches.length, 1, `${name} must appear once in the general search index.`);
}

console.log("PASS: Desangrador progression, Ritos de Sangre, and explicit spell associations are valid.");

}
main().catch(error => { console.error(error); process.exitCode = 1; });
