"use strict";

const assert = require("assert");
const classIndex = require("../data/class/index.json");
const alchemistData = require("../data/class/class-alchemist.json");

const alchemist = alchemistData.class.find(it => it.name === "Alquimista" && it.source === "Himo");

assert(alchemist, "The Himo Alquimista class must exist.");
assert.strictEqual(classIndex.alchemist, "class-alchemist.json");
assert.strictEqual(alchemist.classFeatures.length, 20);
assert.strictEqual(Object.hasOwn(alchemist, "proficiencyBonusProgression"), false);
assert.strictEqual(Object.hasOwn(alchemist, "classTableLabels"), false);
assert.deepStrictEqual(
	alchemist.classTableGroups[0].rows.map(row => row[0]),
	["-", "-", 1, 2, 2, 3, 3, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 15]
);
assert.deepStrictEqual(
	alchemist.classFeatures.map(level => level[0].name),
	[
		"Carbonero, Competencia en pociones",
		"Sabiduría Alquímica",
		"Piedra Filosofal",
		"Mejora de puntuación de característica",
		"Especialización",
		"Recolector Filosofal-Ritual",
		"Mejora de la Piedra",
		"Mejora de puntuación de característica",
		"Especialización",
		"Cinturón de Conservación",
		"Mejora de la Piedra",
		"Mejora de puntuación de característica",
		"Especialización",
		"Uno con la Naturaleza",
		"Mejora de la Piedra",
		"Mejora de puntuación de característica",
		"Especialización",
		"Invocación Favorita",
		"Mejora de puntuación de característica",
		"Avatar Filosofal"
	]
);

assert.strictEqual(alchemist.subclasses.length, 7);
assert(alchemist.subclasses.every(subclass => subclass.subclassFeatures.length === 4));

const erratic = alchemist.subclasses.find(it => it.name === "Alquimista Errático");
assert(erratic, "The Alquimista Errático specialization must exist.");

const tables = [];
const visit = value => {
	if (Array.isArray(value)) return value.forEach(visit);
	if (!value || typeof value !== "object") return;
	if (value.type === "table") tables.push(value);
	Object.values(value).forEach(visit);
};
visit(erratic);

assert.strictEqual(tables.length, 2);
tables.forEach(table => {
	assert.deepStrictEqual(table.colLabels, ["d20", "Efecto", "Escalado"]);
	assert.strictEqual(table.rows.length, 20);
});

const serialized = JSON.stringify(alchemist);
assert(serialized.includes("{@filter pociones|optionalfeatures|feature type=POT|source=Himo}"));

console.log("PASS: Alquimista data structure and progression are valid.");
