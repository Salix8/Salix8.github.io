import fs from "node:fs";

const SEARCH_DIR = new URL("../../search/", import.meta.url);

const getIndexFiles = () => fs.readdirSync(SEARCH_DIR)
	.filter(fileName => /^index(?:-[^.]+)?\.json$/.test(fileName))
	.sort();

describe("formato de los índices de búsqueda", () => {
	it("guarda todos los índices como JSON legible y estable", () => {
		const indexFiles = getIndexFiles();

		expect(indexFiles).toEqual([
			"index-alt-spell.json",
			"index-foundry.json",
			"index-item.json",
			"index-partnered.json",
			"index.json",
		]);

		indexFiles.forEach(fileName => {
			const raw = fs.readFileSync(new URL(fileName, SEARCH_DIR), "utf8");
			const index = JSON.parse(raw);

			expect(raw).toBe(`${JSON.stringify(index, null, "\t")}\n`);
		});
	});
});
