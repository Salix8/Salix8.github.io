"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {Omnidexer} = require("../js/omnidexer.js");

const browserRoot = path.join(__dirname, "..");
const data = require("../data/conditionsdiseases.json");
const searchIndex = Omnidexer.decompressIndex(require("../search/index.json"));
const pageController = fs.readFileSync(path.join(browserRoot, "js", "conditionsdiseases.js"), "utf8");

const himoDiseaseNames = [
	"Aeromonosis", "Anemia", "Apendicitis", "Ataque de Ansiedad", "Caosfágia", "Depresión", "Escorbuto",
	"Fiebre de las Alcantarillas", "Fiebre de Infección", "Fiebre Ghoul", "Fiebres Invernales", "Fiebre del Oro",
	"Fractura", "Gangrena", "Golpe de Calor", "Hipo Arcano", "Hipotermia", "Indigestión", "Lepra", "Malaria",
	"Peste", "Pulmones Sucios", "Rabia", "Salmonela", "Sarna", "Sida", "Síndrome de Abstinencia", "Tetano",
	"Tifus", "Tuberculosis", "Viruela"
];
const himoConditionNames = ["Dazed", "Sangrado"];

function getHimoEntries (collection, name) {
	return collection.filter(it => it.name === name && it.source === "Himo");
}

function findTable (name) {
	return getHimoEntries(data.disease, name)[0].entries.find(it => it.type === "table");
}

assert.strictEqual(data.disease.length, 38, "El catálogo debe contener 38 enfermedades.");
assert.strictEqual(data.condition.length, 17, "El catálogo debe contener 17 condiciones.");
assert.strictEqual(data.status.length, 2, "El catálogo debe contener los estados Concentration y Surprised.");
for (const [label, collection] of [["enfermedades", data.disease], ["condiciones", data.condition], ["estados", data.status]]) {
	const keys = collection.map(it => `${it.name.toLowerCase()}|${it.source.toLowerCase()}`);
	assert.strictEqual(new Set(keys).size, keys.length, `No debe haber ${label} duplicadas por nombre y fuente.`);
}

for (const name of himoDiseaseNames) {
	const matches = getHimoEntries(data.disease, name);
	assert.strictEqual(matches.length, 1, `La enfermedad ${name} debe existir exactamente una vez.`);
	assert.strictEqual(matches[0].page, "??", `${name} debe mantener la página provisional.`);
	for (const entry of matches[0].entries.filter(it => it.type === "entries")) {
		assert.ok(["Síntomas", "Contagio", "Efectos", "Curación", "Tratamiento", "Notas"].includes(entry.name), `Sección inesperada en ${name}: ${entry.name}.`);
		assert.ok(entry.entries.length, `No deben renderizarse secciones vacías en ${name}.`);
	}
}

for (const name of himoConditionNames) {
	assert.strictEqual(getHimoEntries(data.condition, name).length, 1, `La condición ${name} debe existir exactamente una vez.`);
}

assert.strictEqual(findTable("Hipo Arcano").rows.length, 16, "La tabla de Hipo Arcano debe tener 16 resultados.");
assert.strictEqual(findTable("Síndrome de Abstinencia").rows.length, 10, "La tabla de abstinencia debe tener 10 resultados.");
assert.ok(!getHimoEntries(data.disease, "Salmonela")[0].entries.some(it => it.name === "Efectos"), "Salmonela no debe mostrar una sección Efectos vacía.");
for (const name of ["Hipo Arcano", "Síndrome de Abstinencia"]) {
	assert.ok(findTable(name).rows.every(row => row.every(cell => cell != null)), `La tabla de ${name} no debe contener celdas nulas.`);
}

const knownByTag = {
	disease: new Set(data.disease.map(it => `${it.name.toLowerCase()}|${it.source.toLowerCase()}`)),
	condition: new Set(data.condition.map(it => `${it.name.toLowerCase()}|${it.source.toLowerCase()}`)),
	status: new Set(data.status.map(it => `${it.name.toLowerCase()}|${it.source.toLowerCase()}`))
};
const serialized = JSON.stringify(data);
for (const match of serialized.matchAll(/\{@(disease|condition|status) ([^|}]+)\|([^|}]+)(?:\|[^}]*)?}/g)) {
	const [, tag, name, source] = match;
	assert.ok(knownByTag[tag].has(`${name.toLowerCase()}|${source.toLowerCase()}`), `La referencia {@${tag} ${name}|${source}} no tiene destino.`);
}
for (const name of ["Concentration", "Surprised"]) {
	assert.strictEqual(searchIndex.filter(it => it.c === 49 && it.s === "PHB" && it.n === name).length, 1, `${name} debe aparecer una sola vez en el buscador general.`);
}

for (const [category, names] of [[21, himoDiseaseNames], [6, himoConditionNames]]) {
	for (const name of names) {
		const matches = searchIndex.filter(it => it.c === category && it.s === "Himo" && it.n === name);
		assert.strictEqual(matches.length, 1, `${name} debe aparecer una sola vez en el buscador general.`);
	}
}
assert.strictEqual(new Set(searchIndex.map(it => it.id)).size, searchIndex.length, "El índice no debe contener identificadores duplicados.");
assert.ok(!pageController.includes("deselFn: (it) => it === \"disease\""), "Las enfermedades no deben estar excluidas al abrir la página.");

console.log("PASS: catálogo Himo (38 enfermedades, 17 condiciones, 2 estados, tablas, referencias e índice)");
