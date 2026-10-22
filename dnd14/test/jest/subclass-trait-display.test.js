import "../../js/parser.js";
globalThis.VetoolsConfig = {get: () => "classic"};
import "../../js/utils.js";
import "../../js/render.js";

describe("Subclass trait display", () => {
	it("renders a marked trait without a second subclass heading", () => {
		const feature = {
			name: "Impacto Directo",
			_displayName: "Level 9: Impacto Directo",
			isDisplayAsSubclassTrait: true,
			entries: ["Regla de prueba."],
		};

		const rendered = Renderer.class.getDisplayNamedSubclassFeatureEntry(feature, {styleHint: "classic"});

		expect(rendered.name).toBeUndefined();
		expect(rendered._displayName).toBeUndefined();
		expect(rendered.isDisplayAsSubclassTrait).toBeUndefined();
		expect(rendered.entries).toEqual([{type: "entries", name: "Level 9: Impacto Directo", entries: ["Regla de prueba."]}]);
		expect(feature.name).toBe("Impacto Directo");
	});
});
