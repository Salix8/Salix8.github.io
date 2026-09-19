"use strict";

const assert = require("assert");
const {Omnidexer} = require("../js/omnidexer.js");

const classIndex = require("../data/class/index.json");
const martialExpertData = require("../data/class/class-martial-expert.json");
const searchIndex = Omnidexer.decompressIndex(require("../search/index.json"));

const martialExpert = martialExpertData.class.find(it => it.name === "Experto Marcial" && it.source === "Himo");

assert(martialExpert, "The Himo Experto Marcial class must exist.");
assert.strictEqual(classIndex["martial-expert"], "class-martial-expert.json");
assert.strictEqual(martialExpert.classFeatures.length, 20);
assert.strictEqual(Object.hasOwn(martialExpert, "proficiencyBonusProgression"), false);
assert.deepStrictEqual(martialExpert.proficiency, ["str", "con"]);
assert.deepStrictEqual(martialExpert.multiclassing.requirements, {str: 13, con: 13});

assert.deepStrictEqual(
	martialExpert.classFeatures.map(level => level.map(feature => feature.name)),
	[
		["Máximo Partido", "Estilo de Lucha"],
		["Golpe Amortiguado"],
		["Forma de Combate"],
		["Ability Score Improvement", "Generar Apertura"],
		["Multiataque", "Siempre Listo"],
		["Estilo de Lucha", "Estallido de Guerra"],
		["Forma de Combate"],
		["Ability Score Improvement"],
		["Maestro Reparador"],
		["Golpes Potentes"],
		["Estilo de Lucha", "Rematador"],
		["Ability Score Improvement"],
		["Forma de Combate"],
		["Desarmar y Humillar"],
		["Violencia Extrema"],
		["Ability Score Improvement"],
		["Estilo de Lucha", "Mejora de Rematador"],
		["Forma de Combate"],
		["Ability Score Improvement"],
		["Peligroso"]
	]
);

for (const level of [3, 7, 13, 18]) {
	const feature = martialExpert.classFeatures[level - 1].find(it => it.name === "Forma de Combate");
	assert(feature?.gainSubclassFeature, `Level ${level} must grant a Forma de Combate feature.`);
	assert(feature.entries.length, `Forma de Combate at level ${level} must explain its advancement.`);
}

for (const level of [4, 8, 12, 16, 19]) {
	const feature = martialExpert.classFeatures[level - 1].find(it => it.name === "Ability Score Improvement");
	assert(feature, `Level ${level} must contain Ability Score Improvement.`);
	assert(feature.entries[0].includes(`${level}th level`));
	assert(feature.entries[1].includes("{@5etools feat|feats.html}"));
}

for (const level of [1, 6, 11, 17]) {
	const feature = martialExpert.classFeatures[level - 1].find(it => it.name === "Estilo de Lucha");
	assert(feature?.entries.length, `Level ${level} must grant an explained fighting style choice.`);
}

const multiattack = martialExpert.classFeatures[4].find(it => it.name === "Multiataque");
assert.deepStrictEqual(multiattack.entries, ["Beginning at 5th level, you can attack twice, instead of once, whenever you take the {@action Attack} action on your turn."]);
assert(!JSON.stringify(multiattack).includes("three"));
assert(!JSON.stringify(multiattack).includes("four"));

const expectedSubclasses = ["Bruto", "Inexpugnable", "Armado", "Blindado", "Yeoman"];
assert.deepStrictEqual(martialExpert.subclasses.map(it => it.name), expectedSubclasses);
assert(martialExpert.subclasses.every(subclass => subclass.subclassFeatures.length === 4));

const expectedSubclassFeatures = {
	"Bruto": ["Luchador rabioso", "Cabeza dura", "Melé Devastadora", "Sin miedo a morir"],
	"Inexpugnable": ["Protección a Medida", "Entereza", "Baluarte en mano", "Máxima defensa"],
	"Armado": ["Uno con tu arma", "Golpe ralentizante", "Tornado de Carne", "Golpe de Gracia"],
	"Blindado": ["Acostumbrado al peso", "Fortificado", "Caída ligera, caída pesada", "Maestro en Armaduras"],
	"Yeoman": ["Disparador Multirango", "Preciso", "Una flecha para un amigo", "Francotirador"]
};

const collectNames = value => {
	const out = [];
	const visit = current => {
		if (Array.isArray(current)) return current.forEach(visit);
		if (!current || typeof current !== "object") return;
		if (current.name) out.push(current.name);
		Object.values(current).forEach(visit);
	};
	visit(value);
	return out;
};

for (const subclass of martialExpert.subclasses) {
	const namesByTier = subclass.subclassFeatures.map(collectNames);
	expectedSubclassFeatures[subclass.name].forEach((name, index) => {
		assert(namesByTier[index].includes(name), `${name} must unlock at subclass tier ${index + 1}.`);
	});
}

const serialized = JSON.stringify(martialExpert);
for (const link of [
	"{@optfeature Defense|PHB|Defensa}",
	"{@optfeature Dueling|PHB|Duelista}",
	"{@optfeature Great Weapon Fighting|PHB}",
	"{@optfeature Interception|TCE}",
	"{@optfeature Protection|PHB}",
	"{@optfeature Superior Technique|TCE}",
	"{@optfeature Thrown Weapon Fighting|TCE}",
	"{@optfeature Two-Weapon Fighting|PHB}",
	"{@optfeature Unarmed Fighting|TCE|Unarmed Strike}"
]) assert(serialized.includes(link), `Missing internal fighting style link: ${link}`);

assert(serialized.includes("Shield Fighting"));
assert(serialized.includes("puede cogerse más de una vez"));

for (const [category, name] of [[5, "Experto Marcial"], ...expectedSubclasses.map(name => [40, `${name} (Experto Marcial)`])]) {
	const matches = searchIndex.filter(it => it.c === category && it.s === "Himo" && it.n === name);
	assert.strictEqual(matches.length, 1, `${name} must appear once in the general search index.`);
}

console.log("PASS: Experto Marcial class, Formas de Combate, and fighting styles are valid.");
