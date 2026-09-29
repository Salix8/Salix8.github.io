"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {Omnidexer} = require("../js/omnidexer.js");

const browserRoot = path.join(__dirname, "..");
const searchIndex = Omnidexer.decompressIndex(require("../search/index.json"));
const targets = {
	barbarian: [["Path of the Beast", "TCE"], ["Path of the Giant", "BGG"], ["Path of Wild Magic", "TCE"]],
	bard: [["College of Creation", "TCE"], ["College of Eloquence", "TCE"]],
	cleric: [["Peace Domain", "TCE"], ["Twilight Domain", "TCE"]],
	druid: [["Circle of Stars", "TCE"], ["Circle of Wildfire", "TCE"]],
	fighter: [["Echo Knight", "EGW"], ["Psi Warrior", "TCE"], ["Rune Knight", "TCE"]],
	monk: [["Way of the Ascendant Dragon", "FTD"], ["Way of the Astral Self", "TCE"], ["Way of Mercy", "TCE"]],
	paladin: [["Oath of Glory", "TCE"], ["Oath of the Watchers", "TCE"]],
	ranger: [["Drakewarden", "FTD"], ["Swarmkeeper", "TCE"]],
	rogue: [["Phantom", "TCE"], ["Soulknife", "TCE"]],
	sorcerer: [["Lunar Sorcery", "DSotDQ"]],
	warlock: [["The Genie", "TCE"], ["The Undead", "VRGR"]],
	wizard: [["Graviturgy Magic", "EGW"], ["Order of Scribes", "TCE"]],
};

function getUnsupportedEntryTypes (entry, output = []) {
	if (!entry || typeof entry !== "object") return output;
	if (["refSubclassFeature", "refOptionalfeature", "statblock"].includes(entry.type)) output.push(entry.type);
	Object.values(entry).forEach(value => getUnsupportedEntryTypes(value, output));
	return output;
}

function hasTableCaption (entry, caption) {
	if (!entry || typeof entry !== "object") return false;
	if (entry.type === "table" && entry.caption === caption) return true;
	return Object.values(entry).some(value => hasTableCaption(value, caption));
}

const imported = [];
for (const [classFile, subclasses] of Object.entries(targets)) {
	const classData = require(path.join(browserRoot, "data", "class", `class-${classFile}.json`));
	for (const [name, source] of subclasses) {
		const matches = classData.class[0].subclasses.filter(subclass => subclass.name === name && subclass.source === source);
		assert.strictEqual(matches.length, 1, `${name} debe existir exactamente una vez con fuente ${source}.`);
		assert.strictEqual(typeof matches[0].page, "number", `${name} debe tener página oficial numérica.`);
		assert.deepStrictEqual(getUnsupportedEntryTypes(matches[0]), [], `${name} no debe conservar referencias de esquema moderno.`);
		const searchMatches = searchIndex.filter(entry => entry.c === 40 && entry.b === name && entry.s === source);
		assert.strictEqual(searchMatches.length, 1, `${name} debe aparecer una sola vez en el buscador general.`);
		imported.push(matches[0]);
	}
}

assert.strictEqual(imported.length, 26, "Deben importarse exactamente las 26 subclases solicitadas.");
assert.strictEqual(new Set(searchIndex.map(entry => entry.id)).size, searchIndex.length, "El índice no debe contener identificadores duplicados.");

const lunar = imported.find(subclass => subclass.name === "Lunar Sorcery");
assert.ok(hasTableCaption(lunar, "Lunar Spells"), "Lunar Sorcery debe conservar su tabla de conjuros.");

const utils = fs.readFileSync(path.join(browserRoot, "js", "utils.js"), "utf8");
for (const [source, sourceConstant, fullName] of [["BGG", "BGG", "Bigby Presents: Glory of the Giants"], ["DSotDQ", "DSoDQ", "Dragonlance: Shadow of the Dragon Queen"]]) {
	assert.ok(utils.includes(`Parser.SOURCE_JSON_TO_FULL[SRC_${sourceConstant}] = \"${fullName}\"`), `${source} debe estar registrado en el catálogo de fuentes.`);
}

console.log("PASS: 26 subclases oficiales, fuentes, referencias y búsqueda global");
