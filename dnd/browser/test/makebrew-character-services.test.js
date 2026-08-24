"use strict";

(() => {
	const services = typeof module !== "undefined" && module.exports
		? require("../js/makebrew-character-services.js")
		: globalThis;
	const {
		CharacterAbilityScoreService,
		CharacterSpeciesService,
		CharacterSelectionService,
		CharacterProficiencyService,
		CharacterStatblockService,
		CharacterTraitSummaryService,
		CharacterSpellcastingService
	} = services;
	const traitSummaryData = typeof module !== "undefined" && module.exports
		? require("../data/character-builder-trait-summaries.json")
		: {traits: []};
	const resultsElement = typeof document !== "undefined" ? document.getElementById("test-results") : null;
	let passed = 0;
	let failed = 0;

	function renderResult (name, error) {
		const message = error ? `FAIL: ${name}\n${error.message}` : `PASS: ${name}`;
		if (resultsElement) {
			const line = document.createElement("pre");
			line.className = error ? "fail" : "pass";
			line.textContent = message;
			resultsElement.appendChild(line);
		} else console.log(message);
	}

	function assertEqual (actual, expected, message = "Values differ") {
		if (actual !== expected) throw new Error(`${message}. Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`);
	}

	function assertDeepEqual (actual, expected, message = "Values differ") {
		assertEqual(JSON.stringify(actual), JSON.stringify(expected), message);
	}

	function test (name, fn) {
		try {
			fn();
			passed++;
			renderResult(name);
		} catch (error) {
			failed++;
			renderResult(name, error);
		}
	}

	const completeScores = {str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8};

	test("calculates ability-score totals and modifiers", () => {
		const summary = CharacterAbilityScoreService.getAbilitySummary({
			baseScores: completeScores,
			speciesBonuses: {str: 2},
			otherBonuses: {str: 1}
		});
		assertDeepEqual(summary.str, {base: 15, speciesBonus: 2, otherBonus: 1, total: 18, modifier: 4});
	});

	test("calculates point-buy costs using the fixed published progression", () => {
		const baseScores = {str: 15, dex: 8, con: 8, int: 8, wis: 8, cha: 8};
		assertEqual(CharacterAbilityScoreService.getPointBuySpent(baseScores), 9);
		const custom = CharacterAbilityScoreService.getPointBuySummary(
			{str: 7, dex: 8, con: 8, int: 8, wis: 8, cha: 8},
			{budget: 31, minScore: 7, maxScore: 16}
		);
		assertEqual(custom.spent, -1);
		assertEqual(custom.remaining, 32);
		assertEqual(custom.isValid, true);
		assertEqual(CharacterAbilityScoreService.getPointBuyConfig({costs: {15: 0}}).costByScore[15], 9);
	});

	test("validates standard-array score assignments", () => {
		assertEqual(CharacterAbilityScoreService.validateStandardArray(completeScores).isValid, true);
		assertEqual(CharacterAbilityScoreService.validateStandardArray({...completeScores, dex: 15}).isValid, false);
	});

	test("matches named traits to reusable collapsed summaries", () => {
		const definitions = [
			{id: "wizard-spellcasting", names: ["Spellcasting"], match: {featureType: "class", className: "Wizard"}, summary: "Wizard spells."},
			{id: "spellcasting", names: ["Spellcasting", "Innate Spellcasting"], summary: "Expand for spells."}
		];
		assertDeepEqual(
			CharacterTraitSummaryService.getPresentation(definitions, "Innate Spellcasting."),
			{id: "spellcasting", summary: "Expand for spells.", isCollapsible: true}
		);
		assertDeepEqual(
			CharacterTraitSummaryService.getPresentation(definitions, "Spellcasting", {featureType: "class", className: "Wizard"}),
			{id: "wizard-spellcasting", summary: "Wizard spells.", isCollapsible: true}
		);
		assertEqual(CharacterTraitSummaryService.getPresentation(definitions, "Darkvision"), null);
	});

	if (traitSummaryData.traits.length) test("defines a specific summary for every installed class spellcaster", () => {
		[
			["Artificer", "TCE", "Spellcasting", "artificer-spellcasting"],
			["Bard", "PHB", "Spellcasting", "bard-spellcasting"],
			["Cleric", "PHB", "Spellcasting", "cleric-spellcasting"],
			["Druid", "PHB", "Spellcasting", "druid-spellcasting"],
			["Paladin", "PHB", "Spellcasting", "paladin-spellcasting"],
			["Ranger", "PHB", "Spellcasting", "ranger-spellcasting"],
			["Ranger (Revised)", "UATheRangerRevised", "Spellcasting", "revised-ranger-spellcasting"],
			["Sorcerer", "PHB", "Spellcasting", "sorcerer-spellcasting"],
			["Spellcaster Sidekick", "UASidekicks", "Spellcasting", "spellcaster-sidekick-spellcasting"],
			["Warlock", "PHB", "Pact Magic", "warlock-pact-magic"],
			["Wizard", "PHB", "Spellcasting", "wizard-spellcasting"]
		].forEach(([className, classSource, traitName, expectedId]) => {
			const presentation = CharacterTraitSummaryService.getPresentation(traitSummaryData.traits, traitName, {featureType: "class", className, classSource});
			assertEqual(presentation.id, expectedId);
		});
	});

	test("derives spellcasting counts and slot level from class table data", () => {
		const classData = {
			classTableGroups: [
				{colLabels: ["Cantrips Known", "Spells Known"], rows: [[2, 3], [2, 4]]},
				{title: "Spell Slots per Spell Level", rows: [[2, 0, 0], [3, 2, 0]]}
			]
		};
		assertDeepEqual(CharacterSpellcastingService.getClassProgression(classData, 2), {
			cantripsKnown: 2,
			spellsKnown: 4,
			maximumSpellLevel: 2,
			isPreparedCaster: false,
			preparedSpellsFormula: null
		});
		assertEqual(CharacterSpellcastingService.formatSummaryTemplate("{{cantripsKnown}} / {{spellsKnown}}", {cantripsKnown: 2, spellsKnown: 4}), "2 / 4");
	});

	if (typeof module !== "undefined" && module.exports) test("uses the Sorcerer level-10 progression instead of level-1 values", () => {
		const sorcerer = require("../data/class/class-sorcerer.json").class.find(it => it.name === "Sorcerer");
		const progression = CharacterSpellcastingService.getClassProgression(sorcerer, 10);
		assertEqual(progression.cantripsKnown, 6);
		assertEqual(progression.spellsKnown, 11);
		assertEqual(progression.maximumSpellLevel, 5);
	});

	test("calculates total level and proficiency bonus", () => {
		const classes = [{level: 3}, {level: 2}];
		assertEqual(CharacterProficiencyService.getTotalLevel(classes), 5);
		assertEqual(CharacterProficiencyService.getProficiencyBonus(5), 3);
	});

	test("calculates RAW average hit points for a single class", () => {
		const hitPoints = CharacterStatblockService.getHitPoints({
			classes: [{level: 2, classData: {hd: {faces: 10}}}],
			constitutionScore: 14
		});
		assertEqual(hitPoints.firstLevelHitPoints, 12);
		assertEqual(hitPoints.subsequentLevelHitPoints, 8);
		assertEqual(hitPoints.average, 20);
		assertEqual(hitPoints.formula, "10 + 1d10 + 4");
	});

	test("calculates RAW average hit points across multiclass levels", () => {
		const hitPoints = CharacterStatblockService.getHitPoints({
			classes: [
				{level: 1, classData: {hd: {faces: 10}}},
				{level: 1, classData: {hd: {faces: 6}}}
			],
			constitutionScore: 12
		});
		assertEqual(hitPoints.average, 16);
		assertEqual(hitPoints.formula, "10 + 1d6 + 2");
	});

	test("creates bestiary-formatted saving throws and skills", () => {
		const abilityScores = {str: 16, dex: 14, con: 14, int: 10, wis: 10, cha: 10};
		assertDeepEqual(
			CharacterProficiencyService.getSaveMap({abilityScores, savingThrowAbilities: ["str", "con"], totalLevel: 5}),
			{str: "+6", con: "+5"}
		);
		assertDeepEqual(
			CharacterProficiencyService.getSkillMap({
				abilityScores,
				proficiencyStates: {athletics: "proficient", stealth: "expertise"},
				totalLevel: 5
			}),
			{athletics: "+6", stealth: "+8"}
		);
	});

	test("uses armor and unarmored-defense AC rules", () => {
		assertEqual(CharacterStatblockService.getArmorClass({
			abilityScores: {dex: 18},
			armor: {baseAc: 14, type: "MA"},
			shield: {ac: 2}
		}), 18);
		assertEqual(CharacterStatblockService.getArmorClass({
			abilityScores: {dex: 16, wis: 14},
			unarmoredDefense: {abilities: ["dex", "wis"], allowShield: false},
			shield: {ac: 2}
		}), 15);
		assertEqual(CharacterStatblockService.getArmorClass({
			abilityScores: {dex: 14},
			armor: {baseAc: 16, type: "HA"}
		}), 16);
	});

	test("derives choices, traits, size, and speed from a merged species", () => {
		const mergedSpecies = {
			ability: [{cha: 2, choose: {from: ["str", "dex", "con", "int", "wis"], count: 2}}],
			size: ["S", "M"],
			speed: {walk: 30, fly: true},
			entries: [{name: "Age", entries: ["Flavor"]}, {name: "Flight", entries: ["You can fly."]}],
			type: "fey"
		};
		const bonuses = CharacterSpeciesService.getAbilityBonuses(mergedSpecies, {ability: {"ability:0": ["str", "dex"]}});
		assertDeepEqual(bonuses, {str: 1, dex: 1, con: 0, int: 0, wis: 0, cha: 2});
		assertEqual(CharacterSpeciesService.getSelectedSize(mergedSpecies, {size: "M"}), "M");
		assertDeepEqual(CharacterSpeciesService.getNormalizedSpeed(mergedSpecies.speed), {walk: 30, fly: 30});
		assertEqual(CharacterSpeciesService.getCreatureType(mergedSpecies), "fey");
		assertDeepEqual(CharacterSpeciesService.getNarrativeTraits(mergedSpecies, ["age"]).map(it => it.name), ["Flight"]);
	});

	test("deduplicates active proficiency selections and preserves inactive choices", () => {
		const selections = {
			"background:skill": ["stealth", "arcana", "stealth"],
			"class:inactive:skill": ["perception"]
		};
		const resolved = CharacterSelectionService.getResolvedSelections({
			fixed: {skill: new Set(["stealth"]), language: new Set(), tool: new Set()},
			groups: [{key: "background:skill", kind: "skill", count: 2, options: ["stealth", "arcana", "perception"]}],
			choiceSelections: selections
		});
		assertDeepEqual([...resolved.selected.skill].sort(), ["arcana", "stealth"]);
		assertEqual(resolved.duplicateSelections.length, 1);
		assertDeepEqual(resolved.inactiveKeys, ["class:inactive:skill"]);
		assertDeepEqual(selections["class:inactive:skill"], ["perception"]);
	});

	test("maps challenge rating from total level with optional overrides", () => {
		assertEqual(CharacterStatblockService.getChallengeRating(7), "7");
		assertEqual(CharacterStatblockService.getChallengeRating(2, {levelToCr: {2: "1/2"}}), "1/2");
	});

	test("calculates the wizard spellbook size from class level", () => {
		assertEqual(CharacterSpellcastingService.getWizardSpellbookKnown(1), 6);
		assertEqual(CharacterSpellcastingService.getWizardSpellbookKnown(2), 8);
		assertEqual(CharacterSpellcastingService.getWizardSpellbookKnown(10), 24);
	});

	test("reads Wizard's level-10 cantrip table using the current class level", () => {
		const wizard = {
			classTableGroups: [{
				colLabels: ["{@filter Cantrips Known|spells|level=0|class=Wizard}"],
				rows: [[3], [3], [3], [4], [4], [4], [4], [4], [4], [5]]
			}]
		};
		assertEqual(CharacterSpellcastingService.getClassProgression(wizard, 10).cantripsKnown, 5);
	});

	const summary = `${passed} passed, ${failed} failed`;
	if (resultsElement) {
		const line = document.createElement("strong");
		line.textContent = summary;
		resultsElement.appendChild(line);
	} else console.log(summary);
	if (failed && typeof process !== "undefined") process.exitCode = 1;
})();
