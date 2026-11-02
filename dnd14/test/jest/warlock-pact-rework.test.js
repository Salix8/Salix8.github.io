import fs from "node:fs";

const OPTIONAL_FEATURES = JSON.parse(fs.readFileSync(new URL("../../data/optionalfeatures.json", import.meta.url), "utf8")).optionalfeature;
const WARLOCK_DATA = JSON.parse(fs.readFileSync(new URL("../../data/class/class-warlock.json", import.meta.url), "utf8"));

const getOptionalFeature = name => OPTIONAL_FEATURES.find(it => it.name === name);
const getWarlockLevelFeature = (name, level) => WARLOCK_DATA.classFeature.find(it => it.name === name && it.level === level);

describe("Pactos e invocaciones de Warlock", () => {
	it("offers Pact of the Senses as a Pact Boon", () => {
		const pact = getOptionalFeature("Pacto de los Sentidos");
		const pactBoon = getWarlockLevelFeature("Pact Boon", 3);

		expect(pact).toMatchObject({source: "Himo", featureType: ["PB"]});
		expect(pact.entries).toHaveLength(2);
		expect(pactBoon.entries[1].entries).toContainEqual({
			type: "refOptionalfeature",
			optionalfeature: "Pacto de los Sentidos|Himo",
		});
	});

	it("keeps official Chain options and stores Himo reworks separately", () => {
		const pact = getOptionalFeature("Pact of the Chain");
		const pactHimo = getOptionalFeature("Pact of the Chain (Himo)");
		const investment = getOptionalFeature("Investment of the Chain Master");
		const investmentHimo = getOptionalFeature("Investment of the Chain Master (Himo)");

		expect(pact.additionalSpells[0].innate._.ritual).toEqual(["find familiar"]);
		expect(pactHimo.additionalSpells[0].innate._.daily["1e"]).toEqual(["find familiar"]);
		expect(pactHimo.entries.join(" ")).toContain("Tsutsugamushi");
		expect(getOptionalFeature("Voice of the Chain Master").source).toBe("PHB");
		expect(getOptionalFeature("Voice of the Chain Master (Himo)").prerequisite).toEqual([{pact: "Chain (Himo)"}]);
		expect(investment.prerequisite).toEqual([{pact: "Chain"}]);
		expect(investmentHimo.prerequisite).toEqual([{pact: "Chain (Himo)", level: {level: 5, class: {name: "Warlock"}}}]);
	});

	it("assigns Pact of the Senses invocations their exact levels", () => {
		const expected = new Map([
			["Ecolocalización Arcana", undefined],
			["Visión más allá del Subsuelo", 5],
			["Ojos de Reptil", 9],
			["Percepción Arcana", 14],
		]);

		for (const [name, level] of expected) {
			const invocation = getOptionalFeature(name);
			expect(invocation).toMatchObject({source: "Himo", featureType: ["EI"]});
			expect(invocation.prerequisite[0].pact).toBe("Pacto de los Sentidos");
			expect(invocation.prerequisite[0].level?.level).toBe(level);
		}
	});

	it("stores the Chain summon table and Mente Psiónica spell access", () => {
		const ascension = getOptionalFeature("Ascensión Sobrenatural");
		const mente = getOptionalFeature("Mente Psiónica");

		expect(ascension.prerequisite).toEqual([{pact: "Chain (Himo)", level: {level: 7, class: {name: "Warlock"}}}]);
		expect(ascension.entries[1].rows).toHaveLength(8);
		expect(ascension.entries[1].rows[0][1]).toContain("summon greater demon");
		expect(mente.prerequisite[0].level.level).toBe(9);
		expect(mente.additionalSpells[0].innate._).toEqual(["nondetection"]);
	});
});
