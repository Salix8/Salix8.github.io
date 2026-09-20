"use strict";

const fs = require("fs");
const path = require("path");

const browserRoot = path.join(__dirname, "..");
const dataRoot = path.join(browserRoot, "data");
const exceptionPath = path.join(__dirname, "reference-link-exceptions.json");
const isWrite = process.argv.includes("--write");

const customSources = new Set(["Himo", "GMAM", "GPNM", "GdR", "CdS", "GHLoE"]);
const renderableKeys = new Set(["entries", "entry", "items", "rows", "row", "colLabels", "caption", "headerEntries", "footerEntries"]);

const tagConfig = {
	spell: {categories: [2], props: ["spell"], defaultSource: "PHB"},
	item: {categories: [4], props: ["item", "baseitem", "variant"], defaultSource: "DMG"},
	class: {categories: [5], props: ["class"], defaultSource: "PHB"},
	creature: {categories: [1], props: ["monster"], defaultSource: "MM"},
	condition: {categories: [6], props: ["condition"], defaultSource: "PHB"},
	disease: {categories: [21], props: ["disease"], defaultSource: "DMG"},
	status: {categories: [49], props: ["status"], defaultSource: "PHB"},
	background: {categories: [3], props: ["background"], defaultSource: "PHB"},
	race: {categories: [10], props: ["race", "subrace"], defaultSource: "PHB"},
	feat: {categories: [7], props: ["feat"], defaultSource: "PHB"},
	optfeature: {categories: [8, 22, 23, 26, 27, 28, 29, 32, 33, 34, 35, 36, 37, 38, 39, 44, 45], props: ["optionalfeature"], defaultSource: "PHB"},
	reward: {categories: [11], props: ["reward"], defaultSource: "DMG"},
	psionic: {categories: [9], props: ["psionic"], defaultSource: "UATheMysticClass"},
	object: {categories: [15], props: ["object"], defaultSource: "DMG"},
	trap: {categories: [16], props: ["trap"], defaultSource: "DMG"},
	hazard: {categories: [17], props: ["hazard"], defaultSource: "DMG"},
	variantrule: {categories: [12], props: ["variantrule"], defaultSource: "DMG"},
	action: {categories: [42], props: ["action"], defaultSource: "PHB"},
	language: {categories: [43], props: ["language"], defaultSource: "PHB"}
};

const aliases = [
	{tag: "status", name: "Concentration", source: "PHB", values: ["concentración", "concentration"]},
	{tag: "condition", name: "Charmed", source: "PHB", values: ["charmed", "charm", "hechizado", "hechizada", "hechizados", "hechizadas", "encantado", "encantada", "encantados", "encantadas"]},
	{tag: "condition", name: "Frightened", source: "PHB", values: ["frightened", "asustado", "asustada", "asustados", "asustadas", "miedo"]},
	{tag: "condition", name: "Blinded", source: "PHB", values: ["blinded", "ceguera"]},
	{tag: "condition", name: "Deafened", source: "PHB", values: ["deafened", "sordera"]},
	{tag: "condition", name: "Grappled", source: "PHB", values: ["grappled", "agarrado", "agarrada", "agarrados", "agarradas"]},
	{tag: "condition", name: "Incapacitated", source: "PHB", values: ["incapacitated", "incapacitado", "incapacitada", "incapacitados", "incapacitadas"]},
	{tag: "condition", name: "Invisible", source: "PHB", values: ["invisible", "invisibles"]},
	{tag: "condition", name: "Paralyzed", source: "PHB", values: ["paralyzed", "paralizado", "paralizada", "paralizados", "paralizadas", "parálisis"]},
	{tag: "condition", name: "Petrified", source: "PHB", values: ["petrified", "petrificado", "petrificada", "petrificados", "petrificadas", "petrificación"]},
	{tag: "condition", name: "Poisoned", source: "PHB", values: ["poisoned", "envenenado", "envenenada", "envenenados", "envenenadas", "envenenamiento"]},
	{tag: "condition", name: "Prone", source: "PHB", values: ["prone", "derribado", "derribada", "derribados", "derribadas"]},
	{tag: "condition", name: "Restrained", source: "PHB", values: ["restrained", "restringido", "restringida", "restringidos", "restringidas"]},
	{tag: "condition", name: "Stunned", source: "PHB", values: ["stunned", "aturdido", "aturdida", "aturdidos", "aturdidas"]},
	{tag: "condition", name: "Unconscious", source: "PHB", values: ["unconscious", "inconsciente", "inconscientes"]},
	{tag: "skill", name: "Acrobatics", values: ["Acrobatics", "Acrobacias"]},
	{tag: "skill", name: "Animal Handling", values: ["Animal Handling", "Trato Animal"]},
	{tag: "skill", name: "Arcana", values: ["Arcana"]},
	{tag: "skill", name: "Athletics", values: ["Athletics", "Atletismo"]},
	{tag: "skill", name: "Deception", values: ["Deception", "Engaño"]},
	{tag: "skill", name: "History", values: ["History", "Historia"]},
	{tag: "skill", name: "Insight", values: ["Insight", "Averiguar Intenciones"]},
	{tag: "skill", name: "Intimidation", values: ["Intimidation", "Intimidación"]},
	{tag: "skill", name: "Investigation", values: ["Investigation", "Investigación"]},
	{tag: "skill", name: "Medicine", values: ["Medicine", "Medicina"]},
	{tag: "skill", name: "Perception", values: ["Perception", "Percepción"]},
	{tag: "skill", name: "Performance", values: ["Performance", "Interpretación"]},
	{tag: "skill", name: "Persuasion", values: ["Persuasion", "Persuasión"]},
	{tag: "skill", name: "Religion", values: ["Religion"]},
	{tag: "skill", name: "Sleight of Hand", values: ["Sleight of Hand", "Juego de Manos"]},
	{tag: "skill", name: "Stealth", values: ["Stealth", "Sigilo"]},
	{tag: "skill", name: "Survival", values: ["Survival", "Supervivencia"]},
	{tag: "item", name: "Herbalism Kit", source: "PHB", values: ["herramientas de herborista"]},
	{tag: "item", name: "Alchemist's Supplies", source: "PHB", values: ["suministros de alquimista"]},
	{tag: "item", name: "Gaming Set", source: "PHB", values: ["set de juego", "sets de juego"]},
	{tag: "disease", name: "Hipo Arcano", source: "Himo", values: ["Hipo Arcano"]},
	{tag: "condition", name: "Dazed", source: "Himo", values: ["dazed"]},
	{tag: "spell", name: "Spider Climb", source: "PHB", values: ["Spider Climb"]},
	{tag: "spell", name: "Greater Invisibility", source: "PHB", values: ["Greater Invisibility"]},
	{tag: "spell", name: "Cat Charm", source: "GMAM", values: ["Cat Charm"]},
	{tag: "spell", name: "Espolón de Roca", source: "GMAM", values: ["Espolón de roca"]},
	{tag: "spell", name: "Heartsense", source: "GMAM", values: ["Heartsense"]},
	{tag: "spell", name: "Emboscada", source: "GMAM", values: ["Emboscada"]},
	{tag: "spell", name: "Sequía", source: "GMAM", values: ["Sequía"]},
	{tag: "spell", name: "Forma de Jaguar", source: "GMAM", values: ["Forma de Jaguar"]},
	{tag: "spell", name: "Incendio", source: "GMAM", values: ["Incendio"]},
	{tag: "spell", name: "Sending (Hishna)", source: "GMAM", values: ["Sending (Hishna)"]},
	{tag: "spell", name: "Cacería", source: "GPNM", values: ["Cacería"]},
	{tag: "spell", name: "Talismán de Hishna", source: "GMAM", values: ["Talismán (Hishna)"]},
	{tag: "spell", name: "Elevar Menor", source: "GMAM", values: ["Elevar Menor"]},
	{tag: "spell", name: "Regulación Térmica", source: "GMAM", values: ["Regulación Térmica"]},
	{tag: "spell", name: "Breathsense", source: "GMAM", values: ["Breathsense"]},
	{tag: "spell", name: "Suerte del Pescador", source: "GMAM", values: ["Suerte del Pescador"]},
	{tag: "spell", name: "Elevar Mayor", source: "GMAM", values: ["Elevar Mayor"]},
	{tag: "spell", name: "Forma de Águila", source: "GMAM", values: ["Forma de Águila"]},
	{tag: "spell", name: "Cambiar Cauce", source: "GMAM", values: ["Cambiar Cauce"]},
	{tag: "spell", name: "Major Bird Charm", source: "GMAM", values: ["Major Bird Charm"]},
	{tag: "spell", name: "Espíritu del Sauce", source: "GdR", values: ["Espíritu del Sauce"]},
	{tag: "spell", name: "Talismán de Pluma", source: "GMAM", values: ["Talismán (Pluma)"]},
];

const aliasesByValue = new Map(aliases.flatMap(alias => alias.values.map(value => [value.toLocaleLowerCase(), alias])));
const aliasPattern = [...aliasesByValue.keys()].sort((a, b) => b.length - a.length).map(escapeRegexp).join("|");
const aliasMatcher = new RegExp(`(?<![\\p{L}\\p{N}_])(${aliasPattern})(?![\\p{L}\\p{N}_])`, "giu");

function escapeRegexp (value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getJsonFiles (root) {
	const out = [];
	for (const entry of fs.readdirSync(root, {withFileTypes: true})) {
		const fullPath = path.join(root, entry.name);
		if (entry.isDirectory()) out.push(...getJsonFiles(fullPath));
		else if (entry.name.endsWith(".json")) out.push(fullPath);
	}
	return out;
}

function getTagText (alias) {
	if (alias.tag === "skill") return `{@skill ${alias.name}}`;
	return `{@${alias.tag} ${alias.name}|${alias.source}}`;
}

function replaceOutsideTags (value) {
	let normalized = value;
	do {
		value = normalized;
		normalized = value.replace(/\{@(condition|status|skill) (\{@\1 [^{}]+})(?:\|[^{}]*)?}/g, "$2");
	} while (normalized !== value);

	// "Nature" is both a skill and an ordinary noun. These known prose usages were
	// produced by the first audit pass and are intentionally restored to plain text.
	normalized = normalized
		.replaceAll("Cat {@condition Charmed|PHB}", "{@spell Cat Charm|GMAM}")
		.replaceAll("Major Bird {@condition Charmed|PHB}", "{@spell Major Bird Charm|GMAM}")
		.replaceAll("{@condition grapple}", "{@condition Grappled|PHB|grapple}")
		.replaceAll("{@spell Melf's Arrow}", "{@spell Melf's Acid Arrow|PHB|Melf's Arrow}")
		.replaceAll("{@spell tiny hut}", "{@spell Leomund's Tiny Hut|PHB|tiny hut}")
		.replaceAll("la {@skill Nature}, sus espíritus", "la naturaleza, sus espíritus")
		.replaceAll("cercanía a la {@skill Nature}", "cercanía a la naturaleza")
		.replaceAll("verdadera {@skill Nature} de la creación", "verdadera naturaleza de la creación")
		.replaceAll("{@skill Nature} como máximo poder", "Naturaleza como máximo poder")
		.replaceAll("La {@skill Nature} es sabia", "La naturaleza es sabia")
		.replaceAll("misma {@skill Nature} que", "misma naturaleza que")
		.replaceAll("reconocer la {@skill Nature} o", "reconocer la naturaleza o")
		.replaceAll("su {@skill Nature} alineamiento", "su naturaleza alineamiento")
		.replaceAll("cuál es la {@skill Nature} de", "cuál es la naturaleza de")
		.replaceAll("discernir la {@skill Nature} del", "discernir la naturaleza del")
		.replaceAll("espíritus de la {@skill Nature}", "espíritus de la naturaleza")
		.replaceAll("independientemente de su {@skill Nature}", "independientemente de su naturaleza")
		.replaceAll("caídos en la {@skill Nature}", "caídos en la naturaleza");
	normalized = normalized
		.replaceAll("determinar la {@skill Religion}, culto", "determinar la religión, culto")
		.replaceAll("determinar a qué {@skill Religion}, culto", "determinar a qué religión, culto");
	normalized = normalized
		.replace(/\binmunidad al encantamiento\b/giu, "inmunidad a {@condition Charmed|PHB}")
		.replace(/\binmune al encantamiento\b/giu, "inmune a {@condition Charmed|PHB}");

	return normalized.split(/(\{@[^{}]*})/g).map(part => {
		if (part.startsWith("{@")) return part;
		return part.replace(aliasMatcher, match => getTagText(aliasesByValue.get(match.toLocaleLowerCase())));
	}).join("");
}

function getSourcesByTagAndName (registry) {
	const out = new Map();
	for (const [tag, references] of registry) {
		for (const reference of references) {
			const splitAt = reference.lastIndexOf("|");
			const name = reference.slice(0, splitAt);
			const source = reference.slice(splitAt + 1);
			const key = `${tag}|${name}`;
			if (!out.has(key)) out.set(key, new Set());
			out.get(key).add(source);
		}
	}
	return out;
}

function repairResolvableTagSources (value, registry, sourcesByTagAndName) {
	const tagNames = Object.keys(tagConfig).join("|");
	const tagRe = new RegExp(`\\{@(${tagNames}) ([^|}]+)(?:\\|([^|}]*))?(?:\\|([^}]*))?}`, "g");
	return value.replace(tagRe, (full, tag, name, sourceRaw, display) => {
		const currentSource = sourceRaw || tagConfig[tag].defaultSource;
		if (registry.get(tag).has(`${name}|${currentSource}`.toLowerCase())) return full;
		const sources = sourcesByTagAndName.get(`${tag}|${name}`.toLowerCase());
		if (!sources || sources.size !== 1) return full;
		const [sourceLower] = sources;
		const source = ({himo: "Himo", gdr: "GdR", cds: "CdS", ghloe: "GHLoE", gmam: "GMAM", gpnm: "GPNM"})[sourceLower] || sourceLower.toUpperCase();
		return `{@${tag} ${name}|${source}${display == null ? "" : `|${display}`}}`;
	});
}

function collectCustomStringFixes (value, state, registry, sourcesByTagAndName, {activeSource = null, isRenderable = false} = {}) {
	if (typeof value === "string") {
		if (!customSources.has(activeSource) || !isRenderable) return;
		const replacement = repairResolvableTagSources(replaceOutsideTags(value), registry, sourcesByTagAndName);
		if (replacement !== value) state.fixes.set(value, replacement);
		return;
	}
	if (!value || typeof value !== "object") return;
	if (Array.isArray(value)) {
		for (const child of value) collectCustomStringFixes(child, state, registry, sourcesByTagAndName, {activeSource, isRenderable});
		return;
	}
	const nextSource = value.source || activeSource;
	for (const [key, child] of Object.entries(value)) {
		collectCustomStringFixes(child, state, registry, sourcesByTagAndName, {
			activeSource: nextSource,
			isRenderable: key === "name" ? false : isRenderable || renderableKeys.has(key)
		});
	}
}

function applySourcePreservingFixes (file, fixes) {
	let raw = fs.readFileSync(file, "utf8");
	for (const [before, after] of fixes) {
		const beforeToken = JSON.stringify(before);
		const afterToken = JSON.stringify(after);
		raw = raw.split(beforeToken).join(afterToken);
	}
	JSON.parse(raw);
	fs.writeFileSync(file, raw);
}

function decodeSearchIndex () {
	const index = JSON.parse(fs.readFileSync(path.join(browserRoot, "search", "index.json"), "utf8"));
	const lookups = {};
	for (const [prop, values] of Object.entries(index.m || {})) {
		lookups[prop] = {};
		for (const [value, id] of Object.entries(values)) lookups[prop][id] = value;
	}
	return index.x.map(entry => {
		const out = {...entry};
		for (const prop of Object.keys(lookups)) if (out[prop] != null) out[prop] = lookups[prop][out[prop]] || out[prop];
		return out;
	});
}

function buildEntityRegistry (files) {
	const registry = new Map(Object.keys(tagConfig).map(tag => [tag, new Set()]));
	const propsToTags = {};
	for (const [tag, config] of Object.entries(tagConfig)) {
		for (const prop of config.props) (propsToTags[prop] ||= []).push(tag);
	}

	function walk (value) {
		if (!value || typeof value !== "object") return;
		if (Array.isArray(value)) return value.forEach(walk);
		for (const [key, child] of Object.entries(value)) {
			if (propsToTags[key] && Array.isArray(child)) {
				for (const entity of child) {
					if (!entity || !entity.name || !entity.source) continue;
					for (const tag of propsToTags[key]) registry.get(tag).add(`${entity.name}|${entity.source}`.toLowerCase());
				}
			}
			walk(child);
		}
	}

	for (const file of files) walk(JSON.parse(fs.readFileSync(file, "utf8")));

	// The Items page creates specific magic-item variants at load time. Mirror its
	// naming contract so links such as "Adamantine Breastplate" are validated
	// against their real local hover targets instead of being false positives.
	const baseItems = JSON.parse(fs.readFileSync(path.join(dataRoot, "items-base.json"), "utf8")).baseitem;
	const itemTypes = JSON.parse(fs.readFileSync(path.join(dataRoot, "items-base.json"), "utf8")).itemType;
	for (const itemType of itemTypes) if (itemType.name && itemType.source) registry.get("item").add(`${itemType.name}|${itemType.source}`.toLowerCase());
	const genericVariants = JSON.parse(fs.readFileSync(path.join(dataRoot, "magicvariants.json"), "utf8")).variant;
	for (const baseItem of baseItems) {
		for (const variant of genericVariants) {
			const matchesRequirement = variant.requires?.some(requirement => Object.entries(requirement).every(([key, expected]) => baseItem[key] === expected));
			if (!matchesRequirement) continue;
			const isExcluded = Object.entries(variant.excludes || {}).some(([key, excluded]) => {
				const actual = Array.isArray(baseItem[key]) ? baseItem[key] : [baseItem[key]];
				const excludedValues = Array.isArray(excluded) ? excluded : [excluded];
				return actual.some(value => excludedValues.includes(value));
			});
			if (isExcluded) continue;
			const name = `${variant.inherits.namePrefix || ""}${baseItem.name}${variant.inherits.nameSuffix || ""}`;
			registry.get("item").add(`${name}|${variant.inherits.source || baseItem.source}`.toLowerCase());
		}
	}

	for (const entry of decodeSearchIndex()) {
		for (const [tag, config] of Object.entries(tagConfig)) {
			if (config.categories.includes(entry.c) && entry.n && entry.s) registry.get(tag).add(`${entry.n}|${entry.s}`.toLowerCase());
		}
	}
	return registry;
}

function collectStrings (value, output, file) {
	if (typeof value === "string") output.push({file, value});
	else if (Array.isArray(value)) value.forEach(child => collectStrings(child, output, file));
	else if (value && typeof value === "object") Object.values(value).forEach(child => collectStrings(child, output, file));
}

function findBrokenReferences (files, registry) {
	const strings = [];
	for (const file of files) collectStrings(JSON.parse(fs.readFileSync(file, "utf8")), strings, file);
	const tagNames = Object.keys(tagConfig).join("|");
	const tagRe = new RegExp(`\\{@(${tagNames}) ([^|}]+)(?:\\|([^|}]*))?(?:\\|[^}]*)?}`, "g");
	const broken = [];
	for (const {file, value} of strings) {
		for (const match of value.matchAll(tagRe)) {
			const [, tag, name, sourceRaw] = match;
			const source = sourceRaw || tagConfig[tag].defaultSource;
			const key = `${name}|${source}`.toLowerCase();
			const reversedBonusName = tag === "item" ? name.replace(/^(\+\d+) (.+)$/i, "$2 $1") : name;
			const reversedBonusKey = `${reversedBonusName}|${source}`.toLowerCase();
			if (!registry.get(tag).has(key) && !registry.get(tag).has(reversedBonusKey)) broken.push({tag, name, source, file: path.relative(browserRoot, file)});
		}
	}
	return broken;
}

function getUniqueReferences (references) {
	const byKey = new Map();
	for (const reference of references) {
		const key = `${reference.tag}|${reference.name}|${reference.source}`.toLowerCase();
		if (!byKey.has(key)) byKey.set(key, reference);
	}
	return [...byKey.values()].sort((a, b) => `${a.tag}|${a.name}|${a.source}`.localeCompare(`${b.tag}|${b.name}|${b.source}`));
}

function main () {
	const files = getJsonFiles(dataRoot);
	const registry = buildEntityRegistry(files);
	const sourcesByTagAndName = getSourcesByTagAndName(registry);
	let changedFiles = 0;
	let changedStrings = 0;

	for (const file of files) {
		const state = {fixes: new Map()};
		collectCustomStringFixes(JSON.parse(fs.readFileSync(file, "utf8")), state, registry, sourcesByTagAndName);
		if (!state.fixes.size) continue;
		changedStrings += state.fixes.size;
		if (isWrite) {
			applySourcePreservingFixes(file, state.fixes);
			changedFiles++;
		}
	}

	const broken = getUniqueReferences(findBrokenReferences(files, registry));
	const exceptions = JSON.parse(fs.readFileSync(exceptionPath, "utf8"));
	const invalidExceptions = exceptions.filter(it => !it.tag || !it.name || !it.source || !it.reason?.trim());
	const exceptionKeys = new Set(exceptions.map(it => `${it.tag}|${it.name}|${it.source}`.toLowerCase()));
	const unexpected = broken.filter(it => !exceptionKeys.has(`${it.tag}|${it.name}|${it.source}`.toLowerCase()));
	const staleExceptions = exceptions.filter(it => !broken.some(ref => `${ref.tag}|${ref.name}|${ref.source}`.toLowerCase() === `${it.tag}|${it.name}|${it.source}`.toLowerCase()));

	console.log(`Reference audit: ${files.length} JSON files; ${broken.length} unresolved unique references.`);
	console.log(`${isWrite ? changedFiles : 0} files written; ${changedStrings} custom strings ${isWrite ? "updated" : "eligible for normalization"}.`);
	if (unexpected.length) console.log(`Unexpected unresolved references:\n${JSON.stringify(unexpected, null, 2)}`);
	if (staleExceptions.length) console.log(`Stale reference exceptions:\n${JSON.stringify(staleExceptions, null, 2)}`);
	if (invalidExceptions.length) console.log(`Invalid reference exceptions:\n${JSON.stringify(invalidExceptions, null, 2)}`);

	if (!isWrite && changedStrings) process.exitCode = 1;
	if (unexpected.length || staleExceptions.length || invalidExceptions.length) process.exitCode = 1;
}

main();
