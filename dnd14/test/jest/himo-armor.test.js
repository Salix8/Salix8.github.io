import fs from "node:fs";

import "../../js/parser.js";
globalThis.VetoolsConfig = {get: () => "classic"};
import "../../js/utils.js";
import "../../js/render.js";
await import("../../js/utils-ui.js");
await import("../../js/filter-common.js");
await import("../../js/filter.js");
await import("../../js/filter-items.js");

const ITEMS = JSON.parse(fs.readFileSync(new URL("../../data/items.json", import.meta.url), "utf8")).item;
const getItem = name => ITEMS.find(item => item.name === name && item.source === "Himo");

describe("Himo armor", () => {
	it("uses Constitution for Grick and Barlgura armor AC", () => {
		for (const name of ["Armadura de Grick", "Armadura de Barlgura"]) {
			const item = getItem(name);
			expect(item.acAbility).toBe("Con");
			expect(Renderer.item.getRenderedDamageAndProperties(item)[0]).toContain("AC 12 + Con (max 2)");
		}
	});

	it("indexes every Himo armor and shield as affecting Armor Class", () => {
		const himoArmor = ITEMS.filter(item => item.source === "Himo" && ["LA", "MA", "HA", "S"].includes(item.type));
		expect(himoArmor).toHaveLength(15);

		for (const item of himoArmor) {
			const mutableItem = structuredClone(item);
			PageFilterItems.mutateForFilters(mutableItem);
			expect(mutableItem._fBonus).toContain("Armor Class");
		}
	});
});
