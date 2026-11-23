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
import "../../js/parser.js";
import "../../js/utils.js";
import "../../js/render.js";
import "../../js/render-dice.js";
globalThis.VetoolsConfig = {get: () => "classic"};

describe("Himo race choices", () => {
	it("renders the divine options and their effects in a table", () => {
		const race = data.race.find(it => it.source === "Himo" && it.name === "Iluminado");
		const trait = race.entries.find(it => it.name === "Rasgo divino");
		const table = trait.entries.find(it => it.type === "table");
		expect(table.rows.map(row => row[0])).toEqual(["Bueno", "Neutral", "Malo"]);
		expect(race.ability[0]).toEqual({cha: 2, choose: {from: ["wis", "int", "con"], amount: 1}});
		expect(Renderer.get().render(table)).toContain("<table");
	});

	it("merges each Bugfolk subrace into the correct final ability scores", () => {
		const base = data.race.find(it => it.source === "Himo" && it.name === "Bugfolk");
		const expected = {
			Mantis: {wis: 1, cha: -1, dex: 2},
			Avispa: {wis: 1, cha: 2},
			Escarabajo: {wis: 1, cha: -1, str: 2},
			Hormiga: {wis: 1, cha: -1, str: 2},
			Polilla: {wis: 1, cha: 2},
		};
		for (const [name, scores] of Object.entries(expected)) {
			const subrace = data.subrace.find(it => it.source === "Himo" && it.raceName === "Bugfolk" && it.name === name);
			const merged = Renderer.race._getMergedSubrace(base, structuredClone(subrace));
			expect(merged.ability).toEqual([scores]);
		}
		const table = base.entries.find(it => it.name === "Subrazas").entries.find(it => it.type === "table");
		expect(table.rows.map(row => row[0])).toEqual(Object.keys(expected));
		expect(Renderer.get().render(table)).toContain("<table");
	});
});
