import fs from "node:fs";

import "../../js/parser.js";
globalThis.FilterItem = class {};
import "../../js/utils.js";

const SPELL_DIR = new URL("../../data/spells/", import.meta.url);
const EXPECTED_FILE = new URL("../fixtures/himo-spell-lists.json", import.meta.url);
const CLASS_FILES = {
	Planeswalker: new URL("../../data/class/class-planeswalker.json", import.meta.url),
	Payaso: new URL("../../data/class/class-clown.json", import.meta.url),
	Lexarca: new URL("../../data/class/class-lexarch.json", import.meta.url),
};
const EXPECTED_LEVELS = {
	Lexarca: {0: 13, 1: 24, 2: 22, 3: 23, 4: 25, 5: 19, 6: 16, 7: 12, 8: 10, 9: 10},
	Payaso: {0: 11, 1: 23, 2: 20, 3: 15, 4: 12, 5: 11},
	Planeswalker: {0: 20, 1: 44, 2: 46, 3: 27, 4: 26, 5: 22},
};

const getKey = ({name, source}) => `${name}|${source}`;
const getSortKey = (spell) => `${spell.level}|${getKey(spell)}`;

const getSpells = () => {
	const index = JSON.parse(fs.readFileSync(new URL("index.json", SPELL_DIR), "utf8"));
	return Object.values(index)
		.flatMap(file => JSON.parse(fs.readFileSync(new URL(file, SPELL_DIR), "utf8")).spell || []);
};

const getFilterLinks = (entry) => {
	if (typeof entry === "string") return [...entry.matchAll(/\{@filter [^}]*\|spells\|[^}]*\bclass=([^|}]+)/g)].map(match => match[1]);
	if (entry == null || typeof entry !== "object") return [];
	if (Array.isArray(entry)) return entry.flatMap(getFilterLinks);
	return Object.values(entry).flatMap(getFilterLinks);
};

describe("listas de conjuros de Himo", () => {
	const spells = getSpells();
	const expectedByClass = JSON.parse(fs.readFileSync(EXPECTED_FILE, "utf8"));

	it.each(Object.keys(EXPECTED_LEVELS))("guarda exactamente la lista base de %s en cada conjuro", className => {
		const actual = spells
			.filter(spell => spell.classes?.fromClassList?.some(it => it.name === className && it.source === "Himo"))
			.map(({name, source, level}) => ({name, source, level}));
		const expected = expectedByClass[className];

		expect(new Set(actual.map(getKey)).size).toBe(actual.length);
		expect(actual.sort((a, b) => getSortKey(a).localeCompare(getSortKey(b))))
			.toEqual(expected.sort((a, b) => getSortKey(a).localeCompare(getSortKey(b))));
		expect(Object.fromEntries(Object.entries(actual.reduce((out, spell) => {
			out[spell.level] = (out[spell.level] || 0) + 1;
			return out;
		}, {})).sort(([a], [b]) => Number(a) - Number(b)))).toEqual(EXPECTED_LEVELS[className]);
		for (const spell of actual) {
			const sourceSpell = spells.find(it => getKey(it) === getKey(spell));
			expect(sourceSpell.classes.fromClassList.filter(it => it.name === className && it.source === "Himo")).toHaveLength(1);
		}
	});

	it("usa las fichas publicadas para las equivalencias de nombre", () => {
		for (const className of ["Lexarca", "Planeswalker"]) {
			expect(expectedByClass[className]).toContainEqual({name: "Mind Sliver", source: "TCE", level: 0});
			expect(expectedByClass[className]).toContainEqual({name: "Teleportation Circle", source: "PHB", level: 5});
		}
		for (const spell of spells.filter(it => it.name === "Mind Sliver" && it.source !== "TCE")) {
			expect(spell.classes?.fromClassList || []).not.toEqual(expect.arrayContaining([
				{name: "Lexarca", source: "Himo"},
				{name: "Planeswalker", source: "Himo"},
			]));
		}
	});

	it("retira las asociaciones sustituidas que no están en las listas aprobadas", () => {
		for (const name of ["Ritual Funerario de Zackie", "Muro de Frontera", "Domo Impenetrable"]) {
			const spell = spells.find(it => it.name === name && it.source === "GdR");
			expect(spell).toBeDefined();
			expect(spell.classes?.fromClassList || []).not.toEqual(expect.arrayContaining([
				{name: "Planeswalker", source: "Himo"},
				{name: "Payaso", source: "Himo"},
				{name: "Lexarca", source: "Himo"},
			]));
		}
	});

	it.each(Object.entries(CLASS_FILES))("mantiene los enlaces de %s alineados con la etiqueta del filtro", (className, file) => {
		const data = JSON.parse(fs.readFileSync(file, "utf8"));
		const links = getFilterLinks(data.class[0].classTableGroups);

		expect(links).toContain(className);
		expect(links.every(it => it === className)).toBe(true);
		expect(SourceUtil.isNonstandardSource("Himo")).toBe(false);
	});
});
