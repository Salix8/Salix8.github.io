const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const index = JSON.parse(fs.readFileSync(path.join(root, "data", "class", "index.json"), "utf8"));
const data = JSON.parse(fs.readFileSync(path.join(root, "data", "class", "class-guardian.json"), "utf8"));
const guardian = data.class.find(it => it.name === "Guardián" && it.source === "Himo");

assert.equal(index.guardian, "class-guardian.json");
assert.ok(guardian, "Guardián must be registered as a Himo class.");
assert.deepEqual(guardian.hd, {number: 1, faces: 12});
assert.deepEqual(guardian.proficiency, ["con", "cha"]);
assert.deepEqual(guardian.multiclassing.requirements, {con: 13, cha: 13});
assert.equal(guardian.subclassTitle, "Defensive Archetypes");

const standardPb = level => 2 + Math.floor((level - 1) / 4);
assert.equal(guardian.classFeatures.length, 27);
for (let level = 1; level <= 20; level++) assert.equal(standardPb(level), [2, 3, 4, 5, 6][Math.floor((level - 1) / 4)]);
assert.deepEqual(guardian.classTableGroups[0].rows.flat(), ["1d4", "1d4", "1d4", "1d4", "1d6", "1d6", "1d6", "1d6", "1d6", "1d8", "1d8", "1d8", "1d8", "1d8", "1d10", "1d10", "1d10", "1d10", "1d10", "1d10"]);

const getFeature = (name, level) => data.classFeature.find(it => it.name === name && it.level === level);
for (const level of [4, 8, 10, 12, 16, 19]) {
	const feature = getFeature("Ability Score Improvement", level);
	assert.ok(feature, `Missing Ability Score Improvement at level ${level}.`);
	assert.match(feature.entries[0], new RegExp(`When you reach ${level}th level`));
}
for (const level of [3, 6, 13, 18]) assert.ok(getFeature("Defensive Archetypes", level), `Missing archetype step at level ${level}.`);
for (const level of [5, 17]) assert.ok(getFeature("Extra Reaction", level), `Missing Extra Reaction step at level ${level}.`);
assert.match(getFeature("Unbreakable", 9).entries[0], /Con un éxito, eres inmune/);
assert.match(getFeature("Unbreakable", 9).entries[0], /Con un fallo, recibes la mitad/);

assert.equal(data.subclass.length, 5);
const expectedSubclasses = ["Heraldo Místico", "Juramentado", "Warden", "Renegado", "Wyrmguard"];
assert.deepEqual(data.subclass.map(it => it.name), expectedSubclasses);
for (const subclass of data.subclass) {
	assert.equal(subclass.source, "Himo");
	assert.deepEqual(subclass.subclassFeatures.map(it => Number(it.split("|").at(-2))), [3, 6, 13, 18]);
}

const herald = data.subclass.find(it => it.name === "Heraldo Místico");
assert.equal(herald.spellcastingAbility, "cha");
assert.deepEqual(herald.cantripProgression.slice(2), [3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]);
assert.deepEqual(herald.spellsKnownProgression.slice(2), [3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13]);
assert.equal(herald.subclassTableGroups.length, 2);
assert.deepEqual(herald.subclassTableGroups[1].rowsSpellProgression.at(-1), [4, 3, 3, 1]);
assert.ok(herald.subclassSpells.some(it => it.name === "Guidance" && it.source === "PHB"));
assert.ok(herald.subclassSpells.some(it => it.filter?.class?.name === "Bard"));

const search = JSON.parse(fs.readFileSync(path.join(root, "search", "index.json"), "utf8"));
const himoSourceId = search.m.s.Himo;
const normalize = value => value.normalize("NFD").replace(/\p{Diacritic}/gu, "");
assert.ok(search.x.some(it => normalize(it.n) === "Guardian" && it.s === himoSourceId));
for (const subclass of expectedSubclasses) assert.ok(search.x.some(it => normalize(it.n) === `${normalize(subclass)} (Guardian)` && it.s === himoSourceId), `Missing search entry for ${subclass}.`);

const spellLookup = JSON.parse(fs.readFileSync(path.join(root, "data", "generated", "gendata-spell-source-lookup.json"), "utf8"));
for (const spellName of ["guidance", "healing word"]) {
	assert.equal(
		spellLookup.phb[spellName]?.subclass?.Himo?.["Guardián"]?.Himo?.["Heraldo Místico"]?.name,
		"Heraldo Místico",
		`${spellName} must be linked to Heraldo Místico.`,
	);
}

console.log("PASS: Guardián has its class progression, five Defensive Archetypes, and Heraldo Místico spellcasting data.");
