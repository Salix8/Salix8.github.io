import fs from "fs";

import {Um, Uf, JsonTester} from "5etools-utils";

const LOG_TAG = "JSON";
const _IS_FAIL_SLOW = !!process.env.FAIL_SLOW;

const _GENERATED_ALLOWLIST = new Set([
	"bookref-quick.json",
	"gendata-spell-source-lookup.json",
]);

// This generated lookup uses localized class/subclass keys. The upstream schema
// only permits ASCII keys, so it is covered by the custom-content test instead.
const _GENERATED_SKIP_SCHEMA = new Set([
	"gendata-spell-source-lookup.json",
]);

// This is application configuration for the Salix spell-pricing service, rather
// than a 5etools entity collection. It has a dedicated structural test.
const _CUSTOM_NON_5ETOOLS_FILES = new Set([
	"data/spell-pricing.json",
	// Himo recipes carry a portal-specific `potion` contract. It is validated in
	// `custom-content.test.cjs`, as the upstream schema intentionally disallows it.
	"data/optionalfeatures.json",
]);

async function main () {
	const jsonTester = new JsonTester({
		tagLog: LOG_TAG,
		fnGetSchemaId: (filePath) => {
			const relativeFilePath = filePath.replace("data/", "");

			if (relativeFilePath.startsWith("adventure/")) return "adventure/adventure.json";
			if (relativeFilePath.startsWith("book/")) return "book/book.json";

			if (relativeFilePath.startsWith("bestiary/bestiary-")) return "bestiary/bestiary.json";
			if (relativeFilePath.startsWith("bestiary/fluff-bestiary-")) return "bestiary/fluff-bestiary.json";

			if (relativeFilePath.startsWith("class/class-")) return "class/class.json";
			if (relativeFilePath.startsWith("class/fluff-class-")) return "class/fluff-class.json";

			if (relativeFilePath.startsWith("spells/spells-")) return "spells/spells.json";
			if (relativeFilePath.startsWith("spells/fluff-spells-")) return "spells/fluff-spells.json";

			return relativeFilePath;
		},
	});
	await jsonTester.pInit();

	const fileList = Uf.listJsonFiles("data")
		.filter(filePath => {
			if (_CUSTOM_NON_5ETOOLS_FILES.has(filePath)) return false;
			if (filePath.includes("data/generated")) {
				const fileName = filePath.split("/").at(-1);
				return _GENERATED_ALLOWLIST.has(fileName) && !_GENERATED_SKIP_SCHEMA.has(fileName);
			}
			return true;
		});

	const results = await jsonTester.pGetErrorsOnDirsWorkers({
		isFailFast: !_IS_FAIL_SLOW,
		fileList,
	});

	const {errors, errorsFull} = results;

	if (errors.length) {
		if (!process.env.CI) fs.writeFileSync(`test/temp/test-json.error.log`, errorsFull.join("\n\n=====\n\n"));
		console.error(`Schema test failed (${errors.length} failure${errors.length === 1 ? "`" : "s"}).`);
		return false;
	}

	Um.info(LOG_TAG, `All schema tests passed.`);
	return true;
}

const pMain = main();

if (import.meta.main && !(await pMain)) process.exitCode = 1;

export default pMain;
