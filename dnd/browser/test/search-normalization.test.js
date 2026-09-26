"use strict";

const assert = require("assert");
require("../js/utils.js");
const {List, ListItem} = require("../js/list2.js");
global.elasticlunr = require("../lib/elasticlunr.js");
global.Omnidexer = require("../js/omnidexer.js").Omnidexer;
const Omnisearch = require("../js/omnisearch.js");

async function main () {
	const boItems = require("../data/items.json").item.filter(it => /^Bō /.test(it.name));
	assert.deepStrictEqual(boItems.map(it => it.name), ["Bō 1,5 m", "Bō 1,8 m", "Bō 2 m"]);
	const originalBoData = JSON.stringify(boItems);
	const list = new List({fnSort: null});
	list._doRender = () => {};
	const names = ["Tétanos", "Fire Bolt", ...boItems.map(it => it.name), "Árbol", "Café", "Pingüino", "Peña", "Fireball"];
	names.forEach((name, ix) => list.addItem(new ListItem(ix, null, name, {source: "Himo"})));
	list.addItem(new ListItem(100, null, "Fire Bolt excluded", {}, {isExcluded: true}));
	list.init();
	const listNames = query => {
		list.search(query);
		return list.visibleItems.map(it => it.name);
	};
	for (const query of ["tetanos", "TÉTANOS", "Te\u0301tanos", " tetanos "]) assert.deepStrictEqual(listNames(query), ["Tétanos"]);
	for (const query of ["firebolt", "fire bolt", " FIRE   BOLT "]) assert.deepStrictEqual(listNames(query), ["Fire Bolt"]);
	for (const query of ["Bo", "Bō", "BO\u0304"]) {
		assert.deepStrictEqual(listNames(query).filter(name => name.startsWith("Bō")), boItems.map(it => it.name));
	}
	for (const item of boItems) assert.deepStrictEqual(listNames(item.name.replace("ō", "o")), [item.name]);
	for (const [query, name] of [["arbol", "Árbol"], ["cafe", "Café"], ["pinguino", "Pingüino"], ["pena", "Peña"]]) {
		assert.deepStrictEqual(listNames(query), [name]);
	}
	assert(listNames("fire").includes("Fireball"));
	assert.deepStrictEqual(listNames("bolt fire"), []);
	assert.strictEqual(listNames("  ").length, names.length);
	list.filter(it => it.name !== "Fire Bolt");
	assert.deepStrictEqual(listNames("firebolt"), []);
	list.filter(null);
	assert.deepStrictEqual(listNames("firebolt"), ["Fire Bolt"]);
	list.addItem(new ListItem(101, null, "Árbol Lunar", {}));
	list.update();
	assert.deepStrictEqual(listNames("arbollunar"), ["Árbol Lunar"]);

	// Exercise production index initialization and runtime additions with the real data and engine.
	DataUtil.loadJSON = async () => JSON.parse(JSON.stringify(require("../search/index.json")));
	BrewUtil.pGetSearchIndex = async () => [];
	await Omnisearch.pInit();
	const results = query => Omnisearch.getSearchResults(query);
	for (const query of ["tetanos", "TÉTANOS", "Te\u0301tanos"]) {
		const disease = results(query).filter(it => it.doc.n === "Tétanos" && it.doc.s === "Himo");
		assert.strictEqual(disease.length, 1);
		assert.strictEqual(disease[0].doc.u, "t%c3%a9tanos_himo");
	}
	for (const query of ["firebolt", "fire bolt", " FIRE   BOLT "]) assert(results(query).some(it => it.doc.n === "Fire Bolt"));
	for (const query of ["Bo", "Bō", "BO\u0304"]) {
		const variants = results(query).filter(it => /^Bō /.test(it.doc.n) && it.doc.s === "Himo");
		assert.strictEqual(variants.length, 3);
		assert.strictEqual(new Set(variants.map(it => it.doc.id)).size, 3);
		assert.strictEqual(new Set(variants.map(it => it.doc.u)).size, 3);
	}
	for (const item of boItems) {
		const variants = results(item.name.replace("ō", "o")).filter(it => /^Bō /.test(it.doc.n));
		assert.deepStrictEqual(variants.map(it => it.doc.n), [item.name]);
		assert.strictEqual(variants[0].doc.u, UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_ITEMS](item));
	}
	assert.deepStrictEqual(results(" "), []);
	assert.deepStrictEqual(results("bolt fire").map(it => it.doc.id), results("fire bolt").filter(it => it.score > 0).map(it => it.doc.id));
	const spells = results("in:spell firebolt");
	assert(spells.some(it => it.doc.n === "Fire Bolt"));
	assert(spells.every(it => it.doc.c === Parser.CAT_ID_SPELL));
	assert.deepStrictEqual(results("in:disease firebolt"), []);
	for (const query of ["bo", "firebolt", "fire bolt", "tetanos"]) {
		const matches = results(query);
		assert.strictEqual(new Set(matches.map(it => it.doc.id)).size, matches.length);
	}
	await Omnisearch.pAddToIndex("disease", {name: "Árbol Lunar", source: "Himo", entries: []});
	assert(results("arbollunar").some(it => it.doc.n === "Árbol Lunar"));
	assert(results("in:disease arbol lunar").some(it => it.doc.n === "Árbol Lunar"));
	assert.strictEqual(JSON.stringify(boItems), originalBoData);
	console.log("PASS: normalización de listas e índice global, categorías, altas y tres variantes de Bō");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
