import fs from "node:fs";

import "../../js/parser.js";
globalThis.FilterItem = class {};
import "../../js/utils.js";

describe("Cuaderno de Himo", () => {
	it("is registered as a core site source", () => {
		expect(Parser.sourceJsonToFull(Parser.SRC_HIMO)).toBe("Cuaderno de Himo");
		expect(Parser.sourceJsonToAbv(Parser.SRC_HIMO)).toBe("Himo");
		expect(SourceUtil.isSiteSource(Parser.SRC_HIMO)).toBe(true);
		expect(SourceUtil.isCoreOrSupplement(Parser.SRC_HIMO)).toBe(true);
	});

	it("registers every Himo class file in the classes index", () => {
		const index = JSON.parse(fs.readFileSync(new URL("../../data/class/index.json", import.meta.url), "utf8"));
		const expected = [
			"class-alchemist.json",
			"class-canalla.json",
			"class-clown.json",
			"class-desangrador.json",
			"class-lexarch.json",
			"class-martial-expert.json",
			"class-planeswalker.json",
			"class-ranger-himo.json",
		];

		expect(Object.values(index)).toEqual(expect.arrayContaining(expected));
	});

	it("registers Himo subclasses for every affected official class", () => {
		const data = JSON.parse(fs.readFileSync(new URL("../../data/class/class-himo-base-subclasses.json", import.meta.url), "utf8"));
		const expectedClassNames = [
			"Artificer",
			"Barbarian",
			"Bard",
			"Cleric",
			"Druid",
			"Fighter",
			"Monk",
			"Paladin",
			"Sorcerer",
			"Warlock",
			"Wizard",
		];

		expect(data.subclass).toHaveLength(32);
		expect([...new Set(data.subclass.map(it => it.className))].sort()).toEqual(expectedClassNames);

		for (const subclass of data.subclass) {
			expect(subclass.source).toBe(Parser.SRC_HIMO);
			expect(subclass.subclassFeatures).not.toHaveLength(0);
		}

		for (const feature of data.subclassFeature) {
			expect(feature.source).toBe(Parser.SRC_HIMO);
			expect(feature.level).toBeGreaterThan(0);
			expect(feature.className).toBeTruthy();
			expect(feature.subclassShortName).toBeTruthy();
		}
	});

	it("provides renderable level metadata for subclasses of Himo classes", () => {
		const classFiles = [
			"class-alchemist.json",
			"class-canalla.json",
			"class-clown.json",
			"class-desangrador.json",
			"class-lexarch.json",
			"class-martial-expert.json",
			"class-planeswalker.json",
		];

		for (const classFile of classFiles) {
			const data = JSON.parse(fs.readFileSync(new URL(`../../data/class/${classFile}`, import.meta.url), "utf8"));
			const [cls] = data.class;

			for (const feature of data.classFeature) {
				expect(feature.level).toBeGreaterThan(0);
				expect(feature.className).toBe(cls.name);
			}

			for (const subclass of data.subclass) {
				for (const feature of data.subclassFeature.filter(it => it.subclassShortName === subclass.shortName)) {
					expect(feature.level).toBeGreaterThan(0);
					expect(feature.className).toBe(cls.name);
					expect(feature.subclassShortName).toBe(subclass.shortName);
				}
			}
		}
	});
});
