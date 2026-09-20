"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {Omnidexer} = require("../js/omnidexer.js");
Object.assign(global, require("../js/utils-ui.js"));
const PageFilterSpells = require("../js/filter-spells.js");

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
assert.deepStrictEqual(bloodMagicTable.colLabels, ["Slot máx", "PtS máx"]);
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

assert.deepStrictEqual(desangrador.classSpells, [{filter: {schools: ["N"], levels: [1, 2, 3, 4, 5]}}]);
const expectedSubclassFilters = {
	Flagelante: {school: "V", className: "Cleric"},
	Quebrantahuesos: {school: "V", className: "Paladin"},
	Vampírico: {school: "E", className: "Wizard"},
	Pagano: {school: "C", className: "Warlock"},
	Delirante: {school: "D", className: "Cleric"}
};
for (const subclass of desangrador.subclasses) {
	const filterEntry = subclass.subclassSpells.find(it => it.filter);
	const expected = expectedSubclassFilters[subclass.shortName];
	assert.deepStrictEqual(filterEntry.filter.schools, [expected.school]);
	assert.deepStrictEqual(filterEntry.filter.levels, [1, 2, 3, 4, 5]);
	assert.deepStrictEqual(filterEntry.filter.class, {name: expected.className, source: "PHB"});
}

const pagan = desangrador.subclasses.find(it => it.shortName === "Pagano");
assert(pagan.subclassSpells.includes("hex"));
assert.deepStrictEqual(pagan.additionalSpells, [{prepared: {3: ["hex"]}}]);
const serialized = JSON.stringify(desangrador);
assert(serialized.includes("escuela de ncantamiento"));
assert.strictEqual((serialized.match(/Con un éxito/g) || []).length >= 2, true);

const pageFilter = Object.create(PageFilterSpells.prototype);
pageFilter._brewSpellClasses = {};
pageFilter.populateClassLookup(desangradorData);
assert.strictEqual(pageFilter._brewSpellClasses.filter.length, 6);

const futureNecromancySpell = {name: "Future Necromancy Spell", source: "TEST", school: "N", level: 5, classes: {fromClassList: []}};
Renderer.spell.initClasses(futureNecromancySpell, pageFilter._brewSpellClasses);
assert(futureNecromancySpell.classes.fromClassList.some(it => it.name === "Desangrador" && it.source === "Himo"));

const futureClericEvocation = {name: "Future Cleric Evocation", source: "TEST", school: "V", level: 3, classes: {fromClassList: [{name: "Cleric", source: "PHB"}]}};
Renderer.spell.initClasses(futureClericEvocation, pageFilter._brewSpellClasses);
assert(futureClericEvocation.classes.fromSubclass.some(it => it.class.name === "Desangrador" && it.subclass.name === "Flagelante"));

const futureAddedHomebrewRelation = {name: "Future Derived Spell", source: "TEST", school: "V", level: 3, classes: {fromClassList: [{name: "Other", source: "TEST"}]}};
const originalClasses = MiscUtil.copy(futureAddedHomebrewRelation.classes);
futureAddedHomebrewRelation.classes.fromClassList.push({name: "Cleric", source: "PHB"});
const flagelanteFilter = desangrador.subclasses.find(it => it.shortName === "Flagelante").subclassSpells[0].filter;
assert.strictEqual(Renderer.spell.isClassSpellFilterMatch(futureAddedHomebrewRelation, flagelanteFilter, originalClasses), false);

for (const spell of [futureNecromancySpell, futureClericEvocation]) assert(spell.level >= 1 && spell.level <= 5);
assert.strictEqual(Renderer.spell.isClassSpellFilterMatch({school: "N", level: 0}, desangrador.classSpells[0].filter, {}), false);
assert.strictEqual(Renderer.spell.isClassSpellFilterMatch({school: "N", level: 6}, desangrador.classSpells[0].filter, {}), false);

const spells = fs.readdirSync(path.join(__dirname, "..", "data", "spells"))
	.filter(it => /^spells-.*\.json$/.test(it))
	.flatMap(it => JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "spells", it), "utf8")).spell || []);
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
	Renderer.spell.initClasses(spell, pageFilter._brewSpellClasses);
	if (spellCase.type === "class") assert(spell.classes.fromClassList.some(it => it.name === "Desangrador"));
	else assert(spell.classes.fromSubclass.some(it => it.class.name === "Desangrador" && it.subclass.name === spellCase.subclass));
}

for (const [category, name] of [[5, "Desangrador"], ...expectedSubclasses.map(name => [40, `${name} (Desangrador)`])]) {
	const matches = searchIndex.filter(it => it.c === category && it.s === "Himo" && it.n === name);
	assert.strictEqual(matches.length, 1, `${name} must appear once in the general search index.`);
}

console.log("PASS: Desangrador progression, Ritos de Sangre, and dynamic spell lists are valid.");
