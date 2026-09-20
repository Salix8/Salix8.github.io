"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");
const {Omnidexer} = require("../js/omnidexer.js");

const browserRoot = path.join(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(browserRoot, relativePath), "utf8");
const conditions = require("../data/conditionsdiseases.json");
const searchIndex = Omnidexer.decompressIndex(require("../search/index.json"));

for (const [name, page] of [["Concentration", 203], ["Surprised", 189]]) {
	const matches = conditions.status.filter(it => it.name === name && it.source === "PHB");
	assert.strictEqual(matches.length, 1, `${name}|PHB debe existir exactamente una vez.`);
	assert.strictEqual(matches[0].page, page, `${name}|PHB debe conservar la página de PHB 2014.`);
	assert.strictEqual(searchIndex.filter(it => it.c === 49 && it.s === "PHB" && it.n === name).length, 1, `${name}|PHB debe estar en el buscador.`);
}

const utils = read("js/utils.js");
assert(utils.includes("Parser.CAT_ID_STATUS = 49"));
assert(utils.includes("spDurationToFull = function (dur, {isPlainText = false} = {})"));
assert(utils.includes("{@status Concentration|PHB}"));
assert(read("js/render.js").includes('case "@status"'));
assert(read("js/conditionsdiseases.js").includes('"condition", "disease", "status"'));
assert(read("js/makecards.js").includes("{isPlainText: true}"));
assert(read("js/render-markdown.js").includes("{isPlainText: true}"));

const backgrounds = read("data/backgrounds.json");
assert(backgrounds.includes("{@item Herbalism Kit|PHB}"));
assert(backgrounds.includes("{@item Alchemist's Supplies|PHB}"));
const alchemist = read("data/class/class-alchemist.json");
for (const tag of ["{@disease Hipo Arcano|Himo}", "{@spell Spider Climb|PHB}", "{@spell Greater Invisibility|PHB}"]) assert(alchemist.includes(tag), `${tag} debe estar enlazado en Alquimista.`);
const paladin = read("data/class/class-paladin.json");
for (const tag of ["{@spell Cat Charm|GMAM}", "{@spell Emboscada|GMAM}", "{@spell Cacería|GPNM}", "{@spell Talismán de Hishna|GMAM}"]) assert(paladin.includes(tag), `${tag} debe estar enlazado en Paladín.`);
assert(read("data/spells/spells-gdr.json").includes("{@condition Poisoned|PHB} o una enfermedad"));

assert(require("../data/class/class-sidekick.json").class.every(it => it.source === "TCE"));
assert.strictEqual(require("../data/bestiary/bestiary-ftd.json").monster[0].name, "Draconic Spirit");
assert.strictEqual(require("../data/bestiary/bestiary-bmt.json").monster[0].name, "Reaper Spirit");
assert(require("../data/items.json").item.some(it => it.name === "Spelljamming Helm" && it.source === "AAG"));
assert(require("../data/variantrules.json").variantrule.some(it => it.name === "Downtime Activity: Running a Business" && it.source === "DMG"));

const audit = childProcess.spawnSync(process.execPath, [path.join(__dirname, "reference-link-audit.js")], {encoding: "utf8"});
assert.strictEqual(audit.status, 0, `${audit.stdout}\n${audit.stderr}`);

console.log("PASS: status, enlaces semánticos, importaciones e índice general");
