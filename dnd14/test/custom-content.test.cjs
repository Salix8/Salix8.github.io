const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "custom-content-manifest.json"), "utf8"));

assert.equal(manifest.edition, "2014");
for (const entry of manifest.entries) {
	assert.ok(fs.existsSync(path.join(root, entry.path)), `Missing custom content: ${entry.path}`);
}

const navigation = fs.readFileSync(path.join(root, "js", "navigation.js"), "utf8");
assert.match(navigation, /characterbuilder\.html/);
assert.match(navigation, /spellpricer\.html/);
const spellPricing = JSON.parse(fs.readFileSync(path.join(root, "data", "spell-pricing.json"), "utf8"));
assert.equal(spellPricing.config.levelBaseGp.length, 11, "Spell-pricing levels must cover cantrip through level 10.");
assert.ok(spellPricing.config.levelBaseGp.every(Number.isFinite), "Spell-pricing base values must be numeric.");
assert.ok(Array.isArray(spellPricing.prices) && spellPricing.prices.length > 0, "Spell-pricing data must contain imported prices.");
assert.ok(spellPricing.prices.every(({name, source, priceGp}) => name && source && Number.isFinite(priceGp)), "Every imported spell price must be complete.");

const spellSourceLookup = JSON.parse(fs.readFileSync(path.join(root, "data", "generated", "gendata-spell-source-lookup.json"), "utf8"));
assert.equal(spellSourceLookup.ai["fast friends"].subclass.Himo.Desangrador.Himo.Vampírico.name, "Rito Vampírico");
assert.ok(fs.existsSync(path.join(root, "data", "class", "class-canalla.json")));
assert.ok(fs.existsSync(path.join(root, "salix-content.html")));
assert.doesNotMatch(navigation, /legacy\//);

const characterBuilder = fs.readFileSync(path.join(root, "js", "salix", "makebrew-character.js"), "utf8");
const characterBuilderServices = fs.readFileSync(path.join(root, "js", "salix", "makebrew-character-services.js"), "utf8");
assert.ok(fs.existsSync(path.join(root, "data", "character-builder-trait-summaries.json")), "Character Builder trait summaries must be shipped.");
assert.ok(fs.existsSync(path.join(root, "css", "character-builder-traits.css")), "Character Builder trait CSS must be shipped.");
assert.match(characterBuilder, /data\/bestiary\/legendarygroups\.json/);
assert.doesNotMatch(characterBuilder, /data\/bestiary\/meta\.json/);
assert.match(characterBuilderServices, /class CharacterBuilderDataService/);
assert.match(characterBuilderServices, /pLoadRawJson/);
assert.match(characterBuilderServices, /pLoadRaces/);

const optionalFeatures = JSON.parse(fs.readFileSync(path.join(root, "data", "optionalfeatures.json"), "utf8")).optionalfeature;
assert.equal(optionalFeatures.length, 457, "D&D 2014 must contain the complete historical Optional Features catalogue.");
assert.equal(new Set(optionalFeatures.map(({name, source}) => `${name}\u0000${source}`)).size, optionalFeatures.length, "Optional Features must not be duplicated.");

const potions = optionalFeatures.filter(it => it.potion);
assert.equal(potions.length, 61, "All Alchemist potion recipes must be present.");
assert.deepEqual(Object.fromEntries([1, 5, 10, 15].map(level => [level, potions.filter(it => it.potion.level === level).length])), {1: 19, 5: 20, 10: 10, 15: 12});
assert.ok(potions.every(it => it.featureType.includes("POT") && it.potion.ingredients && it.potion.ingredientTypes?.length && ["range", "use", "duration"].every(prop => Object.hasOwn(it.potion, prop))), "Potion records must preserve their complete recipe contract.");

const optionalFeaturesFilter = fs.readFileSync(path.join(root, "js", "filter-optionalfeatures.js"), "utf8");
assert.match(optionalFeaturesFilter, /header: "Class \/ Subclass"/);
assert.match(optionalFeaturesFilter, /OptionalFeatureLevelRangeFilter/);
assert.match(optionalFeaturesFilter, /filters: \[this\._levelFilter, this\._classFilter\]/);
assert.match(optionalFeaturesFilter, /setValue\(baseKey, isHidden \? 0 : 1\)/);
assert.match(optionalFeaturesFilter, /_getClassKey\("Alquimista", "Himo"\)\]: "omit"/);
assert.match(optionalFeaturesFilter, /_getClassKey\("Fighter", "PHB"\)\]: "omit"/);
assert.match(optionalFeaturesFilter, /"fighting-styles", displayName: "Fighting Styles"/);
assert.match(optionalFeaturesFilter, /"maneuvers", displayName: "Maneuvers"/);
assert.match(optionalFeaturesFilter, /"ship-upgrades", displayName: "Ship Upgrades"/);
assert.match(optionalFeaturesFilter, /"infernal-war-machine", displayName: "Infernal War Machine"/);
assert.match(optionalFeaturesFilter, /isNestDivider: true/);
assert.match(optionalFeaturesFilter, /setValue\("EI", 1\)/);
assert.match(optionalFeaturesFilter, /featureType: "POT", filters: \[this\._ingredientFilter\]/);
assert.match(fs.readFileSync(path.join(root, "js", "parser.js"), "utf8"), /"POT": "Pociones del Alquimista"/);

console.log("PASS: 2014 custom content manifest, routes, spell pricing, Character Builder, and Canalla data.");
