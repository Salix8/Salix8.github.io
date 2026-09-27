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
const rangerData = require("../data/class/class-ranger.json");
const rangerHimoData = require("../data/class/class-ranger-himo.json");
const searchIndex = Omnidexer.decompressIndex(require("../search/index.json"));

const ranger = rangerData.class.find(it => it.name === "Ranger" && it.source === "PHB");
const rangerHimoRaw = rangerHimoData.class.find(it => it.name === "Ranger (Himo)" && it.source === "Himo");
assert(ranger && rangerHimoRaw);
assert.strictEqual(classIndex["ranger-himo"], "class-ranger-himo.json");
assert.strictEqual(rangerHimoRaw.classFeatures.length, 20);
assert.strictEqual(Object.hasOwn(rangerHimoRaw, "proficiencyBonusProgression"), false);
assert.strictEqual(rangerHimoRaw.casterProgression, "1/2");
assert.strictEqual(rangerHimoRaw.spellcastingAbility, "wis");
assert.strictEqual(rangerHimoRaw.classSpells, undefined);
assert.deepStrictEqual(rangerHimoRaw.subclassesFrom, {class: "Ranger", source: "PHB"});

assert.deepStrictEqual(rangerHimoRaw.classTableGroups.map(it => it.rows), ranger.classTableGroups.map(it => it.rows));
assert.deepStrictEqual(
	rangerHimoRaw.classFeatures.map(level => level.map(feature => feature.name)),
	[
		["Enemigo Predilecto", "Explorador Natural"],
		["Estilo de Lucha", "Spellcasting", "Ágil y Experto"],
		["Subclase", "Consciencia Primigenia", "Golpe Medido"],
		["Ability Score Improvement"],
		["Multiataque", "Cataplasmas"],
		["Móvil", "Mejoras Favored Foe y Explorador Natural"],
		["Subclase", "Mejora Golpe Medido"],
		["Ability Score Improvement", "Zancada de Tierra"],
		["¡A Cubierto!"],
		["Hide in Plain Sight", "Incansable", "Mejora Explorador Natural"],
		["Subclase"],
		["Ability Score Improvement"],
		["Mejora Golpe Medido"],
		["Danger Slayer", "Mejora Favored Foe"],
		["Subclase"],
		["Ability Score Improvement"],
		["Mejora Golpe Medido"],
		["Feral Senses"],
		["Ability Score Improvement"],
		["Foe Slayer"]
	]
);

for (const level of [3, 7, 11, 15]) {
	const feature = rangerHimoRaw.classFeatures[level - 1].find(it => it.name === "Subclase");
	assert(feature?.gainSubclassFeature, `Level ${level} must advance the Ranger Archetype.`);
	assert(feature.entries.length);
}
for (const level of [4, 8, 12, 16, 19]) {
	const feature = rangerHimoRaw.classFeatures[level - 1].find(it => it.name === "Ability Score Improvement");
	assert(feature.entries[0].includes(`${level}th level`));
	assert(feature.entries[1].includes("{@5etools feat|feats.html}"));
}
for (const level of [3, 7, 13, 17]) {
	const name = level === 3 ? "Golpe Medido" : "Mejora Golpe Medido";
	assert(rangerHimoRaw.classFeatures[level - 1].some(it => it.name === name));
}

const serialized = JSON.stringify(rangerHimoRaw);
assert(serialized.includes("{@filter opciones de maniobra|optionalfeatures|feature type=MV:B}"));
assert(serialized.includes("Beginning at 7th level, you can nimbly dodge"));
assert(serialized.includes("Una vez por descanso corto, como bonus, puedes hacerte invisible"));
assert(!serialized.includes("Danger Slager"));

const rangerHimo = MiscUtil.copy(rangerHimoRaw);
const sourceSubclassSnapshot = JSON.stringify(ranger.subclasses);
const resolved = {class: [ranger, rangerHimo]};
assert.strictEqual(DataUtil.class._mutResolveSubclassReferences(resolved), resolved);
assert.strictEqual(rangerHimo.subclasses.length, ranger.subclasses.length);
assert.strictEqual(JSON.stringify(ranger.subclasses), sourceSubclassSnapshot, "The PHB Ranger subclasses must not be mutated.");
assert(rangerHimo.subclasses.every((it, i) => it !== ranger.subclasses[i]), "Inherited subclasses must be deep copies.");
assert.deepStrictEqual(
	rangerHimo.subclasses.map(it => [it.name, it.source]),
	ranger.subclasses.map(it => [it.name, it.source])
);

const dedupeTarget = MiscUtil.copy(rangerHimoRaw);
dedupeTarget.subclasses = [MiscUtil.copy(ranger.subclasses[0])];
DataUtil.class._mutResolveSubclassReferences({class: [ranger, dedupeTarget]});
assert.strictEqual(dedupeTarget.subclasses.length, ranger.subclasses.length);
assert.throws(
	() => DataUtil.class._mutResolveSubclassReferences({class: [{name: "Missing Target", source: "Himo", subclassesFrom: {class: "Missing Source", source: "PHB"}}]}),
	/was not found/
);
assert.throws(
	() => DataUtil.class._mutResolveSubclassReferences({class: [{name: "Loop", source: "Himo", subclassesFrom: {class: "Loop", source: "Himo"}}]}),
	/cannot inherit subclasses from itself/
);

const spells = await DataUtil.spell.pLoadAll();
const huntersMark = MiscUtil.copy(spells.find(it => it.name === "Hunter's Mark" && it.source === "PHB"));
assert(huntersMark);
assert(huntersMark.classes.fromClassList.some(it => it.name === "Ranger (Himo)" && it.source === "Himo"));

const expectedSearchNames = [
	[5, "Ranger (Himo)", "Himo"],
	...ranger.subclasses.map(it => [40, `${it.name} (Ranger (Himo))`, it.source])
];
for (const [category, name, source] of expectedSearchNames) {
	const matches = searchIndex.filter(it => it.c === category && it.s === source && it.n === name);
	assert.strictEqual(matches.length, 1, `${name} must appear once in the general search index.`);
}

console.log("PASS: Ranger (Himo), spell progression, and inherited Ranger subclasses are valid.");

}
main().catch(error => { console.error(error); process.exitCode = 1; });
