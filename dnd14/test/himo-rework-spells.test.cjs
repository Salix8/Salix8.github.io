const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const spellDir = path.join(root, "data", "spells");
const spellIndex = JSON.parse(fs.readFileSync(path.join(spellDir, "index.json"), "utf8"));
const himoData = JSON.parse(fs.readFileSync(path.join(spellDir, spellIndex.Himo), "utf8"));
const spellSources = JSON.parse(fs.readFileSync(path.join(spellDir, "sources.json"), "utf8"));

const expectedClassSignatures = {
	"Sending (Rework)": ["class:Bard|PHB", "class:Cleric|PHB", "class:Wizard|PHB"],
	"Goodberry (Rework)": ["class:Druid|PHB", "class:Ranger|PHB"],
	"Jump (Rework)": ["class:Druid|PHB", "class:Ranger|PHB", "class:Sorcerer|PHB", "class:Wizard|PHB", "class:Artificer|TCE"],
	"Witch Bolt (Rework)": ["class:Sorcerer|PHB", "class:Warlock|PHB", "class:Wizard|PHB"],
	"Detect Thoughts (Rework)": ["class:Bard|PHB", "class:Sorcerer|PHB", "class:Wizard|PHB"],
	"Enervation (Rework)": ["variant:Sorcerer|PHB|XGE", "variant:Warlock|PHB|XGE", "variant:Wizard|PHB|XGE"],
	"Levitate (Rework)": ["class:Sorcerer|PHB", "class:Wizard|PHB", "class:Artificer|TCE"],
	"Drawmij's Instant Summons (Rework)": ["class:Wizard|PHB"],
	"Etherealness (Rework)": ["class:Bard|PHB", "class:Cleric|PHB", "class:Sorcerer|PHB", "class:Warlock|PHB", "class:Wizard|PHB"],
};

const getClassSignatures = spellSource => {
	const out = [];
	for (const cls of spellSource?.class || []) out.push(`class:${cls.name}|${cls.source}`);
	for (const cls of spellSource?.classVariant || []) out.push(`variant:${cls.name}|${cls.source}|${cls.definedInSource}`);
	return out;
};

assert.equal(spellIndex.Himo, "spells-himo.json");
assert.deepEqual(Object.keys(himoData), ["spell"]);
assert.equal(himoData.spell.length, 9);
assert.equal(new Set(himoData.spell.map(({name, source}) => `${name}\u0000${source}`)).size, 9);

const forbiddenProperties = ["page", "referenceSources", "races", "feats", "backgrounds", "optionalfeatures", "rewards"];
for (const spell of himoData.spell) {
	assert.equal(spell.source, "Himo");
	assert.match(spell.name, / \(Rework\)$/);
	assert.equal(Object.hasOwn(spell, "classes"), false, `${spell.name} must use the centralized class source registry.`);
	assert.deepEqual(getClassSignatures(spellSources.Himo[spell.name]), expectedClassSignatures[spell.name]);
	for (const prop of forbiddenProperties) assert.equal(Object.hasOwn(spell, prop), false, `${spell.name} should not inherit ${prop}.`);
}

const allSpells = Object.values(spellIndex)
	.flatMap(file => JSON.parse(fs.readFileSync(path.join(spellDir, file), "utf8")).spell || []);

for (const rework of himoData.spell) {
	const originalName = rework.name.replace(/ \(Rework\)$/, "");
	assert.ok(
		allSpells.some(spell => spell.name === originalName && ["PHB", "XGE"].includes(spell.source)),
		`Missing official original for ${rework.name}.`,
	);
}

for (const file of ["index.json", "index-alt-spell.json", "index-foundry.json"]) {
	const index = JSON.parse(fs.readFileSync(path.join(root, "search", file), "utf8"));
	const himoSourceId = index.m.s.Himo;
	const indexedReworks = index.x.filter(it => it.s === himoSourceId && it.n.endsWith("(Rework)"));
	assert.deepEqual(indexedReworks.map(it => it.n), himoData.spell.map(it => it.name), `${file} must contain every Himo rework.`);
}

console.log("PASS: 9 Himo rework spells preserve supplied classes and their official originals.");
