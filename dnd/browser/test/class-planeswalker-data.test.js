"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {Omnidexer} = require("../js/omnidexer.js");

const classIndex = require("../data/class/index.json");
const planeswalkerData = require("../data/class/class-planeswalker.json");
const searchIndex = Omnidexer.decompressIndex(require("../search/index.json"));

const planeswalker = planeswalkerData.class.find(it => it.name === "Planeswalker" && it.source === "Himo");

assert(planeswalker, "The Himo Planeswalker class must exist.");
assert.strictEqual(classIndex.planeswalker, "class-planeswalker.json");
assert.strictEqual(planeswalker.classFeatures.length, 20);
assert.strictEqual(Object.hasOwn(planeswalker, "proficiencyBonusProgression"), false);
assert.deepStrictEqual(planeswalker.classSpells, [{class: "Wizard", source: "PHB"}]);
assert.strictEqual(planeswalker.spellcastingAbility, "int");
assert.strictEqual(planeswalker.casterProgression, "artificer");
assert.deepStrictEqual(
	planeswalker.cantripProgression,
	[2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4]
);
assert.deepStrictEqual(planeswalker.classTableGroups[0].colLabels, ["Lv 0", "Lv 1", "Lv 2", "Lv 3", "Lv 4", "Lv 5"]);
assert.deepStrictEqual(
	planeswalker.classTableGroups[0].rows,
	[
		[2, 2, "-", "-", "-", "-"], [2, 2, "-", "-", "-", "-"], [2, 3, "-", "-", "-", "-"], [2, 3, "-", "-", "-", "-"],
		[2, 4, 2, "-", "-", "-"], [2, 4, 2, "-", "-", "-"], [2, 4, 3, "-", "-", "-"], [2, 4, 3, "-", "-", "-"],
		[3, 4, 3, 2, "-", "-"], [3, 4, 3, 2, "-", "-"], [3, 4, 3, 3, "-", "-"], [3, 4, 3, 3, "-", "-"],
		[4, 4, 3, 3, 1, "-"], [4, 4, 3, 3, 1, "-"], [4, 4, 3, 3, 2, "-"], [4, 4, 3, 3, 2, "-"],
		[4, 4, 3, 3, 3, 1], [4, 4, 3, 3, 3, 1], [4, 4, 3, 3, 3, 2], [4, 4, 3, 3, 3, 2]
	]
);

assert.deepStrictEqual(
	planeswalker.classFeatures.map(level => level.map(feature => feature.name)),
	[
		["Spellcasting", "Consciencia Planar", "Vía de Exploración"],
		["Paso Rápido", "Wormhole"],
		["Vía de Exploración"],
		["Ability Score Improvement"],
		["Consciencia Planar", "Multiataque"],
		["Paso Lejano"],
		["Vía de Exploración"],
		["Ability Score Improvement", "Wormhole Mejorado"],
		[],
		["Paso Etéreo", "Consciencia Planar"],
		["Transporte de Plano"],
		["Ability Score Improvement"],
		[],
		["Vía de Exploración", "Consciencia Planar"],
		["Wormhole Mejorado"],
		["Ability Score Improvement"],
		["Demiplano Vinculado"],
		["Wormhole Perfecto", "Consciencia Planar"],
		["Ability Score Improvement"],
		["Ente Interplanar"]
	]
);

const subclassFeatureLevels = [1, 3, 7, 14];
for (const level of subclassFeatureLevels) {
	const feature = planeswalker.classFeatures[level - 1].find(it => it.name === "Vía de Exploración");
	assert(feature?.entries.length, `Vía de Exploración at level ${level} must explain its advancement.`);
}

for (const level of [4, 8, 12, 16, 19]) {
	const feature = planeswalker.classFeatures[level - 1].find(it => it.name === "Ability Score Improvement");
	assert(feature, `Level ${level} must contain Ability Score Improvement.`);
	assert(feature.entries[0].includes(`${level}${level === 3 ? "rd" : "th"} level`));
	assert(feature.entries[1].includes("{@5etools feat|feats.html}"));
}

for (const level of [5, 10, 14, 18]) {
	const feature = planeswalker.classFeatures[level - 1].find(it => it.name === "Consciencia Planar");
	assert(feature?.entries.length, `Consciencia Planar at level ${level} must explain its improvement.`);
}

assert(planeswalker.classFeatures[7].find(it => it.name === "Wormhole Mejorado").entries[0].includes("60 pies"));
assert(planeswalker.classFeatures[14].find(it => it.name === "Wormhole Mejorado").entries[0].includes("90 pies"));

assert.strictEqual(planeswalker.subclasses.length, 4);
assert.deepStrictEqual(planeswalker.subclasses.map(it => it.name), ["Vía Elemental", "Vía de la Oscuridad", "Vía de la Luz", "Vía del Caos"]);
assert(planeswalker.subclasses.every(subclass => subclass.subclassFeatures.length === 4));

const elemental = planeswalker.subclasses.find(it => it.shortName === "Elemental");
const serializedElemental = JSON.stringify(elemental);
for (const label of ["Fuego:", "Agua:", "Tierra:", "Aire:"]) {
	assert(serializedElemental.includes(label), `The elemental path must label ${label}`);
}

for (const shortName of ["Oscuridad", "Luz", "Caos"]) {
	const subclass = planeswalker.subclasses.find(it => it.shortName === shortName);
	assert.strictEqual(subclass.subclassSpells.length, 10, `${shortName} must grant ten spells.`);
	assert.deepStrictEqual(Object.keys(subclass.additionalSpells[0].prepared), ["1", "5", "9", "13", "17"]);
	const tables = [];
	const visit = value => {
		if (Array.isArray(value)) return value.forEach(visit);
		if (!value || typeof value !== "object") return;
		if (value.type === "table") tables.push(value);
		Object.values(value).forEach(visit);
	};
	visit(subclass);
	assert.strictEqual(tables.length, 1, `${shortName} must contain one spell table.`);
	assert.strictEqual(tables[0].rows.length, 5);
}

const filterScript = fs.readFileSync(path.join(__dirname, "..", "js", "filter-spells.js"), "utf8");
const spellsScript = fs.readFileSync(path.join(__dirname, "..", "js", "spells.js"), "utf8");
assert(filterScript.includes("populateClassLookup (classData)"));
assert(filterScript.includes("typeof it === \"string\" ? it : it.name"), "Explicit spell entries must remain supported.");
assert(filterScript.includes("if (it.class)"), "Inherited class spell lists must remain supported.");
assert(spellsScript.includes("DataUtil.class.loadJSON()"), "The spell page must load built-in class spell configuration.");

for (const [category, name] of [[5, "Planeswalker"], [40, "Vía Elemental (Planeswalker)"], [40, "Vía de la Oscuridad (Planeswalker)"], [40, "Vía de la Luz (Planeswalker)"], [40, "Vía del Caos (Planeswalker)"]]) {
	const matches = searchIndex.filter(it => it.c === category && it.s === "Himo" && it.n === name);
	assert.strictEqual(matches.length, 1, `${name} must appear once in the general search index.`);
}

console.log("PASS: Planeswalker class, paths, spell progression, and configurable spell list are valid.");
