import "../../js/parser.js";

globalThis.PrereleaseUtil = {hasSourceJson: () => false, getBrewProcessedFromCache: () => []};
globalThis.BrewUtil2 = {hasSourceJson: () => false, getBrewProcessedFromCache: () => []};
globalThis.VetoolsConfig = {get: () => "classic"};

await import("../../js/utils.js");
await import("../../js/utils-ui.js");
await import("../../js/render.js");
await import("../../js/filter.js");

describe("MultiFilter", () => {
	it("evaluates active nested groups recursively", () => {
		const classFilter = new Filter({header: "Class", items: ["Potion"]});
		const ingredientFilter = new Filter({header: "Ingredient", items: ["Mineral"]});
		const spellFilter = new Filter({header: "Spell", items: ["eldritch blast"]});
		const classAndIngredient = new MultiFilter({
			header: "Class and Ingredient",
			filters: [classFilter, ingredientFilter],
			mode: "and",
		});
		const prerequisite = new MultiFilter({
			header: "Prerequisite",
			filters: [classAndIngredient, spellFilter],
			mode: "or",
		});

		classFilter.setValue("Potion", 1);
		ingredientFilter.setValue("Mineral", 1);
		let values = prerequisite.getValues();

		expect(prerequisite.toDisplay(values, [["Potion", "Mineral"], "hex"])).toBe(true);
		expect(prerequisite.toDisplay(values, [["Potion", "Vegetal"], "hex"])).toBe(false);

		spellFilter.setValue("eldritch blast", 1);
		values = prerequisite.getValues();
		expect(prerequisite.toDisplay(values, [["Potion", "Vegetal"], "eldritch blast"])).toBe(true);
	});
});
