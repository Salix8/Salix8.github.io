import fs from "node:fs";

import "../../js/parser.js";
globalThis.FilterItem = class {};
globalThis.PrereleaseUtil = {hasSourceJson: () => false, getBrewProcessedFromCache: () => []};
globalThis.BrewUtil2 = {hasSourceJson: () => false, getBrewProcessedFromCache: () => []};
globalThis.VetoolsConfig = {get: () => "classic"};
import "../../js/utils.js";
import "../../js/render.js";
globalThis.veT = (strings, ...values) => strings.reduce((out, part, i) => `${out}${part}${values[i] ?? ""}`, "");
const {RenderOptionalFeatures} = await import("../../js/render-optionalfeatures.js");
await import("../../js/utils-ui.js");
await import("../../js/filter.js");
await import("../../js/filter-optionalfeatures.js");

const DATA = JSON.parse(fs.readFileSync(new URL("../../data/optionalfeatures.json", import.meta.url), "utf8"));
const getPotion = (name) => DATA.optionalfeature.find(it => it.name === name && it.featureType.includes("POT"));
const POTIONS = DATA.optionalfeature.filter(it => it.featureType.includes("POT"));

function getPotionFilterPage ({additionalPotions = []} = {}) {
	const pageFilter = new PageFilterOptionalFeatures();
	[...POTIONS, ...additionalPotions].forEach(it => pageFilter.mutateAndAddToFilters(it, false));
	return pageFilter;
}

function getOptionalFeatureFilterPage (entities = DATA.optionalfeature) {
	const pageFilter = new PageFilterOptionalFeatures();
	entities.forEach(it => pageFilter.mutateAndAddToFilters(it, false));
	return pageFilter;
}

function getPotionFilterMatches (pageFilter, entities = POTIONS) {
	const values = pageFilter._classAndLevelFilter.getValues();
	return entities.filter(it => pageFilter._classAndLevelFilter.toDisplay(
		values,
		[it._fPrereqClass.concat(it._fPotionClass), it._fPrereqLevel.length ? it._fPrereqLevel : null, it._fPotionLevel, it._fPotionIngredients],
	));
}

function getPrerequisiteFilterMatches (pageFilter, entities) {
	const values = pageFilter._prerequisiteFilter.getValues();
	return entities.filter(it => pageFilter._prerequisiteFilter.toDisplay(
		values,
		[
			[it._fPrereqClass.concat(it._fPotionClass), it._fPrereqLevel.length ? it._fPrereqLevel : null, it._fPotionLevel, it._fPotionIngredients],
			it._fPrereqPact,
			it._fPrereqPatron,
			it._fPrereqSpell,
			it._fPrereqFeature,
		],
	));
}

function getFilterBoxMatches (pageFilter, entities) {
	pageFilter._filterBox = new FilterBox({
		filters: [pageFilter._sourceFilter, pageFilter._typeFilter, pageFilter._prerequisiteFilter, pageFilter._miscFilter],
		namespaceSnapshots: "OptionalFeaturePotionTests",
	});
	const values = pageFilter._filterBox.getValues();
	return entities.filter(it => pageFilter.toDisplay(values, it));
}

describe("Pociones del Alquimista", () => {
	it("shows ingredients in list requirements and five ordered detail lines", () => {
		const explosivePotion = getPotion("Poción Explosiva");
		const meta = Renderer.optionalfeature.getPotionMeta(explosivePotion);

		expect(meta).toEqual(expect.objectContaining({level: 1, ingredients: "Mineral y Animal", range: "4 casillas", use: "Acción", duration: "Instantáneo"}));
		expect(Renderer.optionalfeature.getListPrerequisiteHtml(explosivePotion)).toBe("<b>Ingredientes:</b> Mineral y Animal");
		expect(Renderer.optionalfeature.getPotionDetailEntries(explosivePotion)).toEqual([
			["Nivel", 1],
			["Casting Time", "Acción"],
			["Range", "4 casillas"],
			["Ingredientes", "Mineral y Animal"],
			["Duration", "Instantáneo"],
		]);
		expect(Renderer.optionalfeature.getListPrerequisiteLevelText(explosivePotion)).toBe(1);

		const rendered = RenderOptionalFeatures.getRenderedOptionalFeature(explosivePotion);
		expect(rendered).toContain("<b>Ingredientes:</b> Mineral y Animal");
		expect(rendered).toContain("<b>Nivel:</b> 1");
		expect(rendered).toContain("<b>Casting Time:</b> Acción");
		expect(rendered).toContain("<b>Range:</b> 4 casillas");
		expect(rendered).toContain("<b>Duration:</b> Instantáneo");
	});

	it("keeps higher-level potion metadata available", () => {
		const alchemicalOil = getPotion("Aceite Alquímico");

		expect(Renderer.optionalfeature.getListPrerequisiteLevelText(alchemicalOil)).toBe(5);
		expect(Renderer.optionalfeature.getPotionDetailsHtml(alchemicalOil)).toContain("Duration:</b> Instantáneo");
	});

	it("renders the same metadata for a homebrew potion", () => {
		const homebrewPotion = {
			name: "Poción de prueba",
			potion: {
				level: 20,
				ingredients: "Ingrediente de prueba",
				range: "Personal",
				use: "Acción",
				duration: "1 minuto",
			},
		};

		expect(Renderer.optionalfeature.getListPrerequisiteHtml(homebrewPotion)).toContain("Ingredientes:</b> Ingrediente de prueba");
		expect(Renderer.optionalfeature.getPotionDetailsHtml(homebrewPotion)).toContain("Range:</b> Personal");
		expect(Renderer.optionalfeature.getListPrerequisiteLevelText(homebrewPotion)).toBe(20);
	});

	it("uses the Alquimista header as the hidden potion selection", () => {
		const pageFilter = getPotionFilterPage();
		const {classKey, selectionKey} = PageFilterOptionalFeatures._getPotionClassFilterMeta();

		const selectionItem = pageFilter._classFilter._items.find(it => it.item === selectionKey);
		expect(selectionItem?.isHidden).toBe(true);
		expect(pageFilter._ingredientFilter._isExternallyHidden).toBe(true);
		expect(pageFilter._potionLevelFilter._isExternallyHidden).toBe(true);

		// The first update initializes persisted UI state, so it must not select
		// potions. Reopening the section is the user's explicit selection.
		pageFilter._classFilter._nestsHidden[classKey] = true;
		pageFilter._classFilter._nestsHidden[classKey] = false;
		expect(pageFilter._classFilter._state[selectionKey]).toBe(1);
		expect(pageFilter._ingredientFilter._isExternallyHidden).toBe(false);
		expect(pageFilter._potionLevelFilter._isExternallyHidden).toBe(false);
		expect(pageFilter._potionLevelFilter._items.map(it => it.item)).toEqual([1, 5, 10, 15]);
		expect(pageFilter._potionLevelFilter._items.map(it => pageFilter._potionLevelFilter._getDisplayText(it))).toEqual(["1", "5", "10", "15"]);
		expect(pageFilter._potionLevelFilter._items.map(it => pageFilter._potionLevelFilter._getDisplayText(it).toLowerCase())).toEqual(["1", "5", "10", "15"]);

		pageFilter._ingredientFilter.setValue("Mineral", 1);
		pageFilter._potionLevelFilter.setValue(1, 1);
		pageFilter._classFilter._nestsHidden[classKey] = true;

		expect(pageFilter._classFilter._state[selectionKey]).toBe(0);
		expect(pageFilter._ingredientFilter._state.Mineral).toBe(0);
		expect(pageFilter._potionLevelFilter._state[1]).toBe(0);
		expect(pageFilter._levelFilter._isExternallyHidden).toBe(false);
	});

	it("does not restore saved potion selections from an open Alquimista section", () => {
		const pageFilter = getOptionalFeatureFilterPage();
		const {classKey, selectionKey} = PageFilterOptionalFeatures._getPotionClassFilterMeta();

		pageFilter._classFilter.setValue(selectionKey, 1);
		pageFilter._ingredientFilter.setValue("Mineral", 1);
		pageFilter._potionLevelFilter.setValue(1, 1);
		pageFilter._classFilter._nestsHidden[classKey] = false;

		expect(pageFilter._classFilter._state[selectionKey]).toBe(0);
		expect(pageFilter._ingredientFilter._state.Mineral).toBe(0);
		expect(pageFilter._potionLevelFilter._state[1]).toBe(0);
		expect(getPrerequisiteFilterMatches(pageFilter, DATA.optionalfeature)).toHaveLength(DATA.optionalfeature.length);

		pageFilter._typeFilter.setValue("EI", 1);
		const invocations = getFilterBoxMatches(pageFilter, DATA.optionalfeature);
		expect(invocations.map(it => it.name)).toContain("Agonizing Blast");
		expect(invocations.every(it => it.featureType.includes("EI"))).toBe(true);
	});

	it("intersects potion class, ingredients, and potion level", () => {
		const pageFilter = getPotionFilterPage();
		const {classKey} = PageFilterOptionalFeatures._getPotionClassFilterMeta();
		pageFilter._classFilter._nestsHidden[classKey] = true;
		pageFilter._classFilter._nestsHidden[classKey] = false;

		pageFilter._ingredientFilter.setValue("Mineral", 1);
		pageFilter._potionLevelFilter.setValue(1, 1);
		expect(getPotionFilterMatches(pageFilter)).toHaveLength(8);
		expect(getPotionFilterMatches(pageFilter).map(it => it.name)).toContain("Poción Explosiva");

		pageFilter._ingredientFilter.setValue("Mineral", 0);
		pageFilter._ingredientFilter.setValue("Vegetal", 1);
		pageFilter._potionLevelFilter.setValue(1, 0);
		pageFilter._potionLevelFilter.setValue(5, 1);
		expect(getPotionFilterMatches(pageFilter)).toHaveLength(11);

		pageFilter._ingredientFilter.setValue("Vegetal", 0);
		pageFilter._ingredientFilter.setValue("Otros", 1);
		pageFilter._potionLevelFilter.setValue(5, 0);
		pageFilter._potionLevelFilter.setValue(15, 1);
		expect(getPotionFilterMatches(pageFilter)).toHaveLength(8);
	});

	it("filters potions and Warlock prerequisites through the full prerequisite group", () => {
		const pageFilter = getOptionalFeatureFilterPage();
		const {classKey} = PageFilterOptionalFeatures._getPotionClassFilterMeta();

		expect(getPrerequisiteFilterMatches(pageFilter, DATA.optionalfeature)).toHaveLength(DATA.optionalfeature.length);

		pageFilter._classFilter._nestsHidden[classKey] = true;
		pageFilter._classFilter._nestsHidden[classKey] = false;
		expect(getPrerequisiteFilterMatches(pageFilter, DATA.optionalfeature)).toHaveLength(POTIONS.length);
		pageFilter._ingredientFilter.setValue("Mineral", 1);
		pageFilter._potionLevelFilter.setValue(1, 1);

		const mineralLevelOne = getPrerequisiteFilterMatches(pageFilter, DATA.optionalfeature);
		expect(mineralLevelOne).toHaveLength(8);
		expect(mineralLevelOne.map(it => it.name)).toContain("Poción Explosiva");
		expect(mineralLevelOne.every(it => it.potion?.level === 1 && it.potion.ingredientTypes.includes("Mineral"))).toBe(true);

		pageFilter._ingredientFilter.setValue("Mineral", 0);
		pageFilter._ingredientFilter.setValue("Vegetal", 1);
		pageFilter._potionLevelFilter.setValue(1, 0);
		pageFilter._potionLevelFilter.setValue(5, 1);
		const vegetalLevelFive = getPrerequisiteFilterMatches(pageFilter, DATA.optionalfeature);
		expect(vegetalLevelFive).toHaveLength(11);
		expect(vegetalLevelFive.every(it => it.potion?.level === 5 && it.potion.ingredientTypes.includes("Vegetal"))).toBe(true);

		pageFilter._ingredientFilter.setValue("Vegetal", 0);
		pageFilter._ingredientFilter.setValue("Mineral", 1);
		pageFilter._potionLevelFilter.setValue(5, 0);
		pageFilter._potionLevelFilter.setValue(1, 1);
		pageFilter._spellFilter.setValue("eldritch blast", 1);
		const potionOrWarlock = getPrerequisiteFilterMatches(pageFilter, DATA.optionalfeature);
		expect(potionOrWarlock.map(it => it.name)).toEqual(expect.arrayContaining(["Poción Explosiva", "Agonizing Blast"]));
	});

	it("keeps potion controls independent from the general class level", () => {
		const pageFilter = getOptionalFeatureFilterPage();
		const {classKey} = PageFilterOptionalFeatures._getPotionClassFilterMeta();
		const clownBaseKey = `${PageFilterOptionalFeatures._getClassKey("Payaso", "Himo")}\u0000base`;

		pageFilter._classFilter._nestsHidden[classKey] = true;
		pageFilter._classFilter._nestsHidden[classKey] = false;
		pageFilter._classFilter.setValue(clownBaseKey, 1);
		pageFilter._levelFilter._state.curMin = 2;
		pageFilter._levelFilter._state.curMax = 2;
		pageFilter._ingredientFilter.setValue("Mineral", 1);
		pageFilter._potionLevelFilter.setValue(1, 1);

		expect(pageFilter._levelFilter._isExternallyHidden).toBe(false);
		expect(getPrerequisiteFilterMatches(pageFilter, DATA.optionalfeature).map(it => it.name)).toEqual(expect.arrayContaining(["Poción Explosiva", "Chorro de Agua"]));
	});

	it("uses Alquimista and Warlock as section headers without Base tags", () => {
		const pageFilter = getOptionalFeatureFilterPage();
		const alchemist = PageFilterOptionalFeatures._getPotionClassFilterMeta();
		const warlockKey = PageFilterOptionalFeatures._getClassKey("Warlock", "PHB");
		const itemKeys = pageFilter._classFilter._items.map(it => it.item);

		expect(itemKeys).toContain(alchemist.selectionKey);
		expect(itemKeys).not.toContain(`${alchemist.classKey}\u0000base`);
		expect(itemKeys).not.toContain(`${warlockKey}\u0000base`);
		const alchemistSelection = pageFilter._classFilter._items.find(it => it.item === alchemist.selectionKey);
		expect(alchemistSelection?.isHidden).toBe(true);
		expect(pageFilter._classFilter._getDisplayText(alchemistSelection)).toBe("Alquimista");
		expect(pageFilter._classFilter._getDisplayText(alchemistSelection).toLowerCase()).toBe("alquimista");

		pageFilter._classFilter._nestsHidden[warlockKey] = false;
		expect(pageFilter._pactFilter._isExternallyHidden).toBe(false);
		expect(pageFilter._classFilter._state[`${warlockKey}\u0000base`]).toBeUndefined();
		expect(pageFilter._typeFilter._state.EI).toBe(0);
	});

	it("keeps fighting styles and Eldritch Invocations usable", () => {
		const pageFilter = getOptionalFeatureFilterPage();

		pageFilter._typeFilter.setValue("EI", 1);
		const invocations = getFilterBoxMatches(pageFilter, DATA.optionalfeature);
		expect(invocations.length).toBeGreaterThan(0);
		expect(invocations.every(it => it.featureType.includes("EI"))).toBe(true);

		pageFilter._typeFilter.setValue("EI", 0);
		pageFilter._typeFilter.setValue("FS:F", 1);
		const fightingStyles = getFilterBoxMatches(pageFilter, DATA.optionalfeature);
		expect(fightingStyles.length).toBeGreaterThan(0);
		expect(fightingStyles.every(it => it.featureType.includes("FS:F"))).toBe(true);
	});


	it("groups Words, Bromas, and Jugarretas by their feature type", () => {
		const expectedGroups = [
			["PW", "Words", 28, "Condición"],
			["BRM", "Bromas", 19, "Chorro de Agua"],
			["JUG", "Jugarretas", 34, "Arena en el ojo"],
		];

		expect(DATA.optionalfeature.some(it => it.featureType?.includes("OTH"))).toBe(false);

		for (const [featureType, displayName, count, exampleName] of expectedGroups) {
			const pageFilter = getOptionalFeatureFilterPage();
			pageFilter._typeFilter.setValue(featureType, 1);
			const matches = getFilterBoxMatches(pageFilter, DATA.optionalfeature);

			expect(matches).toHaveLength(count);
			expect(matches.every(it => it.featureType.includes(featureType))).toBe(true);
			expect(matches.map(it => it.name)).toContain(exampleName);
			const typeItem = pageFilter._typeFilter._items.find(it => it.item === featureType);
			expect(pageFilter._typeFilter._getDisplayText(typeItem)).toBe(displayName);
		}
	});

	it("keeps Lexarca identity for power word levels and subclasses without rendering it as a prerequisite", () => {
		const powerWords = DATA.optionalfeature.filter(it => it.source === "Himo" && it.featureType?.includes("PW"));

		expect(powerWords).toHaveLength(28);
		powerWords.forEach(powerWord => {
			const prerequisite = powerWord.prerequisite.find(it => it.level?.class?.name === "Lexarca");
			expect(prerequisite.level.class).toEqual({name: "Lexarca", source: "Himo"});
			expect(Renderer.optionalfeature.getPrerequisiteHtml(powerWord)).not.toContain("Lexarca");
		});
	});

	it("filters the exact fighting-style lists for Canalla and Experto Marcial", () => {
		const pageFilter = getOptionalFeatureFilterPage();

		pageFilter._typeFilter.setValue("FS:C", 1);
		expect(getFilterBoxMatches(pageFilter, DATA.optionalfeature).map(it => it.name).sort()).toEqual([
			"Defense", "Dueling", "Lucha Hiriente", "Thrown Weapon Fighting", "Two-Weapon Fighting", "Unarmed Fighting",
		]);

		pageFilter._typeFilter.setValue("FS:C", 0);
		pageFilter._typeFilter.setValue("FS:EM", 1);
		expect(getFilterBoxMatches(pageFilter, DATA.optionalfeature).map(it => it.name).sort()).toEqual([
			"Defense", "Dueling", "Great Weapon Fighting", "Interception", "Protection", "Shield Fighting", "Superior Technique", "Thrown Weapon Fighting", "Two-Weapon Fighting", "Unarmed Fighting",
		]);
	});

	it("shows maneuvers as the single Battle Master feature-type tag", () => {
		const pageFilter = getOptionalFeatureFilterPage();
		pageFilter._typeFilter.setValue("MV:B", 1);

		const maneuvers = getFilterBoxMatches(pageFilter, DATA.optionalfeature);
		expect(maneuvers).toHaveLength(27);
		expect(maneuvers.every(it => it.featureType.includes("MV:B"))).toBe(true);
		expect(maneuvers.map(it => it.name)).toEqual(expect.arrayContaining(["Anchor Howl", "Block", "Deflect", "Partner's Shield"]));
		const maneuverItem = pageFilter._typeFilter._items.find(it => it.item === "MV:B");
		expect(pageFilter._typeFilter._getDisplayText(maneuverItem)).toBe("Battle Master");
	});

	it("sorts feature-type tags without a bound class context", () => {
		const sort = PageFilterOptionalFeatures._filterFeatureTypeSort;
		expect(Number.isFinite(sort({item: "MV:B"}, {item: "EI"}))).toBe(true);
	});

	it("applies every visible feature-type pill through the same FilterBox route as the page", () => {
		const pageFilter = getOptionalFeatureFilterPage();
		pageFilter._filterBox = new FilterBox({
			filters: [pageFilter._sourceFilter, pageFilter._typeFilter, pageFilter._prerequisiteFilter, pageFilter._miscFilter],
			namespaceSnapshots: "OptionalFeaturePotionTests",
		});
		// Test the type filter in isolation. Source defaults intentionally hide
		// some UA-only types, which is a separate source-filter concern.
		Object.keys(pageFilter._sourceFilter._state).forEach(source => pageFilter._sourceFilter.setValue(source, 0));

		for (const {item: featureType} of pageFilter._typeFilter._items) {
			pageFilter._typeFilter.setValue(featureType, 1);
			const values = pageFilter._filterBox.getValues();
			const matches = DATA.optionalfeature.filter(it => pageFilter.toDisplay(values, it));

			expect(matches.length).toBeGreaterThan(0);
			expect(matches.every(it => it.featureType.includes(featureType))).toBe(true);
			pageFilter._typeFilter.setValue(featureType, 0);
		}
	});
});
