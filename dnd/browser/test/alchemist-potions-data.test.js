"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const optionalFeatures = require("../data/optionalfeatures.json").optionalfeature;
const alchemistData = require("../data/class/class-alchemist.json");

const potions = optionalFeatures.filter(it => it.featureType === "POT");
const byName = new Map(potions.map(it => [it.name, it]));

assert.strictEqual(potions.length, 61);
assert.strictEqual(byName.size, potions.length, "Potion names must be unique.");
assert.deepStrictEqual(
	Object.fromEntries([1, 5, 10, 15].map(level => [level, potions.filter(it => it.potion.level === level).length])),
	{1: 19, 5: 20, 10: 10, 15: 12}
);

potions.forEach(potion => {
	assert.strictEqual(potion.source, "Himo");
	assert.strictEqual(potion.page, "??");
	assert(potion.potion && typeof potion.potion === "object");
	["level", "ingredients", "ingredientTypes", "range", "use", "duration"].forEach(field => {
		assert(Object.hasOwn(potion.potion, field), `${potion.name} is missing potion.${field}.`);
	});
	assert(Array.isArray(potion.potion.ingredientTypes));
	assert(potion.potion.ingredientTypes.every(it => ["Animal", "Vegetal", "Mineral", "Otros", "Especial"].includes(it)));
	assert(Array.isArray(potion.entries) && potion.entries.length);
});

assert(!byName.has("Flatulencias secsis*"));
assert(!byName.has("Título"));

const explosive = byName.get("Poción Explosiva");
assert(explosive);
assert.strictEqual(explosive.potion.ingredients, "Mineral y Animal");
assert.strictEqual(explosive.potion.level, 1);
assert(JSON.stringify(explosive.entries).includes("{@dice 2d8}"));

const chemicalBomb = byName.get("Bomba Química (lv 10)");
assert(chemicalBomb);
assert(chemicalBomb.entries.some(section => section.entries.some(entry => entry && entry.type === "list" && entry.items.length === 5)));

const preservationGlucose = byName.get("Glucosa de Conservación");
assert(preservationGlucose);
assert.strictEqual(preservationGlucose.potion.use, "", "The PDF does not provide a use value for this potion.");

const alchemist = alchemistData.class.find(it => it.name === "Alquimista" && it.source === "Himo");
const serializedAlchemist = JSON.stringify(alchemist);
assert(serializedAlchemist.includes("{@filter pociones|optionalfeatures|feature type=POT|source=Himo}"));
assert(serializedAlchemist.includes("La cantidad es siempre la que quepa en unas manos normales ni muy grandes ni muy pequeñas o pueda medirse como cazo de cocina, aprox"));

const jsRoot = path.join(__dirname, "..", "js");
assert(fs.readFileSync(path.join(jsRoot, "utils.js"), "utf8").includes('"POT": "Poti"'));
assert(fs.readFileSync(path.join(jsRoot, "omnidexer.js"), "utf8").includes("Parser.CAT_ID_POTION"));

console.log("PASS: Alchemist potion data and registration are valid.");
