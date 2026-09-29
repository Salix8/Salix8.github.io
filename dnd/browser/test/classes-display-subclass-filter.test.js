"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

class BaseComponent {
	_getProxy (prop, value) { return value; }
}

class Filter {
	constructor (opts) { Object.assign(this, opts); }
}

const context = {
	BaseComponent,
	Filter,
	SourceFilter: {getInstance: opts => new Filter(opts)},
	MiscUtil: {getWalker: () => ({walk: () => {}})},
	window: {addEventListener: () => {}},
};
context.globalThis = context;

const source = fs.readFileSync(path.join(__dirname, "..", "js", "classes.js"), "utf8");
vm.runInNewContext(`${source}\nglobalThis.ClassesPageForTest = ClassesPage;`, context, {filename: "classes.js"});

const page = new context.ClassesPageForTest();
page._filterBox = {
	toDisplay: (filterValues, sources) => {
		const sourceValues = filterValues.Source;
		const sourceList = Array.isArray(sources) ? sources : [sources];
		return !sourceValues._isActive || sourceList.some(source => sourceValues[source] === 1);
	},
};

const option = context.ClassesPageForTest._OPTION_DISPLAY_CLASS_IF_SUBCLASS_VISIBLE;
const header = context.ClassesPageForTest._OPTIONS_FILTER_HEADER;
const cls = {
	source: "PHB",
	_fMisc: [],
	subclasses: [
		{source: "TCE", _fMisc: []},
		{source: "PHB", _fMisc: []},
	],
};
const filterValues = {
	Source: {_isActive: true, PHB: 0, TCE: 1},
	Miscellaneous: {_isActive: false},
	[header]: {[option]: 0},
};

assert.strictEqual(page._isClassVisible(filterValues, cls), false);
filterValues[header][option] = 1;
assert.strictEqual(page._isClassVisible(filterValues, cls), true);
assert.strictEqual(page._getDisplaySource(filterValues, cls, "PHB"), "TCE");
assert.strictEqual(page._isClassContentSourceVisible(filterValues, cls, "PHB"), true);
assert.strictEqual(page._isSubclassVisible(filterValues, cls.subclasses[1]), false);
assert.strictEqual(page._optionsFilter.toDisplay(), true);
assert.strictEqual(page._optionsFilter.isActive(), false);

console.log("PASS: una subclase visible mantiene su clase y sus rasgos base visibles.");
