import "../../js/parser.js";

globalThis.PrereleaseUtil = {hasSourceJson: () => false, getBrewProcessedFromCache: () => []};
globalThis.BrewUtil2 = {hasSourceJson: () => false, getBrewProcessedFromCache: () => []};
globalThis.VetoolsConfig = {get: () => "classic"};

await import("../../js/utils.js");
await import("../../js/utils-ui.js");
await import("../../js/render.js");
await import("../../js/filter.js");
await import("../../js/filter-spells.js");

const getTags = ({level = 1, school, classes = []}) => PageFilterSpells.getDesangradorAccessTags({
	level,
	school,
	_fClassesAndVariantClasses: classes.map(item => ({item})),
});

describe("selector de conjuros de Desangrador", () => {
	it("asigna los perfiles de clase y escuela sin añadir asociaciones a los conjuros", () => {
		expect(getTags({school: "N"})).toEqual(["Desangrador"]);
		expect(getTags({school: "D", classes: ["Cleric"]})).toEqual(["Desangrador: Delirante"]);
		expect(getTags({school: "V", classes: ["Cleric"]})).toEqual(["Desangrador: Flagelante"]);
		expect(getTags({school: "V", classes: ["Paladin"]})).toEqual(["Desangrador: Quebrantahuesos"]);
		expect(getTags({school: "C", classes: ["Warlock"]})).toEqual(["Desangrador: Pagano"]);
		expect(getTags({school: "E", classes: ["Wizard"]})).toEqual(["Desangrador: Vampírico"]);
		expect(getTags({school: "D", classes: ["Wizard"]})).toEqual([]);
	});

	it("limita el acceso a conjuros de nivel 1 a 5", () => {
		expect(getTags({level: 0, school: "N"})).toEqual([]);
		expect(getTags({level: 6, school: "N"})).toEqual([]);
		expect(getTags({level: 5, school: "N"})).toEqual(["Desangrador"]);
	});

	it("abre con Base y limpia los perfiles al cerrar", () => {
		const pageFilter = new PageFilterSpells();
		const { _classFilter: classFilter } = pageFilter;
		const keys = PageFilterSpells._DESANGRADOR_ACCESS.map(({key}) => key);

		expect(classFilter._nests["Desangrador"].displayName).toBe("Desangrador");
		expect(classFilter._isNestItemsFirst).toBe(true);
		expect(classFilter._isNestAfterItems).toBe(true);
		expect(classFilter._state.Desangrador).toBe(0);
		classFilter._nestsHidden.Desangrador = false;
		expect(classFilter._state.Desangrador).toBe(1);
		classFilter.setValue("Desangrador: Vampírico", 1);
		classFilter._nestsHidden.Desangrador = true;
		expect(keys.map(key => classFilter._state[key])).toEqual([0, 0, 0, 0, 0, 0]);
	});

	it("filtra los perfiles virtuales sin tocar los filtros de clase ni escuela", () => {
		const pageFilter = new PageFilterSpells();
		const { _classFilter: classFilter, _classAndSubclassFilter: classAndSubclassFilter } = pageFilter;
		classFilter._nestsHidden.Desangrador = false;

		let values = classAndSubclassFilter.getValues();
		expect(classAndSubclassFilter.toDisplay(values, [["Desangrador"], [], null])).toBe(true);
		expect(classAndSubclassFilter.toDisplay(values, [["Desangrador: Delirante"], [], null])).toBe(false);

		classFilter.setValue("Desangrador: Delirante", 1);
		values = classAndSubclassFilter.getValues();
		expect(classAndSubclassFilter.toDisplay(values, [["Desangrador"], [], null])).toBe(true);
		expect(classAndSubclassFilter.toDisplay(values, [["Desangrador: Delirante"], [], null])).toBe(true);
		expect(classAndSubclassFilter.toDisplay(values, [["Desangrador: Pagano"], [], null])).toBe(false);
	});

	it("interpreta class=Desangrador como Base y muestra el desplegable", () => {
		const pageFilter = new PageFilterSpells();
		pageFilter._classFilter.setValue("Desangrador", 1);

		expect(pageFilter._classFilter._nestsHidden.Desangrador).toBe(false);
		expect(PageFilterSpells.getClassFilterDisplay("Desangrador")).toBe("Base");
	});
});
