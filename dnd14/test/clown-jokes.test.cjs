const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const jokes = JSON.parse(fs.readFileSync(path.join(root, "data", "optionalfeatures.json"), "utf8"))
	.optionalfeature
	.filter(it => it.source === "Himo" && it.featureType?.includes("BRM"));
const clown = JSON.parse(fs.readFileSync(path.join(root, "data", "class", "class-clown.json"), "utf8"));

const getJoke = name => jokes.find(it => it.name === name);
const getBaseLevel = name => getJoke(name)?.prerequisite?.[0]?.level?.level;

assert.deepEqual(
	["Shock", "Cubo en la puerta", "Chorro de Agua", "Zancadilla", "Palmada Eléctrica", "Tartazo"].map(getBaseLevel),
	[2, 2, 2, 2, 2, 2],
);
assert.deepEqual(["Confeti", "Bolsillo Mágico"].map(getBaseLevel), [5, 5]);
assert.deepEqual(["Proporciones cómicas", "Esquiva Ensayada", "Hombre del Saco"].map(getBaseLevel), [11, 11, 11]);

for (const joke of jokes) {
	assert.equal(
		joke.entries.some(it => it?.name === "Uso de las bromas"),
		false,
		`${joke.name} must not duplicate the Bromas feature description.`,
	);
}

assert.match(getJoke("Tartazo").entries[0], /pero sí puede ser utilizada varias veces en la misma criatura/);
assert.match(getJoke("Cubo en la puerta").entries[0], /la trampa no salta, por lo que sigue activa/);
assert.match(getJoke("Bruto").entries[0], /ataque apto para el rasgo de experto/);
assert.match(getJoke("Bruto").entries[0], /puede recibir más de una vez esta broma/);
assert.match(getJoke("Malabares").entries[0], /\{@i Miradas a Mi}/);
assert.match(getJoke("¿Seguro?").entries[0], /El curso de acción debe proyectarse a menos de 1 hora/);

const getClassJokeText = name => {
	const entries = JSON.stringify(clown);
	assert.match(entries, new RegExp(name.replace(/[?¿]/g, "\\$&")));
	return entries;
};
const classText = getClassJokeText("Tartazo");
assert.match(classText, /pero sí puede ser utilizada varias veces en la misma criatura/);
assert.match(classText, /la trampa no salta, por lo que sigue activa/);
assert.match(classText, /ataque apto para el rasgo de experto/);
assert.match(classText, /\{@i Miradas a Mi}/);
assert.match(classText, /El curso de acción debe proyectarse a menos de 1 hora/);

console.log("PASS: Payaso bromas are level-gated, deduplicated, and contain the requested rules text.");
