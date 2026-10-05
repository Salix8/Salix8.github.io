"use strict";

class OptionalFeatureLevelRangeFilter extends RangeFilter {
	setStateFromLoaded (filterState, opts) {
		const state = filterState?.[this.header]?.state;
		if (!state || !["min", "max", "curMin", "curMax"].some(prop => state[prop] != null)) return;
		super.setStateFromLoaded(filterState, opts);
	}
}

class PageFilterOptionalFeatures extends PageFilterBase {
	// region static
	static _filterFeatureTypeSort (a, b) {
		return SortUtil.ascSort(Parser.optFeatureTypeToFull(a.item), Parser.optFeatureTypeToFull(b.item));
	}

	static sortOptionalFeatures (itemA, itemB, options) {
		if (options.sortBy === "level") {
			const aValue = Number(itemA.values.level) || 0;
			const bValue = Number(itemB.values.level) || 0;
			return SortUtil.ascSort(aValue, bValue) || SortUtil.listSort(itemA, itemB, options);
		}
		return SortUtil.listSort(itemA, itemB, options);
	}

	static _getClassKey (name, source) { return `${name}\u0000${source || "PHB"}`; }

	static _CLASS_FILTER_MODES = {
		[PageFilterOptionalFeatures._getClassKey("Alquimista", "Himo")]: "omit",
		[PageFilterOptionalFeatures._getClassKey("Artificer", "PHB")]: "omit",
		[PageFilterOptionalFeatures._getClassKey("Artificer", "TCE")]: "omit",
		[PageFilterOptionalFeatures._getClassKey("Artificer (Revisited)", "PHB")]: "omit",
		[PageFilterOptionalFeatures._getClassKey("Fighter", "PHB")]: "omit",
		[PageFilterOptionalFeatures._getClassKey("Monk", "PHB")]: "omit",
	};

	static _HIDDEN_FEATURE_TYPES = new Set(["AS", "AS:V1-UA", "AS:V2-UA"]);

	static _FEATURE_TYPE_NESTS = {
		"FS:B": {nest: "fighting-styles", displayName: "Fighting Styles"},
		"FS:F": {nest: "fighting-styles", displayName: "Fighting Styles"},
		"FS:P": {nest: "fighting-styles", displayName: "Fighting Styles"},
		"FS:R": {nest: "fighting-styles", displayName: "Fighting Styles"},
		"MV": {nest: "maneuvers", displayName: "Maneuvers"},
		"MV:B": {nest: "maneuvers", displayName: "Maneuvers"},
		"MV:C2-UA": {nest: "maneuvers", displayName: "Maneuvers"},
		"SHP:F": {nest: "ship-upgrades", displayName: "Ship Upgrades"},
		"SHP:H": {nest: "ship-upgrades", displayName: "Ship Upgrades"},
		"SHP:M": {nest: "ship-upgrades", displayName: "Ship Upgrades"},
		"SHP:O": {nest: "ship-upgrades", displayName: "Ship Upgrades"},
		"SHP:W": {nest: "ship-upgrades", displayName: "Ship Upgrades"},
		"IWM:A": {nest: "infernal-war-machine", displayName: "Infernal War Machine"},
		"IWM:G": {nest: "infernal-war-machine", displayName: "Infernal War Machine"},
		"IWM:W": {nest: "infernal-war-machine", displayName: "Infernal War Machine"},
	};

	static _getClassFilterDisplay (item) {
		const [className, , subclassName] = item.split("\u0000");
		return subclassName === "base" ? `${className} base` : subclassName;
	}

	static _getClassLevelFilterMeta (levelMeta) {
		if (!levelMeta || !levelMeta.class || levelMeta.level == null) return null;

		const className = levelMeta.class.name;
		const classSource = levelMeta.class.source || "PHB";
		const subclassName = levelMeta.subclass?.name;
		const subclassSource = subclassName && (levelMeta.subclass.source || classSource);
		const classKey = this._getClassKey(className, classSource);
		const subclassKey = subclassName ? `${classKey}\u0000${subclassName}\u0000${subclassSource}` : `${classKey}\u0000base`;

		return {classKey, subclassKey, className, level: Number(levelMeta.level)};
	}
	// endregion

	constructor () {
		super();

		this._typeFilter = new Filter({
			header: "Feature Type",
			items: [],
			displayFn: Parser.optFeatureTypeToFull,
			itemSortFn: PageFilterOptionalFeatures._filterFeatureTypeSort,
			nests: [],
			isNestDivider: true,
		});
		this._pactFilter = new Filter({
			header: "Pact Boon",
			items: [],
			displayFn: Parser.prereqPactToFull,
		});
		this._patronFilter = new Filter({
			header: "Otherworldly Patron",
			items: [],
			displayFn: Parser.prereqPatronToShort,
		});
		this._spellFilter = new Filter({
			header: "Spell",
			items: [],
			displayFn: StrUtil.toTitleCase.bind(StrUtil),
		});
		this._featureFilter = new Filter({
			header: "Feature",
			displayFn: StrUtil.toTitleCase.bind(StrUtil),
		});
		this._ingredientFilter = new Filter({
			header: "Ingredients",
			items: ["Animal", "Vegetal", "Mineral", "Otros", "Especial"],
		});
		this._classFilter = new Filter({
			header: "Class / Subclass",
			items: [],
			displayFn: PageFilterOptionalFeatures._getClassFilterDisplay,
			itemSortFn: SortUtil.ascSortLower,
			nests: [],
		});
		this._levelFilter = new OptionalFeatureLevelRangeFilter({
			header: "Level",
			min: 1,
			max: 20,
			wrapperClass: "ve-fltr__optionalfeatures-level",
		});
		this._classAndLevelFilter = new MultiFilter({
			header: "Class and Level",
			filters: [this._levelFilter, this._classFilter],
			mode: "and",
			isModeLocked: true,
			isHeaderHidden: true,
		});
		this._prerequisiteFilter = new MultiFilter({
			header: "Prerequisite",
			filters: [
				this._classAndLevelFilter,
				this._pactFilter,
				this._patronFilter,
				this._spellFilter,
				this._ingredientFilter,
				this._featureFilter,
			],
			isHeaderHidden: true,
		});
		this._miscFilter = new Filter({
			header: "Miscellaneous",
			items: ["Has Info", "Has Images", "Legacy", "Grants Additional Spells"],
			isMiscFilter: true,
			deselFn: PageFilterBase.defaultMiscellaneousDeselFn.bind(PageFilterBase),
		});

		this._bindWarlockPrerequisiteVisibility();
		this._bindFeatureTypePrerequisiteVisibility({featureType: "POT", filters: [this._ingredientFilter]});
	}

	_bindWarlockPrerequisiteVisibility () {
		const classKeys = ["PHB", "XPHB"].map(source => PageFilterOptionalFeatures._getClassKey("Warlock", source));
		const filters = [this._pactFilter, this._patronFilter, this._spellFilter];
		const hk = () => {
			const visibleClassKeys = classKeys.filter(classKey => this._classFilter._nestsHidden[classKey] === false);
			filters.forEach(filter => filter.setIsExternallyHidden(!visibleClassKeys.length));
			if (visibleClassKeys.length) {
				visibleClassKeys.forEach(classKey => this._classFilter.setValue(`${classKey}\u0000base`, 1));
				this._typeFilter.setValue("EI", 1);
			}
		};
		classKeys.forEach(classKey => this._classFilter._addHook("nestsHidden", classKey, hk));
		filters.forEach(filter => filter.setIsExternallyHidden(true));
	}

	_bindFeatureTypePrerequisiteVisibility ({featureType, filters}) {
		const hk = () => filters.forEach(filter => filter.setIsExternallyHidden(this._typeFilter._state[featureType] !== 1));
		this._typeFilter._addHook("state", featureType, hk);
		hk();
	}

	static _RE_OPTIONALFEATURE_PACT = /^pact of (?:the )?(?<pactName>[^|]+)(?:\|[^|]+)?$/;

	static _mutateForFilters_getPrerequisitesFeaturePact (ent) {
		if (!ent.prerequisite) return {};

		const out = {prereqPact: [], prereqFeature: []};

		for (const prereq of ent.prerequisite) {
			if (prereq.pact) out.prereqPact.push(prereq.pact);
			if (prereq.feature) out.prereqFeature.push(...prereq.feature);

			// Modern pacts are linked `optionalfeatures`; convert to "pact" filter format
			if (!prereq.optionalfeature) continue;

			for (const uid of prereq.optionalfeature) {
				const m = this._RE_OPTIONALFEATURE_PACT.exec(uid);
				if (m) {
					out.prereqPact.push(m.groups.pactName.toTitleCase());
					continue;
				}
				out.prereqFeature.push(uid.split("|")[0].toTitleCase());
			}
		}

		return out;
	}

	static mutateForFilters (ent) {
		this._mutateForFilters_commonSources(ent);

		// (Convert legacy string format to array)
		ent.featureType = ent.featureType && ent.featureType instanceof Array ? ent.featureType : ent.featureType ? [ent.featureType] : ["OTH"];
		ent._fPrereqClass = [];
		ent._fPrereqLevel = [];
		ent._fPotionIngredients = [];
		if (ent.prerequisite) {
			ent._sPrereq = true;
			const {prereqPact, prereqFeature} = this._mutateForFilters_getPrerequisitesFeaturePact(ent);
			ent._fPrereqPact = prereqPact;
			ent._fPrereqFeature = prereqFeature;
			ent._fPrereqPatron = ent.prerequisite.filter(it => it.patron).map(it => it.patron);
			ent._fPrereqSpell = ent.prerequisite
				.filter(it => it.spell)
				.map(prereq => {
					return (prereq.spell || [])
						.map(strOrObj => {
							if (typeof strOrObj === "string") return strOrObj.split("#")[0].split("|")[0];

							// TODO(Future) improve if required -- refactor this + `PageFilterSpells` display fns to e.g. render
							const ptChoose = strOrObj.choose
								.split("|")
								.sort(SortUtil.ascSortLower)
								.map(pt => {
									const [filter, values] = pt.split("=");
									switch (filter.toLowerCase()) {
										case "level": return values.split(";").map(v => Parser.spLevelToFullLevelText(Number(v), {isPluralCantrips: false})).join("/");
										case "class": return values.split(";").map(v => v.toTitleCase()).join("/");
										default: return pt;
									}
								})
								.join(" ");
							return `Any ${ptChoose}`;
						});
				});
			const classLevelMetas = ent.prerequisite.map(it => PageFilterOptionalFeatures._getClassLevelFilterMeta(it.level)).filter(Boolean);
			ent._fPrereqClass.push(...classLevelMetas.map(it => it.subclassKey));
			ent._fPrereqLevel.push(...classLevelMetas.map(it => it.level));
		}
		if (ent.potion) {
			ent._fPotionIngredients = ent.potion.ingredientTypes || [];
			const meta = PageFilterOptionalFeatures._getClassLevelFilterMeta({level: ent.potion.level, class: {name: "Alquimista", source: "Himo"}});
			if (meta) {
				ent._fPrereqClass.push(meta.subclassKey);
				ent._fPrereqLevel.push(meta.level);
			}
		}

		ent._dFeatureType = ent.featureType.map(ft => Parser.optFeatureTypeToFull(ft));
		ent._lFeatureType = ent.featureType.join(", ");
		ent.featureType.sort((a, b) => SortUtil.ascSortLower(Parser.optFeatureTypeToFull(a), Parser.optFeatureTypeToFull(b)));

		this._mutateForFilters_commonMisc(ent);
		if (ent.additionalSpells) ent._fMisc.push("Grants Additional Spells");
	}

	addToFilters (it, isExcluded) {
		if (isExcluded) return;

		this._sourceFilter.addItem(it._fSources);
		it.featureType
			.filter(featureType => !PageFilterOptionalFeatures._HIDDEN_FEATURE_TYPES.has(featureType))
			.forEach(featureType => this._addFeatureTypeFilterItem(featureType));
		this._pactFilter.addItem(it._fPrereqPact);
		this._patronFilter.addItem(it._fPrereqPatron);
		this._spellFilter.addItem(it._fPrereqSpell);
		this._featureFilter.addItem(it._fPrereqFeature);
		this._miscFilter.addItem(it._fMisc);

		(it.prerequisite || []).map(it => PageFilterOptionalFeatures._getClassLevelFilterMeta(it.level)).filter(Boolean).forEach(meta => this._addClassLevelFilterItem(meta));
		if (it.potion) this._addClassLevelFilterItem(PageFilterOptionalFeatures._getClassLevelFilterMeta({level: it.potion.level, class: {name: "Alquimista", source: "Himo"}}));
		this._ingredientFilter.addItem(it._fPotionIngredients);
	}

	_addClassLevelFilterItem (meta) {
		if (!meta) return;
		const mode = PageFilterOptionalFeatures._CLASS_FILTER_MODES[meta.classKey];
		this._levelFilter.addItem(meta.level);

		if (mode === "omit") return;
		const isNewClass = !this._classFilter._nests[meta.classKey];
		this._classFilter.addNest(meta.classKey, {isHidden: true, displayName: meta.className});
		if (isNewClass) this._bindClassBaseSelection(meta);
		this._classFilter.addItem(new FilterItem({item: meta.subclassKey, nest: meta.classKey}));
	}

	_addFeatureTypeFilterItem (featureType) {
		const nestMeta = PageFilterOptionalFeatures._FEATURE_TYPE_NESTS[featureType];
		if (nestMeta) this._typeFilter.addNest(nestMeta.nest, {isHidden: true, displayName: nestMeta.displayName});
		this._typeFilter.addItem(new FilterItem({item: featureType, ...(nestMeta ? {nest: nestMeta.nest} : {})}));
	}

	_bindClassBaseSelection ({classKey}) {
		const baseKey = `${classKey}\u0000base`;
		this._classFilter._addHook("nestsHidden", classKey, () => {
			const isHidden = this._classFilter._nestsHidden[classKey] !== false;
			this._classFilter.setValue(baseKey, isHidden ? 0 : 1);
		});
	}

	async _pPopulateBoxOptions (opts) {
		opts.filters = [
			this._sourceFilter,
			this._typeFilter,
			this._prerequisiteFilter,
			this._miscFilter,
		];
	}

	toDisplay (values, it) {
		return this._filterBox.toDisplay(
			values,
			it._fSources,
			it.featureType,
			[
				[it._fPrereqClass, it._fPrereqLevel],
				it._fPrereqPact,
				it._fPrereqPatron,
				it._fPrereqSpell,
				it._fPotionIngredients,
				it._fPrereqFeature,
			],
			it._fMisc,
		);
	}
}

globalThis.PageFilterOptionalFeatures = PageFilterOptionalFeatures;

class ModalFilterOptionalFeatures extends ModalFilterBase {
	/**
	 * @param opts
	 * @param opts.namespace
	 * @param [opts.isRadio]
	 * @param [opts.allData]
	 */
	constructor (opts) {
		opts = opts || {};
		super({
			...opts,
			modalTitle: `Optional Feature${opts.isRadio ? "" : "s"}`,
			pageFilter: new PageFilterOptionalFeatures(),
			previewButtonHandler: new ListUiPreviewButtonHandlerStatsFluff({page: UrlUtil.PG_OPT_FEATURES}),
		});
	}

	_getColumnHeaders () {
		const btnMeta = [
			{sort: "name", text: "Name", width: "3"},
			{sort: "type", text: "Type", width: "2"},
			{sort: "prerequisite", text: "Prerequisite", width: "4"},
			{sort: "level", text: "Level", width: "1"},
			{sort: "source", text: "Source", width: "1"},
		];
		return ModalFilterBase._getFilterColumnHeaders(btnMeta);
	}

	async _pLoadAllData () {
		return [
			...(await DataLoader.pCacheAndGetAllSite(UrlUtil.PG_OPT_FEATURES)),
			...((await PrereleaseUtil.pGetBrewProcessed()).optionalfeature || []),
			...((await BrewUtil2.pGetBrewProcessed()).optionalfeature || []),
		];
	}

	_getListItem (pageFilter, optfeat, ftI) {
		const eleRow = document.createElement("div");
		eleRow.className = "ve-px-0 ve-w-100 ve-flex-col ve-no-shrink";

		const hash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_OPT_FEATURES](optfeat);
		const source = Parser.sourceJsonToAbv(optfeat.source);
		const prerequisite = Renderer.utils.prerequisite.getHtml(optfeat.prerequisite, {isListMode: true, keyOptions: {level: {isNameOnly: true}}});
		const level = Renderer.optionalfeature.getListPrerequisiteLevelText(optfeat.prerequisite);

		eleRow.innerHTML = `<div class="ve-w-100 ve-flex-vh-center ve-lst__row-border veapp__list-row ve-no-select ve-lst__wrp-cells">
			<div class="ve-col-0-5 ve-pl-0 ve-flex-vh-center">${this._isRadio ? `<input type="radio" name="radio" class="ve-no-events">` : `<input type="checkbox" class="ve-no-events">`}</div>

			<div class="ve-col-0-5 ve-px-1 ve-flex-vh-center">
				<div class="ve-ui-list__btn-inline ve-px-2 ve-no-select" title="Toggle Preview (SHIFT to Toggle Info Preview)">[+]</div>
			</div>

			<div class="ve-col-3 ve-px-1 ${optfeat._versionBase_isVersion ? "ve-italic" : ""} ${this._getNameStyle()}">${optfeat._versionBase_isVersion ? `<span class="ve-px-3"></span>` : ""}${optfeat.name}</div>
			<span class="ve-col-2 ve-px-1 ve-text-center" title="${optfeat._dFeatureType.join(", ").qq()}">${optfeat._lFeatureType}</span>
			<span class="ve-col-4 ve-px-1 ve-text-center">${prerequisite}</span>
			<span class="ve-col-1 ve-px-1 ve-text-center">${level}</span>
			<div class="ve-col-1 ve-pl-1 ve-pr-0 ve-flex-h-center ${Parser.sourceJsonToSourceClassname(optfeat.source)}" title="${Parser.sourceJsonToFull(optfeat.source)}">${source}${Parser.sourceJsonToMarkerHtml(optfeat.source, {isList: true})}</div>
		</div>`;

		const btnShowHidePreview = eleRow.firstElementChild.children[1].firstElementChild;

		const listItem = new ListItem({
			id: ftI,
			ele: eleRow,
			name: optfeat.name,
			values: {
				source,
				sourceJson: optfeat.source,
				...ListItem.getCommonValues(optfeat),
				prerequisite,
				level,
				type: optfeat._lFeatureType,
			},
			data: {
				hash,
				page: optfeat.page,
				cbSel: eleRow.firstElementChild.firstElementChild.firstElementChild,
				btnShowHidePreview,
			},
		});

		this._previewButtonHandler.bindPreviewButton({entity: optfeat, listItem, btnShowHidePreview});

		return listItem;
	}
}

globalThis.ModalFilterOptionalFeatures = ModalFilterOptionalFeatures;
