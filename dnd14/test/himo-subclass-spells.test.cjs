const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const classData = JSON.parse(fs.readFileSync(path.join(root, "data", "class", "class-himo-base-subclasses.json"), "utf8"));
const spellIndex = JSON.parse(fs.readFileSync(path.join(root, "data", "spells", "index.json"), "utf8"));
const lookup = JSON.parse(fs.readFileSync(path.join(root, "data", "generated", "gendata-spell-source-lookup.json"), "utf8"));

const expectedCounts = new Map([
	["Artificer|Bladesmith", 10],
	["Cleric|Shintoísta", 10],
	["Cleric|Vacío", 10],
	["Cleric|Viaje", 10],
	["Druid|Bosque", 10],
	["Druid|Espinas", 3],
	["Druid|Tierra (Corrección)", 52],
	["Paladin|Salvaje", 10],
	["Paladin|Fey", 10],
	["Paladin|Hishna", 10],
	["Paladin|Pluma", 10],
	["Sorcerer|Vampírico", 10],
	["Warlock|Parásito", 10],
	["Warlock|Quori", 10],
	["Warlock|Archimago", 10],
	["Warlock|Dragón", 10],
]);

const getSpellUids = subclass => Object.values(subclass.additionalSpells[0])
	.filter(value => typeof value === "object")
	.flatMap(levels => Object.values(levels).flat())
	.filter(value => typeof value === "string");

const getLookupSubclass = (name, source, subclass) => lookup[source.toLowerCase()][name.toLowerCase()]?.subclass?.[subclass.classSource]?.[subclass.className]?.[subclass.source]?.[subclass.shortName];

const getNormalizedUid = uid => {
	const [name, source = "PHB"] = uid.split("|");
	return `${name.toLowerCase()}|${source.toLowerCase()}`;
};

const getTableSpellUids = subclass => {
	const feature = classData.subclassFeature.find(it => it.className === subclass.className && it.subclassShortName === subclass.shortName && it.level <= 3);
	const tableJsons = [];
	const pCollectTables = entry => {
		if (entry instanceof Array) return entry.forEach(pCollectTables);
		if (!entry || typeof entry !== "object") return;
		if (entry.type === "table") tableJsons.push(JSON.stringify(entry));
		Object.values(entry).forEach(pCollectTables);
	};
	pCollectTables(feature.entries);
	return tableJsons
		.flatMap(tableJson => tableJson.match(/@spell ([^}|]+)(?:\|([^}|]+))?/g) || [])
		.map(tag => getNormalizedUid(tag.slice(7)));
};

const spellIds = new Set(Object.values(spellIndex)
	.flatMap(file => JSON.parse(fs.readFileSync(path.join(root, "data", "spells", file), "utf8")).spell || [])
	.map(spell => `${spell.name.toLowerCase()}|${spell.source.toLowerCase()}`));

for (const [key, expectedCount] of expectedCounts) {
	const [className, shortName] = key.split("|");
	const subclass = classData.subclass.find(it => it.className === className && it.shortName === shortName);
	assert.ok(subclass?.additionalSpells, `Missing additionalSpells for ${key}.`);

	const uids = getSpellUids(subclass);
	assert.equal(new Set(uids.map(it => it.toLowerCase())).size, expectedCount, `${key} should have ${expectedCount} unique spells.`);
	for (const uid of uids) {
		const [name, source = "PHB"] = uid.split("|");
		assert.ok(spellIds.has(`${name.toLowerCase()}|${source.toLowerCase()}`), `${key} references missing ${uid}.`);
		assert.equal(getLookupSubclass(name, source, subclass)?.name, subclass.name, `${uid} should be indexed for ${key}.`);
	}

	if (key !== "Druid|Espinas") {
		assert.deepEqual(
			new Set(getTableSpellUids(subclass)),
			new Set(uids.map(getNormalizedUid)),
			`${key} must match the spells listed in its source table.`,
		);
	}
}

const wildPaladin = classData.subclass.find(it => it.className === "Paladin" && it.shortName === "Salvaje");
assert.deepEqual(getSpellUids(wildPaladin), [
	"Hunter's Mark|PHB", "Animal Friendship|PHB", "Animal Messenger|PHB", "Beast Sense|PHB", "Conjure Animals|PHB",
	"Phantom Steed|PHB", "Guardian of Nature|XGE", "Aura of Life|PHB", "Commune with Nature|PHB", "Wrath of Nature|XGE",
]);

const lich = classData.subclass.find(it => it.className === "Wizard" && it.shortName === "Lich");
assert.deepEqual(lich.additionalSpells, [{expanded: {s0: [{all: "school=N"}]}}]);
const necromancySpells = Object.values(spellIndex)
	.flatMap(file => JSON.parse(fs.readFileSync(path.join(root, "data", "spells", file), "utf8")).spell || [])
	.filter(spell => spell.school === "N");
assert.equal(necromancySpells.length, 56);
for (const spell of necromancySpells) assert.equal(getLookupSubclass(spell.name, spell.source, lich)?.name, "Lich", `${spell.name} should be indexed for Lich.`);

console.log("PASS: 17 Himo subclasses expose their spell filters, including all necromancy for Lich.");
