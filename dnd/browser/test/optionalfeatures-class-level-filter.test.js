"use strict";

const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
require("../js/utils.js");
Object.assign(global, require("../js/utils-ui.js"));
Object.assign(global, require("../js/filter.js"));
Object.assign(global, require("../js/list2.js"));
global.Renderer = {get: () => ({}), hover: {isSmallScreen: () => false}};

const listPageSource = fs.readFileSync(require.resolve("../js/listpage.js"), "utf8");
const source = fs.readFileSync(require.resolve("../js/optionalfeatures.js"), "utf8");
const OptionalFeaturesPage = vm.runInThisContext(`${listPageSource}\n${source.split("const optionalFeaturesPage =")[0]}\nOptionalFeaturesPage;`);
const optionalFeatures = require("../data/optionalfeatures.json").optionalfeature;
const page = new OptionalFeaturesPage();

const withLevel = optionalFeatures
	.map(feature => ({feature, level: (feature.prerequisite || []).find(prerequisite => prerequisite.level)}))
	.filter(it => it.level);
assert.strictEqual(withLevel.length, 161, "The catalogue still has 161 class-level optional features");

const prepared = withLevel.map(({feature, level}) => {
	const meta = page._addClassLevelFilterItem(level.level);
	return {feature, classValue: meta.subclassKey, levelValue: meta.level};
});
for (const feature of optionalFeatures.filter(it => it.potion)) {
	const meta = page._addClassLevelFilterItem({level: feature.potion.level, class: {name: "Alquimista", source: "Himo"}});
	prepared.push({feature, classValue: meta.subclassKey, levelValue: meta.level});
}

const values = () => page._classAndLevelFilter.getValues();
const isVisible = preparedFeature => page._classAndLevelFilter.toDisplay(values(), [preparedFeature.classValue, preparedFeature.levelValue]);
const selectOnly = preparedFeature => page._classFilter.setValue(preparedFeature.classValue, 1);
const setLevel = (min, max) => {
	page._levelFilter._state.curMin = min;
	page._levelFilter._state.curMax = max;
};

const baseTrick = prepared.find(it => it.feature.name === "Arena en el ojo");
const vandalTrick = prepared.find(it => it.feature.name === "Brochazo");
const circusPrank = prepared.find(it => it.feature.name === "Bruto");
const potion = prepared.find(it => it.feature.name === "Elixir curativo");
assert(baseTrick && vandalTrick && circusPrank && potion);

assert(baseTrick.classValue.endsWith("\u0000base"), "General Canalla tricks use Base");
const canallaKey = OptionalFeaturesPage._getClassLevelFilterMeta({level: 2, class: {name: "Canalla", source: "Himo"}}).classKey;
const canallaOptions = page._classFilter._items
	.filter(it => it.nest === canallaKey)
	.map(it => page._classFilter._displayFn(it.item))
	.sort();
assert.deepStrictEqual(canallaOptions, ["Canalla base", "Ludópata", "Matón", "Parkourista", "Ratero", "Rioter", "Virtuoso", "Vándalo"], "Canalla has its base options and the seven Experience subclasses");

const warlockKey = OptionalFeaturesPage._getClassKey("Warlock", "PHB");
assert(page._warlockPrerequisiteFilters.every(filter => filter._isExternallyHidden), "Warlock-only prerequisites start hidden");
page._classFilter._nestsHidden[warlockKey] = false;
assert(page._warlockPrerequisiteFilters.every(filter => !filter._isExternallyHidden), "Opening Warlock reveals its prerequisites without selecting it");
page._pactFilter.setValue("Blade", 1);
page._classFilter._nestsHidden[warlockKey] = true;
assert(page._warlockPrerequisiteFilters.every(filter => filter._isExternallyHidden), "Closing Warlock hides its prerequisites");
assert.strictEqual(page._pactFilter.getValues()["Pact Boon"].Blade, 1, "Closing Warlock preserves active prerequisite selections");
page._pactFilter.reset();

selectOnly(baseTrick);
setLevel(2, 9);
assert(isVisible(baseTrick));
assert(!isVisible(vandalTrick), "Base excludes subclass tricks");

page._classFilter.reset();
selectOnly(vandalTrick);
setLevel(3, 3);
assert(isVisible(vandalTrick));
assert(!isVisible(baseTrick), "Class/subclass and level are intersected");
setLevel(6, 11);
assert(!isVisible(vandalTrick), "A level outside the selected range is excluded");

page._classFilter.reset();
selectOnly(circusPrank);
setLevel(3, 3);
assert(isVisible(circusPrank), "A Circus prank is available at its subclass level");

page._classFilter.reset();
selectOnly(potion);
setLevel(potion.levelValue, potion.levelValue);
assert(isVisible(potion), "Alchemist potions are grouped under Base");

const oldState = {Level: {state: {"Canalla (Vándalo) Level 3": 1}}};
const restored = new OptionalFeaturesPage()._levelFilter;
restored.setStateFromLoaded(oldState);
assert.strictEqual(restored._state.curMin, 1);
assert.strictEqual(restored._state.curMax, 20, "Old discrete Level preferences are ignored safely");
assert.strictEqual(page._levelFilter._state.min, 1);
assert.strictEqual(page._levelFilter._state.max, 20, "The slider always covers the full character-level range");

const upgradedRange = new OptionalFeaturesPage()._levelFilter;
upgradedRange.setStateFromLoaded({Level: {state: {min: 1, max: 18, curMin: 1, curMax: 18}}});
assert.strictEqual(upgradedRange._state.curMax, 20, "The former full 1-18 range expands to level 20");

const nested = page._classAndLevelFilter;
nested._state.mode = "or";
nested.reset();
assert.strictEqual(nested._state.mode, "and", "The class-and-level group remains an intersection");

const prerequisiteFilter = page._filters[2];
const pactFeature = optionalFeatures.find(it => (it.prerequisite || []).some(prerequisite => prerequisite.pact === "Blade"));
page._classFilter.reset();
page._levelFilter.reset();
page._pactFilter.setValue("Blade", 1);
assert(prerequisiteFilter.toDisplay(prerequisiteFilter.getValues(), [["Blade"], [], [], [[], []], [], []]), "Pact prerequisites remain alternatives in the outer group");
assert(pactFeature);

console.log("PASS: class/subclass and level filters preserve 161 requirements, Base, subclasses, Circos, potions, AND behaviour, and legacy preferences.");
