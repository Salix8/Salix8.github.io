import fs from "node:fs";

const _getData = () => JSON.parse(fs.readFileSync(new URL("../../data/class/class-planeswalker.json", import.meta.url), "utf8"));

describe("Vías de Planeswalker de Himo", () => {
	it("registers the four requested paths and resolves each feature reference", () => {
		const data = _getData();
		const expectedPaths = ["Brumas", "Caos", "Elemental", "Desconocido"];

		expect(data.subclass.map(it => it.shortName)).toEqual(expect.arrayContaining(expectedPaths));
		expect(data.subclass.some(it => it.shortName === "Pecado")).toBe(false);

		for (const shortName of expectedPaths) {
			const subclass = data.subclass.find(it => it.shortName === shortName);
			expect(subclass.source).toBe("Himo");
			expect(subclass.subclassFeatures).toHaveLength(4);

			for (const ref of subclass.subclassFeatures) {
				const [name, className, classSource, subclassShortName, subclassSource, level, source] = ref.split("|");
				const feature = data.subclassFeature.find(it => (
					it.name === name
					&& it.className === className
					&& it.classSource === classSource
					&& it.subclassShortName === subclassShortName
					&& it.subclassSource === subclassSource
					&& it.level === Number(level)
					&& it.source === source
				));
				expect(feature).toBeDefined();
			}
		}
	});

	it("keeps the Mist path spell table linked", () => {
		const data = _getData();
		const feature = data.subclassFeature.find(it => it.name === "Vía de las Brumas" && it.subclassShortName === "Brumas");
		const renderedData = JSON.stringify(feature);

		for (const spell of [
			"charm person",
			"cause fear|XGE",
			"moonbeam",
			"blindness/deafness",
			"fast friends|AI",
			"fear",
			"charm monster|XGE",
			"Robar Pensamientos|CdS",
			"dominate person",
			"danse macabre|XGE",
		]) expect(renderedData).toContain(`{@spell ${spell}}`);
	});
});
