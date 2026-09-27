"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
require("../js/omnidexer.js");
Object.assign(global, require("../js/utils-ui.js"));
const PageFilterSpells = require("../js/filter-spells.js");
const fixture = require("./fixtures/spell-association-source.json");
const root = path.join(__dirname, "..");
let spells;
const clone = value => JSON.parse(JSON.stringify(value));
const key = it => `${it.name}|${it.source}`;
const keys = items => items.map(key).sort();
const getSpell = (name, source) => spells.find(s => s.name === name && s.source === source);
const assertUnique = (items, getKey = key) => assert.strictEqual(new Set(items.map(getKey)).size, items.length);

async function main () {
	DataUtil.loadJSON = async url => JSON.parse(fs.readFileSync(path.join(root, url), "utf8"));
	spells = await DataUtil.spell.pLoadAll();
	assert(spells.length > 0);
	assert.strictEqual(fixture.spells.length, 42);
	const normalizedRaces = {
		"Half-Elf (Variant; Moon Elf or Sun Elf Descent)": "Half-Elf (Moon Elf or Sun Elf Descent)",
		"Merfolk (Ixalan; Blue)": "Merfolk (Ixalan) (Blue)",
		"Merfolk (Zendikar; Ula Creed)": "Merfolk (Zendikar) (Ula Creed)"
	};
	for (const {name, source, associations} of fixture.spells) {
		const spell = getSpell(name, source);
		const expected = new Set();
		for (const field of ["class", "classVariant"]) {
			for (const [classSource, classes] of Object.entries(associations[field] || {})) {
				Object.keys(classes).forEach(className => expected.add(`${className}|${classSource}`));
			}
		}
		for (const cls of expected) assert(keys(spell.classes.fromClassList).includes(cls), `${name}: ${cls}`);
		for (const [classSource, classes] of Object.entries(associations.subclass || {})) {
			for (const [className, sources] of Object.entries(classes)) {
				for (const [subclassSource, subclasses] of Object.entries(sources)) {
					for (const subclassName of Object.keys(subclasses)) assert(spell.classes.fromSubclass.some(it =>
						key(it.class) === `${className}|${classSource}` && key(it.subclass) === `${subclassName}|${subclassSource}`), name);
				}
			}
		}
		for (const [field, localField] of [["race", "races"], ["background", "backgrounds"]]) {
			for (const [entitySource, entities] of Object.entries(associations[field] || {})) {
				for (const entityName of Object.keys(entities)) assert(spell[localField].some(it =>
					key(it) === `${field === "race" ? normalizedRaces[entityName] || entityName : entityName}|${entitySource}`), name);
			}
		}
	}
	assert.deepStrictEqual(keys(getSpell("Encode Thoughts", "GGR").classes.fromClassList), ["Artificer|TCE", "Bard|PHB", "Planeswalker|Himo", "Warlock|PHB", "Wizard|PHB"]);
	assert.deepStrictEqual(getSpell("Encode Thoughts", "GGR").backgrounds, [{name: "Dimir Operative", source: "GGR"}]);
	assert.deepStrictEqual(keys(getSpell("Lacrim Vita", "GdR").classes.fromClassList), ["Desangrador|Himo", "Planeswalker|Himo", "Wizard|PHB"]);
	for (const name of ["Muro de Frontera", "Domo Impenetrable"]) {
		assert.strictEqual(getSpell(name, "GdR").level, 10);
		assert.deepStrictEqual(keys(getSpell(name, "GdR").classes.fromClassList), ["Bard|PHB", "Cleric|PHB", "Lexarca|Himo", "Planeswalker|Himo", "Wizard|PHB"]);
	}

	DataUtil.loadJSON = async url => JSON.parse(fs.readFileSync(path.join(root, url), "utf8"));
	const classData = await DataUtil.class.loadJSON();
	const casters = classData.class.filter(c => c.casterProgression || c.spellcastingAbility || c.classSpells);
	assert.strictEqual(casters.length, 17);
	assert.deepStrictEqual(keys(getSpell("Ritual Funerario de Zackie", "GdR").classes.fromClassList), keys(casters.filter(c => c.source !== "UAArtificerRevisited")));
	const pageFilter = Object.create(PageFilterSpells.prototype);
	const localClasses = new Set(keys(classData.class));
	const localRaces = new Set(keys(Renderer.race.mergeSubraces(clone(require("../data/races.json").race))));
	const localBackgrounds = new Set(keys(require("../data/backgrounds.json").background));
	const repairedKeys = new Set([...fixture.spells.map(key), ...spells.filter(s => ["GdR", "GGR"].includes(s.source) && ["Encode Thoughts", "Lacrim Vita", "Ritual Funerario de Zackie", "Muro de Frontera", "Domo Impenetrable"].includes(s.name)).map(key)]);
	let derivedCount = 0;
	for (const original of spells) {
		assert(original.classes.fromClassList.length, key(original));
		const spell = clone(original);
		pageFilter.mutateForFilters(spell);
		assert(spell._fClasses.length, key(spell));
		for (const field of ["classes", "races", "backgrounds"]) assert.deepStrictEqual(spell[field], original[field], `${key(spell)}: ${field}`);
		assertUnique(spell.classes.fromClassList);
		assertUnique(spell.classes.fromSubclass || [], it => `${key(it.class)}|${key(it.subclass)}|${it.subclass.subSubclass || ""}`);
		assertUnique(spell.races || []);
		assertUnique(spell.backgrounds || []);
		
		derivedCount += spell.classes.fromClassList.length - original.classes.fromClassList.length;
		const initialized = JSON.stringify(spell);
		Renderer.spell.initClasses(spell);
		assert.strictEqual(JSON.stringify(spell), initialized, "Repeated initialization must be idempotent");
		if (!repairedKeys.has(key(spell))) continue;
		for (const cls of original.classes.fromClassList) {
			const filterName = PageFilterSpells.getClassFilterItem(cls).item;
			assert(spell._fClasses.some(it => it.item === filterName), `${key(spell)} missing from class filter ${filterName}`);
		}
		spell.classes.fromClassList.forEach(c => assert(localClasses.has(key(c)), key(c)));
		for (const race of spell.races || []) {
			if (race.isUnavailable) assert.strictEqual(key(race), "Kobold|MPMM");
			else assert(localRaces.has(key(race)), key(race));
		}
		(spell.backgrounds || []).forEach(bg => assert(localBackgrounds.has(key(bg)), key(bg)));
		if (original.name === "Lacrim Vita") assert(spell.classes.fromClassList.some(c => c.name === "Desangrador"));
	}
	assert.strictEqual(derivedCount, 0, "Published spell associations must be explicit");

	// Render the actual sheet without a browser, retaining the generated HTML for link assertions.
	global.$ = html => html;
	const RenderSpells = vm.runInThisContext(`${fs.readFileSync(path.join(root, "js/render-spells.js"), "utf8")}\nRenderSpells;`);
	const subclassLookup = clone(require("../data/generated/gendata-subclass-lookup.json"));
	RenderSpells.mergeHomebrewSubclassLookup(subclassLookup, classData);
	for (const [name, source] of [["Antagonize", "BMT"], ["Tasha's Caustic Brew", "TCE"], ["Encode Thoughts", "GGR"], ["Mind Sliver", "TCE"]]) {
		const spell = clone(getSpell(name, source));
		pageFilter.mutateForFilters(spell);
		const html = RenderSpells.$getRenderedSpell(spell, subclassLookup);
		assert(html.includes("Classes: "));
		assert(html.includes("Wizard"));
		if (name === "Encode Thoughts") assert(html.includes("Dimir Operative"));
		if (name === "Mind Sliver") {
			assert(html.includes("Kobold"));
			assert(html.includes("kobold_mpmm"), "Imported Kobold must link to its full sheet");
			assert(html.includes("Aberrant Mind"));
		}
	}
	console.log(`PASS: ${spells.length} conjuros con clases, 42 contrastados con 5etools, 5 asignaciones propias; ${derivedCount} asociaciones de clase añadidas en ejecución`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
