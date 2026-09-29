"use strict";

const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const {Omnidexer} = require("../js/omnidexer.js");
const optional = require("../data/optionalfeatures.json").optionalfeature;
const index = Omnidexer.decompressIndex(require("../search/index.json"));
global.$$ = (strings, ...values) => strings.reduce((out, str, i) => out + str + (values[i] ?? ""), "");
const RenderOptionalFeatures = vm.runInThisContext(`${fs.readFileSync(require.resolve("../js/render-optionalfeatures.js"), "utf8")}\nRenderOptionalFeatures;`);

for (const [file, type, sectionName, total, distribution, category] of [
	["class-clown", "BRM", "Bromas", 19, {2: 6, 5: 2, 11: 3}, Parser.CAT_ID_PRANK],
	["class-canalla", "JUG", "Jugarretas", 34, {2: 3, 9: 3}, Parser.CAT_ID_TRICK]
]) {
	const cls = require(`../data/class/${file}.json`).class[0];
	const features = optional.filter(it => it.featureType === type);
	assert.strictEqual(features.length, total);
	const byName = new Map(features.map(it => [it.name, it]));
	assert.strictEqual(byName.size, total);
	assert.deepStrictEqual(Object.fromEntries(Object.keys(distribution).map(level => [level, features.filter(it => !it.prerequisite[0].level.subclass && it.prerequisite[0].level.level === Number(level)).length])), distribution);
	const generalRule = cls.classFeatures[1].find(it => it.name === sectionName).entries[0];
	const seen = new Set();
	function check (entry, level, subclass) {
		const option = byName.get(entry.name);
		assert(option, `Missing option ${entry.name}`);
		assert(!seen.has(entry.name), `Repeated original ${entry.name}`);
		seen.add(entry.name);
		assert.strictEqual(option.source, "Himo");
		assert.strictEqual(option.page, "??");
		const expectedLevel = {level, class: {name: cls.name, source: "Himo", visible: true}};
		if (subclass) expectedLevel.subclass = {name: subclass.shortName, source: "Himo", visible: true};
		assert.deepStrictEqual(option.prerequisite, [{level: expectedLevel}]);
		assert.deepStrictEqual(option.entries.slice(0, entry.entries.length), entry.entries, `${entry.name}: update both rule copies`);
		const context = option.entries.slice(entry.entries.length);
		if (type === "BRM") {
			assert.deepStrictEqual(context[0], {type: "entries", name: "Uso de las bromas", entries: [generalRule]});
			assert.strictEqual(context.length, subclass ? 2 : 1);
			if (subclass) assert.strictEqual(context[1], "Esta broma está preparada y no cuenta para el máximo de bromas que puedes preparar.");
		} else assert.deepStrictEqual(context, []);
		assert.strictEqual(optional.filter(it => it.name === entry.name && it.source === "Himo").length, 1);
		const matches = index.filter(it => it.c === category && it.n === entry.name && it.s === "Himo");
		assert.strictEqual(matches.length, 1);
		assert.strictEqual(matches[0].u, UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_OPT_FEATURES](option));
		assert.strictEqual(matches[0].h, 1);
		const html = RenderOptionalFeatures.$getRenderedOptionalFeature(option);
		assert(html.includes(entry.name));
		assert(html.includes(cls.name));
		if (subclass) assert(html.includes(subclass.shortName), "The owner subclass must be visible in the prerequisite");
	}
	for (const [i, group] of cls.classFeatures.entries()) for (const section of group) if (section.name === sectionName) {
		assert(section.entries.some(it => typeof it === "string" && it.includes(`|feature type=${type}|source=Himo}`)));
		section.entries.filter(it => it && typeof it === "object" && it.name).forEach(it => check(it, i + 1));
	}
	for (const sc of cls.subclasses) {
		const levels = type === "BRM" ? [3] : [3, 6, 11, 15];
		levels.forEach((level, i) => {
			for (const feature of sc.subclassFeatures[i]) {
				const container = i === 0 ? feature.entries.find(it => it?.name?.startsWith(sectionName)) : feature;
				assert(container);
				const children = container.entries.filter(it => it && it.type === "entries" && it.name);
				assert.strictEqual(children.length, type === "BRM" ? 2 : 1);
				children.forEach(it => check(it, level, sc));
			}
		});
	}
	assert.strictEqual(seen.size, total, "Every catalogue option must have an original class description");
	assert.strictEqual(UrlUtil.CAT_TO_PAGE[category], UrlUtil.PG_OPT_FEATURES);
	const arbiter = Omnidexer.TO_INDEX.find(it => it.category === category);
	const generated = new Omnidexer();
	generated.addToIndex(arbiter, {optionalfeature: optional});
	assert.strictEqual(generated.getIndex().x.length, total);
}
console.log("PASS: 19 bromas and 34 jugarretas; complete original rules, context, prerequisites, rendering, links, and search registration.");
