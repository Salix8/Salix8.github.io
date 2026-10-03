"use strict";

const assert = require("assert");
const tables = require("../data/tables.json").table;

const getTable = name => {
	const matches = tables.filter(table => table.name === name && table.source === "Himo");
	assert.strictEqual(matches.length, 1, `${name} must be registered once for Himo.`);
	return matches[0];
};

const wildMagic = getTable("Wild Magic");
const modron = getTable("Modron");
const slaad = getTable("Slaad");

assert.deepStrictEqual(wildMagic.colLabels, ["d100", "Efecto"]);
assert.strictEqual(wildMagic.rows.length, 96);
assert.ok(wildMagic.footnotes[0].includes("Modron") && wildMagic.footnotes[0].includes("Slaad"));

const coveredRolls = new Set();
wildMagic.rows.forEach(([roll]) => {
	const [min, max = min] = roll.split("-").map(Number);
	for (let value = min; value <= max; value++) {
		assert.ok(!coveredRolls.has(value), `Wild Magic roll ${value} must not be duplicated.`);
		coveredRolls.add(value);
	}
});
assert.deepStrictEqual([...coveredRolls].sort((a, b) => a - b), Array.from({length: 100}, (_, index) => index + 1));

assert.deepStrictEqual(modron.rows[0], ["1-8", "Monodrone"]);
assert.strictEqual(modron.rows.length, 10);
assert.deepStrictEqual(slaad.rows, [
	["1", "Tadpole"],
	["2", "Rojo"],
	["3", "Azul"],
	["4", "Verde"],
	["5", "Gris"],
	["6", "Negro"],
]);

console.log("PASS: Wild Magic, Modron, and Slaad tables are complete and available for Himo.");
