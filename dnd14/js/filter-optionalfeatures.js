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
		return SortUtil.ascSort(PageFilterOptionalFeatures._getFeatureTypeDisplay(a.item), PageFilterOptionalFeatures._getFeatureTypeDisplay(b.item));
	}

	static _getFeatureTypeDisplay (featureType) {
		return featureType === "MV:B" ? "Battle Master" : Parser.optFeatureTypeToFull(featureType);
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
		[PageFilterOptionalFeatures._getClassKey("Alquimista", "Himo")]: "nest-only",
		[PageFilterOptionalFeatures._getClassKey("Artificer", "PHB")]: "omit",
		[PageFilterOptionalFeatures._getClassKey("Artificer", "TCE")]: "omit",
		[PageFilterOptionalFeatures._getClassKey("Artificer (Revisited)", "PHB")]: "omit",
		[PageFilterOptionalFeatures._getClassKey("Fighter", "PHB")]: "omit",
		[PageFilterOptionalFeatures._getClassKey("Monk", "PHB")]: "omit",
		[PageFilterOptionalFeatures._getClassKey("Warlock", "PHB")]: "nest-only",
		[PageFilterOptionalFeatures._getClassKey("Warlock", "XPHB")]: "nest-only",
	};

	static _HIDDEN_FEATURE_TYPES = new Set(["AS", "AS:V1-UA", "AS:V2-UA", "MV", "MV:C2-UA"]);
	static _POTION_LEVELS = [1, 5, 10, 15];
	static _POTION_INGREDIENTS = ["Animal", "Vegetal", "Mineral", "Otros", "Especial"];
	static _GENERAL_LEVELS = Array.from({length: 20}, (_, i) => i + 1);

	static _FEATURE_TYPE_NESTS = {
		"FS:B": {nest: "fighting-styles", displayName: "Fighting Styles"},
		"FS:C": {nest: "fighting-styles", displayName: "Fighting Styles"},
		"FS:EM": {nest: "fighting-styles", displayName: "Fighting Styles"},
		"FS:F": {nest: "fighting-styles", displayName: "Fighting Styles"},
		"FS:P": {nest: "fighting-styles", displayName: "Fighting Styles"},
		"FS:R": {nest: "fighting-styles", displayName: "Fighting Styles"},
	};

	static _getClassFilterDisplay (item) {
		const [className, , subclassName] = item.split("\u0000");
		if (subclassName == null) return className;
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

	static _getPotionClassFilterMeta () {
		const className = "Alquimista";
		const classKey = this._getClassKey(className, "Himo");
		return {classKey, selectionKey: classKey, className};
	}
	// endregion

	constructor () {
		super();

		this._typeFilter = new Filter({
			header: "Feature Type",
			items: [],
			displayFn: PageFilterOptionalFeatures._getFeatureTypeDisplay,
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
			items: PageFilterOptionalFeatures._POTION_INGREDIENTS,
		});
		this._potionLevelFilter = new Filter({
			header: "Potion Level",
			items: PageFilterOptionalFeatures._POTION_LEVELS,
			displayFn: level => `${level}`,
			itemSortFn: SortUtil.ascSort,
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
			filters: [this._classFilter, this._levelFilter, this._potionLevelFilter, this._ingredientFilter],
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
				this._featureFilter,
			],
			mode: "or",
			isHeaderHidden: true,
		});
		this._miscFilter = new Filter({
			header: "Miscellaneous",
			items: ["Has Info", "Has Images", "Legacy", "Grants Additional Spells"],
			isMiscFilter: true,
			deselFn: PageFilterBase.defaultMiscellaneousDeselFn.bind(PageFilterBase),
		});

		this._bindWarlockPrerequisiteVisibility();
		this._bindAlchemistPotionVisibility();
	}

	_bindWarlockPrerequisiteVisibility () {
		const classKeys = ["PHB", "XPHB"].map(source => PageFilterOptionalFeatures._getClassKey("Warlock", source));
		const filters = [this._pactFilter, this._patronFilter, this._spellFilter];
		const hk = () => {
			const visibleClassKeys = classKeys.filter(classKey => this._classFilter._nestsHidden[classKey] === false);
			filters.forEach(filter => filter.setIsExternallyHidden(!visibleClassKeys.length));
		};
		classKeys.forEach(classKey => this._classFilter._addHook("nestsHidden", classKey, hk));
		filters.forEach(filter => filter.setIsExternallyHidden(true));
	}

	_bindAlchemistPotionVisibility () {
		const {classKey, selectionKey} = PageFilterOptionalFeatures._getPotionClassFilterMeta();
		const filters = [this._ingredientFilter, this._potionLevelFilter];
		let wasOpen = null;
		const hk = () => {
			const isOpen = this._classFilter._nestsHidden[classKey] === false;
			filters.forEach(filter => filter.setIsExternallyHidden(!isOpen));

			// The first state update restores the persisted open/closed UI state.
			// It must never become a hidden potion selection, or an opened section
			// from a previous visit would filter the whole catalogue on page load.
			if (wasOpen === null) {
				wasOpen = isOpen;
				this._classFilter.setValue(selectionKey, 0);
				filters.forEach(filter => filter.reset());
				return;
			}
			wasOpen = isOpen;

			if (isOpen) {
				this._classFilter.setValue(selectionKey, 1);
				return;
			}

			this._classFilter.setValue(selectionKey, 0);
			filters.forEach(filter => filter.reset());
		};

		this._classFilter._addHook("nestsHidden", classKey, hk);
		filters.forEach(filter => filter.setIsExternallyHidden(true));
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
		ent._fPotionClass = [];
		ent._fPotionLevel = [];
		ent._fPotionIngredients = [];
		if (ent.prerequisite) {
			ent._sPrereq = true;
			const {prereqPact, prereqFeature} = this._mutateForFilters_getPrerequisitesFeaturePact(ent);
			ent._fPrereqPact = prereqPact;
			ent._fPrereqFeature = prereqFeature;
			ent._fPrereqPatron = ent.prerequisite.filter(it => it.patron).map(it => it.patron);
			ent._fPrereqSpell = ent.prerequisite
				.filter(it => it.spell)
				.flatMap(prereq => {
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
			ent._fPotionClass.push(PageFilterOptionalFeatures._getPotionClassFilterMeta().selectionKey);
			ent._fPotionLevel.push(Number(ent.potion.level));
			ent._fPrereqLevel.push(...PageFilterOptionalFeatures._GENERAL_LEVELS);
		} else {
			// Potion-only filters should not remove regular class features when both
			// kinds are selected together.
			ent._fPotionIngredients = [...PageFilterOptionalFeatures._POTION_INGREDIENTS];
			ent._fPotionLevel = [...PageFilterOptionalFeatures._POTION_LEVELS];
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
		if (it.potion) this._addPotionClassFilterItem();
		this._potionLevelFilter.addItem(it._fPotionLevel);
		this._ingredientFilter.addItem(it._fPotionIngredients);
	}

	_addClassLevelFilterItem (meta) {
		if (!meta) return;
		const mode = PageFilterOptionalFeatures._CLASS_FILTER_MODES[meta.classKey];
		this._levelFilter.addItem(meta.level);

		if (mode === "omit") return;
		const isNewClass = !this._classFilter._nests[meta.classKey];
		this._classFilter.addNest(meta.classKey, {isHidden: true, displayName: meta.className});
		if (mode === "nest-only") return;
		if (isNewClass) this._bindClassBaseSelection(meta);
		this._classFilter.addItem(new FilterItem({item: meta.subclassKey, nest: meta.classKey}));
	}

	_addPotionClassFilterItem () {
		const meta = PageFilterOptionalFeatures._getPotionClassFilterMeta();
		this._classFilter.addNest(meta.classKey, {isHidden: true, displayName: meta.className});
		this._classFilter.addItem(new FilterItem({item: meta.selectionKey, nest: meta.classKey, isHidden: true}));
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
				[it._fPrereqClass.concat(it._fPotionClass), it._fPrereqLevel.length ? it._fPrereqLevel : null, it._fPotionLevel, it._fPotionIngredients],
				it._fPrereqPact,
				it._fPrereqPatron,
				it._fPrereqSpell,
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
		const prerequisite = Renderer.optionalfeature.getListPrerequisiteHtml(optfeat);
		const level = Renderer.optionalfeature.getListPrerequisiteLevelText(optfeat);

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
