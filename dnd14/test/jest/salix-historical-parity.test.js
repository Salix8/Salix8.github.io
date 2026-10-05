import fs from "node:fs";

import "../../js/parser.js";
globalThis.FilterItem = class {};
import "../../js/utils.js";

const readJson = relativePath => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), "utf8"));

const manifest = readJson("../fixtures/salix-historical-manifest.json");
const dataFiles = {
	background: "../../data/backgrounds.json",
	condition: "../../data/conditionsdiseases.json",
	disease: "../../data/conditionsdiseases.json",
	feat: "../../data/feats.json",
	baseitem: "../../data/items-base.json",
	item: "../../data/items.json",
	optionalfeature: "../../data/optionalfeatures.json",
	table: "../../data/tables.json",
};

describe("Salix historical content parity", () => {
	it("keeps every inventoried Himo entity in canonical data files", () => {
		for (const [prop, expectedEntities] of Object.entries(manifest.entities)) {
			const data = readJson(dataFiles[prop]);
			const keys = new Set((data[prop] || []).map(it => `${it.name}|${it.source}`));

			for (const entity of expectedEntities) {
				expect(keys).toContain(`${entity.name}|${entity.source}`);
			}
		}
	});

	it("exposes the custom spell and bestiary sources with stable metadata", () => {
		const sources = [
			[Parser.SRC_GDR, "Grimorio de Ruvyn"],
			[Parser.SRC_GPNM, "Guía de Peter a la No tan Magia"],
			[Parser.SRC_GMAM, "Guía de Molly a las Artes de Maztica"],
			[Parser.SRC_CDS, "Compendio de los Sueños"],
			[Parser.SRC_DDV, "Diablonomicon de Valafar"],
		];

		for (const [source, fullName] of sources) {
			expect(SourceUtil.isSiteSource(source)).toBe(true);
			expect(Parser.sourceJsonToFull(source)).toBe(fullName);
			expect(Parser.sourceJsonToAbv(source)).toBe(source);
		}
	});

	it("uses DdV as the canonical identifier while retaining its historical alias", () => {
		const ddv = readJson("../../data/spells/spells-ddv.json");
		expect(ddv.spell).not.toHaveLength(0);
		expect(ddv.spell.every(it => it.source === Parser.SRC_DDV)).toBe(true);
		expect(Parser.sourceJsonToFull("DiablonomicndeValafar")).toBe(Parser.sourceJsonToFull(Parser.SRC_DDV));
	});

	it("includes the recovered GMAM fluff in the standard bestiary index", () => {
		const fluffIndex = readJson("../../data/bestiary/fluff-index.json");
		const fluff = readJson("../../data/bestiary/fluff-bestiary-gmam.json");

		expect(fluffIndex.GMAM).toBe("fluff-bestiary-gmam.json");
		expect(fluff.monsterFluff).toHaveLength(26);
	});
});
