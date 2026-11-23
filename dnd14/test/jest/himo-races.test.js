import fs from "node:fs";

const data = JSON.parse(fs.readFileSync(new URL("../../data/races.json", import.meta.url), "utf8"));

describe("Cuaderno de Himo races", () => {
	it("registers the supplied races under the Himo source", () => {
		const races = data.race.filter(it => it.source === "Himo");
		expect(races.map(it => it.name)).toEqual(expect.arrayContaining([
			"Demeris (Enano)", "Iluminado", "Dracónidos Feéricos", "Hadas", "Semi-Hada",
			"Elfo de Sangre", "Oni", "Spirit folk", "Bugfolk",
		]));
		for (const race of races) expect(race.entries.length).toBeGreaterThan(0);
	});

	it("links each Bugfolk subrace to its Himo parent", () => {
		const subraces = data.subrace.filter(it => it.source === "Himo" && it.raceName === "Bugfolk");
		expect(subraces.map(it => it.name)).toEqual(["Mantis", "Avispa", "Escarabajo", "Hormiga", "Polilla"]);
		for (const subrace of subraces) {
			expect(subrace.raceSource).toBe("Himo");
			expect(subrace.entries.length).toBeGreaterThan(0);
		}
	});
});
