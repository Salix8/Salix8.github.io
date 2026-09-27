"use strict";

const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
require("../js/utils.js");
Object.assign(global, require("../js/utils-ui.js"));
Object.assign(global, require("../js/filter.js"));
Object.assign(global, require("../js/list2.js"));
const source = fs.readFileSync(require.resolve("../js/classes.js"), "utf8");
const ClassesPage = vm.runInThisContext(`${source.split("\nconst classesPage =")[0]}\nClassesPage;`);
const page = new ClassesPage();
const filter = page._miscFilter;
const classes = require("../data/class/class-sidekick.json").class;
const normal = {name: "Wizard", source: "PHB"};
const visitor = {name: "Personal Companion", source: "TEST", isSidekick: true};
const visible = cls => filter.toDisplay(filter.getValues(), ClassesPage.getClassContextMisc(cls));

assert.strictEqual(classes.length, 3);
for (const cls of [...classes, visitor]) assert(!visible(cls), `${cls.name} hidden by default`);
assert(visible(normal));
filter.setValue("Sidekick", 0);
for (const cls of [...classes, visitor, normal]) assert(visible(cls), `${cls.name} visible in neutral state`);
filter.setValue("Sidekick", 1);
for (const cls of [...classes, visitor]) assert(visible(cls));
assert(!visible(normal));

// Exercise the real class-list preparation without rendering its DOM.
global.$ = () => ({});
global.$$ = () => ({});
const autoEncodeHash = UrlUtil.autoEncodeHash;
UrlUtil.autoEncodeHash = cls => `${cls.name}_${cls.source}`;
for (const [ix, cls] of [...classes, visitor, normal].entries()) {
 const item = page.getListItem(cls, ix, false);
 assert.strictEqual(filter.toDisplay(filter.getValues(), item.data.class._fMisc), !!cls.isSidekick);
 const subclass = {name: "Specialization", source: cls.source};
 ClassesPage._enhanceSubclassData(cls, subclass);
 assert.strictEqual(filter.toDisplay(filter.getValues(), subclass._fMisc), !!cls.isSidekick);
 // The same inherited context is used by features, the outline, tables, and print view.
 assert.strictEqual(filter.toDisplay(filter.getValues(), ClassesPage.getClassContextMisc(cls)), !!cls.isSidekick);
}
UrlUtil.autoEncodeHash = autoEncodeHash;

const sourceFilter = page._sourceFilter;
sourceFilter.addItem(["PHB", "TCE", "TEST"]);
sourceFilter.setValue("TCE", 2);
const combined = cls => sourceFilter.toDisplay(sourceFilter.getValues(), cls.source) && visible(cls);
assert(!combined(classes[0]), "Source exclusion still applies to sidekicks");
sourceFilter.setValue("TCE", 1);
assert(combined(classes[0]));

const saved = filter.getSaveableState();
const restored = new ClassesPage()._miscFilter;
restored.setStateFromLoaded(saved);
assert(restored.toDisplay(restored.getValues(), ["Sidekick"]));
assert(!restored.toDisplay(restored.getValues(), []));
restored.reset();
assert(!restored.toDisplay(restored.getValues(), ["Sidekick"]));
const oldPreferences = JSON.parse(JSON.stringify(saved));
delete oldPreferences.Miscellaneous.state.Sidekick;
restored.setStateFromLoaded(oldPreferences);
assert(!restored.toDisplay(restored.getValues(), ["Sidekick"]), "Old saved filters retain the new default exclusion");
filter.setValue("Sidekick", 0);
restored.setStateFromLoaded(filter.getSaveableState());
assert(restored.toDisplay(restored.getValues(), ["Sidekick"]), "An explicit neutral choice survives reload");

async function testStartupWithSavedSelection () {
	const startupPage = new ClassesPage();
	startupPage._miscFilter.setValue("Sidekick", 1);
	const list = new List({fnSort: null});
	list._doRender = () => {};
	global.Omnisearch = {addScrollTopFloat () {}};
	ExcludeUtil.pInitialise = async () => {};
	DataUtil.class.loadJSON = async () => ({class: classes});
	ListUtil.initList = () => list;
	ListUtil.setOptions = () => {};
	SortUtil.initBtnSortHandlers = () => {};
	global.pInitFilterBox = async () => ({
		getValues: () => startupPage._miscFilter.getValues(),
		toDisplay: (values, source, misc) => startupPage._miscFilter.toDisplay(values, misc),
		reset: () => assert.fail("Startup must not reset saved filters before the list is populated")
	});
	const finished = new Error("Startup verified");
	startupPage._addData = data => {
		assert(list._isInit, "Initialize the list before evaluating saved filters");
		startupPage._dataList = data.class.map(cls => ({...cls, subclasses: [], _fMisc: ClassesPage.getClassContextMisc(cls)}));
		startupPage._dataList.forEach((cls, ix) => list.addItem(new ListItem(ix, null, cls.name)));
		list.update();
		startupPage._handleFilterChange();
		assert.strictEqual(list.visibleItems.length, 3);
		list.search("Spellcaster");
		assert.deepStrictEqual(list.visibleItems.map(it => it.name), ["Spellcaster Sidekick"]);
		throw finished;
	};
	await assert.rejects(startupPage.pOnLoad(), error => error === finished);
}
testStartupWithSavedSelection().then(() => console.log("PASS: sidekick defaults, three states, class/subclass context, sources, homebrew, startup, search, persistence, and reset.")).catch(error => {console.error(error); process.exitCode = 1;});
