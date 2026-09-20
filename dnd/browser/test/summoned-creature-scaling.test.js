"use strict";

const assert = require("assert");
const {Omnidexer} = require("../js/omnidexer.js");
const {SpellSummonedCreatureScaleService} = require("../js/scalecreature.js");

const draconicSpirit = require("../data/bestiary/bestiary-ftd.json").monster.find(it => it.name === "Draconic Spirit");
const forestProwlers = require("../data/bestiary/bestiary-hwcs.json").monster;
const druid = require("../data/class/class-druid.json");
const spellsFtd = require("../data/spells/spells-ftd.json").spell;
const searchIndex = Omnidexer.decompressIndex(require("../search/index.json"));
const spellSearchIndex = Omnidexer.decompressIndex(require("../search/index-alt-spell.json"));

assert.deepStrictEqual(forestProwlers.map(it => it.name), ["Forest Prowler", "Juvenile Forest Prowler"]);
assert(JSON.stringify(druid).includes("{@creature Juvenile Forest Prowler|HWCS}"));
assert(JSON.stringify(druid).includes("{@spell Lanza Atrapante de Claymore|GPNM}"));
assert(!JSON.stringify(druid).includes("Peter's Lanza"));

const summonSpell = spellsFtd.find(it => it.name === "Summon Draconic Spirit");
assert(summonSpell);
assert.strictEqual(draconicSpirit.summonedBySpell, "Summon Draconic Spirit|FTD");
assert.strictEqual(draconicSpirit.summonedBySpellLevel, 5);

for (const spell of spellsFtd) {
	assert(searchIndex.some(it => it.c === 2 && it.n === spell.name && it.s === "FTD"), `${spell.name} is missing from the general index.`);
	assert(spellSearchIndex.some(it => it.c === 2 && it.n === spell.name && it.s === "FTD" && it.lvl === spell.level), `${spell.name} is missing from the spell index.`);
}
for (const creature of forestProwlers) {
	assert(searchIndex.some(it => it.c === 1 && it.n === creature.name && it.s === "HWCS"), `${creature.name} is missing from the general index.`);
}
assert(searchIndex.some(it => it.c === 1 && it.n === "Draconic Spirit" && it.s === "FTD"));

const levelFive = SpellSummonedCreatureScaleService.scale(draconicSpirit, 5);
const levelNine = SpellSummonedCreatureScaleService.scale(draconicSpirit, 9);
assert.strictEqual(levelFive.ac[0].ac, 19);
assert.strictEqual(levelFive.hp.special, "50 (the dragon has 5d10 Hit Dice)");
assert(levelFive.action[0].entries[0].includes("two Rend attacks"));
assert(levelFive.action[1].entries[0].includes("1d6 + 4 + 5"));
assert.strictEqual(levelNine.ac[0].ac, 23);
assert.strictEqual(levelNine.hp.special, "90 (the dragon has 9d10 Hit Dice)");
assert(levelNine.action[0].entries[0].includes("four Rend attacks"));
assert(levelNine.action[1].entries[0].includes("1d6 + 4 + 9"));
assert.throws(() => SpellSummonedCreatureScaleService.scale(draconicSpirit, 4), /Invalid summon spell level/);

console.log("PASS: Humblewood references, FTD indexing, summon linkage, and spell-level scaling are valid.");
