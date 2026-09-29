"use strict";

function optFeatSort (itemA, itemB, options) {
	if (options.sortBy === "level") {
		const aValue = Number(itemA.values.level) || 0;
		const bValue = Number(itemB.values.level) || 0;
		return SortUtil.ascSort(aValue, bValue) || SortUtil.listSort(itemA, itemB, options);
	}
	return SortUtil.listSort(itemA, itemB, options);
}

function filterFeatureTypeSort (a, b) {
	return SortUtil.ascSort(Parser.optFeatureTypeToFull(a.item), Parser.optFeatureTypeToFull(b.item))
}

class OptionalFeatureLevelRangeFilter extends RangeFilter {
	setStateFromLoaded (filterState) {
		const toLoad = filterState && filterState[this.header];
		const state = toLoad && toLoad.state;
		const isRangeState = state && ["min", "max", "curMin", "curMax"].some(prop => state[prop] != null);

		if (!isRangeState) {
			if (toLoad) this.setBaseStateFromLoaded(toLoad);
			return;
		}

		super.setStateFromLoaded(filterState);
	}

	setFromSubHashState (state) {
		const cleanedState = {};
		Object.entries(state).forEach(([key, values]) => {
			if (FilterBase.getProp(key) !== "state") {
				cleanedState[key] = values;
				return;
			}

			const rangeValues = values.filter(it => /^(min|max)=/.test(it));
			if (rangeValues.length) cleanedState[key] = rangeValues;
		});

		if (!Object.keys(cleanedState).some(key => FilterBase.getProp(key) === "state")) {
			this.setMetaFromSubHashState(cleanedState);
			this.reset();
			return;
		}

		super.setFromSubHashState(cleanedState);
	}
}

class OptionalFeaturesPage extends ListPage {
	static _getClassLevelFilterMeta (levelMeta) {
		if (!levelMeta || !levelMeta.class || levelMeta.level == null) return null;

		const className = levelMeta.class.name;
		const classSource = levelMeta.class.source || SRC_PHB;
		const subclassName = levelMeta.subclass && levelMeta.subclass.name;
		const subclassSource = subclassName && (levelMeta.subclass.source || classSource);
		const classKey = `${className}\u0000${classSource}`;
		const subclassKey = subclassName ? `${classKey}\u0000${subclassName}\u0000${subclassSource}` : `${classKey}\u0000base`;

		return {
			classKey,
			subclassKey,
			className,
			subclassName,
			level: Number(levelMeta.level)
		};
	}

	constructor () {
		const sourceFilter = SourceFilter.getInstance();
		const typeFilter = new Filter({
			header: "Feature Type",
			items: ["AI", "ED", "EI", "MM", "MV", "MV:B", "OTH", "FS:F", "FS:B", "FS:P", "FS:R", "PB", "POT", "PW", "BRM", "JUG"],
			displayFn: Parser.optFeatureTypeToFull,
			itemSortFn: filterFeatureTypeSort
		});
		const pactFilter = new Filter({
			header: "Pact Boon",
			items: ["Blade", "Chain", "Tome"],
			displayFn: Parser.prereqPactToFull
		});
		const patronFilter = new Filter({
			header: "Otherworldly Patron",
			items: ["The Archfey", "The Fiend", "The Great Old One", "The Hexblade", "The Kraken", "The Raven Queen", "The Seeker"],
			displayFn: Parser.prereqPatronToShort
		});
		const spellFilter = new Filter({
			header: "Spell",
			items: ["eldritch blast", "hex/curse"],
			displayFn: StrUtil.toTitleCase
		});
		const featureFilter = new Filter({
			header: "Feature",
			displayFn: StrUtil.toTitleCase
		});
		const ingredientFilter = new Filter({
			header: "Ingredients",
			items: ["Animal", "Vegetal", "Mineral", "Otros", "Especial"]
		});
		const classFilter = new Filter({
			header: "Class / Subclass",
			displayFn: item => item.endsWith("\u0000base") ? "Base" : item.split("\u0000")[2],
			itemSortFn: (a, b) => SortUtil.ascSortLower(a.item.endsWith("\u0000base") ? "Base" : a.item.split("\u0000")[2], b.item.endsWith("\u0000base") ? "Base" : b.item.split("\u0000")[2]),
			nests: []
		});
		const levelFilter = new OptionalFeatureLevelRangeFilter({header: "Level", min: 1, max: 20});
		const classAndLevelFilter = new MultiFilter({
			header: "Class and Level",
			filters: [classFilter, levelFilter],
			mode: "and",
			isModeLocked: true
		});
		const prerequisiteFilter = new MultiFilter({header: "Prerequisite", filters: [pactFilter, patronFilter, spellFilter, classAndLevelFilter, featureFilter, ingredientFilter]});

		super({
			dataSource: "data/optionalfeatures.json",

			filters: [
				sourceFilter,
				typeFilter,
				prerequisiteFilter
			],
			filterSource: sourceFilter,

			listClass: "optfeatures",
			listOptions: {
				fnSort: optFeatSort
			},

			sublistClass: "suboptfeatures",
			sublistOptions: {
				fnSort: optFeatSort
			},

			dataProps: ["optionalfeature"]
		});

		this._sourceFilter = sourceFilter;
		this._typeFilter = typeFilter;
		this._pactFilter = pactFilter;
		this._patronFilter = patronFilter;
		this._spellFilter = spellFilter;
		this._featureFilter = featureFilter;
		this._classFilter = classFilter;
		this._levelFilter = levelFilter;
		this._classAndLevelFilter = classAndLevelFilter;
		this._ingredientFilter = ingredientFilter;
	}

	_addClassLevelFilterItem (levelMeta) {
		const meta = OptionalFeaturesPage._getClassLevelFilterMeta(levelMeta);
		if (!meta) return null;

		this._classFilter.addNest(meta.classKey, {isHidden: true, displayName: meta.className});
		this._classFilter.addItem(new FilterItem({item: meta.subclassKey, nest: meta.classKey}));
		this._levelFilter.addItem(meta.level);
		return meta;
	}

	getListItem (it, ivI, isExcluded) {
		it.featureType = it.featureType || "OTH";
		if (it.prerequisite) {
			it._sPrereq = true;
			it._fPrereqPact = it.prerequisite.filter(it => it.pact).map(it => {
				this._pactFilter.addItem(it.pact);
				return it.pact;
			});
			it._fPrereqPatron = it.prerequisite.filter(it => it.patron).map(it => {
				this._patronFilter.addItem(it.patron);
				return it.patron;
			});
			it._fprereqSpell = it.prerequisite.filter(it => it.spell).map(it => {
				const mapped = (it.spell || []).map(it => it.split("#")[0].split("|")[0]);
				this._spellFilter.addItem(mapped);
				return mapped;
			});
			it._fprereqFeature = it.prerequisite.filter(it => it.feature).map(it => {
				this._featureFilter.addItem(it.feature);
				return it.feature;
			});
			const classLevelMetas = it.prerequisite.map(it => this._addClassLevelFilterItem(it.level)).filter(Boolean);
			it._fPrereqClass = classLevelMetas.map(it => it.subclassKey);
			it._fPrereqLevel = classLevelMetas.map(it => it.level);
		}
		if (it.potion) {
			it._fPotionIngredients = it.potion.ingredientTypes || [];
			this._ingredientFilter.addItem(it._fPotionIngredients);

			const meta = this._addClassLevelFilterItem({
				level: it.potion.level,
				class: {name: "Alquimista", source: "Himo"}
			});
			it._fPrereqClass = [meta.subclassKey];
			it._fPrereqLevel = [meta.level];
		}

		if (it.featureType instanceof Array) {
			it._dFeatureType = it.featureType.map(ft => Parser.optFeatureTypeToFull(ft));
			it._lFeatureType = it.featureType.join(", ");
			it.featureType.sort((a, b) => SortUtil.ascSortLower(Parser.optFeatureTypeToFull(a), Parser.optFeatureTypeToFull(b)));
		} else {
			it._dFeatureType = Parser.optFeatureTypeToFull(it.featureType);
			it._lFeatureType = it.potion || ["PW", "BRM", "JUG"].includes(it.featureType) ? it._dFeatureType : it.featureType;
		}

		if (!isExcluded) {
			// populate filters
			this._sourceFilter.addItem(it.source);
			this._typeFilter.addItem(it.featureType);
		}

		const eleLi = document.createElement("li");
		eleLi.className = `row ${isExcluded ? "row--blacklisted" : ""}`;

		const source = Parser.sourceJsonToAbv(it.source);
		const hash = UrlUtil.autoEncodeHash(it);
		const prerequisite = it.potion ? it.potion.ingredients : Renderer.utils.getPrerequisiteText(it.prerequisite, true, new Set(["level"]));
		const level = it.potion ? it.potion.level : Renderer.optionalfeature.getListPrerequisiteLevelText(it.prerequisite);

		eleLi.innerHTML = `<a href="#${hash}" class="lst--border">
			<span class="bold col-3-2 pl-0">${it.name}</span>
			<span class="col-1-5 text-center" title="${it._dFeatureType}">${it._lFeatureType}</span>
			<span class="col-4-8 text-center">${prerequisite}</span>
			<span class="col-1 text-center">${level}</span>
			<span class="col-1-5 ${Parser.sourceJsonToColor(it.source)} text-center pr-0" title="${Parser.sourceJsonToFull(it.source)}" ${BrewUtil.sourceJsonToStyle(it.source)}>${source}</span>
		</a>`;

		const listItem = new ListItem(
			ivI,
			eleLi,
			it.name,
			{
				hash,
				source,
				prerequisite,
				level,
				type: it._lFeatureType
			},
			{
				uniqueId: it.uniqueId ? it.uniqueId : ivI,
				isExcluded
			}
		);

		eleLi.addEventListener("click", (evt) => this._list.doSelect(listItem, evt));
		eleLi.addEventListener("contextmenu", (evt) => ListUtil.openContextMenu(evt, this._list, listItem));

		return listItem;
	}

	handleFilterChange () {
		const f = this._filterBox.getValues();
		this._list.filter(item => {
			const it = this._dataList[item.ix];
			return this._filterBox.toDisplay(
				f,
				it.source,
				it.featureType,
				[
					it._fPrereqPact,
					it._fPrereqPatron,
					it._fprereqSpell,
					[it._fPrereqClass, it._fPrereqLevel],
					it._fprereqFeature,
					it._fPotionIngredients
				]
			);
		});
		FilterBox.selectFirstVisible(this._dataList);
	}

	getSublistItem (it, pinId) {
		const hash = UrlUtil.autoEncodeHash(it);
		const prerequisite = it.potion ? it.potion.ingredients : Renderer.utils.getPrerequisiteText(it.prerequisite, true, new Set(["level"]));
		const level = it.potion ? it.potion.level : Renderer.optionalfeature.getListPrerequisiteLevelText(it.prerequisite);

		const $ele = $(`<li class="row">
			<a href="#${hash}" class="lst--border">
				<span class="bold col-4 pl-0">${it.name}</span>
				<span class="col-2 text-center" title="${it._dFeatureType}">${it._lFeatureType}</span>
				<span class="col-4-5 ${prerequisite === "\u2014" ? "text-center" : ""}">${prerequisite}</span>
				<span class="col-1-5 pr-0">${level}</span>
			</a>
		</li>`)
			.contextmenu(evt => ListUtil.openSubContextMenu(evt, listItem));

		const listItem = new ListItem(
			pinId,
			$ele,
			it.name,
			{
				hash,
				type: it._lFeatureType,
				prerequisite,
				level
			}
		);
		return listItem;
	}

	doLoadHash (id) {
		const it = this._dataList[id];

		const $wrpTab = $(`#stat-tabs`);
		$wrpTab.find(`.opt-feature-type`).remove();
		const $wrpOptFeatType = $(`<div class="opt-feature-type"/>`).prependTo($wrpTab);
		if (it.featureType instanceof Array) {
			const commonPrefix = MiscUtil.findCommonPrefix(it.featureType.map(fs => Parser.optFeatureTypeToFull(fs)));
			if (commonPrefix) $wrpOptFeatType.append(`${commonPrefix.trim()} `);
			it.featureType.forEach((ft, i) => {
				if (i > 0) $wrpOptFeatType.append("/");
				$(`<span class="roller">${Parser.optFeatureTypeToFull(ft).substring(commonPrefix.length)}</span>`)
					.click(() => {
						this._filterBox.setFromValues({"Feature Type": {[ft]: 1}});
						this.handleFilterChange();
					})
					.appendTo($wrpOptFeatType);
			});
		} else {
			$(`<span class="roller">${Parser.optFeatureTypeToFull(it.featureType)}</span>`)
				.click(() => {
					this._filterBox.setFromValues({"Feature Type": {[it.featureType]: 1}});
					this.handleFilterChange();
				})
				.appendTo($wrpOptFeatType);
		}

		$(`#pagecontent`).empty().append(RenderOptionalFeatures.$getRenderedOptionalFeature(it));

		ListUtil.updateSelected();
	}

	async pDoLoadSubHash (sub) {
		sub = this._filterBox.setFromSubHashes(sub);
		await ListUtil.pSetFromSubHashes(sub);
	}
}

const optionalFeaturesPage = new OptionalFeaturesPage();
window.addEventListener("load", () => optionalFeaturesPage.pOnLoad());
