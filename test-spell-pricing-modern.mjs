import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {SpellPricingService} from "./dnd-shared/spell-pricing-service.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const storage = new Map();
globalThis.StorageUtil = {
	syncGet: key => storage.get(key) || null,
	syncSet: (key, value) => storage.set(key, value),
};

async function pGetSpells (edition) {
	const directory = path.join(root, edition, "data", "spells");
	const index = JSON.parse(await readFile(path.join(directory, "index.json"), "utf8"));
	const datasets = await Promise.all(Object.values(index).map(async filename => JSON.parse(await readFile(path.join(directory, filename), "utf8"))));
	return datasets.flatMap(data => data.spell || []);
}

async function pTestEdition (edition) {
	const spellPricerHtml = await readFile(path.join(root, edition, "spellpricer.html"), "utf8");
	assert.match(spellPricerHtml, /id="spricer-provisional-price"/, `${edition}: debe incluir un resultado provisional`);
	assert.match(spellPricerHtml, /<th>Factor<\/th>/, `${edition}: debe conservar la columna Factor`);

	const pricing = JSON.parse(await readFile(path.join(root, edition, "data", "spell-pricing.json"), "utf8"));
	const service = new SpellPricingService({dataUrl: `/${edition}/data/spell-pricing.json`});
	const originalFetch = globalThis.fetch;
	globalThis.fetch = async () => ({ok: true, json: async () => pricing});
	await service.pInit();
	globalThis.fetch = originalFetch;

	const spells = await pGetSpells(edition);
	const spellKeys = new Set(spells.map(spell => `${spell.name}|${spell.source}`));
	assert.equal(pricing.prices.length, 207, `${edition}: debe conservar los 207 precios históricos`);
	pricing.prices.forEach(price => assert.ok(spellKeys.has(`${price.name}|${price.source}`), `${edition}: precio sin conjuro ${price.name}|${price.source}`));

	const imported = service.mutateSpell(spells.find(spell => spell.name === "Fireball" && spell.source === "PHB"));
	assert.equal(imported.priceGp, 422, `${edition}: Fireball debe mantener su precio importado`);
	const defaults = service.getAutofillInputs(imported);
	assert.equal(defaults.utility, 1, `${edition}: la utilidad por defecto debe ser 1`);
	assert.equal(defaults.isWizard, true, `${edition}: Wizard debe estar activo por defecto`);
	const untaxed = service.mutateSpell(spells.find(spell => !pricing.prices.some(price => price.name === spell.name && price.source === spell.source)));
	assert.equal(untaxed.priceGp, null, `${edition}: todo conjuro debe recibir priceGp aunque no esté tasado`);

	const inputs = {...defaults, level: imported.level, utility: 4};
	const saved = service.saveOverride(imported, inputs);
	assert.equal(service.getPriceMeta(imported).source, "local", `${edition}: el override local debe prevalecer`);
	assert.throws(() => service.saveOverride(imported, {...inputs, level: imported.level + 1}), /potenciados/);
	service.removeOverride(imported);
	assert.equal(service.getPriceMeta(imported).priceGp, 422);
	assert.ok(saved.priceGp > 0);
}

await pTestEdition("dnd14");
storage.clear();
await pTestEdition("dnd24");
console.log("PASS: catálogo, campo runtime, fórmula y overrides del tasador moderno.");
