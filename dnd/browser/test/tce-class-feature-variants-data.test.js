"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {Omnidexer} = require("../js/omnidexer.js");

const browserRoot = path.join(__dirname, "..");
const searchIndex = Omnidexer.decompressIndex(require("../search/index.json"));
const targets = {
	barbarian: [[3, "Primal Knowledge"], [7, "Instinctive Pounce"]],
	bard: [[2, "Magical Inspiration"], [4, "Bardic Versatility"]],
	cleric: [[2, "Channel Divinity: Harness Divine Power"], [4, "Cantrip Versatility"]],
	druid: [[2, "Wild Companion"], [4, "Cantrip Versatility"]],
	fighter: [[4, "Martial Versatility"]],
	monk: [[2, "Dedicated Weapon"], [3, "Ki-Fueled Attack"], [4, "Quickened Healing"], [5, "Focused Aim"]],
	paladin: [[3, "Channel Divinity: Harness Divine Power"], [4, "Martial Versatility"]],
	ranger: [[1, "Deft Explorer"], [1, "Favored Foe"], [2, "Spellcasting Focus"], [3, "Primal Awareness"], [4, "Martial Versatility"], [6, "Deft Explorer Improvement"], [10, "Deft Explorer Improvement"], [10, "Nature's Veil"]],
	rogue: [[3, "Steady Aim"]],
	sorcerer: [[3, "Metamagic Options"], [4, "Sorcerous Versatility"], [5, "Magical Guidance"]],
	warlock: [[4, "Eldritch Versatility"]],
	wizard: [[3, "Cantrip Formulas"]]
};

function findUnsupportedNode (entry) {
	if (!entry || typeof entry !== "object") return null;
	if (["refSubclassFeature", "refOptionalfeature", "statblock"].includes(entry.type)) return entry.type;
	return Object.values(entry).map(findUnsupportedNode).find(Boolean) || null;
}

const imported = [];
for (const [classFile, expected] of Object.entries(targets)) {
	const classData = require(path.join(browserRoot, "data", "class", `class-${classFile}.json`));
	const className = classData.class[0].name;
	assert.strictEqual(classData.class[0].source, "PHB", `${className} debe conservar su origen PHB.`);

	for (const [level, name] of expected) {
		const matches = classData.class[0].classFeatures[level - 1].filter(feature => feature.name === name && feature.source === "TCE");
		assert.strictEqual(matches.length, 1, `${className} ${level}; ${name} debe existir una sola vez.`);
		const feature = matches[0];
		assert.strictEqual(feature.isClassFeatureVariant, true, `${name} debe marcarse como variante de clase.`);
		assert.strictEqual(typeof feature.page, "number", `${name} debe conservar su página oficial.`);
		assert.strictEqual(findUnsupportedNode(feature), null, `${name} no debe contener nodos incompatibles.`);

		const searchName = `${className} ${level}; ${name}`;
		const searchMatches = searchIndex.filter(entry => entry.c === 30 && entry.s === "TCE" && entry.n === searchName);
		assert.strictEqual(searchMatches.length, 1, `${name} debe aparecer una sola vez en la búsqueda global.`);
		assert.strictEqual(searchMatches[0].p, feature.page, `${name} debe conservar su página TCE en búsqueda.`);
		assert.ok(searchMatches[0].u.includes(`class-${classFile}`.replace("class-", "")) || searchMatches[0].u.startsWith(`${classFile}_phb`), `${name} debe enlazar a ${className}.`);
		imported.push(feature);
	}
}

assert.strictEqual(imported.length, 29, "Deben existir exactamente las 29 variantes de Tasha solicitadas.");
const metamagic = imported.find(feature => feature.name === "Metamagic Options");
assert.ok(JSON.stringify(metamagic).includes("{@optfeature Seeking Spell|TCE}"));
assert.ok(JSON.stringify(metamagic).includes("{@optfeature Transmuted Spell|TCE}"));
assert.ok(Renderer.get().render(metamagic).includes("rd__h--class-feature-variant"), "Las variantes deben marcar su título para el estilo visual.");
const classVariantCss = fs.readFileSync(path.join(browserRoot, "css", "classes-custom.css"), "utf8");
assert.ok(classVariantCss.includes(".night-mode .stats .rd__h--class-feature-variant"));
assert.ok(classVariantCss.includes("#e6ab94"));
assert.ok(classVariantCss.includes(".rd__h--class-feature-variant .rd__title-link"));
assert.ok(classVariantCss.includes("!important"));

for (const fileName of fs.readdirSync(path.join(browserRoot, "data", "class")).filter(it => it.endsWith(".json"))) {
	const data = JSON.parse(fs.readFileSync(path.join(browserRoot, "data", "class", fileName), "utf8"));
	for (const classEntry of data.class || []) {
		if (classEntry.source !== "Himo") continue;
		const variants = (classEntry.classFeatures || []).flat().filter(feature => feature.source === "TCE" && feature.isClassFeatureVariant);
		assert.deepStrictEqual(variants, [], `${fileName} no debe recibir variantes de Tasha.`);
	}
}

console.log("PASS: 29 variantes oficiales de Tasha, enlaces y búsqueda global.");
