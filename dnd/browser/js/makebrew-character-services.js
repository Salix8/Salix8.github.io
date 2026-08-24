"use strict";

/**
 * Pure rules helpers used by the Character Builder. Keeping these calculations
 * outside of the builder view makes the selected character state portable to a
 * bestiary-ready monster object and straightforward to test.
 */
(() => {
	const ABILITIES = Object.freeze(["str", "dex", "con", "int", "wis", "cha"]);
	const ABILITY_ALIASES = Object.freeze({
		strength: "str",
		dexterity: "dex",
		constitution: "con",
		intelligence: "int",
		wisdom: "wis",
		charisma: "cha"
	});
	const SKILL_TO_ABILITY = Object.freeze({
		athletics: "str",
		acrobatics: "dex",
		"sleight of hand": "dex",
		stealth: "dex",
		arcana: "int",
		history: "int",
		investigation: "int",
		nature: "int",
		religion: "int",
		"animal handling": "wis",
		insight: "wis",
		medicine: "wis",
		perception: "wis",
		survival: "wis",
		deception: "cha",
		intimidation: "cha",
		performance: "cha",
		persuasion: "cha"
	});

	const DEFAULT_POINT_BUY_COSTS = Object.freeze({
		3: -9,
		4: -6,
		5: -4,
		6: -2,
		7: -1,
		8: 0,
		9: 1,
		10: 2,
		11: 3,
		12: 4,
		13: 5,
		14: 7,
		15: 9,
		16: 12,
		17: 15,
		18: 19
	});
	const DEFAULT_STANDARD_ARRAY = Object.freeze([15, 14, 13, 12, 10, 8]);

	function _toNumber (value) {
		if (value == null || value === "") return null;
		const asNumber = Number(value);
		return Number.isFinite(asNumber) ? asNumber : null;
	}

	function _toInteger (value) {
		const asNumber = _toNumber(value);
		return asNumber == null ? null : Math.trunc(asNumber);
	}

	function _toNonNegativeInteger (value, fallback = 0) {
		const asInteger = _toInteger(value);
		return asInteger == null ? fallback : Math.max(0, asInteger);
	}

	function _normaliseAbility (ability) {
		if (ability == null) return null;
		const normalised = `${ability}`.trim().toLowerCase();
		const resolved = ABILITY_ALIASES[normalised] || normalised;
		return ABILITIES.includes(resolved) ? resolved : null;
	}

	function _normaliseSkill (skill) {
		return skill == null ? null : `${skill}`.trim().toLowerCase().replace(/\s+/g, " ");
	}

	function _normaliseTraitName (name) {
		return name == null
			? null
			: `${name}`.trim().toLowerCase().replace(/[.:]+$/g, "").replace(/\s+/g, " ");
	}

	function _getOption (options, keys) {
		for (const key of keys) {
			if (options && options[key] !== undefined) return options[key];
		}
		return undefined;
	}

	function _getFirstDefined (...values) {
		return values.find(value => value !== undefined && value !== null);
	}

	function _getAbilityScore (scores, ability) {
		if (!scores) return null;
		const abilityAbv = _normaliseAbility(ability);
		if (!abilityAbv) return null;

		const source = scores.scores || scores;
		let raw = source[abilityAbv];
		if (raw === undefined) {
			const key = Object.keys(source).find(it => _normaliseAbility(it) === abilityAbv);
			if (key !== undefined) raw = source[key];
		}
		if (raw && typeof raw === "object") raw = _getFirstDefined(raw.total, raw.score, raw.value);
		return _toInteger(raw);
	}

	function _getAbilityModifier (scores, ability) {
		const score = _getAbilityScore(scores, ability);
		return score == null ? null : Math.floor((score - 10) / 2);
	}

	function _formatBonus (value) {
		return value >= 0 ? `+${value}` : `${value}`;
	}

	function _getClassDefinition (classSelection) {
		if (!classSelection || typeof classSelection !== "object") return null;
		for (const key of ["classData", "class", "data", "definition"]) {
			if (classSelection[key] && typeof classSelection[key] === "object") return classSelection[key];
		}
		return classSelection;
	}

	function _getClassLevel (classSelection) {
		if (typeof classSelection === "number") return _toNonNegativeInteger(classSelection);
		return _toNonNegativeInteger(classSelection && classSelection.level);
	}

	function _getHitDieFaces (classSelection) {
		const definition = _getClassDefinition(classSelection);
		const rawHitDie = _getFirstDefined(
			_getOption(classSelection, ["hitDieFaces", "hitDie", "hd"]),
			_getOption(definition, ["hitDieFaces", "hitDie", "hd"])
		);
		if (rawHitDie && typeof rawHitDie === "object") {
			return _toNonNegativeInteger(_getFirstDefined(rawHitDie.faces, rawHitDie.face, rawHitDie.die, rawHitDie.value));
		}
		if (typeof rawHitDie === "string") {
			const match = rawHitDie.match(/(?:d)?(\d+)/i);
			return match ? _toNonNegativeInteger(match[1]) : 0;
		}
		return _toNonNegativeInteger(rawHitDie);
	}

	function _normaliseProficiencyMultiplier (entry) {
		if (entry == null || entry === false || entry === "none") return 0;
		if (entry === true) return 1;
		if (typeof entry === "number") return Math.max(0, Math.trunc(entry));
		if (typeof entry === "string") {
			const normalised = entry.trim().toLowerCase();
			if (normalised === "expertise" || normalised === "double") return 2;
			return normalised === "proficient" || normalised === "proficiency" ? 1 : 0;
		}
		if (typeof entry === "object") {
			if (entry.expertise === true) return 2;
			if (entry.multiplier !== undefined) return _normaliseProficiencyMultiplier(entry.multiplier);
			if (entry.proficiency !== undefined) return _normaliseProficiencyMultiplier(entry.proficiency);
			if (entry.isProficient === true || entry.proficient === true) return 1;
		}
		return 0;
	}

	function _getProficiencyEntries (proficiencies) {
		if (!proficiencies) return [];
		if (Array.isArray(proficiencies)) {
			return proficiencies.map(entry => {
				if (typeof entry === "string") return {name: entry, multiplier: 1};
				if (!entry || typeof entry !== "object") return null;
				return {name: entry.name || entry.skill || entry.ability, multiplier: _normaliseProficiencyMultiplier(entry)};
			}).filter(Boolean);
		}

		return Object.entries(proficiencies).map(([name, value]) => ({name, multiplier: _normaliseProficiencyMultiplier(value)}));
	}

	function _sumNumericValues (value) {
		if (value == null || value === false) return 0;
		if (typeof value === "number" || typeof value === "string") return _toNumber(value) || 0;
		if (Array.isArray(value)) return value.reduce((total, it) => total + _sumNumericValues(it), 0);
		if (typeof value === "object") {
			if (value.value !== undefined) return _sumNumericValues(value.value);
			if (value.bonus !== undefined) return _sumNumericValues(value.bonus);
			return Object.values(value).reduce((total, it) => total + _sumNumericValues(it), 0);
		}
		return 0;
	}

	class CharacterAbilityScoreService {
		static getAbilitySummary (options = {}, speciesBonuses, otherBonuses) {
			const isOptionsObject = options && typeof options === "object" && ["baseScores", "base", "speciesBonuses", "speciesBonus", "otherBonuses", "otherBonus"].some(key => options[key] !== undefined);
			const resolvedOptions = isOptionsObject
				? options
				: {baseScores: options, speciesBonuses, otherBonuses};
			const baseScores = _getOption(resolvedOptions, ["baseScores", "base"]) || {};
			const speciesScoreBonuses = _getOption(resolvedOptions, ["speciesBonuses", "speciesBonus", "raceBonuses", "raceBonus"]) || {};
			const otherScoreBonuses = _getOption(resolvedOptions, ["otherBonuses", "otherBonus", "bonuses"]) || {};
			const out = {};

			ABILITIES.forEach(ability => {
				const base = _getAbilityScore(baseScores, ability);
				const speciesBonus = _getAbilityScore(speciesScoreBonuses, ability) || 0;
				const otherBonus = _getAbilityScore(otherScoreBonuses, ability) || 0;
				const total = base == null ? null : base + speciesBonus + otherBonus;
				out[ability] = {
					base,
					speciesBonus,
					otherBonus,
					total,
					modifier: total == null ? null : Math.floor((total - 10) / 2)
				};
			});

			return out;
		}

		static getAbilityTotals (abilitySummary) {
			const out = {};
			ABILITIES.forEach(ability => out[ability] = _getAbilityScore(abilitySummary, ability));
			return out;
		}

		static getPointBuyConfig (config = {}) {
			return {
				budget: _getFirstDefined(_toInteger(_getOption(config, ["budget", "points", "pointBudget"])), 27),
				minScore: _getFirstDefined(_toInteger(_getOption(config, ["minScore", "min", "minimumScore"])), 8),
				maxScore: _getFirstDefined(_toInteger(_getOption(config, ["maxScore", "max", "maximumScore"])), 15),
				// The published score-to-cost progression is fixed. Campaigns can adjust
				// budget and range, but never silently change the underlying rule.
				costByScore: DEFAULT_POINT_BUY_COSTS
			};
		}

		static getPointBuySpent (baseScores, config = {}) {
			return this.getPointBuySummary(baseScores, config).spent;
		}

		static getPointBuySummary (baseScores, config = {}) {
			const resolvedConfig = this.getPointBuyConfig(config);
			const errors = [];
			const costByAbility = {};
			let spent = 0;
			let isComplete = true;
			let isWithinBounds = true;
			let hasKnownCosts = true;

			ABILITIES.forEach(ability => {
				const score = _getAbilityScore(baseScores, ability);
				if (score == null) {
					isComplete = false;
					errors.push(`${ability} requires a base score.`);
					return;
				}
				if (score < resolvedConfig.minScore || score > resolvedConfig.maxScore) {
					isWithinBounds = false;
					errors.push(`${ability} must be between ${resolvedConfig.minScore} and ${resolvedConfig.maxScore}.`);
				}
				const cost = _toNumber(resolvedConfig.costByScore[score]);
				if (cost == null) {
					hasKnownCosts = false;
					errors.push(`No point-buy cost is configured for ${ability} ${score}.`);
					return;
				}
				costByAbility[ability] = cost;
				spent += cost;
			});

			const isValid = isComplete && isWithinBounds && hasKnownCosts;
			return {
				config: resolvedConfig,
				costByAbility,
				spent: isComplete && hasKnownCosts ? spent : null,
				remaining: isComplete && hasKnownCosts ? resolvedConfig.budget - spent : null,
				isComplete,
				isWithinBounds,
				hasKnownCosts,
				isValid,
				errors
			};
		}

		static validatePointBuy (baseScores, config = {}) {
			return this.getPointBuySummary(baseScores, config);
		}

		static validateStandardArray (baseScores, standardArray = DEFAULT_STANDARD_ARRAY) {
			const expected = [...standardArray].map(_toInteger).filter(it => it != null).sort((a, b) => a - b);
			const actual = ABILITIES.map(ability => _getAbilityScore(baseScores, ability));
			const missingAbilities = ABILITIES.filter((ability, index) => actual[index] == null);
			const received = actual.filter(it => it != null).sort((a, b) => a - b);
			const unexpectedScores = [...received];
			const expectedRemaining = [...expected];

			for (let index = unexpectedScores.length - 1; index >= 0; index--) {
				const expectedIndex = expectedRemaining.indexOf(unexpectedScores[index]);
				if (expectedIndex !== -1) {
					expectedRemaining.splice(expectedIndex, 1);
					unexpectedScores.splice(index, 1);
				}
			}

			return {
				standardArray: [...standardArray],
				assignedScores: actual,
				missingAbilities,
				unexpectedScores,
				unusedScores: expectedRemaining,
				isValid: !missingAbilities.length && !unexpectedScores.length && !expectedRemaining.length
			};
		}

		static getStandardArraySummary (baseScores, standardArray = DEFAULT_STANDARD_ARRAY) {
			return this.validateStandardArray(baseScores, standardArray);
		}
	}

	CharacterAbilityScoreService.ABILITIES = ABILITIES;
	CharacterAbilityScoreService.STANDARD_ARRAY = DEFAULT_STANDARD_ARRAY;
	CharacterAbilityScoreService.DEFAULT_POINT_BUY_COSTS = DEFAULT_POINT_BUY_COSTS;
	CharacterAbilityScoreService.DEFAULT_POINT_BUY_CONFIG = Object.freeze({
		budget: 27,
		minScore: 8,
		maxScore: 15,
		costByScore: DEFAULT_POINT_BUY_COSTS
	});

	class CharacterSpeciesService {
		static getAbilityChoiceGroups (species = {}) {
			species = species || {};
			return (species.ability || []).map((ability, index) => {
				if (!ability || !ability.choose) return null;
				const choose = ability.choose;
				const options = (choose.from || []).map(_normaliseAbility).filter(Boolean);
				if (!options.length) return null;
				return {
					key: `ability:${index}`,
					options,
					count: Math.max(1, _toNonNegativeInteger(choose.count, 1)),
					amount: _toInteger(choose.amount) == null ? 1 : _toInteger(choose.amount)
				};
			}).filter(Boolean);
		}

		static getAbilityBonuses (species = {}, choices = {}) {
			species = species || {};
			choices = choices || {};
			const out = {};
			ABILITIES.forEach(ability => out[ability] = 0);
			const abilityChoices = choices.ability || choices.abilityChoices || {};

			(species.ability || []).forEach(ability => {
				if (!ability || typeof ability !== "object") return;
				ABILITIES.forEach(abv => out[abv] += _toInteger(ability[abv]) || 0);
			});
			this.getAbilityChoiceGroups(species).forEach(group => {
				const selected = Array.isArray(abilityChoices[group.key]) ? abilityChoices[group.key] : [];
				const seen = new Set();
				selected.forEach(ability => {
					const normalised = _normaliseAbility(ability);
					if (!normalised || seen.has(normalised) || !group.options.includes(normalised) || seen.size >= group.count) return;
					seen.add(normalised);
					out[normalised] += group.amount;
				});
			});

			return out;
		}

		static getSelectedSize (species = {}, choices = {}) {
			species = species || {};
			choices = choices || {};
			const availableSizes = Array.isArray(species.size) ? species.size : [species.size];
			const sizes = availableSizes.filter(Boolean);
			const requested = choices.size || choices.selectedSize;
			return sizes.includes(requested) ? requested : (sizes[0] || "M");
		}

		static getCreatureType (species = {}, choices = {}) {
			species = species || {};
			choices = choices || {};
			const structured = species.creatureType || species.type;
			const derived = Array.isArray(structured) ? structured[0] : structured;
			return choices.creatureType || derived || "humanoid";
		}

		static getNormalizedSpeed (speed) {
			if (typeof speed === "number" || typeof speed === "string") return speed;
			if (!speed || typeof speed !== "object") return {walk: 30};

			const getNormalisedValue = value => {
				if (value == null || value === false) return null;
				if (value === true) return true;
				if (typeof value === "number") return value;
				if (typeof value !== "object" || value.number == null || isNaN(Number(value.number))) return null;
				const out = {number: Number(value.number)};
				if (value.condition) out.condition = value.condition;
				return out;
			};
			const getNumber = value => typeof value === "number"
				? value
				: value && typeof value === "object" && value.number != null ? Number(value.number) : null;

			const normalisedWalk = getNormalisedValue(speed.walk);
			const walk = getNumber(normalisedWalk) || 30;
			const out = {};
			["walk", "burrow", "climb", "fly", "swim"].forEach(prop => {
				const value = getNormalisedValue(speed[prop]);
				if (value != null) out[prop] = value === true ? walk : value;
			});
			if (!out.walk) out.walk = walk;
			if (out.fly != null && speed.canHover) out.canHover = true;
			return out;
		}

		static getNarrativeTraits (species = {}, ignoredNames = []) {
			species = species || {};
			const ignored = new Set(ignoredNames.map(it => `${it}`.toLowerCase()));
			return (species.entries || []).filter(entry => {
				if (!entry || typeof entry === "string") return true;
				return !entry.name || !ignored.has(`${entry.name}`.toLowerCase());
			});
		}
	}

	class CharacterSelectionService {
		static getResolvedSelections (options = {}) {
			const kinds = ["skill", "language", "tool"];
			const groups = options.groups || [];
			const choiceSelections = options.choiceSelections || options.selections || {};
			const fixed = options.fixed || {};
			const selected = {};
			const selectedByGroup = {};
			const duplicateSelections = [];
			kinds.forEach(kind => {
				const rawValues = fixed[kind];
				const values = Array.isArray(rawValues)
					? rawValues
					: rawValues && typeof rawValues[Symbol.iterator] === "function" ? [...rawValues] : [];
				selected[kind] = new Set(values.filter(Boolean));
			});

			const activeKeys = new Set(groups.map(group => group.key));
			groups.forEach(group => {
				if (!group || !group.key || !selected[group.kind]) return;
				const count = Math.max(0, _toNonNegativeInteger(group.count, 1));
				const knownOptions = group.options || [];
				const groupValues = [];
				const seenInGroup = new Set();
				(choiceSelections[group.key] || []).forEach(value => {
					if (!value || groupValues.length >= count || seenInGroup.has(value)) return;
					if (knownOptions.length && !knownOptions.includes(value)) return;
					seenInGroup.add(value);
					if (selected[group.kind].has(value)) {
						duplicateSelections.push({key: group.key, kind: group.kind, value});
						return;
					}
					selected[group.kind].add(value);
					groupValues.push(value);
				});
				selectedByGroup[group.key] = groupValues;
			});

			return {
				selected,
				selectedByGroup,
				duplicateSelections,
				inactiveKeys: Object.keys(choiceSelections).filter(key => !activeKeys.has(key))
			};
		}
	}

	class CharacterProficiencyService {
		static getTotalLevel (classes) {
			const selections = Array.isArray(classes) ? classes : (classes ? [classes] : []);
			return selections.reduce((total, classSelection) => total + _getClassLevel(classSelection), 0);
		}

		static getProficiencyBonus (totalLevel) {
			const level = _toNonNegativeInteger(totalLevel);
			return level ? Math.ceil(level / 4) + 1 : 2;
		}

		static getSavingThrowAbilities (classes) {
			const selections = Array.isArray(classes) ? classes : (classes ? [classes] : []);
			const firstClass = selections.find(classSelection => _getClassLevel(classSelection) > 0) || selections[0];
			const definition = _getClassDefinition(firstClass);
			const rawAbilities = _getFirstDefined(
				_getOption(firstClass, ["savingThrowAbilities", "savingThrows", "saves"]),
				_getOption(definition, ["savingThrowAbilities", "savingThrows", "saves", "proficiency"])
			);
			return _getProficiencyEntries(rawAbilities)
				.filter(it => it.multiplier > 0)
				.map(it => _normaliseAbility(it.name))
				.filter(Boolean);
		}

		static getSaveMap (options = {}) {
			const classes = options.classes || [];
			const abilityScores = options.abilityScores || options.abilitySummary || {};
			const totalLevel = _toNonNegativeInteger(_getFirstDefined(options.totalLevel, this.getTotalLevel(classes)));
			const proficiencyBonus = _getFirstDefined(_toInteger(options.proficiencyBonus), this.getProficiencyBonus(totalLevel));
			const rawProficiencies = _getFirstDefined(
				_getOption(options, ["savingThrowAbilities", "savingThrows", "saves"]),
				this.getSavingThrowAbilities(classes)
			);
			const out = {};

			_getProficiencyEntries(rawProficiencies).forEach(({name, multiplier}) => {
				const ability = _normaliseAbility(name);
				const abilityModifier = _getAbilityModifier(abilityScores, ability);
				if (!ability || !multiplier || abilityModifier == null) return;
				const bonus = abilityModifier + proficiencyBonus * multiplier;
				out[ability] = options.returnNumeric ? bonus : _formatBonus(bonus);
			});

			return out;
		}

		static getSkillMap (options = {}) {
			const classes = options.classes || [];
			const abilityScores = options.abilityScores || options.abilitySummary || {};
			const totalLevel = _toNonNegativeInteger(_getFirstDefined(options.totalLevel, this.getTotalLevel(classes)));
			const proficiencyBonus = _getFirstDefined(_toInteger(options.proficiencyBonus), this.getProficiencyBonus(totalLevel));
			const rawProficiencies = _getOption(options, ["proficiencyStates", "skillProficiencies", "skills"]) || {};
			const skillToAbility = {...SKILL_TO_ABILITY};
			Object.entries(options.skillToAbility || {}).forEach(([skill, ability]) => {
				const normalisedSkill = _normaliseSkill(skill);
				const normalisedAbility = _normaliseAbility(ability);
				if (normalisedSkill && normalisedAbility) skillToAbility[normalisedSkill] = normalisedAbility;
			});

			const out = {};
			_getProficiencyEntries(rawProficiencies).forEach(({name, multiplier}) => {
				const skill = _normaliseSkill(name);
				const ability = skill && skillToAbility[skill];
				const abilityModifier = _getAbilityModifier(abilityScores, ability);
				if (!skill || !ability || !multiplier || abilityModifier == null) return;
				const bonus = abilityModifier + proficiencyBonus * multiplier;
				out[skill] = options.returnNumeric ? bonus : _formatBonus(bonus);
			});

			return out;
		}
	}

	CharacterProficiencyService.SKILL_TO_ABILITY = SKILL_TO_ABILITY;

	class CharacterStatblockService {
		static getTotalLevel (classes) {
			return CharacterProficiencyService.getTotalLevel(classes);
		}

		static getProficiencyBonus (totalLevel) {
			return CharacterProficiencyService.getProficiencyBonus(totalLevel);
		}

		static getSaveMap (options = {}) {
			return CharacterProficiencyService.getSaveMap(options);
		}

		static getSkillMap (options = {}) {
			return CharacterProficiencyService.getSkillMap(options);
		}

		static getChallengeRating (totalLevel, options = {}) {
			const level = _toNonNegativeInteger(totalLevel);
			const levelToCr = _getOption(options, ["levelToCr", "crByLevel"]);
			let challengeRating;
			if (typeof levelToCr === "function") challengeRating = levelToCr(level);
			else if (Array.isArray(levelToCr)) challengeRating = levelToCr[level];
			else if (levelToCr && typeof levelToCr === "object") challengeRating = _getFirstDefined(levelToCr[level], levelToCr[`${level}`]);

			return challengeRating == null ? `${level}` : `${challengeRating}`;
		}

		static getHitPoints (options = {}) {
			const classes = Array.isArray(options.classes) ? options.classes : (options.classes ? [options.classes] : []);
			const constitutionScore = _getFirstDefined(
				_toInteger(options.constitutionScore),
				_getAbilityScore(options.abilityScores || options.abilitySummary, "con"),
				10
			);
			const constitutionModifier = Math.floor((constitutionScore - 10) / 2);
			const additionalHitPoints = _toInteger(options.additionalHitPoints) || 0;
			const manualHitPoints = _toInteger(options.manualHitPoints);
			const errors = [];
			const hitDice = [];
			let calculatedAverage = additionalHitPoints;
			let totalLevel = 0;
			let firstLevelHitPoints = null;
			let subsequentLevelHitPoints = 0;
			let hasFirstLevel = false;

			classes.forEach((classSelection, classIndex) => {
				const level = _getClassLevel(classSelection);
				if (!level) return;
				totalLevel += level;
				const faces = _getHitDieFaces(classSelection);
				if (!faces) {
					errors.push(`Class selection ${classIndex + 1} has no valid Hit Die.`);
					return;
				}
				hitDice.push({faces, level});

				for (let levelIndex = 0; levelIndex < level; levelIndex++) {
					if (!hasFirstLevel) {
						firstLevelHitPoints = Math.max(1, faces + constitutionModifier);
						calculatedAverage += firstLevelHitPoints;
						hasFirstLevel = true;
						continue;
					}
					const levelHitPoints = Math.max(1, Math.floor(faces / 2) + 1 + constitutionModifier);
					subsequentLevelHitPoints += levelHitPoints;
					calculatedAverage += levelHitPoints;
				}
			});

			if (!hasFirstLevel && !errors.length) errors.push("At least one class level is required to calculate hit points.");
			const isComplete = hasFirstLevel && !errors.length;
			const hitDiceByFaces = hitDice.reduce((accumulator, {faces, level}) => {
				accumulator[faces] = (accumulator[faces] || 0) + level;
				return accumulator;
			}, {});
			const hitDiceFormula = Object.entries(hitDiceByFaces)
				.sort(([a], [b]) => Number(b) - Number(a))
				.map(([faces, count]) => `${count}d${faces}`)
				.join(" + ");
			const laterDiceByFaces = hitDice.map(({faces, level}, index) => ({faces, level: level - (index === 0 ? 1 : 0)}))
				.filter(({level}) => level > 0)
				.reduce((accumulator, {faces, level}) => {
					accumulator[faces] = (accumulator[faces] || 0) + level;
					return accumulator;
				}, {});
			const formulaParts = [];
			if (hasFirstLevel) formulaParts.push(`${hitDice[0].faces}`);
			Object.entries(laterDiceByFaces)
				.sort(([a], [b]) => Number(b) - Number(a))
				.forEach(([faces, count]) => formulaParts.push(`${count}d${faces}`));
			const constitutionContribution = constitutionModifier * totalLevel;
			if (constitutionContribution) formulaParts.push(`${constitutionContribution}`);
			if (additionalHitPoints) formulaParts.push(`${additionalHitPoints}`);

			return {
				totalLevel,
				constitutionModifier,
				firstLevelHitPoints,
				subsequentLevelHitPoints,
				additionalHitPoints,
				calculatedAverage: isComplete ? calculatedAverage : null,
				average: _getFirstDefined(manualHitPoints, isComplete ? calculatedAverage : null),
				formula: formulaParts.join(" + ").replace(/ \+ -/g, " - ") || "0",
				hitDiceFormula: hitDiceFormula || "0",
				isComplete,
				errors
			};
		}

		static getArmorClass (options = {}) {
			return this.getArmorClassSummary(options).armorClass;
		}

		static getArmorClassSummary (options = {}) {
			const abilityScores = options.abilityScores || options.abilitySummary || {};
			const dexterityModifier = _getFirstDefined(_toInteger(options.dexterityModifier), _getAbilityModifier(abilityScores, "dex"), 0);
			const armor = options.armor || options.equippedArmor;
			const shield = options.shield || options.equippedShield;
			const bonusArmorClass = _sumNumericValues(_getOption(options, ["bonuses", "bonusArmorClass", "flatBonus"]));
			const armorBase = _getFirstDefined(_toNumber(armor && _getFirstDefined(armor.baseAc, armor.baseAC, armor.ac, armor.armorClass, armor)), null);
			const armorCategoryRaw = armor && (armor.category || armor.armorCategory || armor.type || armor.typeCode);
			const armorCategory = armorCategoryRaw == null ? null : `${armorCategoryRaw}`.trim().toLowerCase();
			const isLightArmor = armorCategory === "la" || armorCategory === "light" || armorCategory === "light armor";
			const isMediumArmor = armorCategory === "ma" || armorCategory === "medium" || armorCategory === "medium armor";
			const isHeavyArmor = armorCategory === "ha" || armorCategory === "heavy" || armorCategory === "heavy armor";
			const hasArmor = armorBase != null;
			let mode = "default";
			let baseArmorClass = 10;
			let dexterityContribution = dexterityModifier;
			let unarmoredDefenseContribution = 0;
			let allowsShield = true;

			if (hasArmor) {
				mode = "armor";
				baseArmorClass = armorBase;
				if (isHeavyArmor || armor.dexterityBonus === false || armor.addDexterity === false) dexterityContribution = 0;
				else if (isMediumArmor) {
					const dexterityMax = _getFirstDefined(_toInteger(_getFirstDefined(armor.dexterityMax, armor.maxDexBonus, armor.dexterityCap)), 2);
					dexterityContribution = Math.min(dexterityModifier, dexterityMax);
				} else if (!isLightArmor && armor.dexterityMax != null) {
					dexterityContribution = Math.min(dexterityModifier, _toInteger(armor.dexterityMax));
				}
			} else if (options.unarmoredDefense) {
				mode = "unarmored";
				const unarmoredDefense = Array.isArray(options.unarmoredDefense)
					? {abilityAbvs: options.unarmoredDefense}
					: options.unarmoredDefense === true ? {} : options.unarmoredDefense;
				baseArmorClass = _getFirstDefined(_toNumber(_getFirstDefined(unarmoredDefense.baseAc, unarmoredDefense.baseAC, unarmoredDefense.base)), 10);
				const abilityAbvs = unarmoredDefense.abilityAbvs || unarmoredDefense.abilities || ["dex"];
				dexterityContribution = 0;
				abilityAbvs.forEach(ability => {
					const modifier = _getAbilityModifier(abilityScores, ability);
					if (modifier == null) return;
					if (_normaliseAbility(ability) === "dex") dexterityContribution += modifier;
					else unarmoredDefenseContribution += modifier;
				});
				allowsShield = unarmoredDefense.allowShield !== false;
			}

			const shieldBonus = shield && allowsShield
				? _getFirstDefined(_toNumber(_getFirstDefined(shield.acBonus, shield.bonus, shield.ac, shield)), shield === true ? 2 : 0)
				: 0;
			const armorClass = baseArmorClass + dexterityContribution + unarmoredDefenseContribution + shieldBonus + bonusArmorClass;
			return {
				armorClass,
				mode,
				baseArmorClass,
				dexterityModifier,
				dexterityContribution,
				unarmoredDefenseContribution,
				shieldBonus,
				bonusArmorClass
			};
		}

		static getStatblockSummary (options = {}) {
			const classes = options.classes || [];
			const totalLevel = _toNonNegativeInteger(_getFirstDefined(options.totalLevel, this.getTotalLevel(classes)));
			const proficiencyBonus = _getFirstDefined(_toInteger(options.proficiencyBonus), this.getProficiencyBonus(totalLevel));
			const abilitySummary = options.abilitySummary || CharacterAbilityScoreService.getAbilitySummary({
				baseScores: options.baseScores || options.abilityScores,
				speciesBonuses: options.speciesBonuses,
				otherBonuses: options.otherBonuses
			});
			const abilityScores = CharacterAbilityScoreService.getAbilityTotals(abilitySummary);
			return {
				totalLevel,
				proficiencyBonus,
				challengeRating: this.getChallengeRating(totalLevel, options),
				abilitySummary,
				abilityScores,
				hp: this.getHitPoints({...options, classes, abilityScores}),
				ac: this.getArmorClass({...options, abilityScores}),
				save: this.getSaveMap({...options, classes, abilityScores, totalLevel, proficiencyBonus}),
				skill: this.getSkillMap({...options, classes, abilityScores, totalLevel, proficiencyBonus})
			};
		}
	}

	class CharacterTraitSummaryService {
		static getPresentation (definitions, traitName, context = {}) {
			const normalisedName = _normaliseTraitName(traitName);
			if (!normalisedName) return null;

			const getNormalisedValue = value => value == null ? null : `${value}`.trim().toLowerCase();
			const getMatchScore = definition => {
				const names = [definition.name, ...(definition.names || [])]
					.map(_normaliseTraitName)
					.filter(Boolean);
				if (!names.includes(normalisedName)) return -1;

				let score = 0;
				Object.entries(definition.match || {}).forEach(([key, expected]) => {
					if (score < 0) return;
					const actual = getNormalisedValue(context[key]);
					const expectedValues = (Array.isArray(expected) ? expected : [expected]).map(getNormalisedValue);
					if (!actual || !expectedValues.includes(actual)) score = -1;
					else score++;
				});
				return score;
			};

			const definition = (definitions || [])
				.map(it => ({definition: it, score: getMatchScore(it)}))
				.filter(it => it.score >= 0)
				.sort((a, b) => b.score - a.score)[0];
			if (!definition || (!definition.definition.summary && !definition.definition.summaryTemplate)) return null;
			return {
				id: definition.definition.id || normalisedName,
				summary: definition.definition.summary || null,
				...(definition.definition.summaryTemplate ? {summaryTemplate: definition.definition.summaryTemplate} : {}),
				isCollapsible: definition.definition.isCollapsible !== false
			};
		}
	}

	class CharacterSpellcastingService {
		static getWizardSpellbookKnown (level = 1) {
			const safeLevel = Math.max(1, _toNonNegativeInteger(level, 1));
			return 6 + (safeLevel - 1) * 2;
		}

		static getClassProgression (classData = {}, level = 1) {
			const levelIndex = Math.max(0, _toNonNegativeInteger(level, 1) - 1);
			const getTableCell = label => {
				for (const group of classData.classTableGroups || []) {
					const columnIndex = (group.colLabels || []).findIndex(it => `${it}`.toLowerCase().includes(label.toLowerCase()));
					if (!~columnIndex || !group.rows || !group.rows[levelIndex]) continue;
					return group.rows[levelIndex][columnIndex];
				}
				return null;
			};
			const getTableValue = label => _toInteger(getTableCell(label));
			const getMaximumSpellLevel = () => {
				const group = (classData.classTableGroups || []).find(it => `${it.title || ""}`.toLowerCase().includes("spell slots per spell level"));
				if (!group || !group.rows || !group.rows[levelIndex]) return null;
				const row = group.rows[levelIndex];
				for (let index = row.length - 1; index >= 0; --index) if ((_toInteger(row[index]) || 0) > 0) return index + 1;
				const pactSlotLevel = `${getTableCell("slot level") || ""}`.match(/(\d+)(?:st|nd|rd|th)/i);
				return pactSlotLevel ? Number(pactSlotLevel[1]) : 0;
			};
			return {
				cantripsKnown: Array.isArray(classData.cantripProgression) ? _toInteger(classData.cantripProgression[levelIndex]) : getTableValue("cantrips known"),
				spellsKnown: Array.isArray(classData.spellsKnownProgression) ? _toInteger(classData.spellsKnownProgression[levelIndex]) : getTableValue("spells known"),
				maximumSpellLevel: getMaximumSpellLevel(),
				isPreparedCaster: !!classData.preparedSpells,
				preparedSpellsFormula: classData.preparedSpells || null
			};
		}

		static formatSummaryTemplate (template, values = {}) {
			return `${template || ""}`.replace(/\{\{(\w+)\}\}/g, (match, key) => values[key] == null ? match : values[key]);
		}
	}

	const exported = {
		CharacterAbilityScoreService,
		CharacterSpeciesService,
		CharacterSelectionService,
		CharacterProficiencyService,
		CharacterStatblockService,
		CharacterTraitSummaryService,
		CharacterSpellcastingService
	};

	if (typeof globalThis !== "undefined") Object.assign(globalThis, exported);
	if (typeof module !== "undefined" && module.exports) module.exports = exported;
})();
