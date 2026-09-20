"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {Omnidexer} = require("../js/omnidexer.js");

const spellIndex = require("../data/spells/index.json");
const spellData = require("../data/spells/spells-ghloe.json");
const searchIndex = Omnidexer.decompressIndex(require("../search/index.json"));
const spellSearchIndex = Omnidexer.decompressIndex(require("../search/index-alt-spell.json"));

assert.strictEqual(spellIndex.GHLoE, "spells-ghloe.json");
assert.strictEqual(spellData.spell.length, 1);

const spell = spellData.spell[0];
assert.strictEqual(spell.name, "Hunter Sense");
assert.strictEqual(spell.source, "GHLoE");
assert.strictEqual(spell.level, 0);
assert.strictEqual(spell.school, "D");
assert.deepStrictEqual(spell.time, [{number: 1, unit: "action"}]);
assert.deepStrictEqual(spell.range, {type: "point", distance: {type: "touch"}});
assert.deepStrictEqual(spell.components, {v: true, s: true});
assert.strictEqual(spell.duration[0].concentration, true);
assert.deepStrictEqual(spell.classes.fromClassList.map(it => it.name), ["Druid", "Ranger"]);
assert(spell.entries.length);

const sourceUtils = fs.readFileSync(path.join(__dirname, "..", "js", "utils.js"), "utf8");
assert(sourceUtils.includes('SRC_GHLoE = "GHLoE"'));
assert(sourceUtils.includes('"Grim Hollow: Lairs of Etharis"'));

assert.strictEqual(searchIndex.filter(it => it.c === 2 && it.s === "GHLoE" && it.n === "Hunter Sense").length, 1);
assert.strictEqual(spellSearchIndex.filter(it => it.c === 2 && it.s === "GHLoE" && it.n === "Hunter Sense" && it.lvl === 0).length, 1);

console.log("PASS: Hunter Sense spell data, source, classes, and search entries are valid.");
