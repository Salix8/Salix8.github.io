const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const load = file => JSON.parse(fs.readFileSync(path.join(root, "data", "class", file), "utf8"));
const getClass = data => data.class[0];
const getFeature = (data, name) => data.classFeature.find(it => it.name === name && it.level === 4);

const cases = [
	["class-clown.json", "Payaso", "Cantrip Versatility", "TCE"],
	["class-planeswalker.json", "Planeswalker", "Cantrip Versatility", "TCE"],
	["class-planeswalker.json", "Planeswalker", "Planar Versatility", "Himo"],
	["class-lexarch.json", "Lexarca", "Cantrip Versatility", "TCE"],
	["class-martial-expert.json", "Experto Marcial", "Martial Versatility", "TCE"],
	["class-desangrador.json", "Desangrador", "Martial Versatility", "TCE"],
	["class-canalla.json", "Canalla", "Martial Versatility", "TCE"],
	["class-ranger-himo.json", "Ranger (Himo)", "Martial Versatility", "TCE"],
	["class-alchemist.json", "Alquimista", "Study Versatility", "Himo"],
];

for (const [file, className, featureName, source] of cases) {
	const data = load(file);
	const cls = getClass(data);
	const feature = getFeature(data, featureName);
	assert.ok(feature, `Missing ${featureName} for ${className}.`);
	assert.equal(feature.source, source);
	assert.equal(feature.className, className);
	assert.equal(feature.classSource, "Himo");
	assert.equal(feature.isClassFeatureVariant, true);
	assert.ok(
		cls.classFeatures.includes(`${featureName}|${className}|Himo|4|${source}`),
		`${featureName} must be visible at level 4 for ${className}.`,
	);
}

const planar = getFeature(load("class-planeswalker.json"), "Planar Versatility");
assert.match(planar.entries[0], /isn’t given to you by the subclass/);
assert.match(planar.entries[0], /can’t change one Material Plane/);

const study = getFeature(load("class-alchemist.json"), "Study Versatility");
assert.match(study.entries[0], /proficiencies that you chose with the Carbonero Trait/);

const ranger = getFeature(load("class-ranger-himo.json"), "Martial Versatility");
assert.match(ranger.entries[1], /do one of the following/);
assert.ok(ranger.entries[2].items.some(it => it.includes("maneuver")), "Ranger (Himo) must be able to replace a maneuver.");

console.log("PASS: Himo class versatility variants are registered and preserve their class-specific rules.");
