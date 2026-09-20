"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {Omnidexer} = require("../js/omnidexer.js");

const optionalFeatures = require("../data/optionalfeatures.json").optionalfeature;
const searchIndex = Omnidexer.decompressIndex(require("../search/index.json"));
const words = optionalFeatures.filter(it => it.featureType === "PW");
const byName = new Map(words.map(it => [it.name, it]));

assert.strictEqual(words.length, 28);
assert.strictEqual(byName.size, 28, "Power-word names must be unique.");
words.forEach(word => {
	assert.strictEqual(word.source, "Himo");
	assert.strictEqual(word.page, "??");
	assert(Array.isArray(word.entries) && word.entries.length, `${word.name} must contain its rules.`);
	assert.strictEqual(word.prerequisite.length, 1);
	assert.strictEqual(word.prerequisite[0].level.class.name, "Lexarca");
});

const generalByLevel = Object.fromEntries([2,7,13,17].map(level => [level, words.filter(it => it.prerequisite[0].level.level === level && !it.prerequisite[0].level.subclass).length]));
assert.deepStrictEqual(generalByLevel, {2: 6, 7: 5, 13: 5, 17: 3});

const subclassWords = words.filter(it => it.prerequisite[0].level.subclass);
assert.strictEqual(subclassWords.length, 9);
assert.deepStrictEqual(
	Object.fromEntries(["Lengua de Plata","Lengua de Oro","Lengua de Serpiente","Lengua de Sangre"].map(name => [name, subclassWords.filter(it => it.prerequisite[0].level.subclass.name === name).length])),
	{"Lengua de Plata": 2, "Lengua de Oro": 3, "Lengua de Serpiente": 1, "Lengua de Sangre": 3}
);
for (const name of ["Alma","Infierno","Vida","Curación","Revivir","Rugido","Jaula","ghoul","Lichdom"]) {
	assert(JSON.stringify(byName.get(name).entries).includes("siempre preparada"), `${name} must be always prepared.`);
	assert(JSON.stringify(byName.get(name).entries).includes("no cuenta para el máximo"), `${name} must not count against the maximum.`);
}

const jsRoot = path.join(__dirname, "..", "js");
assert(fs.readFileSync(path.join(jsRoot, "optionalfeatures.js"), "utf8").includes('it.featureType === "PW" ? it._dFeatureType'));
assert(fs.readFileSync(path.join(jsRoot, "utils.js"), "utf8").includes('"PW": "Palabra de Poder"'));
assert(fs.readFileSync(path.join(jsRoot, "utils.js"), "utf8").includes("Parser.CAT_ID_POWER_WORD = 45"));
assert(fs.readFileSync(path.join(jsRoot, "omnidexer.js"), "utf8").includes("Parser.CAT_ID_POWER_WORD"));

for (const word of words) {
	const matches = searchIndex.filter(it => it.c === 45 && it.s === "Himo" && it.n === word.name);
	assert.strictEqual(matches.length, 1, `${word.name} must appear once in the general search index.`);
}

console.log("PASS: Lexarca power words, prerequisites, filters, and search entries are valid.");
