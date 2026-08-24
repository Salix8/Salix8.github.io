"use strict";

/**
 * Builds a player character as a regular 5etools monster. The public
 * `characterBuilder` payload keeps the editable choices, while the root
 * object remains consumable by the existing Bestiary and brew pipeline.
 */
class CharacterBuilder extends Builder {
	constructor () {
		super({
			titleSidebarLoadExisting: "Load Existing Character",
			titleSidebarDownloadJson: "Download Characters as JSON",
			prop: "monster"
		});

		this._classes = [];
		this._backgrounds = [];
		this._races = [];
		this._items = [];
		this._itemLookup = {};
		this._spellSearchIndexes = {};
		this._bestiaryMetaCache = {};
		this._traitSummaryDefinitions = [];
		this._renderOutputDebounced = MiscUtil.debounce(() => this._renderOutput(), 50);
	}

	async pInit () {
		const [classData, raceData, backgroundData, bestiaryMeta, items, traitSummaryData] = await Promise.all([
			DataUtil.class.loadJSON(),
			DataUtil.loadJSON("data/races.json"),
			DataUtil.loadJSON("data/backgrounds.json"),
			DataUtil.loadJSON("data/bestiary/meta.json"),
			Renderer.item.pBuildList({isBlacklistVariants: true}),
			DataUtil.loadJSON("data/character-builder-trait-summaries.json")
		]);

		const brew = BrewUtil.homebrew || {};
		this._classes = [...(classData.class || []), ...(brew.class || [])]
			.sort((a, b) => SortUtil.ascSortLower(a.name, b.name) || SortUtil.ascSortLower(a.source, b.source));
		this._backgrounds = [...(backgroundData.background || []), ...(brew.background || [])]
			.sort((a, b) => SortUtil.ascSortLower(a.name, b.name) || SortUtil.ascSortLower(a.source, b.source));
		this._races = [...(raceData.race || []), ...(brew.race || [])]
			.sort((a, b) => SortUtil.ascSortLower(a.name, b.name) || SortUtil.ascSortLower(a.source, b.source));

		(bestiaryMeta.legendaryGroup || []).forEach(it => {
			(this._bestiaryMetaCache[it.source] = this._bestiaryMetaCache[it.source] || {})[it.name] = it;
		});

		this._items = items;
		items.forEach(it => this._itemLookup[this._getEntityKey(it)] = it);
		this._traitSummaryDefinitions = traitSummaryData.traits || [];
	}

	async pGetUserSpellSearch (options) {
		options = options || {};
		const classRef = options.classRef;
		if (!classRef) return SearchWidget.pGetUserSpellSearch(options.level == null ? {} : {level: options.level});

		const classKey = this._getEntityKey(classRef);
		const indexKey = `characterbuilder-spells-${classKey}-${options.level == null ? "all" : options.level}`;
		if (!this._spellSearchIndexes[indexKey]) {
			const [officialSpells, homebrew] = await Promise.all([
				DataUtil.spell.pLoadAll(),
				BrewUtil.pAddBrewData()
			]);
			const matchesClass = spell => {
				const lists = spell.classes || {};
				return [lists.fromClassList, lists.fromClassListVariant]
					.filter(Array.isArray)
					.flat()
					.some(entry => entry.name === classRef.name && (entry.source || classRef.source || SRC_PHB) === (classRef.source || SRC_PHB));
			};
			const unique = new Map();
			[...officialSpells, ...((homebrew && homebrew.spell) || [])]
				.filter(spell => matchesClass(spell) && (options.level == null || spell.level === options.level))
				.forEach(spell => unique.set(this._getEntityKey(spell), spell));
			const index = elasticlunr(function () {
				this.addField("n");
				this.addField("s");
				this.setRef("id");
			});
			[...unique.values()].forEach((spell, id) => index.addDoc({
				id,
				c: Parser.CAT_ID_SPELL,
				n: spell.name,
				p: spell.page,
				s: spell.source,
				u: UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_SPELLS](spell)
			}));
			this._spellSearchIndexes[indexKey] = index;
			SearchWidget.CONTENT_INDICES[indexKey] = index;
		}

		const tagBuilder = (encName, encSource) => `{@spell ${decodeURIComponent(encName)}${encSource !== UrlUtil.encodeForHash(SRC_PHB) ? `|${decodeURIComponent(encSource)}` : ""}}`;
		const title = options.level === 0 ? `Select ${classRef.name} Cantrip` : `Select ${classRef.name} Spell`;
		return SearchWidget.pGetUserEntitySearch(title, indexKey, tagBuilder);
	}

	_getInitialState () {
		const draft = CharacterBuilder.getDefaultDraft();
		return {
			name: "New Character",
			source: this._ui ? this._ui.source : "",
			size: "M",
			type: "humanoid",
			alignment: ["N"],
			ac: [10],
			hp: {average: 1, formula: "1d8"},
			speed: {walk: 30},
			str: 15,
			dex: 14,
			con: 13,
			int: 12,
			wis: 10,
			cha: 8,
			passive: 10,
			level: 0,
			cr: "0",
			characterBuilder: draft
		};
	}

	static getDefaultDraft () {
		return {
			version: 1,
			classes: [],
			background: {ref: null, choices: {}},
			species: {raceRef: null, subraceRef: null, choices: {}},
			choiceSelections: {},
			manualChoices: [],
			spellcastingSelections: {},
			abilityScores: {
				mode: "standardArray",
				base: {str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8},
				standardArrayAssignments: {str: null, dex: null, con: null, int: null, wis: null, cha: null},
				otherBonus: {str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0},
				pointBuy: {
					budget: 27,
					min: 8,
					max: 15
				}
			},
			inventory: [],
			overrides: {
				cr: null,
				hp: null,
				ac: null,
				type: null,
				isNpc: false,
				actions: []
			}
		};
	}

	setStateFromLoaded (state) {
		if (state && state.s && state.m) {
			this.__state = state.s;
			this.__meta = state.m;
		} else if (state && state.characterBuilder) {
			this.__state = state;
			this.__meta = this.getInitialMetaState();
		}

		this.__state = this.__state || this._getInitialState();
		const loadedSource = this.__state.source;
		this.__state.characterBuilder = this._getNormalizedDraft(this.__state.characterBuilder);
		// Character entries are scoped to the page's active homebrew source. This
		// keeps the sidebar, JSON metadata, and saved monster in the same source.
		if (this._ui && this._ui.source) {
			if (loadedSource && loadedSource !== this._ui.source && this.__meta.ixBrew != null) this.__meta.ixBrew = null;
			this.__state.source = this._ui.source;
		}
		this.doCreateProxies();

		if (this.__meta.ixBrew != null) {
			const expectedIx = (BrewUtil.homebrew.monster || []).findIndex(it => it.source === this.__state.source && it.name === this.__state.name && it.characterBuilder);
			if (!~expectedIx) this.__meta.ixBrew = null;
			else this.__meta.ixBrew = expectedIx;
		}
	}

	_getNormalizedDraft (raw) {
		const defaults = CharacterBuilder.getDefaultDraft();
		const draft = raw ? MiscUtil.copy(raw) : defaults;
		draft.version = 1;
		draft.classes = (draft.classes || []).map((it, ix) => ({
			id: it.id || `class-${ix + 1}`,
			ref: it.ref || null,
			level: Math.max(1, Math.min(20, Number(it.level) || 1)),
			subclassRef: it.subclassRef || null,
			isPrimary: !!it.isPrimary
		}));
		const classKeys = new Set();
		draft.classes.forEach(row => {
			if (!row.ref) return;
			const key = `${row.ref.name || ""}|${row.ref.source || SRC_PHB}`.toLowerCase();
			if (!classKeys.has(key)) return classKeys.add(key);
			row.ref = null;
			row.subclassRef = null;
		});
		let levelBudget = 20;
		draft.classes.forEach(row => {
			if (!row.ref) return;
			if (levelBudget < 1) {
				row.ref = null;
				row.subclassRef = null;
				return;
			}
			row.level = Math.min(row.level, levelBudget);
			levelBudget -= row.level;
		});
		const primaryClass = draft.classes.find(it => it.ref && it.isPrimary)
			|| draft.classes.find(it => it.ref)
			|| draft.classes[0];
		draft.classes.forEach(it => it.isPrimary = it === primaryClass);
		draft.background = {...defaults.background, ...(draft.background || {})};
		draft.species = {...defaults.species, ...(draft.species || {})};
		draft.background.choices = {...(draft.background.choices || {})};
		draft.species.choices = {...(draft.species.choices || {})};
		draft.species.choices.ability = {...(draft.species.choices.ability || {})};
		draft.choiceSelections = draft.choiceSelections || {};
		draft.manualChoices = draft.manualChoices || [];
		draft.spellcastingSelections = draft.spellcastingSelections || {};
		draft.inventory = draft.inventory || [];
		draft.overrides = {...defaults.overrides, ...(draft.overrides || {})};
		draft.overrides.actions = draft.overrides.actions || [];
		draft.abilityScores = {...defaults.abilityScores, ...(draft.abilityScores || {})};
		draft.abilityScores.base = {...defaults.abilityScores.base, ...(draft.abilityScores.base || {})};
		draft.abilityScores.standardArrayAssignments = {...defaults.abilityScores.standardArrayAssignments, ...(draft.abilityScores.standardArrayAssignments || {})};
		draft.abilityScores.otherBonus = {...defaults.abilityScores.otherBonus, ...(draft.abilityScores.otherBonus || {})};
		draft.abilityScores.pointBuy = {...defaults.abilityScores.pointBuy, ...(draft.abilityScores.pointBuy || {})};
		delete draft.abilityScores.pointBuy.costs;

		// Migrate drafts saved before the standard-array bench existed.
		const assignments = draft.abilityScores.standardArrayAssignments;
		const hasAssignments = Parser.ABIL_ABVS.some(abv => assignments[abv] != null);
		const oldValues = Parser.ABIL_ABVS.map(abv => Number(draft.abilityScores.base[abv]));
		const isLegacyCompleteArray = oldValues.length === CharacterBuilder.STANDARD_ARRAY.length
			&& new Set(oldValues).size === CharacterBuilder.STANDARD_ARRAY.length
			&& oldValues.every(value => CharacterBuilder.STANDARD_ARRAY.includes(value));
		if (!hasAssignments && draft.abilityScores.mode === "standardArray" && isLegacyCompleteArray) {
			Parser.ABIL_ABVS.forEach(abv => assignments[abv] = Number(draft.abilityScores.base[abv]));
		}
		return draft;
	}

	getSideMenuItems () {
		return super.getSideMenuItems().filter(it => it.characterBuilder && it.characterBuilder.version);
	}

	getSaveableState () {
		const state = super.getSaveableState();
		state.s = DataUtil.cleanJson(MiscUtil.copy(state.s));
		return state;
	}

	async _renderInputControls_pSaveBrew () {
		const character = DataUtil.cleanJson(MiscUtil.copy(this.__state));
		if (this.ixBrew != null) {
			await BrewUtil.pUpdateEntryByIx(this._prop, this.ixBrew, character);
			this.renderSideMenu();
		} else {
			this.ixBrew = await BrewUtil.pAddEntry(this._prop, character);
			await Omnisearch.pAddToIndex(this._prop, character);
			await SearchWidget.P_LOADING_CONTENT;
			SearchWidget.addToIndexes(this._prop, character);
		}
		this.isEntrySaved = true;
		this.mutSavedButtonText();
		this.doUiSave();
	}

	handleSidebarDownloadJsonClick () {
		const out = this._ui._getJsonOutputTemplate();
		out[this._prop] = this.getSideMenuItems()
			.map(entry => PropOrder.getOrdered(DataUtil.cleanJson(MiscUtil.copy(entry)), this._prop));
		DataUtil.userDownload(DataUtil.getCleanFilename(BrewUtil.sourceJsonToFull(this._ui.source)), out);
	}

	async pHandleSidebarLoadExistingClick () {
		const result = await SearchWidget.pGetUserCreatureSearch();
		if (!result) return;
		const creature = await Renderer.hover.pCacheAndGet(result.page, result.source, result.hash);
		if (!creature || !creature.characterBuilder) {
			return JqueryUtil.doToast({type: "warning", content: "That entry was not created with Character Builder."});
		}
		if (creature.source && this._ui.allSources.includes(creature.source) && this._ui.source !== creature.source) this._ui.source = creature.source;
		const ixBrew = (BrewUtil.homebrew.monster || []).findIndex(it => it.source === creature.source && it.name === creature.name && it.characterBuilder);
		this.setStateFromLoaded({s: MiscUtil.copy(creature), m: {...this.getInitialMetaState(), ixBrew: ~ixBrew ? ixBrew : null}});
		this.renderInput();
		this.renderOutput();
	}

	doHandleSourcesAdd () {
		// Source selection is owned by PageUi and needs no per-character control.
	}

	doHandleSourceUpdate () {
		// Unlike Creature Builder, Character Builder does not expose a per-entry
		// source selector: generic export/sidebar code is intentionally scoped to
		// PageUi's active source, so the character must follow it exactly.
		if (this._ui.source && this._state.source !== this._ui.source) {
			this._state.source = this._ui.source;
			// Never update a saved entry by index after moving it to another source.
			// Saving now creates a source-local copy, preserving the original entry.
			if (this.ixBrew != null) {
				this.ixBrew = null;
				this.isEntrySaved = false;
				JqueryUtil.doToast({type: "info", content: "The character now belongs to the selected source. Save to create its source-local copy."});
			}
		}
		this._sourcesCache = MiscUtil.copy(this._ui.allSources);
		this.renderInput();
		this.renderOutput();
		this.renderSideMenu();
		this.doUiSave();
		this.mutSavedButtonText();
	}

	_renderInputImpl () {
		this.renderInputControls();
		this._renderInputMain();
	}

	_renderInputMain () {
		this._sourcesCache = MiscUtil.copy(this._ui.allSources);
		this.doCreateProxies();
		this._syncMonsterFromDraft();

		const $wrp = this._ui.$wrpInput.empty();
		const cb = () => this._handleDraftChanged();
		this._cbCache = cb;

		this._renderIdentity($wrp, cb);

		this._resetTabs("input");
		const tabs = ["Class", "Background", "Species", "Ability Scores", "Equipment"]
			.map((it, ix) => this._getTab(ix, it, {hasBorder: true, tabGroup: "input", stateObj: this._meta, cbTabChange: this.doUiSave.bind(this)}));
		const [classTab, backgroundTab, speciesTab, abilityTab, equipmentTab] = tabs;
		$$`<div class="flex-v-center w-100 no-shrink ui-tab__wrp-tab-heads--border">${tabs.map(it => it.$btnTab)}</div>`.appendTo($wrp);
		tabs.forEach(it => it.$wrpTab.appendTo($wrp));

		this._renderClassTab(classTab.$wrpTab, cb);
		this._renderBackgroundTab(backgroundTab.$wrpTab, cb);
		this._renderSpeciesTab(speciesTab.$wrpTab, cb);
		this._renderAbilityTab(abilityTab.$wrpTab, cb);
		this._renderEquipmentTab(equipmentTab.$wrpTab, cb);
	}

	_renderIdentity ($wrp, cb) {
		const $identity = $(`<div class="flex-col px-2 pt-2 mkbru__wrp-tab-heads--border"/>`).appendTo($wrp);
		BuilderUi.$getStateIptString("Name", () => {
			this.renderSideMenu();
			cb();
		}, this._state, {nullable: false}, "name").appendTo($identity);

		const [$row, $inner] = BuilderUi.getLabelledRowTuple("Alignment", {isMarked: true});
		const $sel = $(`<select class="form-control input-xs"/>`)
			.append(CharacterBuilder.ALIGNMENTS.map(it => `<option value="${it.value}">${it.label}</option>`).join(""))
			.val((this._state.alignment || ["N"])[0])
			.change(() => {
				this._state.alignment = [$sel.val()];
				cb();
			});
		$sel.appendTo($inner);
		$row.appendTo($identity);

		const draft = this._getDraft();
		const [$overrideRow, $overrideInner] = BuilderUi.getLabelledRowTuple("Statblock Overrides", {isMarked: true});
		const $iptType = $(`<input class="form-control input-xs mr-2" placeholder="humanoid">`).val(draft.overrides.type || "")
			.change(() => this._mutDraft(d => d.overrides.type = $iptType.val().trim() || null, cb));
		const $cbNpc = $(`<label class="flex-v-center no-shrink"><input type="checkbox" class="mr-1">NPC</label>`)
			.find("input").prop("checked", !!draft.overrides.isNpc).change(evt => this._mutDraft(d => d.overrides.isNpc = !!evt.target.checked, cb)).end();
		$$`<div class="flex-v-center w-100"><span class="mr-2 text-muted">Type</span>${$iptType}${$cbNpc}</div>`.appendTo($overrideInner);
		$overrideRow.appendTo($identity);
	}

	_getDraft () {
		return this._state.characterBuilder || CharacterBuilder.getDefaultDraft();
	}

	_mutDraft (mutator, cb, opts) {
		opts = opts || {};
		const draft = this._getNormalizedDraft(this._getDraft());
		mutator(draft);
		this._state.characterBuilder = this._getNormalizedDraft(draft);
		this._syncMonsterFromDraft();
		if (opts.isRerender) this.renderInput();
		if (cb) cb();
	}

	_clearChoiceSelections (draft, prefix) {
		Object.keys(draft.choiceSelections || {}).forEach(key => {
			if (key.startsWith(prefix)) delete draft.choiceSelections[key];
		});
	}

	_clearStructuredFeatureChoices (draft, prefix) {
		draft.manualChoices = (draft.manualChoices || []).filter(choice => !`${choice.id || ""}`.startsWith(`structured:${prefix}`));
	}

	_handleDraftChanged () {
		this._syncMonsterFromDraft();
		this.renderOutput();
		this.doUiSave();
		this.isEntrySaved = false;
		this.mutSavedButtonText();
	}

	_getEntityKey (entity) {
		return `${(entity.name || "").toLowerCase()}|${(entity.source || SRC_PHB).toLowerCase()}`;
	}

	_getEntityRef (entity) {
		return entity ? {name: entity.name, source: entity.source || SRC_PHB} : null;
	}

	_findEntity (list, ref) {
		if (!ref) return null;
		const key = `${ref.name || ""}|${ref.source || SRC_PHB}`.toLowerCase();
		return list.find(it => this._getEntityKey(it) === key) || null;
	}

	_getClass (ref) { return this._findEntity(this._classes, ref); }
	_getBackground (ref) { return this._findEntity(this._backgrounds, ref); }
	_getRace (ref) { return this._findEntity(this._races, ref); }
	_getItem (ref) { return ref && this._itemLookup[`${ref.name}|${ref.source || SRC_PHB}`.toLowerCase()]; }

	_getPrimaryClassRow (draft) {
		return draft.classes.find(it => it.isPrimary) || draft.classes[0] || null;
	}

	_getTotalLevel (draft) {
		const classes = draft.classes.filter(row => row.ref).map(row => ({level: row.level}));
		if (typeof CharacterProficiencyService !== "undefined") return CharacterProficiencyService.getTotalLevel(classes);
		return classes.reduce((total, row) => total + Number(row.level || 1), 0);
	}

	_getMergedSpecies (draft) {
		const base = this._getRace(draft.species.raceRef);
		if (!base) return null;
		if (!draft.species.subraceRef) {
			const out = MiscUtil.copy(base);
			delete out.subraces;
			return out;
		}
		const ref = draft.species.subraceRef;
		const subraces = base.subraces || [];
		const selectedIndex = ref.ix != null && Number.isInteger(Number(ref.ix)) && subraces[Number(ref.ix)]
			? Number(ref.ix)
			: subraces.findIndex(subrace => (subrace.name || null) === (ref.name || null)
				&& (subrace.source || base.source) === (ref.source || base.source));
		const selectedSubrace = subraces[selectedIndex];
		if (!selectedSubrace) return null;
		const merged = Renderer.race.mergeSubraces([MiscUtil.copy(base)], {isAddBaseRaces: true});
		const expectedName = selectedSubrace.name ? `${base.name} (${selectedSubrace.name})` : base.name;
		const expectedSource = selectedSubrace.source || base.source;
		return merged.find(it => it._baseName === base.name
			&& it.name === expectedName
			&& (it.source || base.source) === expectedSource)
			|| merged.find(it => it._baseName === base.name && it.name === expectedName)
			|| null;
	}

	_getSpeciesAbilityChoiceGroups (species) {
		if (typeof CharacterSpeciesService !== "undefined") return CharacterSpeciesService.getAbilityChoiceGroups(species);
		return (species && species.ability || []).map((ability, index) => {
			if (!ability || !ability.choose) return null;
			const choose = ability.choose;
			const options = (choose.from || []).filter(abv => Parser.ABIL_ABVS.includes(abv));
			if (!options.length) return null;
			return {
				key: `ability:${index}`,
				options,
				count: Math.max(1, Number(choose.count || 1)),
				amount: choose.amount == null ? 1 : Number(choose.amount)
			};
		}).filter(Boolean);
	}

	_getSpeciesBonuses (draft, species) {
		if (typeof CharacterSpeciesService !== "undefined") return CharacterSpeciesService.getAbilityBonuses(species, draft.species.choices);
		const out = {str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0};
		if (!species || !species.ability) return out;
		(species.ability || []).forEach((ability, index) => {
			Parser.ABIL_ABVS.forEach(abv => out[abv] += Number(ability[abv] || 0));
			const choice = ability.choose;
			if (!choice) return;
			const selected = ((draft.species.choices.ability || {})[`ability:${index}`] || []);
			const allowed = new Set(choice.from || []);
			const amount = choice.amount == null ? 1 : Number(choice.amount);
			const count = Number(choice.count || 1);
			[...new Set(selected)].slice(0, count).forEach(abv => {
				if (allowed.has(abv) && Parser.ABIL_ABVS.includes(abv)) out[abv] += amount;
			});
		});
		return out;
	}

	_getSpeciesSize (draft, species) {
		if (typeof CharacterSpeciesService !== "undefined") return CharacterSpeciesService.getSelectedSize(species, draft.species.choices);
		const sizes = Array.isArray(species && species.size) ? species.size : [species && species.size];
		return sizes.includes(draft.species.choices.size) ? draft.species.choices.size : (sizes.filter(Boolean)[0] || "M");
	}

	_getSpeciesCreatureType (draft, species) {
		if (typeof CharacterSpeciesService !== "undefined") return CharacterSpeciesService.getCreatureType(species, draft.species.choices);
		const structured = species && (species.creatureType || species.type);
		return draft.species.choices.creatureType || (Array.isArray(structured) ? structured[0] : structured) || "humanoid";
	}

	_getAbilitySummary (draft, opts) {
		opts = opts || {};
		const speciesBonuses = this._getSpeciesBonuses(draft, this._getMergedSpecies(draft));
		const base = {};
		Parser.ABIL_ABVS.forEach(abv => base[abv] = draft.abilityScores.base[abv] == null
			? opts.isFillMissing ? 10 : null
			: Number(draft.abilityScores.base[abv]));
		if (typeof CharacterAbilityScoreService !== "undefined") {
			const calculated = CharacterAbilityScoreService.getAbilitySummary({
				baseScores: base,
				speciesBonuses,
				otherBonuses: draft.abilityScores.otherBonus
			});
			const out = {};
			Parser.ABIL_ABVS.forEach(abv => out[abv] = {
				base: calculated[abv].base,
				species: calculated[abv].speciesBonus,
				other: calculated[abv].otherBonus,
				total: calculated[abv].total,
				modifier: calculated[abv].modifier
			});
			return out;
		}
		const out = {};
		Parser.ABIL_ABVS.forEach(abv => {
			const safeBase = base[abv] == null || isNaN(base[abv]) ? (opts.isFillMissing ? 10 : null) : base[abv];
			const other = Number(draft.abilityScores.otherBonus[abv]) || 0;
			out[abv] = {
				base: safeBase,
				species: speciesBonuses[abv] || 0,
				other,
				total: safeBase == null ? null : safeBase + (speciesBonuses[abv] || 0) + other,
				modifier: safeBase == null ? null : Parser.getAbilityModNumber(safeBase + (speciesBonuses[abv] || 0) + other)
			};
		});
		return out;
	}

	_getClassPackage (classRow, cls, draft) {
		if (!classRow || !cls) return {};
		const primary = this._getPrimaryClassRow(draft);
		return primary && primary.id === classRow.id
			? (cls.startingProficiencies || {})
			: ((cls.multiclassing || {}).proficienciesGained || {});
	}

	_getProficiencyData (draft) {
		const data = {
			fixed: {skill: new Set(), language: new Set(), tool: new Set()},
			fixedSources: {skill: [], language: [], tool: []},
			groups: [],
			packages: []
		};
		const add = (raw, kind, key, label, scope) => this._addProficiencySource(data, raw, kind, key, label, scope);

		draft.classes.forEach(row => {
			const cls = this._getClass(row.ref);
			if (!cls) return;
			const pkg = this._getClassPackage(row, cls, draft);
			data.packages.push({label: `${cls.name}${row.isPrimary ? " (primary)" : " (multiclass)"}`, pkg});
			add(pkg.skills, "skill", `class:${row.id}:skill`, `${cls.name} skills`, "class");
			add(pkg.languages, "language", `class:${row.id}:language`, `${cls.name} languages`, "class");
			add(pkg.tools, "tool", `class:${row.id}:tool`, `${cls.name} tools`, "class");
		});

		const background = this._getBackground(draft.background.ref);
		if (background) {
			add(background.skillProficiencies, "skill", "background:skill", "Background skills", "background");
			add(background.languageProficiencies, "language", "background:language", "Background languages", "background");
			add(background.toolProficiencies, "tool", "background:tool", "Background tools", "background");
		}

		const species = this._getMergedSpecies(draft);
		if (species) {
			add(species.skillProficiencies, "skill", "species:skill", "Species skills", "species");
			add(species.languageProficiencies, "language", "species:language", "Species languages", "species");
			add(species.toolProficiencies, "tool", "species:tool", "Species tools", "species");
		}

		return data;
	}

	_addProficiencySource (data, raw, kind, key, label, scope) {
		if (!raw) return;
		const values = Array.isArray(raw) ? raw : [raw];
		values.forEach((entry, ix) => {
			if (typeof entry === "string") {
				if (/\b(choice|any one|one type|two types|three types)\b/i.test(entry)) {
					const countMatch = /\b(one|two|three|four|five|\d+)\b/i.exec(entry);
					const counts = {one: 1, two: 2, three: 3, four: 4, five: 5};
					const count = countMatch ? counts[countMatch[1].toLowerCase()] || Number(countMatch[1]) || 1 : 1;
					data.groups.push({key: `${key}:${ix}:text`, label, kind, scope, count, options: []});
				} else {
					data.fixed[kind].add(entry);
					data.fixedSources[kind].push(entry);
				}
				return;
			}
			if (!entry || typeof entry !== "object") return;
			Object.entries(entry).forEach(([prop, value]) => {
				if (prop === "choose" && value) {
					const from = (value.from || []).map(it => typeof it === "string" ? it : it.name).filter(Boolean);
					data.groups.push({
						key: `${key}:${ix}`,
						label,
						kind,
						scope,
						count: Number(value.count || 1),
						options: from
					});
					return;
				}
				if (CharacterBuilder.CHOICE_KEYS.has(prop) && (value === true || typeof value === "number" && value > 0)) {
					data.groups.push({
						key: `${key}:${ix}:${prop}`,
						label: `${label} (${prop})`,
						kind,
						scope,
						count: value === true ? 1 : Number(value),
						options: this._getProficiencyChoiceOptions(kind, prop)
					});
					return;
				}
				if (value === true) {
					data.fixed[kind].add(prop);
					data.fixedSources[kind].push(prop);
				}
			});
		});
	}

	_getProficiencyChoiceOptions (kind, prop) {
		if (kind === "skill" && ["any", "anyStandard", "other"].includes(prop)) return Object.keys(Parser.SKILL_TO_ATB_ABV);
		if (kind === "language" && prop === "anyStandard") return CharacterBuilder.STANDARD_LANGUAGES;
		return [];
	}

	_getSelectedProficiencies (draft, data) {
		if (typeof CharacterSelectionService !== "undefined") {
			return CharacterSelectionService.getResolvedSelections({
				groups: data.groups,
				choiceSelections: draft.choiceSelections,
				fixed: data.fixed
			}).selected;
		}
		const out = {skill: new Set(data.fixed.skill), language: new Set(data.fixed.language), tool: new Set(data.fixed.tool)};
		data.groups.forEach(group => {
			const seen = new Set();
			(draft.choiceSelections[group.key] || []).forEach(value => {
				if (!value || seen.size >= group.count || seen.has(value)) return;
				if (group.options.length && !group.options.includes(value)) return;
				seen.add(value);
				out[group.kind].add(value);
			});
		});
		return out;
	}

	_getPointBuySpent (draft) {
		const pointBuy = draft.abilityScores.pointBuy;
		if (typeof CharacterAbilityScoreService !== "undefined") {
			return CharacterAbilityScoreService.getPointBuySpent(draft.abilityScores.base, {minScore: pointBuy.min, maxScore: pointBuy.max});
		}
		return Parser.ABIL_ABVS.reduce((total, abv) => total + Number(CharacterBuilder.POINT_BUY_COSTS[draft.abilityScores.base[abv]] || 0), 0);
	}

	_getHp (draft, abilitySummary) {
		const override = Number(draft.overrides.hp);
		if (!isNaN(override) && override > 0) return {average: override, formula: `${override}`};
		const classRows = [...draft.classes]
			.filter(row => this._getClass(row.ref))
			.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
		if (typeof CharacterStatblockService !== "undefined") {
			const calculated = CharacterStatblockService.getHitPoints({
				classes: classRows.map(row => ({level: row.level, classData: this._getClass(row.ref)})),
				constitutionScore: abilitySummary.con.total
			});
			if (calculated.isComplete) return {average: calculated.average, formula: calculated.formula};
		}

		let total = 0;
		const dice = [];
		let isFirstLevel = true;
		classRows.forEach(row => {
			const cls = this._getClass(row.ref);
			if (!cls || !cls.hd) return;
			const faces = Number(cls.hd.faces || 8);
			const levels = Number(row.level || 1);
			for (let i = 0; i < levels; ++i) {
				total += isFirstLevel ? faces : Math.floor(faces / 2) + 1;
				dice.push(isFirstLevel ? `${faces}` : `1d${faces}`);
				isFirstLevel = false;
			}
		});
		const totalLevel = this._getTotalLevel(draft);
		const conMod = Parser.getAbilityModNumber(abilitySummary.con.total);
		total += conMod * totalLevel;
		if (!dice.length) return {average: 1, formula: "1d8"};
		const bonus = conMod * totalLevel;
		return {average: Math.max(1, total), formula: `${dice.join(" + ")}${bonus ? ` ${bonus >= 0 ? "+" : "-"} ${Math.abs(bonus)}` : ""}`};
	}

	_getArmorClass (draft, abilitySummary) {
		const override = Number(draft.overrides.ac);
		if (!isNaN(override) && override > 0) return [override];
		const armors = [];
		let shield = null;
		(draft.inventory || []).filter(it => it.equipped).forEach(inv => {
			const item = this._getItem(inv.ref);
			if (!item) return;
			if (item.type === "S" && item.ac != null) {
				if (!shield || Number(item.ac) > Number(shield.ac)) shield = item;
			} else if (item.ac != null) armors.push(item);
		});

		const abilityScores = {};
		Parser.ABIL_ABVS.forEach(abv => abilityScores[abv] = abilitySummary[abv].total);
		const getAc = armor => {
			if (typeof CharacterStatblockService !== "undefined") {
				return CharacterStatblockService.getArmorClassSummary({abilityScores, armor, shield}).armorClass;
			}
			const dex = Parser.getAbilityModNumber(abilitySummary.dex.total);
			if (!armor) return 10 + dex + (shield ? Number(shield.ac || 0) : 0);
			const armorType = `${armor.type || ""}`.toUpperCase();
			const dexBonus = armorType === "HA" ? 0 : armorType === "MA" ? Math.min(dex, 2) : dex;
			return Number(armor.ac || 10) + dexBonus + (shield ? Number(shield.ac || 0) : 0);
		};
		const armor = [null, ...armors].reduce((best, candidate) => getAc(candidate) > getAc(best) ? candidate : best, null);
		const ac = getAc(armor);
		const from = [];
		if (armor) from.push(`{@item ${armor.name}|${armor.source}}`);
		if (shield) from.push(`{@item ${shield.name}|${shield.source}}`);
		return from.length ? [{ac, from}] : [ac];
	}

	_getWeaponProficiencies (draft) {
		const proficiencies = new Set();
		const add = raw => {
			const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
			values.forEach(entry => {
				if (typeof entry === "string") proficiencies.add(CharacterBuilder.getNormalizedWeaponName(entry));
				else if (entry && typeof entry === "object") Object.entries(entry).forEach(([name, value]) => {
					if (value === true) proficiencies.add(CharacterBuilder.getNormalizedWeaponName(name));
				});
			});
		};
		draft.classes.forEach(row => {
			const cls = this._getClass(row.ref);
			add(cls && this._getClassPackage(row, cls, draft).weapons);
		});
		const species = this._getMergedSpecies(draft);
		if (species) add(species.weaponProficiencies);
		return proficiencies;
	}

	_isWeaponProficient (item, proficiencies) {
		const weaponName = CharacterBuilder.getNormalizedWeaponName(item.name);
		const category = CharacterBuilder.getNormalizedWeaponName(item.weaponCategory);
		return proficiencies.has(weaponName)
			|| category === "simple" && (proficiencies.has("simple") || proficiencies.has("simple weapon"))
			|| category === "martial" && (proficiencies.has("martial") || proficiencies.has("martial weapon"));
	}

	_getSuggestedActions (draft, abilitySummary, proficiencyBonus) {
		const out = [];
		const weaponProficiencies = this._getWeaponProficiencies(draft);
		(draft.inventory || []).filter(it => it.equipped).forEach(inv => {
			const item = this._getItem(inv.ref);
			if (!item || !item.dmg1) return;
			const properties = item.property || [];
			const isRangedWeapon = item.type === "R" || `${item.weaponCategory || ""}`.toLowerCase().includes("ranged") || properties.includes("R");
			const isRanged = isRangedWeapon || properties.includes("T");
			const isMelee = item.type !== "R";
			const isFinesse = properties.includes("F");
			const strMod = Parser.getAbilityModNumber(abilitySummary.str.total);
			const dexMod = Parser.getAbilityModNumber(abilitySummary.dex.total);
			const abilityMod = isRangedWeapon ? dexMod : isFinesse ? Math.max(strMod, dexMod) : strMod;
			const attack = (this._isWeaponProficient(item, weaponProficiencies) ? proficiencyBonus : 0) + abilityMod;
			const mode = [isMelee ? "mw" : null, isRanged ? "rw" : null].filter(Boolean).join(",");
			const range = [
				isMelee ? "reach 5 ft." : null,
				isRanged ? `range ${item.range || "—"} ft.` : null
			].filter(Boolean).join(" or ");
			const damage = `${item.dmg1}${abilityMod ? ` ${abilityMod >= 0 ? "+" : "-"} ${Math.abs(abilityMod)}` : ""}`;
			const damageType = Parser.dmgTypeToFull(item.dmgType) || item.dmgType || "";
			out.push({
				name: item.name,
				entries: [`{@atk ${mode}} {@hit ${attack}} to hit, ${range}, one target. {@h} {@damage ${damage}} ${damageType} damage.`]
			});
		});
		return out;
	}

	_syncMonsterFromDraft () {
		if (!this._state) return;
		const draft = this._getNormalizedDraft(this._getDraft());
		if (this._state.characterBuilder !== draft) this._state.characterBuilder = draft;
		const abilities = this._getAbilitySummary(draft, {isFillMissing: true});
		const proficiencies = this._getProficiencyData(draft);
		const selected = this._getSelectedProficiencies(draft, proficiencies);
		const totalLevel = this._getTotalLevel(draft);
		const pb = typeof CharacterProficiencyService !== "undefined"
			? CharacterProficiencyService.getProficiencyBonus(totalLevel)
			: totalLevel ? Parser.levelToPb(totalLevel) : 2;
		const primaryRow = this._getPrimaryClassRow(draft);
		const primaryClass = primaryRow && this._getClass(primaryRow.ref);
		const species = this._getMergedSpecies(draft);

		Parser.ABIL_ABVS.forEach(abv => this._state[abv] = abilities[abv].total);
		this._state.level = totalLevel;
		this._state.cr = draft.overrides.cr != null && draft.overrides.cr !== ""
			? `${draft.overrides.cr}`
			: typeof CharacterStatblockService !== "undefined" ? CharacterStatblockService.getChallengeRating(totalLevel) : `${totalLevel || 0}`;
		this._state.type = draft.overrides.type || this._getSpeciesCreatureType(draft, species);
		this._state.isNpc = !!draft.overrides.isNpc;
		if (!this._state.isNpc) delete this._state.isNpc;
		this._state.size = this._getSpeciesSize(draft, species);
		this._state.speed = CharacterBuilder.getNormalizedSpeed(species && species.speed || 30);
		this._state.hp = this._getHp(draft, abilities);
		this._state.ac = this._getArmorClass(draft, abilities);

		const save = {};
		(primaryClass && primaryClass.proficiency || []).forEach(abv => {
			const val = Parser.getAbilityModNumber(abilities[abv].total) + pb;
			save[abv] = CharacterBuilder.getSigned(val);
		});
		if (Object.keys(save).length) this._state.save = save;
		else delete this._state.save;

		const skill = {};
		selected.skill.forEach(name => {
			const ability = Parser.skillToAbilityAbv(name);
			if (!ability) return;
			skill[name] = CharacterBuilder.getSigned(Parser.getAbilityModNumber(abilities[ability].total) + pb);
		});
		if (Object.keys(skill).length) this._state.skill = skill;
		else delete this._state.skill;
		this._state.passive = 10 + (skill.perception ? Number(skill.perception) : Parser.getAbilityModNumber(abilities.wis.total));

		const languages = [...selected.language];
		if (languages.length) this._state.languages = languages.map(it => it.toTitleCase());
		else delete this._state.languages;
		const senses = [];
		if (species && species.darkvision) senses.push(`darkvision ${species.darkvision} ft.`);
		if (senses.length) this._state.senses = senses;
		else delete this._state.senses;

		const traits = this._getTraits(draft, species, proficiencies, selected);
		if (traits.length) this._state.trait = traits;
		else delete this._state.trait;
		const actions = [...this._getSuggestedActions(draft, abilities, pb), ...(draft.overrides.actions || [])]
			.filter(it => it && it.name && it.entries && it.entries.length);
		if (actions.length) this._state.action = actions;
		else delete this._state.action;

		// Keep the renderer's type/CR caches in sync for the live statblock and
		// for Bestiary list/filter consumers. Persistence paths clean `_p*` keys.
		if (Renderer.monster && Renderer.monster.updateParsed) Renderer.monster.updateParsed(this._state);
	}

	_getTraits (draft, species, proficiencies, selected) {
		const traits = [];
		const addEntry = (entry, fallbackName, featureOrigin) => {
			if (!entry) return;
			const trait = typeof entry === "string"
				? {name: fallbackName, entries: [entry]}
				: entry.entries ? {name: entry.name || fallbackName, entries: MiscUtil.copy(entry.entries)} : null;
			if (!trait) return;
			const presentation = typeof CharacterTraitSummaryService !== "undefined"
				? CharacterTraitSummaryService.getPresentation(this._traitSummaryDefinitions, trait.name, featureOrigin)
				: null;
			if (presentation) {
				if (presentation.summaryTemplate) presentation.summary = this._getFormattedSpellcastingSummary(presentation.summaryTemplate, featureOrigin, draft);
				delete presentation.summaryTemplate;
				const featureLink = featureOrigin ? this._getFeatureLink(trait.name, featureOrigin) : null;
				trait.characterBuilderSummary = {...presentation, ...(featureLink || {})};
			}
			else if (JSON.stringify(trait.entries).length >= CharacterBuilder.TRAIT_COLLAPSE_MIN_LENGTH) {
				// Keep unknown long features usable without pretending to understand
				// their rules. Named entries in the JSON catalogue replace this fallback.
				trait.characterBuilderSummary = {
					id: "automatic-long-trait",
					summary: "Full description hidden to keep the statblock compact.",
					isCollapsible: true
				};
			}
			traits.push(trait);
		};

		if (species) {
			const speciesEntries = typeof CharacterSpeciesService !== "undefined"
				? CharacterSpeciesService.getNarrativeTraits(species, [...CharacterBuilder.SPECIES_FLAVOR_ENTRIES])
				: species.entries || [];
			speciesEntries.forEach(entry => {
				const name = typeof entry === "object" ? entry.name : "Species Trait";
				if (name && CharacterBuilder.SPECIES_FLAVOR_ENTRIES.has(name.toLowerCase())) return;
				addEntry(entry, "Species Trait");
			});
		}

		draft.classes.forEach(row => {
			const cls = this._getClass(row.ref);
			if (!cls) return;
			// A feature's own level is used for its permalink, but its spellcasting
			// progression always uses the character's current level in this class.
			this._getActiveClassFeatures(cls, row).forEach(feature => addEntry(feature.entry, `${cls.name} Feature`, {...feature.origin, classLevel: row.level}));
			const selectedSpells = draft.spellcastingSelections[row.id];
			if (!selectedSpells) return;
			const entries = [];
			if (selectedSpells.cantrips && selectedSpells.cantrips.length) entries.push(`Cantrips: ${selectedSpells.cantrips.map(it => it.tag || `{@spell ${it.name}|${it.source}}`).join(", ")}.`);
			if (selectedSpells.spells && selectedSpells.spells.length) entries.push(`Selected Spells: ${selectedSpells.spells.map(it => it.tag || `{@spell ${it.name}|${it.source}}`).join(", ")}.`);
			if (entries.length) traits.push({name: `${cls.name} Spell Selection`, entries});
		});

		const background = this._getBackground(draft.background.ref);
		if (background) this._getBackgroundFeatures(background).forEach(entry => addEntry(entry, "Background Feature"));

		if (proficiencies.packages.length) {
			const entries = [];
			proficiencies.packages.forEach(({label, pkg}) => {
				const pieces = [];
				["armor", "weapons", "tools"].forEach(prop => {
					if (pkg[prop] && pkg[prop].length) pieces.push(`${prop.toTitleCase()}: ${pkg[prop].join(", ")}`);
				});
				if (pieces.length) entries.push(`${label}: ${pieces.join("; ")}.`);
			});
			if (entries.length) traits.push({name: "Proficiencies", entries});
		}

		(draft.manualChoices || []).forEach(choice => {
			const selections = (choice.selections || []).filter(Boolean);
			if (!selections.length) return;
			traits.push({name: choice.label || "Selected Feature", entries: [selections.map(it => it.tag || it.text || it.name).join(", ")]});
		});
		return traits;
	}

	_getFormattedSpellcastingSummary (template, origin, draft) {
		const classData = origin && origin.classData;
		const classLevel = Number(origin && (origin.classLevel || origin.level)) || 1;
		const progression = typeof CharacterSpellcastingService !== "undefined"
			? CharacterSpellcastingService.getClassProgression(classData, classLevel)
			: {};
		const ability = classData && classData.spellcastingAbility
			? Parser.attAbvToFull(classData.spellcastingAbility)
			: "the relevant ability";
		const values = {
			cantripsKnown: progression.cantripsKnown == null ? "no" : progression.cantripsKnown,
			spellsKnown: progression.spellsKnown == null ? "no" : progression.spellsKnown,
			preparedSpells: classData && draft ? this._getPreparedSpellLimit(classData, {level: classLevel}, draft) : "no",
			maximumSpellLevel: progression.maximumSpellLevel == null ? "no" : progression.maximumSpellLevel,
			className: classData && classData.name || "class",
			classLevel,
			wizardSpellbookKnown: classData && classData.name === "Wizard" && typeof CharacterSpellcastingService !== "undefined"
				? CharacterSpellcastingService.getWizardSpellbookKnown(classLevel)
				: "no",
			ability,
			abilityModifier: `${ability} modifier`
		};
		return typeof CharacterSpellcastingService !== "undefined"
			? CharacterSpellcastingService.formatSummaryTemplate(template, values)
			: template;
	}

	_getFeatureLinkTag (featureName, origin) {
		if (!origin || !origin.className || !origin.classSource || !origin.level) return null;
		const featureSource = origin.featureSource || origin.classSource;
		if (origin.featureType === "subclass" && origin.subclassShortName && origin.subclassSource) {
			return `{@subclassFeature ${featureName}|${origin.className}|${origin.classSource}|${origin.subclassShortName}|${origin.subclassSource}|${origin.level}|${featureSource}}`;
		}
		return `{@classFeature ${featureName}|${origin.className}|${origin.classSource}|${origin.level}|${featureSource}}`;
	}

	_getFeatureLink (featureName, origin) {
		const linkTag = this._getFeatureLinkTag(featureName, origin);
		if (!linkTag) return null;
		const classHash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_CLASSES]({name: origin.className, source: origin.classSource});
		const state = UrlUtil.getClassesPageStatePart({
			...(origin.featureType === "subclass" ? {subclass: {shortName: origin.subclassShortName, source: origin.subclassSource}} : {}),
			...(origin.featureIndex == null ? {} : {feature: {ixLevel: origin.levelIndex, ixFeature: origin.featureIndex}})
		});
		return {
			linkTag,
			featureHref: `${UrlUtil.PG_CLASSES}#${classHash}${state ? `${HASH_PART_SEP}${state}` : ""}`,
			featureLinkText: featureName
		};
	}

	_getActiveClassFeatures (cls, row) {
		const out = [];
		const chosenSubclass = (cls.subclasses || []).find(sc => row.subclassRef && sc.name === row.subclassRef.name && (sc.source || cls.source) === (row.subclassRef.source || cls.source));
		let subclassFeatureIndex = 0;
		(cls.classFeatures || []).forEach((features, levelIx) => {
			if (levelIx + 1 > row.level) return;
			(features || []).forEach((feature, featureIndex) => {
				if (!feature.gainSubclassFeature) out.push({
					entry: feature,
					level: levelIx + 1,
					origin: {
						featureType: "class",
						className: cls.name,
						classData: cls,
						classSource: cls.source || SRC_PHB,
						featureSource: feature.source || cls.source || SRC_PHB,
						level: levelIx + 1,
						levelIndex: levelIx,
						featureIndex
					}
				});
			});
			if ((features || []).some(feature => feature.gainSubclassFeature)) {
				const gainSubclassFeatureIndex = (features || []).findIndex(feature => feature.gainSubclassFeature);
				if (chosenSubclass) ((chosenSubclass.subclassFeatures || [])[subclassFeatureIndex] || []).forEach(feature => out.push({
					entry: feature,
					level: levelIx + 1,
					origin: {
						featureType: "subclass",
						className: cls.name,
						classData: cls,
						classSource: cls.source || SRC_PHB,
						subclassShortName: chosenSubclass.shortName || chosenSubclass.name,
						subclassSource: chosenSubclass.source || cls.source || SRC_PHB,
						featureSource: feature.source || chosenSubclass.source || cls.source || SRC_PHB,
						level: levelIx + 1,
						levelIndex: levelIx,
						featureIndex: gainSubclassFeatureIndex
					}
				}));
				subclassFeatureIndex++;
			}
		});
		return out;
	}

	_getBackgroundFeatures (background) {
		const out = [];
		const visit = entry => {
			if (!entry || typeof entry !== "object") return;
			if ((entry.data && entry.data.isFeature) || (entry.name && /^feature[: ]/i.test(entry.name))) out.push(entry);
			(entry.entries || entry.items || []).forEach(visit);
		};
		(background.entries || []).forEach(visit);
		return out;
	}

	renderOutput () {
		this._renderOutputDebounced();
		this.mutSavedButtonText();
	}

	_renderOutput () {
		this._syncMonsterFromDraft();
		const $wrp = this._ui.$wrpOutput.empty();
		this._resetTabs("output");
		const tabs = ["Statblock", "Choices", "Data"].map((it, ix) => this._getTab(ix, it, {tabGroup: "output", stateObj: this._meta, cbTabChange: this.doUiSave.bind(this)}));
		const [statTab, choicesTab, dataTab] = tabs;
		$$`<div class="flex-v-center w-100 no-shrink">${tabs.map(it => it.$btnTab)}</div>`.appendTo($wrp);
		tabs.forEach(it => it.$wrpTab.appendTo($wrp));

		const $tblMon = $(`<table class="stats monster"/>`).appendTo(statTab.$wrpTab);
		RenderBestiary.$getRenderedCreature(this._state, this._bestiaryMetaCache).appendTo($tblMon);

		const draft = this._getDraft();
		const $choices = $(`<div class="px-2 py-2"/>`).appendTo(choicesTab.$wrpTab);
		$choices.append(`<h4>Character Selections</h4>`);
		const selected = this._getSelectedProficiencies(draft, this._getProficiencyData(draft));
		["skill", "language", "tool"].forEach(kind => {
			if (!selected[kind].size) return;
			$choices.append(`<div class="mb-2"><b>${kind.toTitleCase()}${kind === "skill" ? "s" : "s"}:</b> ${[...selected[kind]].map(it => it.toTitleCase()).join(", ")}</div>`);
		});
		if (!draft.manualChoices.length) $choices.append(`<div class="text-muted">No manual feature selections yet.</div>`);

		const $tblData = $(`<table class="stats stats--book mkbru__wrp-output-tab-data"/>`).appendTo(dataTab.$wrpTab);
		const code = Renderer.get().render({type: "entries", entries: [{type: "code", name: "Data", preformatted: JSON.stringify(DataUtil.cleanJson(MiscUtil.copy(this._state)), null, "\t")} ]});
		$tblData.append(Renderer.utils.getBorderTr());
		$tblData.append(`<tr><td colspan="6">${code}</td></tr>`);
		$tblData.append(Renderer.utils.getBorderTr());
	}
}

CharacterBuilder.POINT_BUY_COSTS = {3: -9, 4: -6, 5: -4, 6: -2, 7: -1, 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9, 16: 12, 17: 15, 18: 19};
CharacterBuilder.STANDARD_ARRAY = typeof CharacterAbilityScoreService !== "undefined" && CharacterAbilityScoreService.STANDARD_ARRAY
	? [...CharacterAbilityScoreService.STANDARD_ARRAY]
	: [15, 14, 13, 12, 10, 8];
CharacterBuilder.CHOICE_KEYS = new Set(["any", "anyStandard", "exotic", "other", "anyArtisansTool", "musical instrument", "gaming set"]);
CharacterBuilder.STANDARD_LANGUAGES = ["common", "dwarvish", "elvish", "giant", "gnomish", "goblin", "halfling", "orc"];
CharacterBuilder.SPECIES_FLAVOR_ENTRIES = new Set(["age", "alignment", "size", "speed", "language", "languages"]);
CharacterBuilder.TRAIT_COLLAPSE_MIN_LENGTH = 280;
CharacterBuilder.ALIGNMENTS = [
	{value: "LG", label: "Lawful Good"}, {value: "NG", label: "Neutral Good"}, {value: "CG", label: "Chaotic Good"},
	{value: "LN", label: "Lawful Neutral"}, {value: "N", label: "Neutral"}, {value: "CN", label: "Chaotic Neutral"},
	{value: "LE", label: "Lawful Evil"}, {value: "NE", label: "Neutral Evil"}, {value: "CE", label: "Chaotic Evil"}, {value: "U", label: "Unaligned"}
];
CharacterBuilder.getSigned = (value) => value >= 0 ? `+${value}` : `${value}`;
CharacterBuilder.getNormalizedWeaponName = (name) => `${name || ""}`
	.toLowerCase()
	.replace(/\bweapons?\b/g, "")
	.trim()
	.replace(/s$/, "");
CharacterBuilder.getNormalizedSpeed = (speed) => {
	if (typeof CharacterSpeciesService !== "undefined") return CharacterSpeciesService.getNormalizedSpeed(speed);
	if (typeof speed === "number") return {walk: speed};
	if (!speed || typeof speed !== "object") return {walk: 30};

	const getNormalizedValue = value => {
		if (value == null || value === false) return null;
		if (value === true) return true;
		if (typeof value === "number") return value;
		if (typeof value !== "object" || value.number == null || isNaN(Number(value.number))) return null;
		const out = {number: Number(value.number)};
		if (value.condition) out.condition = value.condition;
		return out;
	};
	const getNumericValue = value => typeof value === "number"
		? value
		: value && typeof value === "object" && value.number != null ? Number(value.number) : null;

	const walkValue = getNormalizedValue(speed.walk);
	const walk = getNumericValue(walkValue) || 30;
	const out = {};
	["walk", "burrow", "climb", "fly", "swim"].forEach(prop => {
		const value = getNormalizedValue(speed[prop]);
		if (value == null) return;
		// A boolean movement mode in race data means "equal to walking speed";
		// monster statblocks require the concrete numeric value instead.
		out[prop] = value === true ? walk : value;
	});
	if (!out.walk) out.walk = walk;
	if (out.fly != null && speed.canHover) out.canHover = true;
	return Object.keys(out).length ? out : {walk: 30};
};

CharacterBuilder.prototype._renderClassTab = function ($parent, cb) {
	const draft = this._getDraft();
	$parent.append(`<div class="px-2 pt-2 text-muted">Choose the primary class first. Additional classes use the 2014 multiclass proficiency rules.</div>`);
	const $rows = $(`<div class="px-2 py-2"/>`).appendTo($parent);

	if (!draft.classes.length) $rows.append(`<div class="text-muted mb-2">No class selected yet.</div>`);
	draft.classes.forEach((row, rowIx) => this._renderClassRow($rows, row, rowIx, cb));

	$(`<button class="btn btn-xs btn-primary mb-2">Add Another Class</button>`)
		.click(() => this._mutDraft(d => {
			const id = `class-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
			d.classes.push({id, ref: null, level: 1, subclassRef: null, isPrimary: !d.classes.length});
		}, cb, {isRerender: true}))
		.appendTo($parent);

	this._renderProficiencyChoices($parent, "class", cb);
	this._renderManualFeatureChoices($parent, cb);
};

CharacterBuilder.prototype._renderClassRow = function ($parent, row, rowIx, cb) {
	const draft = this._getDraft();
	const selectedKeys = new Set(draft.classes.filter(it => it.id !== row.id && it.ref).map(it => this._getEntityKey(it.ref)));
	const maxLevel = Math.max(1, 20 - draft.classes.filter(it => it.id !== row.id && it.ref).reduce((total, it) => total + Number(it.level || 1), 0));
	const $row = $(`<div class="flex-col mkbru__wrp-rows stripe-even p-2 mb-2"/>`).appendTo($parent);
	const $top = $(`<div class="flex-v-center mb-2"/>`).appendTo($row);
	const $selClass = $(`<select class="form-control input-xs mr-2"/>`).appendTo($top);
	$selClass.append(`<option value="">Select class</option>`);
	this._classes.forEach((cls, ix) => {
		const isSelected = row.ref && this._getEntityKey(row.ref) === this._getEntityKey(cls);
		const isUnavailable = selectedKeys.has(this._getEntityKey(cls));
		$selClass.append(`<option value="${ix}"${isUnavailable && !isSelected ? " disabled" : ""}>${cls.name} [${Parser.sourceJsonToAbv(cls.source)}]</option>`);
		if (isSelected) $selClass.val(`${ix}`);
	});
	$selClass.change(() => {
		const selected = $selClass.val() === "" ? null : this._classes[Number($selClass.val())];
		this._mutDraft(d => {
			const target = d.classes.find(it => it.id === row.id);
			target.ref = this._getEntityRef(selected);
			target.subclassRef = null;
			this._clearChoiceSelections(d, `class:${row.id}:`);
			this._clearStructuredFeatureChoices(d, `class:${row.id}:`);
			delete d.spellcastingSelections[row.id];
		}, cb, {isRerender: true});
	});

	const $iptLevel = $(`<input type="number" min="1" max="${maxLevel}" class="form-control input-xs text-center mr-2" style="max-width: 5rem">`).val(row.level)
		.change(() => this._mutDraft(d => {
			const target = d.classes.find(it => it.id === row.id);
			target.level = Math.max(1, Math.min(maxLevel, Number($iptLevel.val()) || 1));
		}, cb, {isRerender: true}));
	$(`<span class="mr-1 text-muted">Level</span>`).insertBefore($iptLevel);
	$iptLevel.appendTo($top);

	const $btnPrimary = $(`<button class="btn btn-xs btn-default mr-2 ${row.isPrimary ? "active" : ""}" title="Use this class for starting proficiencies, saving throws, and equipment">Primary</button>`)
		.click(() => this._mutDraft(d => d.classes.forEach(it => it.isPrimary = it.id === row.id), cb, {isRerender: true}));
	$btnPrimary.appendTo($top);
	$(`<button class="btn btn-xs btn-danger" title="Remove class"><span class="glyphicon glyphicon-trash"></span></button>`)
		.click(() => this._mutDraft(d => {
			d.classes = d.classes.filter(it => it.id !== row.id);
			this._clearChoiceSelections(d, `class:${row.id}:`);
			this._clearStructuredFeatureChoices(d, `class:${row.id}:`);
			delete d.spellcastingSelections[row.id];
			if (d.classes.length && !d.classes.some(it => it.isPrimary)) d.classes[0].isPrimary = true;
		}, cb, {isRerender: true}))
		.appendTo($top);

	const cls = this._getClass(row.ref);
	if (!cls) return;
	const subclassLevel = this._getSubclassLevel(cls);
	const $subclassRow = $(`<div class="flex-v-center mb-2"/>`).appendTo($row);
	$subclassRow.append(`<span class="mr-2 bold" style="min-width: 85px">Subclass</span>`);
	const $selSubclass = $(`<select class="form-control input-xs" ${row.level < subclassLevel ? "disabled" : ""}/>`).appendTo($subclassRow);
	$selSubclass.append(`<option value="">${row.level < subclassLevel ? `Unlocks at level ${subclassLevel}` : "Select subclass"}</option>`);
	(cls.subclasses || []).forEach((subclass, ix) => {
		const isSelected = row.subclassRef && subclass.name === row.subclassRef.name && (subclass.source || cls.source) === (row.subclassRef.source || cls.source);
		$selSubclass.append(`<option value="${ix}">${subclass.name} [${Parser.sourceJsonToAbv(subclass.source || cls.source)}]</option>`);
		if (isSelected) $selSubclass.val(`${ix}`);
	});
	$selSubclass.change(() => {
		const selected = $selSubclass.val() === "" ? null : (cls.subclasses || [])[Number($selSubclass.val())];
		this._mutDraft(d => {
			const target = d.classes.find(it => it.id === row.id);
			target.subclassRef = selected ? {name: selected.name, source: selected.source || cls.source, shortName: selected.shortName} : null;
			this._clearStructuredFeatureChoices(d, `class:${row.id}:`);
		}, cb, {isRerender: true});
	});

	const activeFeatures = this._getActiveClassFeatures(cls, row);
	const $features = $(`<details class="mb-2"><summary><b>Active Features (${activeFeatures.length})</b></summary></details>`).appendTo($row);
	if (!activeFeatures.length) $features.append(`<div class="text-muted p-2">No active features at this level.</div>`);
	activeFeatures.forEach(({entry, level}) => {
		const name = Renderer.findName(entry) || "Class Feature";
		let rendered = "";
		try { rendered = Renderer.get().render(entry); } catch (e) { rendered = `<div class="text-muted">Could not render feature.</div>`; }
		$features.append(`<div class="p-2 stripe-odd--faint"><div class="bold">Level ${level}: ${name}</div>${rendered}</div>`);
	});
	this._renderClassSpellcastingModule($row, cls, row, activeFeatures, cb);
};

CharacterBuilder.prototype._getClassSpellcastingInfo = function (cls, row, activeFeatures) {
	const feature = (activeFeatures || this._getActiveClassFeatures(cls, row)).find(it => {
		const name = Renderer.findName(it.entry) || "";
		return /^(spellcasting|pact magic)$/i.test(name);
	});
	if (!feature) return null;
	const progression = typeof CharacterSpellcastingService !== "undefined"
		? CharacterSpellcastingService.getClassProgression(cls, row.level)
		: {cantripsKnown: null, spellsKnown: null, maximumSpellLevel: null};
	return {feature, progression};
};

CharacterBuilder.prototype._getPreparedSpellLimit = function (cls, row, draft) {
	const abilitySummary = this._getAbilitySummary(draft);
	const ability = cls.spellcastingAbility || "cha";
	const modifier = abilitySummary[ability] && abilitySummary[ability].modifier || 0;
	const progression = cls.casterProgression || "";
	const classLevelPart = progression === "full" ? row.level : Math.floor(row.level / 2);
	return Math.max(1, classLevelPart + modifier);
};

CharacterBuilder.prototype._renderClassSpellcastingModule = function ($parent, cls, row, activeFeatures, cb) {
	const info = this._getClassSpellcastingInfo(cls, row, activeFeatures);
	if (!info) return;
	const draft = this._getDraft();
	const selection = draft.spellcastingSelections[row.id] || {cantrips: [], spells: []};
	const isPrepared = info.progression.isPreparedCaster || ["Cleric", "Druid", "Paladin", "Wizard"].includes(cls.name);
	const spellLimit = isPrepared ? this._getPreparedSpellLimit(cls, row, draft) : info.progression.spellsKnown;
	const cantripLimit = info.progression.cantripsKnown;
	const maxSpellLevel = Math.max(1, Number(info.progression.maximumSpellLevel) || 1);
	const $module = $(`<details class="mb-2 p-2 stripe-odd--faint"><summary><b>${cls.name} Spell Selection</b></summary></details>`).appendTo($parent);
	$module.append(`<div class="text-muted small mb-2">${isPrepared ? "Prepare" : "Choose known"} spells from the ${cls.name} list. Your selections are kept separately from the published feature text.</div>`);
	$module.append(`<div class="small mb-2">Cantrips: <b>${selection.cantrips.length}${cantripLimit == null ? "" : `/${cantripLimit}`}</b> · Spells: <b>${selection.spells.length}${spellLimit == null ? "" : `/${spellLimit}`}</b> · Maximum spell level: <b>${maxSpellLevel}</b></div>`);

	const addSpell = async spellLevel => {
		const isCantrip = spellLevel === 0;
		const limit = isCantrip ? cantripLimit : spellLimit;
		const selected = isCantrip ? selection.cantrips : selection.spells;
		if (limit != null && selected.length >= limit) return JqueryUtil.doToast({type: "warning", content: `This ${cls.name} has reached its ${isCantrip ? "cantrip" : "spell"} selection limit at this level.`});
		const result = await this.pGetUserSpellSearch({level: spellLevel, classRef: row.ref});
		if (!result) return;
		this._mutDraft(d => {
			const target = d.spellcastingSelections[row.id] = d.spellcastingSelections[row.id] || {cantrips: [], spells: []};
			const bucket = isCantrip ? target.cantrips : target.spells;
			const ref = {name: result.name, source: decodeURIComponent(result.source || SRC_PHB), tag: result.tag, level: spellLevel};
			if (bucket.some(it => this._getEntityKey(it) === this._getEntityKey(ref))) return;
			bucket.push(ref);
		}, cb, {isRerender: true});
	};

	const $controls = $(`<div class="flex-v-center flex-wrap mb-2"/>`).appendTo($module);
	if (cantripLimit) $(`<button class="btn btn-xs btn-default mr-2 mb-1">Add Cantrip</button>`).click(() => addSpell(0)).appendTo($controls);
	const $spellLevel = $(`<select class="form-control input-xs mr-2 mb-1" style="max-width: 8rem"/>`).appendTo($controls);
	for (let level = 1; level <= maxSpellLevel; ++level) $spellLevel.append(`<option value="${level}">Level ${level}</option>`);
	$(`<button class="btn btn-xs btn-default mb-1">Add ${isPrepared ? "Prepared" : "Known"} Spell</button>`).click(() => addSpell(Number($spellLevel.val()))).appendTo($controls);

	[["Cantrips", selection.cantrips], [isPrepared ? "Prepared Spells" : "Known Spells", selection.spells]].forEach(([label, spells]) => {
		if (!spells.length) return;
		const $list = $(`<div class="mb-1"><b>${label}:</b> </div>`).appendTo($module);
		spells.forEach((spell, index) => {
			const $line = $(`<span class="mr-2"/>`).appendTo($list);
			$line.append(`${Renderer.get().render(spell.tag || `{@spell ${spell.name}|${spell.source}}`)} `);
			$(`<button class="btn btn-xxs btn-danger" title="Remove"><span class="glyphicon glyphicon-remove"></span></button>`).click(() => this._mutDraft(d => {
				const target = d.spellcastingSelections[row.id];
				if (target) (label === "Cantrips" ? target.cantrips : target.spells).splice(index, 1);
			}, cb, {isRerender: true})).appendTo($line);
		});
	});
};

CharacterBuilder.prototype._getSubclassLevel = function (cls) {
	const ix = (cls.classFeatures || []).findIndex(features => (features || []).some(feature => feature.gainSubclassFeature));
	return ~ix ? ix + 1 : 1;
};

CharacterBuilder.prototype._getStructuredFeatureChoiceGroups = function (draft) {
	const groups = [];
	const visit = (entry, context, key, path) => {
		if (!entry || typeof entry !== "object") return;
		if (entry.type === "options" && Array.isArray(entry.entries)) {
			const options = entry.entries.map((option, index) => ({
				id: `${key}:${path}:${index}`,
				name: typeof option === "string" ? option : option.name || `Option ${index + 1}`
			}));
			if (options.length) {
				groups.push({
					id: `structured:${key}:${path}`,
					label: `${context}${entry.name ? `: ${entry.name}` : ""}`,
					count: Math.max(1, Number(entry.count || 1)),
					options
				});
			}
		}
		const children = Array.isArray(entry.entries) ? entry.entries : Array.isArray(entry.items) ? entry.items : [];
		children.forEach((child, index) => visit(child, context, key, `${path}.${index}`));
	};

	draft.classes.forEach(row => {
		const cls = this._getClass(row.ref);
		if (!cls) return;
		this._getActiveClassFeatures(cls, row).forEach(({entry, level}, index) => {
			visit(entry, `${cls.name} level ${level}`, `class:${row.id}:${level}:${index}`, "0");
		});
	});
	const background = this._getBackground(draft.background.ref);
	if (background) this._getBackgroundFeatures(background).forEach((entry, index) => visit(entry, background.name, "background", `${index}`));
	const species = this._getMergedSpecies(draft);
	if (species) (species.entries || []).forEach((entry, index) => visit(entry, species.name, "species", `${index}`));
	return groups;
};

CharacterBuilder.prototype._renderProficiencyChoices = function ($parent, scope, cb) {
	const draft = this._getDraft();
	const data = this._getProficiencyData(draft);
	const groups = data.groups.filter(it => it.scope === scope);
	if (!groups.length) return;

	const $section = $(`<div class="px-2 pb-2"/>`).appendTo($parent);
	$section.append(`<h5 class="mb-2">Selections</h5>`);
	groups.forEach(group => {
		const $row = $(`<div class="mb-2 mkbru__row stripe-even p-2"/>`).appendTo($section);
		$row.append(`<div class="bold mb-1">${group.label} <span class="text-muted">(choose ${group.count})</span></div>`);
		const current = draft.choiceSelections[group.key] || [];
		if (!group.options.length) {
			const $ipt = $(`<input class="form-control input-xs" placeholder="Enter selection manually">`).val(current.join(", "));
			$ipt.change(() => this._mutDraft(d => {
				const seen = new Set();
				d.choiceSelections[group.key] = $ipt.val().split(",")
					.map(it => it.trim())
					.filter(it => it && !seen.has(it) && seen.add(it))
					.slice(0, group.count);
			}, cb));
			$row.append(`<div class="text-muted small mb-1">This source does not define a closed option list.</div>`).append($ipt);
			return;
		}

		for (let ix = 0; ix < group.count; ++ix) {
			const $sel = $(`<select class="form-control input-xs mb-1"/>`).appendTo($row);
			$sel.append(`<option value="">Select ${group.kind}</option>`);
			const used = new Set(data.fixed[group.kind]);
			data.groups.forEach(other => (draft.choiceSelections[other.key] || []).forEach((value, otherIx) => {
				if (!value || (other.key === group.key && otherIx === ix)) return;
				used.add(value);
			}));
			group.options.forEach(option => {
				const isCurrent = current[ix] === option;
				$sel.append(`<option value="${option.escapeQuotes()}"${used.has(option) && !isCurrent ? " disabled" : ""}>${option.toTitleCase()}</option>`);
			});
			$sel.val(current[ix] || "");
			$sel.change(() => this._mutDraft(d => {
				const values = [...(d.choiceSelections[group.key] || [])];
				values[ix] = $sel.val() || null;
				d.choiceSelections[group.key] = values;
			}, cb, {isRerender: true}));
		}
	});

	const resolved = typeof CharacterSelectionService !== "undefined"
		? CharacterSelectionService.getResolvedSelections({groups: data.groups, choiceSelections: draft.choiceSelections, fixed: data.fixed})
		: null;
	const selected = resolved ? resolved.selected : this._getSelectedProficiencies(draft, data);
	if (selected.skill.size) $section.append(`<div class="text-muted small">Current skills: ${[...selected.skill].map(it => it.toTitleCase()).join(", ")}</div>`);
	const duplicateFixedSkills = data.fixedSources.skill.filter((value, ix, values) => values.indexOf(value) !== ix);
	if (duplicateFixedSkills.length) {
		$section.append(`<div class="alert alert-warning py-1 mt-2 mb-0">Duplicate skill proficiency from multiple sources: ${[...new Set(duplicateFixedSkills)].map(it => it.toTitleCase()).join(", ")}. The statblock keeps one proficiency.</div>`);
	}
	if (resolved && resolved.duplicateSelections.length) {
		$section.append(`<div class="alert alert-warning py-1 mt-2 mb-0">Duplicate selections were ignored so each final proficiency appears only once.</div>`);
	}
};

CharacterBuilder.prototype._renderManualFeatureChoices = function ($parent, cb) {
	const draft = this._getDraft();
	const $section = $(`<div class="px-2 pb-2"/>`).appendTo($parent);
	$section.append(`<h5 class="mb-1">Feature Selections</h5><div class="text-muted small mb-2">For choices described only in published prose, record the choice here. Spell searches can be filtered by level and class.</div>`);
	const structuredGroups = this._getStructuredFeatureChoiceGroups(draft);
	const structuredIds = new Set(structuredGroups.map(group => group.id));
	structuredGroups.forEach(group => {
		const $row = $(`<div class="mkbru__wrp-rows p-2 mb-2 stripe-even"/>`).appendTo($section);
		$row.append(`<div class="bold mb-1">${group.label} <span class="text-muted">(choose ${group.count})</span></div>`);
		const stored = (draft.manualChoices || []).find(choice => choice.id === group.id);
		const selected = stored && stored.selections || [];
		for (let index = 0; index < group.count; ++index) {
			const $select = $(`<select class="form-control input-xs mb-1"/>`).appendTo($row);
			$select.append(`<option value="">Select option</option>`);
			const used = new Set(selected.filter((selection, selectionIndex) => selection && selectionIndex !== index).map(selection => selection.id));
			group.options.forEach(option => {
				const isCurrent = selected[index] && selected[index].id === option.id;
				$select.append(`<option value="${option.id.escapeQuotes()}"${used.has(option.id) && !isCurrent ? " disabled" : ""}>${option.name}</option>`);
			});
			$select.val(selected[index] && selected[index].id || "");
			$select.change(() => this._mutDraft(d => {
				let target = d.manualChoices.find(choice => choice.id === group.id);
				if (!target) {
					target = {id: group.id, label: group.label, selections: []};
					d.manualChoices.push(target);
				}
				target.label = group.label;
				const option = group.options.find(it => it.id === $select.val());
				target.selections[index] = option ? {id: option.id, name: option.name, text: option.name} : null;
			}, cb, {isRerender: true}));
		}
	});

	(draft.manualChoices || []).filter(choice => !structuredIds.has(choice.id)).forEach(choice => {
		const $row = $(`<div class="mkbru__wrp-rows p-2 mb-2 stripe-even"/>`).appendTo($section);
		const $iptName = $(`<input class="form-control input-xs mr-2" placeholder="Feature choice">`).val(choice.label || "");
		$iptName.change(() => this._mutDraft(d => {
			const target = d.manualChoices.find(it => it.id === choice.id);
			if (target) target.label = $iptName.val().trim() || "Feature Selection";
		}, cb));
		const $spellLevel = $(`<select class="form-control input-xs mr-2" style="max-width: 7rem"><option value="">Any spell level</option>${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => `<option value="${level}">${level === 0 ? "Cantrip" : `Level ${level}`}</option>`).join("")}</select>`)
			.val(choice.spellLevel == null ? "" : `${choice.spellLevel}`)
			.change(() => this._mutDraft(d => {
				const target = d.manualChoices.find(it => it.id === choice.id);
				if (target) target.spellLevel = $spellLevel.val() === "" ? null : Number($spellLevel.val());
			}, cb, {isRerender: true}));
		const spellClasses = draft.classes
			.map(row => ({row, cls: this._getClass(row.ref)}))
			.filter(it => it.cls);
		const $spellClass = $(`<select class="form-control input-xs mr-2" style="max-width: 10rem"><option value="">Any class</option></select>`);
		spellClasses.forEach(({cls}, index) => {
			const isSelected = choice.spellClassRef && this._getEntityKey(choice.spellClassRef) === this._getEntityKey(cls);
			$spellClass.append(`<option value="${index}">${cls.name}</option>`);
			if (isSelected) $spellClass.val(`${index}`);
		});
		$spellClass.change(() => this._mutDraft(d => {
			const target = d.manualChoices.find(it => it.id === choice.id);
			if (target) {
				const selected = $spellClass.val() === "" ? null : spellClasses[Number($spellClass.val())].cls;
				target.spellClassRef = this._getEntityRef(selected);
			}
		}, cb, {isRerender: true}));
		const $btnSpell = $(`<button class="btn btn-xs btn-default mr-2">Add Spell</button>`).click(async () => {
			const searchOptions = {
				level: choice.spellLevel == null ? null : Number(choice.spellLevel),
				classRef: choice.spellClassRef || null
			};
			const result = await this.pGetUserSpellSearch(searchOptions);
			if (!result) return;
			this._mutDraft(d => {
				const target = d.manualChoices.find(it => it.id === choice.id);
				if (!target) return;
				target.selections = target.selections || [];
				target.selections.push({name: result.name, source: decodeURIComponent(result.source || SRC_PHB), tag: result.tag});
			}, cb, {isRerender: true});
		});
		const $iptText = $(`<input class="form-control input-xs mr-2" placeholder="Record a selected option">`);
		const $btnText = $(`<button class="btn btn-xs btn-default mr-2">Add Text</button>`).click(() => {
			const text = $iptText.val().trim();
			if (!text) return;
			this._mutDraft(d => {
				const target = d.manualChoices.find(it => it.id === choice.id);
				if (target) target.selections.push({text});
			}, cb, {isRerender: true});
		});
		const $btnRemove = $(`<button class="btn btn-xs btn-danger" title="Remove choice"><span class="glyphicon glyphicon-trash"></span></button>`)
			.click(() => this._mutDraft(d => d.manualChoices = d.manualChoices.filter(it => it.id !== choice.id), cb, {isRerender: true}));
		$$`<div class="flex-v-center mb-2">${$iptName}${$spellLevel}${$spellClass}${$btnSpell}${$btnRemove}</div>`.appendTo($row);
		$$`<div class="flex-v-center mb-2">${$iptText}${$btnText}</div>`.appendTo($row);
		(choice.selections || []).forEach((selection, ix) => {
			if (!selection) return;
			const $line = $(`<div class="flex-v-center mb-1"/>`).appendTo($row);
			$line.append(`<span class="mr-2">${Renderer.get().render(selection.tag || selection.text || selection.name)}</span>`);
			$(`<button class="btn btn-xxs btn-danger" title="Remove"><span class="glyphicon glyphicon-remove"></span></button>`)
				.click(() => this._mutDraft(d => {
					const target = d.manualChoices.find(it => it.id === choice.id);
					if (target) target.selections.splice(ix, 1);
				}, cb, {isRerender: true}))
				.appendTo($line);
		});
	});

	$(`<button class="btn btn-xs btn-default">Add Manual Feature Selection</button>`)
		.click(() => this._mutDraft(d => d.manualChoices.push({id: `choice-${Date.now()}-${Math.floor(Math.random() * 1000)}`, label: "Feature Selection", selections: []}), cb, {isRerender: true}))
		.appendTo($section);
};

CharacterBuilder.prototype._renderBackgroundTab = function ($parent, cb) {
	const draft = this._getDraft();
	const background = this._getBackground(draft.background.ref);
	const $section = $(`<div class="px-2 py-2"/>`).appendTo($parent);
	$section.append(`<div class="text-muted mb-2">Search the installed 5etools backgrounds, then complete any structured proficiencies below.</div>`);
	const $btnChoose = $(`<button class="btn btn-xs btn-primary mr-2">${background ? "Change Background" : "Choose Background"}</button>`).click(async () => {
		const result = await SearchWidget.pGetUserBackgroundSearch();
		if (!result) return;
		const ref = {name: result.name, source: decodeURIComponent(result.source || SRC_PHB)};
		this._mutDraft(d => {
			d.background = {ref, choices: {}};
			this._clearChoiceSelections(d, "background:");
			this._clearStructuredFeatureChoices(d, "background");
		}, cb, {isRerender: true});
	});
	const $btnClear = $(`<button class="btn btn-xs btn-danger" ${background ? "" : "disabled"}>Clear</button>`).click(() => this._mutDraft(d => {
		d.background = {ref: null, choices: {}};
		this._clearChoiceSelections(d, "background:");
		this._clearStructuredFeatureChoices(d, "background");
	}, cb, {isRerender: true}));
	$$`<div class="mb-2">${$btnChoose}${$btnClear}</div>`.appendTo($section);
	if (!background) {
		$section.append(`<div class="text-muted">No background selected.</div>`);
		return;
	}
	$section.append(`<h4>${background.name} <small>[${Parser.sourceJsonToAbv(background.source)}]</small></h4>`);
	this._renderEntityEntries($section, background.entries || []);
	this._renderProficiencyChoices($parent, "background", cb);
};

CharacterBuilder.prototype._renderSpeciesTab = function ($parent, cb) {
	const draft = this._getDraft();
	const race = this._getRace(draft.species.raceRef);
	const $section = $(`<div class="px-2 py-2"/>`).appendTo($parent);
	$section.append(`<div class="text-muted mb-2">Search the installed 5etools species, then choose a subrace when one is available.</div>`);
	const $btnChoose = $(`<button class="btn btn-xs btn-primary mr-2">${race ? "Change Species" : "Choose Species"}</button>`).click(async () => {
		const result = await SearchWidget.pGetUserRaceSearch({isBaseRacesOnly: true});
		if (!result) return;
		const ref = {name: result.name, source: decodeURIComponent(result.source || SRC_PHB)};
		const selectedRace = this._getRace(ref);
		if (!selectedRace) {
			return JqueryUtil.doToast({type: "warning", content: "The selected base species could not be resolved. Please try again."});
		}
		this._mutDraft(d => {
			d.species = {raceRef: this._getEntityRef(selectedRace), subraceRef: null, choices: {}};
			this._clearChoiceSelections(d, "species:");
			this._clearStructuredFeatureChoices(d, "species");
		}, cb, {isRerender: true});
	});
	const $btnClear = $(`<button class="btn btn-xs btn-danger" ${race ? "" : "disabled"}>Clear</button>`).click(() => this._mutDraft(d => {
		d.species = {raceRef: null, subraceRef: null, choices: {}};
		this._clearChoiceSelections(d, "species:");
		this._clearStructuredFeatureChoices(d, "species");
	}, cb, {isRerender: true}));
	$$`<div class="mb-2">${$btnChoose}${$btnClear}</div>`.appendTo($section);
	if (!race) return;

	const $subrace = $(`<select class="form-control input-xs mb-2"/>`).appendTo($section);
	$subrace.append(`<option value="">Base ${race.name}</option>`);
	(race.subraces || []).forEach((subrace, ix) => {
		const isSelected = draft.species.subraceRef && ((draft.species.subraceRef.ix != null && Number(draft.species.subraceRef.ix) === ix)
			|| ((subrace.name || null) === (draft.species.subraceRef.name || null) && (subrace.source || race.source) === (draft.species.subraceRef.source || race.source)));
		const label = subrace.name || "Default Traits";
		$subrace.append(`<option value="${ix}">${label} [${Parser.sourceJsonToAbv(subrace.source || race.source)}]</option>`);
		if (isSelected) $subrace.val(`${ix}`);
	});
	$subrace.change(() => {
		const selected = $subrace.val() === "" ? null : (race.subraces || [])[Number($subrace.val())];
		this._mutDraft(d => {
			d.species.subraceRef = selected ? {name: selected.name || null, source: selected.source || race.source, ix: Number($subrace.val())} : null;
			d.species.choices = {};
			this._clearChoiceSelections(d, "species:");
			this._clearStructuredFeatureChoices(d, "species");
		}, cb, {isRerender: true});
	});

	const merged = this._getMergedSpecies(draft) || race;
	$section.append(`<h4>${merged.name} <small>[${Parser.sourceJsonToAbv(merged.source)}]</small></h4>`);
	this._renderSpeciesCharacterChoices($section, draft, merged, cb);
	this._renderEntityEntries($section, merged.entries || []);
	this._renderProficiencyChoices($parent, "species", cb);
};

CharacterBuilder.prototype._renderSpeciesCharacterChoices = function ($parent, draft, species, cb) {
	const abilityGroups = this._getSpeciesAbilityChoiceGroups(species);
	const sizes = Array.isArray(species.size) ? species.size.filter(Boolean) : [];

	const $section = $(`<div class="mb-2 p-2 stripe-even"/>`).appendTo($parent);
	$section.append(`<div class="bold mb-1">Species Choices</div>`);
	abilityGroups.forEach(group => {
		const $row = $(`<div class="mb-2"/>`).appendTo($section);
		$row.append(`<div class="small text-muted mb-1">Choose ${group.count} ability score${group.count === 1 ? "" : "s"} (+${group.amount} each)</div>`);
		const current = ((draft.species.choices.ability || {})[group.key] || []);
		for (let index = 0; index < group.count; ++index) {
			const $select = $(`<select class="form-control input-xs mb-1"/>`).appendTo($row);
			$select.append(`<option value="">Select ability</option>`);
			const used = new Set(current.filter((value, selectedIndex) => selectedIndex !== index));
			group.options.forEach(option => {
				const isCurrent = current[index] === option;
				$select.append(`<option value="${option}"${used.has(option) && !isCurrent ? " disabled" : ""}>${Parser.attAbvToFull(option)}</option>`);
			});
			$select.val(current[index] || "");
			$select.change(() => this._mutDraft(d => {
				d.species.choices = d.species.choices || {};
				d.species.choices.ability = d.species.choices.ability || {};
				const values = [...(d.species.choices.ability[group.key] || [])];
				values[index] = $select.val() || null;
				d.species.choices.ability[group.key] = values;
			}, cb, {isRerender: true}));
		}
	});

	if (sizes.length > 1) {
		const $row = $(`<label class="flex-v-center mb-1"><span class="mr-2">Size</span></label>`).appendTo($section);
		const $select = $(`<select class="form-control input-xs"/>`).appendTo($row);
		sizes.forEach(size => $select.append(`<option value="${size}">${Parser.sizeAbvToFull(size)}</option>`));
		$select.val(this._getSpeciesSize(draft, species));
		$select.change(() => this._mutDraft(d => {
			d.species.choices = d.species.choices || {};
			d.species.choices.size = $select.val();
		}, cb, {isRerender: true}));
	}

	const $typeRow = $(`<label class="flex-v-center mb-1"><span class="mr-2">Creature Type</span></label>`).appendTo($section);
	const $type = $(`<input class="form-control input-xs" placeholder="humanoid">`).val(this._getSpeciesCreatureType(draft, species));
	$type.change(() => this._mutDraft(d => {
		d.species.choices = d.species.choices || {};
		d.species.choices.creatureType = $type.val().trim() || null;
	}, cb));
	$type.appendTo($typeRow);
	$section.append(`<div class="text-muted small">Override this only when the selected species is not humanoid; the identity-row override takes precedence.</div>`);
};

CharacterBuilder.prototype._renderEntityEntries = function ($parent, entries) {
	try {
		const rendered = Renderer.get().render({type: "entries", entries: MiscUtil.copy(entries)});
		$(`<div class="mb-2"/>`).html(rendered).appendTo($parent);
	} catch (e) {
		$parent.append(`<div class="text-muted">Unable to render this source entry.</div>`);
	}
};

CharacterBuilder.prototype._renderAbilityTab = function ($parent, cb) {
	const draft = this._getDraft();
	const scores = draft.abilityScores;
	const $section = $(`<div class="px-2 py-2"/>`).appendTo($parent);
	const modeNames = {standardArray: "Standard Array", manual: "Manual", pointBuy: "Point Buy"};
	const $modes = $(`<div class="btn-group mb-2" data-toggle="buttons"/>`).appendTo($section);
	Object.entries(modeNames).forEach(([mode, label]) => {
		const $label = $(`<label class="btn btn-default btn-xs ${scores.mode === mode ? "active" : ""}"><input type="radio" name="characterbuilder-ability-mode" value="${mode}">${label}</label>`).appendTo($modes);
		$label.find("input").prop("checked", scores.mode === mode).change(() => this._mutDraft(d => {
			d.abilityScores.mode = mode;
			if (mode === "standardArray") {
				d.abilityScores.base = {str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8};
				d.abilityScores.standardArrayAssignments = {str: null, dex: null, con: null, int: null, wis: null, cha: null};
			}
			if (mode === "manual") d.abilityScores.base = {str: null, dex: null, con: null, int: null, wis: null, cha: null};
			if (mode === "pointBuy") {
				const min = Number(d.abilityScores.pointBuy.min);
				d.abilityScores.base = {str: min, dex: min, con: min, int: min, wis: min, cha: min};
			}
		}, cb, {isRerender: true}));
	});

	if (scores.mode === "manual") $section.append(`<div class="alert alert-info py-1">Roll 4d6 and discard the lowest die for each ability score. Leave an ability blank until it has been rolled.</div>`);
	if (scores.mode === "pointBuy") this._renderPointBuyControls($section, cb);

	const summary = this._getAbilitySummary(draft);
	const $table = $(`<table class="table table-condensed table-striped mb-2"><thead><tr><th>Ability</th><th>Base</th><th>Species</th><th>Other</th><th>Total</th><th>Mod.</th></tr></thead><tbody></tbody></table>`).appendTo($section);
	const $body = $table.find("tbody");
	Parser.ABIL_ABVS.forEach(abv => {
		const $row = $(`<tr/>`).appendTo($body);
		$row.append(`<th>${abv.toUpperCase()}</th>`);
		const $baseCell = $(`<td/>`).appendTo($row);
		this._renderAbilityBaseInput($baseCell, draft, abv, cb);
		$row.append(`<td>${CharacterBuilder.getSigned(summary[abv].species)}</td>`);
		const $other = $(`<input type="number" class="form-control input-xs text-center" style="min-width: 4rem">`).val(scores.otherBonus[abv] || "")
			.change(() => this._mutDraft(d => d.abilityScores.otherBonus[abv] = Number($other.val()) || 0, cb, {isRerender: true}));
		$row.append($(`<td/>`).append($other));
		$row.append(`<td><b>${summary[abv].total == null ? "&mdash;" : summary[abv].total}</b></td>`);
		$row.append(`<td>${summary[abv].total == null ? "&mdash;" : CharacterBuilder.getSigned(Parser.getAbilityModNumber(summary[abv].total))}</td>`);
	});

	if (scores.mode === "standardArray") {
		const assigned = Object.values(scores.standardArrayAssignments || {}).filter(value => value != null).map(Number);
		const available = CharacterBuilder.STANDARD_ARRAY.filter(value => !assigned.includes(value));
		const isValid = assigned.length === CharacterBuilder.STANDARD_ARRAY.length && new Set(assigned).size === CharacterBuilder.STANDARD_ARRAY.length;
		const $bench = $(`<div class="mb-2 p-2 stripe-even"><div class="bold mb-1">Standard Array Bench</div><div class="text-muted small mb-1">Assign a value to an ability to take it from the bench. Set an ability back to its base 8 to return its value.</div></div>`).appendTo($section);
		if (available.length) {
			available.forEach(value => $bench.append(`<span class="label label-default mr-1">${value}</span>`));
		} else $bench.append(`<span class="label label-success">All values assigned</span>`);
		if (!isValid) $section.append(`<div class="alert alert-warning py-1">Assign every Standard Array value once to complete this method.</div>`);
	}
	$section.append(`<div class="text-muted small">Species bonuses are derived from the selected species. Use Other for feats, ability score improvements, and campaign-specific bonuses.</div>`);
};

CharacterBuilder.prototype._renderAbilityBaseInput = function ($parent, draft, abv, cb) {
	const scores = draft.abilityScores;
	if (scores.mode === "standardArray") {
		const assignments = scores.standardArrayAssignments || {};
		const current = assignments[abv];
		const $sel = $(`<select class="form-control input-xs text-center"/>`).appendTo($parent);
		$sel.append(`<option value="">8 (base)</option>`);
		CharacterBuilder.STANDARD_ARRAY.forEach(value => {
			const usedByOther = Parser.ABIL_ABVS.some(other => other !== abv && Number(assignments[other]) === value);
			$sel.append(`<option value="${value}"${usedByOther && Number(current) !== value ? " disabled" : ""}>${value}</option>`);
		});
		$sel.val(current == null ? "" : `${current}`);
		$sel.change(() => this._mutDraft(d => {
			d.abilityScores.standardArrayAssignments = d.abilityScores.standardArrayAssignments || {};
			const value = $sel.val() === "" ? null : Number($sel.val());
			d.abilityScores.standardArrayAssignments[abv] = value;
			d.abilityScores.base[abv] = value == null ? 8 : value;
		}, cb, {isRerender: true}));
		return;
	}
	if (scores.mode === "pointBuy") {
		const pointBuy = scores.pointBuy;
		const options = Object.keys(CharacterBuilder.POINT_BUY_COSTS).map(Number).filter(value => value >= pointBuy.min && value <= pointBuy.max).sort(SortUtil.ascSort);
		const $sel = $(`<select class="form-control input-xs text-center"/>`).appendTo($parent);
		options.forEach(value => $sel.append(`<option value="${value}">${value} (${CharacterBuilder.POINT_BUY_COSTS[value]})</option>`));
		$sel.val(`${scores.base[abv]}`);
		$sel.change(() => this._mutDraft(d => d.abilityScores.base[abv] = Number($sel.val()), cb, {isRerender: true}));
		return;
	}
	const $ipt = $(`<input type="number" class="form-control input-xs text-center" placeholder="—">`).val(scores.base[abv] == null ? "" : scores.base[abv]);
	$ipt.change(() => this._mutDraft(d => {
		const raw = $ipt.val().trim();
		d.abilityScores.base[abv] = raw ? Number(raw) : null;
	}, cb, {isRerender: true}));
	$parent.append($ipt);
};

CharacterBuilder.prototype._renderPointBuyControls = function ($parent, cb) {
	const draft = this._getDraft();
	const pointBuy = draft.abilityScores.pointBuy;
	const spent = this._getPointBuySpent(draft);
	const remaining = Number(pointBuy.budget) - spent;
	const $controls = $(`<div class="mb-2 p-2 stripe-even"/>`).appendTo($parent);
	$controls.append(`<div class="bold mb-1">Point Buy Rules <span class="text-muted">${spent}/${pointBuy.budget} spent (${remaining} remaining)</span></div>`);
	const $budget = $(`<input type="number" class="form-control input-xs text-center mr-2" style="width: 5rem">`).val(pointBuy.budget);
	const $min = $(`<input type="number" class="form-control input-xs text-center mr-2" style="width: 4rem">`).val(pointBuy.min);
	const $max = $(`<input type="number" class="form-control input-xs text-center" style="width: 4rem">`).val(pointBuy.max);
	const updateRange = () => this._mutDraft(d => {
		const config = d.abilityScores.pointBuy;
		config.budget = Number($budget.val()) || 0;
		config.min = Math.min(18, Math.max(3, Number($min.val()) || 3));
		config.max = Math.min(18, Math.max(config.min, Number($max.val()) || config.min));
		Parser.ABIL_ABVS.forEach(abv => {
			const value = Number(d.abilityScores.base[abv]);
			if (isNaN(value) || value < config.min) d.abilityScores.base[abv] = config.min;
			else if (value > config.max) d.abilityScores.base[abv] = config.max;
		});
	}, cb, {isRerender: true});
	$$`<div class="flex-v-center mb-2"><span class="mr-1">Budget</span>${$budget}<span class="mr-1">Min</span>${$min}<span class="mr-1">Max</span>${$max}</div>`.appendTo($controls);
	$budget.change(updateRange); $min.change(updateRange); $max.change(updateRange);
};

CharacterBuilder.prototype._renderEquipmentTab = function ($parent, cb) {
	const draft = this._getDraft();
	const $section = $(`<div class="px-2 py-2"/>`).appendTo($parent);
	$section.append(`<h5>Starting Equipment</h5><div class="text-muted small mb-2">Simple single-item choices can be added directly. Published alternatives which are only prose remain visible and can be resolved with the item search below.</div>`);
	const lines = this._getStartingEquipmentLines(draft);
	if (!lines.length) $section.append(`<div class="text-muted mb-2">Select a primary class or background to see its starting equipment.</div>`);
	lines.forEach(line => this._renderStartingEquipmentLine($section, line, cb));

	const $inventory = $(`<div class="mt-3"/>`).appendTo($section);
	$inventory.append(`<h5>Inventory</h5>`);
	$(`<button class="btn btn-xs btn-primary mb-2">Add Item</button>`).click(async () => {
		const result = await SearchWidget.pGetUserItemSearch();
		if (!result) return;
		const ref = {name: result.name, source: decodeURIComponent(result.source || SRC_DMG)};
		this._mutDraft(d => d.inventory.push({id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`, ref, quantity: 1, equipped: false, note: ""}), cb, {isRerender: true});
	}).appendTo($inventory);
	if (!draft.inventory.length) $inventory.append(`<div class="text-muted">Inventory is empty.</div>`);
	(draft.inventory || []).forEach((item, ix) => this._renderInventoryRow($inventory, item, ix, cb));

	this._renderCombatOverrides($section, cb);
};

CharacterBuilder.prototype._getStartingEquipmentLines = function (draft) {
	const lines = [];
	const primary = this._getPrimaryClassRow(draft);
	const cls = primary && this._getClass(primary.ref);
	if (cls && cls.startingEquipment) {
		(cls.startingEquipment.default || []).forEach(text => lines.push({source: `${cls.name} starting equipment`, text}));
		if (cls.startingEquipment.goldAlternative) lines.push({source: `${cls.name} gold alternative`, text: cls.startingEquipment.goldAlternative});
	}
	const background = this._getBackground(draft.background.ref);
	if (background) this._getBackgroundEquipmentEntries(background).forEach(text => lines.push({source: `${background.name} equipment`, text}));
	return lines;
};

CharacterBuilder.prototype._getBackgroundEquipmentEntries = function (background) {
	const out = [];
	const visit = entry => {
		if (!entry || typeof entry !== "object") return;
		if (entry.name && /^equipment$/i.test(entry.name) && entry.entry) out.push(entry.entry);
		(entry.entries || entry.items || []).forEach(visit);
	};
	(background.entries || []).forEach(visit);
	return out;
};

CharacterBuilder.prototype._renderStartingEquipmentLine = function ($parent, line, cb) {
	const $row = $(`<div class="p-2 mb-1 stripe-even"/>`).appendTo($parent);
	$row.append(`<div class="small text-muted">${line.source}</div>`);
	let rendered = line.text;
	try { rendered = Renderer.get().render(line.text); } catch (e) {}
	$row.append(`<div class="mb-1">${rendered}</div>`);
	const matches = [...`${line.text}`.matchAll(/\{@item ([^|}]+)(?:\|([^|}]+))?/g)];
	const isSimple = matches.length === 1 && !/\(a\)|\(b\)|\bor\b/i.test(`${line.text}`);
	if (!isSimple) return;
	const match = matches[0];
	const ref = {name: match[1], source: match[2] || SRC_PHB};
	$(`<button class="btn btn-xxs btn-default">Add ${ref.name}</button>`).click(() => this._mutDraft(d => {
		const existing = d.inventory.find(it => it.ref && this._getEntityKey(it.ref) === this._getEntityKey(ref));
		if (existing) existing.quantity = Number(existing.quantity || 0) + 1;
		else d.inventory.push({id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`, ref, quantity: 1, equipped: false, note: ""});
	}, cb, {isRerender: true})).appendTo($row);
};

CharacterBuilder.prototype._renderInventoryRow = function ($parent, item, ix, cb) {
	const $row = $(`<div class="flex-v-center mkbru__wrp-rows p-2 mb-1 stripe-even"/>`).appendTo($parent);
	$row.append(`<span class="mr-2 flex-1">${item.ref.name} <small>[${Parser.sourceJsonToAbv(item.ref.source)}]</small></span>`);
	const $qty = $(`<input type="number" min="1" class="form-control input-xs text-center mr-2" style="width: 4rem">`).val(item.quantity || 1);
	$qty.change(() => this._mutDraft(d => d.inventory[ix].quantity = Math.max(1, Number($qty.val()) || 1), cb));
	const $equipped = $(`<label class="mr-2 no-shrink"><input type="checkbox" class="mr-1">Equipped</label>`);
	$equipped.find("input").prop("checked", !!item.equipped).change(evt => this._mutDraft(d => d.inventory[ix].equipped = !!evt.target.checked, cb));
	const $note = $(`<input class="form-control input-xs mr-2" placeholder="Note">`).val(item.note || "");
	$note.change(() => this._mutDraft(d => d.inventory[ix].note = $note.val(), cb));
	$row.append($qty, $equipped, $note);
	$(`<button class="btn btn-xxs btn-danger" title="Remove"><span class="glyphicon glyphicon-trash"></span></button>`).click(() => this._mutDraft(d => d.inventory.splice(ix, 1), cb, {isRerender: true})).appendTo($row);
};

CharacterBuilder.prototype._renderCombatOverrides = function ($parent, cb) {
	const draft = this._getDraft();
	const $section = $(`<div class="mt-3 p-2 stripe-even"/>`).appendTo($parent);
	$section.append(`<h5>Derived Combat Overrides</h5><div class="text-muted small mb-2">Leave a field blank to use the derived value.</div>`);
	const makeInput = (label, prop) => {
		const $ipt = $(`<input type="number" class="form-control input-xs text-center mr-2" style="width: 5rem" placeholder="auto">`).val(draft.overrides[prop] == null ? "" : draft.overrides[prop]);
		$ipt.change(() => this._mutDraft(d => d.overrides[prop] = $ipt.val().trim() === "" ? null : Number($ipt.val()), cb));
		return $$`<label class="flex-v-center mr-2"><span class="mr-1">${label}</span>${$ipt}</label>`;
	};
	$$`<div class="flex-v-center mb-2">${makeInput("CR", "cr")}${makeInput("HP", "hp")}${makeInput("AC", "ac")}</div>`.appendTo($section);
	$section.append(`<div class="bold mb-1">Manual Actions</div>`);
	(draft.overrides.actions || []).forEach((action, ix) => {
		const $row = $(`<div class="flex-col mb-2"/>`).appendTo($section);
		const $name = $(`<input class="form-control input-xs mb-1" placeholder="Action name">`).val(action.name || "");
		const $entries = $(`<textarea class="form-control mb-1" placeholder="Action text"></textarea>`).val((action.entries || []).join("\n"));
		$name.change(() => this._mutDraft(d => d.overrides.actions[ix].name = $name.val(), cb));
		$entries.change(() => this._mutDraft(d => d.overrides.actions[ix].entries = $entries.val().split("\n").map(it => it.trim()).filter(Boolean), cb));
		$row.append($name, $entries);
		$(`<button class="btn btn-xxs btn-danger align-self-end">Remove Action</button>`).click(() => this._mutDraft(d => d.overrides.actions.splice(ix, 1), cb, {isRerender: true})).appendTo($row);
	});
	$(`<button class="btn btn-xs btn-default">Add Manual Action</button>`).click(() => this._mutDraft(d => d.overrides.actions.push({name: "Action", entries: []}), cb, {isRerender: true})).appendTo($section);
};

const characterBuilder = new CharacterBuilder();
ui.characterBuilder = characterBuilder;
characterBuilder.ui = ui;
