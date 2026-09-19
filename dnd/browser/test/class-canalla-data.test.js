"use strict";

const assert = require("assert");
const {Omnidexer} = require("../js/omnidexer.js");

const classIndex = require("../data/class/index.json");
const canallaData = require("../data/class/class-canalla.json");
const searchIndex = Omnidexer.decompressIndex(require("../search/index.json"));

const canalla = canallaData.class.find(it => it.name === "Canalla" && it.source === "Himo");

assert(canalla, "The Himo Canalla class must exist.");
assert.strictEqual(classIndex.canalla, "class-canalla.json");
assert.strictEqual(canalla.classFeatures.length, 20);
assert.strictEqual(Object.hasOwn(canalla, "proficiencyBonusProgression"), false);
assert.deepStrictEqual(canalla.proficiency, ["cha", "dex"]);
assert.deepStrictEqual(canalla.multiclassing.requirements, {cha: 13});

assert.deepStrictEqual(
	canalla.classFeatures.map(level => level.map(feature => feature.name)),
	[
		["Estilo de Lucha", "Taunts", "Hijo de la Calle"],
		["Jugarretas"],
		["Experiencia"],
		["Ability Score Improvement"],
		["Multiataque", "Oponente Odioso"],
		["Experiencia"],
		["Evasión"],
		["Ability Score Improvement"],
		["Suerte del Canalla", "Jugarretas"],
		["Ability Score Improvement"],
		["Experiencia"],
		["Ability Score Improvement"],
		["Taunt Arcano", "Chsst!"],
		["Suerte del Canalla x2"],
		["Experiencia"],
		["Ability Score Improvement"],
		["Mente fría"],
		["Suerte del Canalla x3"],
		["Ability Score Improvement"],
		["Avatar de lo Odioso"]
	]
);

for (const level of [3, 6, 11, 15]) {
	const feature = canalla.classFeatures[level - 1].find(it => it.name === "Experiencia");
	assert(feature?.gainSubclassFeature, `Level ${level} must grant an Experiencia feature.`);
	assert(feature.entries.length, `Experiencia at level ${level} must explain its advancement.`);
}

for (const level of [4, 8, 10, 12, 16, 19]) {
	const feature = canalla.classFeatures[level - 1].find(it => it.name === "Ability Score Improvement");
	assert(feature, `Level ${level} must contain Ability Score Improvement.`);
	assert(feature.entries[0].includes(`${level}th level`));
	assert(feature.entries[1].includes("{@5etools feat|feats.html}"));
}

assert(canalla.classFeatures[6][0].entries[0].startsWith("Beginning at 7th level"));
assert(canalla.classFeatures[13][0].entries[0].includes("dos veces"));
assert(canalla.classFeatures[17][0].entries[0].includes("tres veces"));

const expectedSubclasses = ["Vándalo", "Ludópata", "Parkourista", "Matón", "Virtuoso", "Rioter", "Ratero"];
assert.deepStrictEqual(canalla.subclasses.map(it => it.name), expectedSubclasses);
assert(canalla.subclasses.every(subclass => subclass.subclassFeatures.length === 4));
assert(!JSON.stringify(canalla).includes("Borracho"));

const expectedTricks = {
	"Vándalo": ["Brochazo", "Tintazo", "Bomba de Tinta", "Cubo tras la puerta"],
	"Ludópata": ["Moneda al aire", "Lanzar 1d20", "Carta no deseada", "Fajo de cartas"],
	"Parkourista": ["Choque de carrera", "Pasar por encima", "¿Por qué no te metes con alguien de tu tamaño?", "Patada voladora"],
	"Matón": ["Empujón", "Sacar pecho", "Someter", "¡Vamos chicos!"],
	"Virtuoso": ["Dando la nota", "Nota de Distracción", "El Super-estribillo", "Sonata Multitudinaria"],
	"Rioter": ["Grito de Guerra", "Gas lacrimógeno", "Oleada", "¡A cubierto!"],
	"Ratero": ["Desarme", "Navajazo", "Manto Nocturno", "Correa Maestra"]
};

const collectNamedEntries = value => {
	const out = [];
	const visit = current => {
		if (Array.isArray(current)) return current.forEach(visit);
		if (!current || typeof current !== "object") return;
		if (current.type === "entries" && current.name) out.push(current.name);
		Object.values(current).forEach(visit);
	};
	visit(value);
	return out;
};

for (const subclass of canalla.subclasses) {
	const namesByTier = subclass.subclassFeatures.map(collectNamedEntries);
	expectedTricks[subclass.name].forEach((name, index) => {
		assert(namesByTier[index].includes(name), `${name} must unlock at subclass tier ${index + 1}.`);
	});
}

const virtuoso = canalla.subclasses.find(it => it.name === "Virtuoso");
const tables = [];
const visitTables = value => {
	if (Array.isArray(value)) return value.forEach(visitTables);
	if (!value || typeof value !== "object") return;
	if (value.type === "table") tables.push(value);
	Object.values(value).forEach(visitTables);
};
visitTables(virtuoso);
assert.strictEqual(tables.length, 1);
assert.strictEqual(tables[0].rows.length, 6);

const serialized = JSON.stringify(canalla);
for (const link of [
	"{@optfeature Defense|PHB|Defensivo}",
	"{@optfeature Dueling|PHB|Duelista}",
	"{@optfeature Thrown Weapon Fighting|TCE|Lucha de armas arrojadizas}",
	"{@optfeature Two-Weapon Fighting|PHB|Lucha a dos armas}",
	"{@optfeature Unarmed Fighting|TCE|Lucha desarmada}",
	"{@spell Graffiti Arcano|GdR}",
	"{@spell Jim's Glowing Coin|AI|Jim’s Glowing Coin}"
]) assert(serialized.includes(link), `Missing internal link: ${link}`);

for (const [category, name] of [[5, "Canalla"], ...expectedSubclasses.map(name => [40, `${name} (Canalla)`])]) {
	const matches = searchIndex.filter(it => it.c === category && it.s === "Himo" && it.n === name);
	assert.strictEqual(matches.length, 1, `${name} must appear once in the general search index.`);
}

console.log("PASS: Canalla class, Experiencias, tricks, and internal links are valid.");
