"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const pricingData = require("../data/spell-pricing.json");
const storage = new Map();
global.StorageUtil = {
	syncGet: key => storage.get(key),
	syncSet: (key, value) => storage.set(key, value),
};

const SpellPricingService = require("../js/spell-pricing.js");
SpellPricingService._config = pricingData.config;
SpellPricingService._prices = new Map(pricingData.prices.map(price => [SpellPricingService.getSpellKey(price), price.priceGp]));

const getAllSpells = () => {
	const spellDir = path.join(root, "data", "spells");
	const index = JSON.parse(fs.readFileSync(path.join(spellDir, "index.json"), "utf8"));
	return Object.values(index).flatMap(fileName => JSON.parse(fs.readFileSync(path.join(spellDir, fileName), "utf8")).spell || []);
};

function main () {
	assert.strictEqual(pricingData.prices.length, 207);
	assert.strictEqual(new Set(pricingData.prices.map(price => `${price.name}|${price.source}`)).size, 207);
	assert.deepStrictEqual(pricingData.config.levelBaseGp, [10, 25, 75, 150, 300, 750, 2500, 5000, 10000, 20000, 20000]);

	const allSpells = getAllSpells();
	const spellKeys = new Set(allSpells.map(spell => `${spell.name}|${spell.source}`));
	assert.strictEqual(allSpells.length, 720);
	for (const price of pricingData.prices) assert(spellKeys.has(`${price.name}|${price.source}`), `Precio sin conjuro: ${price.name}|${price.source}`);

	for (const [name, source] of [
		["Inscripción Diplomática", "GdR"],
		["Buscador de Sueños", "CdS"],
		["Caminante de Sueños", "CdS"],
		["Mordenkainen's Private Sanctum", "PHB"],
		["Greater Invisibility", "PHB"],
		["Raulothim's Psychic Lance", "FTD"],
		["Divination", "PHB"],
		["Contact Other Plane", "PHB"],
		["Teleportation Circle", "PHB"],
		["Cone of Cold", "PHB"],
		["Contagion", "PHB"],
		["Disintegrate", "PHB"],
		["Circle of Death", "PHB"],
	]) assert(pricingData.prices.some(price => price.name === name && price.source === source), `Falta equivalencia ${name}|${source}`);

	const defaults = {
		level: 0,
		utility: 1,
		isAcademy: false,
		isRare: false,
		isRitual: false,
		isWizard: true,
		legality: "legal",
		isPaidComponent: false,
	};
	assert.strictEqual(SpellPricingService.calculate(defaults).priceGp, 13, "El truco usa base 10 y utilidad ×1,25");
	assert.strictEqual(SpellPricingService.calculate({...defaults, level: 10}).priceGp, 25000, "Nivel 10 reutiliza base 20.000");
	assert.strictEqual(SpellPricingService.calculate({...defaults, level: 2, utility: 3, isRare: true}).priceGp, 197, "Debe redondear 196,875 a 197");
	assert.strictEqual(SpellPricingService.calculate({
		level: 3,
		utility: 4,
		isAcademy: true,
		isRare: true,
		isRitual: true,
		isWizard: false,
		legality: "illegal",
		isPaidComponent: true,
	}).priceGp, 6075);

	assert(SpellPricingService.hasPaidComponent({components: {m: {text: "a pearl", cost: 10000}}}));
	assert(SpellPricingService.hasPaidComponent({components: {m: "Una lácrima por valor de 25.000 GP"}}));
	assert(SpellPricingService.hasPaidComponent({components: {m: "diamonds worth 1,000 gp"}}));
	assert(!SpellPricingService.hasPaidComponent({components: {m: "20 litros de sangre"}}));
	assert(!SpellPricingService.hasPaidComponent({components: {v: true, s: true}}));

	assert(SpellPricingService.isWizardSpell({classes: {fromClassList: [{name: "Wizard", source: "PHB"}]}}));
	assert(SpellPricingService.isWizardSpell({classes: {fromClassListVariant: [{name: "Wizard", source: "PHB"}]}}));
	assert(!SpellPricingService.isWizardSpell({classes: {fromClassList: [{name: "Cleric", source: "PHB"}]}}));

	const spell = {name: "Test Spell", source: "TEST", level: 1};
	SpellPricingService._prices.set(SpellPricingService.getSpellKey(spell), 99);
	assert.deepStrictEqual(SpellPricingService.getPriceMeta(spell), {priceGp: 99, source: "imported"});
	const saved = SpellPricingService.saveOverride(spell, {...defaults, level: 1, utility: 4});
	assert.strictEqual(saved.priceGp, 50);
	assert.strictEqual(SpellPricingService.getPriceMeta(spell).source, "local");
	assert.strictEqual(SpellPricingService.getPrice(spell), 50);
	assert.throws(() => SpellPricingService.saveOverride(spell, {...defaults, level: 2}), /potenciados/);
	SpellPricingService.removeOverride(spell);
	assert.strictEqual(SpellPricingService.getPrice(spell), 99);

	assert(fs.readFileSync(path.join(root, "js", "navigation.js"), "utf8").includes('spellpricer.html", "Tasador de conjuros'));
	assert(fs.readFileSync(path.join(root, "spells.html"), "utf8").includes('data-sort="price"'));
	assert(fs.readFileSync(path.join(root, "js", "render-spells.js"), "utf8").includes("<span class=\"bold\">Price: </span>"));

	console.log("PASS: 207 precios, fórmula, autocompletado, componentes, persistencia y superficies de precio.");
}

try {
	main();
} catch (error) {
	console.error(error);
	process.exitCode = 1;
}
