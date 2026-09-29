"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const DATA_DIR = path.join(__dirname, "..", "data");
const SPELLS_DIR = path.join(DATA_DIR, "spells");

const _readJson = file => JSON.parse(fs.readFileSync(file, "utf8"));

const _getJsonFiles = dir => fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
	const file = path.join(dir, entry.name);
	if (entry.isDirectory()) return _getJsonFiles(file);
	return entry.name.endsWith(".json") ? [file] : [];
});

const SPELLS = _getJsonFiles(SPELLS_DIR).flatMap(file => _readJson(file).spell || []);

const _getLabels = classFile => {
	const classData = _readJson(path.join(DATA_DIR, "class", classFile));
	return classData.class[0].classTableGroups.flatMap(group => group.colLabels || []);
};

const _getFilter = label => {
	const match = /^\{@filter ([^|]+)\|spells\|(.+)}$/.exec(label);
	assert.ok(match, `Expected a spell filter label, got: ${label}`);
	return Object.fromEntries(match[2].split("|").map(part => part.split("=")));
};

const _hasSpellFor = ({className, level}) => SPELLS.some(spell =>
	spell.level === level
	&& (spell.classes?.fromClassList || []).some(it => it.name === className && it.source === "Himo"),
);

const TEST_CASES = [
	{file: "class-clown.json", className: "Payaso", levels: [0, 1, 2, 3, 4, 5]},
	{file: "class-lexarch.json", className: "Lexarca", levels: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]},
	{file: "class-planeswalker.json", className: "Planeswalker", levels: [0, 1, 2, 3, 4, 5], hasSpellListColumn: false},
	{file: "class-ranger-himo.json", className: "Ranger (Himo)", levels: [1, 2, 3, 4, 5], hasCantrips: false},
];

test("Himo spellcasting table headers provide working spell-list shortcuts", () => {
	for (const {file, className, levels, hasCantrips = true, hasSpellListColumn = true} of TEST_CASES) {
		const filters = _getLabels(file)
			.filter(label => typeof label === "string" && label.startsWith("{@filter "))
			.map(_getFilter)
			.filter(filter => filter.class === className);

		if (hasCantrips) assert.ok(filters.some(filter => filter.level === "0"), `${className} needs its cantrip shortcut`);
		if (hasSpellListColumn) assert.ok(filters.some(filter => filter.level == null), `${className} needs its complete spell-list shortcut`);

		for (const level of levels) {
			assert.ok(_hasSpellFor({className, level}), `${className} has no Himo spell of level ${level}`);
			assert.ok(filters.some(filter => Number(filter.level) === level) || level === 0, `${className} needs its level ${level} shortcut`);
		}
	}
});

test("Desangrador's magic table has a shortcut to its Himo spell list", () => {
	const filters = _getLabels("class-desangrador.json")
		.filter(label => typeof label === "string" && label.startsWith("{@filter "))
		.map(_getFilter);
	assert.ok(filters.some(filter => filter.class === "Desangrador"));
	assert.ok(SPELLS.some(spell => (spell.classes?.fromClassList || []).some(it => it.name === "Desangrador" && it.source === "Himo")));
});
