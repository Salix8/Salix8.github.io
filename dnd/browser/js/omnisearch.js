"use strict";

const Omnisearch = {
	_PLACEHOLDER_TEXT: "Search everywhere...",
	_searchIndex: null,
	_compactNames: new Map(),
	_pLoadSearch: null,
	_CATEGORY_COUNTS: {},
	highestId: -1,

	init: function () {
		if (IS_VTT) return;

		const $nav = $(`#navbar`);

		const $searchIn = $(`<input class="form-control search omni__input" placeholder="${Omnisearch._PLACEHOLDER_TEXT}" title="Hotkey: F. Disclaimer: unlikely to search everywhere. Use with caution.">`).disableSpellcheck();
		const $searchSubmit = $(`<button class="btn btn-default omni__submit" tabindex="-1"><span class="glyphicon glyphicon-search"></span></button>`);

		const $searchInputWrapper = $$`
			<div class="input-group omni__wrp-input">
				${$searchIn}
				<div class="input-group-btn">
					${$searchSubmit}
				</div>
			</div>
		`.appendTo($nav);

		const $searchOutWrapper = $(`<div class="omni__wrp-output"/>`).insertAfter($nav);
		const $searchOut = $(`<div class="omni__output"/>`).appendTo($searchOutWrapper);

		let clickFirst = false;

		const $body = $(`body`);
		$body.on("click", () => $searchOutWrapper.hide());
		$searchOut.on("click", (e) => e.stopPropagation());

		$searchIn.on("keydown", (e) => {
			switch (e.which) {
				case 13: // enter
					clickFirst = true;
					$searchSubmit.click();
					break;
				case 38: // up
					e.preventDefault();
					break;
				case 40: // down
					e.preventDefault();
					$searchOut.find(`a`).first().focus();
					break;
				case 27: // escape
					$searchIn.val("");
					$searchIn.blur();
			}
			e.stopPropagation();
		});

		// auto-search after 100ms
		const TYPE_TIMEOUT_MS = 100;
		let typeTimer;
		const scheduleSearch = () => {
			clickFirst = false;
			clearTimeout(typeTimer);
			typeTimer = setTimeout(() => $searchSubmit.click(), TYPE_TIMEOUT_MS);
		};
		$searchIn.on("keyup", (e) => {
			if (e.which >= 37 && e.which <= 40) return;
			scheduleSearch();
		});
		$searchIn.on("input", scheduleSearch);
		$searchIn.on("keydown", () => clearTimeout(typeTimer));
		$searchIn.on("click", (e) => {
			if ($searchIn.val() && $searchIn.val().trim().length) $searchSubmit.click();
			e.stopPropagation();
		});

		$searchSubmit.on("click", (e) => {
			e.stopPropagation();
			pDoSearch();
		});

		initScrollHandler();

		const MAX_RESULTS = 15;
		async function pDoSearch () {
			await Omnisearch.pInit();

			let page = 0;
			let results = Omnisearch.getSearchResults($searchIn.val());

			if (!doShowUaEtc()) {
				results = results.filter(r => r.doc.s && !SourceUtil._isNonstandardSourceWiz(r.doc.s));
			}

			if (!doHideBlacklisted() && ExcludeUtil.getList().length) {
				results = results.filter(r => {
					if (r.doc.c === Parser.CAT_ID_QUICKREF) return true;
					const bCat = Parser.pageCategoryToProp(r.doc.c);
					const bName = r.doc.b || r.doc.n;
					return !ExcludeUtil.isExcluded(bName, bCat, r.doc.s);
				});
			}

			if (results.length) {
				renderLinks();
			} else {
				$searchOut.empty();
				$searchOutWrapper.hide();
			}

			function renderLinks () {
				function getHoverStr (category, url, src) {
					return `onmouseover="Renderer.hover.pHandleLinkMouseOver(event, this, '${UrlUtil.categoryToPage(category)}', '${src}', '${url.replace(/'/g, "\\'")}')" onmouseleave="Renderer.hover.handleLinkMouseLeave(event, this)" onmousemove="Renderer.hover.handleLinkMouseMove(event, this)" ${Renderer.hover.getPreventTouchString()}`;
				}

				$searchOut.empty();
				const showUa = doShowUaEtc();
				const $btnUaEtc = $(`<button class="btn btn-default btn-xs btn-file ${showUa ? "active" : ""}" title="Filter Unearthed Arcana and other unofficial source results" tabindex="-1">Include UA/etc.</button>`)
					.on("click", () => {
						setShowUaEtc(!showUa);
						pDoSearch();
					});

				const hideBlacklisted = doHideBlacklisted();
				const $btnBlacklist = $(`<button class="btn btn-default btn-xs btn-file ${hideBlacklisted ? "active" : ""}" style="margin-left: 6px;" title="Filter blacklisted content results" tabindex="-1">Include Blacklisted</button>`)
					.on("click", () => {
						setShowBlacklisted(!hideBlacklisted);
						pDoSearch();
					});

				$searchOut.append($(`<div class="text-right"/>`).append([$btnUaEtc, $btnBlacklist]));
				const base = page * MAX_RESULTS;
				for (let i = base; i < Math.max(Math.min(results.length, MAX_RESULTS + base), base); ++i) {
					const r = results[i].doc;
					const $link = $(`<a href="${Renderer.get().baseUrl}${UrlUtil.categoryToPage(r.c)}#${r.u}" ${r.h ? getHoverStr(r.c, r.u, r.s) : ""}>${r.cf}: ${r.n}</a>`)
						.keydown(evt => Omnisearch.handleLinkKeyDown(evt, $link, $searchIn, $searchOut));
					$$`<p>
						${$link}
						${r.s ? `<i title="${Parser.sourceJsonToFull(r.s)}">${Parser.sourceJsonToAbv(r.s)}${r.p ? ` p${r.p}` : ""}</i>` : ""}
					</p>`.appendTo($searchOut);
				}
				$searchOutWrapper.css("display", "flex");

				// add pagination if there are many results
				if (results.length > MAX_RESULTS) {
					const $pgControls = $(`<div class="omni__wrp-paginate">`);
					if (page > 0) {
						const $prv = $(`<span class="omni__paginate-left has-results-left omni__paginate-ctrl"><span class="glyphicon glyphicon-chevron-left"></span></span>`).on("click", () => {
							page--;
							renderLinks();
						});
						$pgControls.append($prv);
					} else ($pgControls.append(`<span class="omni__paginate-left">`));
					$pgControls.append(`<span class="paginate-count">Page ${page + 1}/${Math.ceil(results.length / MAX_RESULTS)} (${results.length} results)</span>`);
					if (results.length - (page * MAX_RESULTS) > MAX_RESULTS) {
						const $nxt = $(`<span class="omni__paginate-right has-results-right omni__paginate-ctrl"><span class="glyphicon glyphicon-chevron-right"></span></span>`).on("click", () => {
							page++;
							renderLinks();
						});
						$pgControls.append($nxt)
					} else ($pgControls.append(`<span class="omni__paginate-right omni__paginate-ctrl">`));
					$searchOut.append($pgControls);
				}

				if (clickFirst) {
					$searchOut.find(`a`).first()[0].click();
				}
			}
		}
		const STORAGE_NAME_UA_ETC = "search-ua-etc";
		const STORAGE_NAME_BLACKLIST = "search-blacklist";
		const CK_SHOW = "SHOW";
		const CK_HIDE = "HIDE";

		let showUaEtc;
		function doShowUaEtc () {
			if (!showUaEtc) showUaEtc = StorageUtil.syncGet(STORAGE_NAME_UA_ETC);
			return showUaEtc !== CK_HIDE;
		}

		function setShowUaEtc (value) {
			showUaEtc = value ? CK_SHOW : CK_HIDE;
			StorageUtil.syncSet(STORAGE_NAME_UA_ETC, showUaEtc);
		}

		let hideBlacklisted;
		function doHideBlacklisted () {
			if (!hideBlacklisted) hideBlacklisted = StorageUtil.syncGet(STORAGE_NAME_BLACKLIST);
			return hideBlacklisted === CK_SHOW;
		}

		function setShowBlacklisted (value) {
			hideBlacklisted = value ? CK_SHOW : CK_HIDE;
			StorageUtil.syncSet(STORAGE_NAME_BLACKLIST, hideBlacklisted);
		}

		function initScrollHandler () {
			const $window = $(window);
			$window.on("scroll", () => {
				if (Renderer.hover.isSmallScreen()) {
					$searchIn.attr("placeholder", Omnisearch._PLACEHOLDER_TEXT);
					$searchInputWrapper.removeClass("omni__wrp-input--scrolled");
					$searchOut.removeClass("omni__output--scrolled");
				} else {
					if ($window.scrollTop() > 50) {
						$searchIn.attr("placeholder", "");
						$searchInputWrapper.addClass("omni__wrp-input--scrolled");
						$searchOut.addClass("omni__output--scrolled");
					} else {
						$searchIn.attr("placeholder", Omnisearch._PLACEHOLDER_TEXT);
						$searchInputWrapper.removeClass("omni__wrp-input--scrolled");
						$searchOut.removeClass("omni__output--scrolled");
					}
				}
			});
		}

		$body.on("keypress", (e) => {
			if (!noModifierKeys(e) || MiscUtil.isInInput(e)) return;
			if (e.key === "f" || e.key === "F") {
				const toSel = e.key === "F" ? $searchIn : $(`#filter-search-input-group`).find(`.search`);
				// defer, otherwise the "f" will be input into the search field
				setTimeout(() => toSel.select().focus(), 0);
			}
		});
	},

	async pInit () {
		if (!Omnisearch._searchIndex) {
			if (Omnisearch._pLoadSearch) await Omnisearch._pLoadSearch;
			else {
				Omnisearch._pLoadSearch = Omnisearch._pDoSearchLoad();
				await Omnisearch._pLoadSearch;
				Omnisearch._pLoadSearch = null;
			}
		}
	},

	_pDoSearchLoad: async function () {
		const data = Omnidexer.decompressIndex(await DataUtil.loadJSON(`${Renderer.get().baseUrl}search/index.json`));

		elasticlunr.clearStopWords();
		Omnisearch._searchIndex = elasticlunr(function () {
			this.addField("n");
			this.addField("cf");
			this.addField("s");
			this.setRef("id");
		});
		SearchUtil.removeStemmer(Omnisearch._searchIndex);
		SearchUtil.addNormalizer(Omnisearch._searchIndex);
		Omnisearch._compactNames.clear();

		data.forEach(Omnisearch._addToIndex);
		Omnisearch.highestId = data.last().id;

		// this doesn't update if the 'Brew changes later, but so be it.
		const brewIndex = await BrewUtil.pGetSearchIndex();
		brewIndex.forEach(Omnisearch._addToIndex);
		if (brewIndex.length) Omnisearch.highestId = brewIndex.last().id
	},

	async pAddToIndex (prop, ...entries) {
		if (!entries.length) return;

		await Omnisearch.pInit();
		const indexer = new Omnidexer(Omnisearch.highestId + 1);

		const toIndex = {[prop]: entries};

		Omnidexer.TO_INDEX__FROM_INDEX_JSON.filter(it => it.listProp === prop)
			.forEach(it => indexer.addToIndex(it, toIndex));
		Omnidexer.TO_INDEX.filter(it => it.listProp === prop)
			.forEach(it => indexer.addToIndex(it, toIndex));

		const toAdd = Omnidexer.decompressIndex(indexer.getIndex());
		toAdd.forEach(Omnisearch._addToIndex);
		if (toAdd.length) Omnisearch.highestId = toAdd.last().id
	},

	getSearchResults (searchTerm) {
		const term = SearchUtil.getNormalizedText(searchTerm);
		if (!term) return [];
		const categories = Object.keys(Omnisearch._CATEGORY_COUNTS);
		const tokens = elasticlunr.tokenizer(term).map(token => ({
			token,
			category: categories.find(category => {
				const normalized = SearchUtil.getNormalizedText(category);
				return token === `in:${normalized}` || token === `in:${normalized}s`;
			})
		}));
		const categoryTokens = tokens.filter(it => it.category);
		const category = categoryTokens.length === 1 ? categoryTokens[0].category : null;
		const text = category ? tokens.filter(it => !it.category).map(it => it.token).join(" ") : term;
		const results = Omnisearch._searchIndex.search(text, {
			fields: {n: {boost: 5, expand: true}, s: {expand: true}},
			bool: "AND",
			expand: true
		});
		const compactTerm = SearchUtil.getCompactText(text);
		const seen = new Set(results.map(it => String(it.doc.id)));
		// Preserve engine ranking, then append extra name matches without merging distinct entries.
		if (compactTerm) {
			for (const [id, entry] of Omnisearch._compactNames) {
				if (seen.has(id) || !entry.name.includes(compactTerm)) continue;
				results.push({ref: id, doc: entry.doc, score: 0});
				seen.add(id);
			}
		}
		return category ? results.filter(it => it.doc.cf === category) : results;
	},

	_addToIndex (d) {
		d.cf = Parser.pageCategoryToFull(d.c);
		if (!Omnisearch._CATEGORY_COUNTS[d.cf]) Omnisearch._CATEGORY_COUNTS[d.cf] = 1;
		else Omnisearch._CATEGORY_COUNTS[d.cf]++;
		Omnisearch._searchIndex.addDoc(d);
		Omnisearch._compactNames.set(String(d.id), {doc: d, name: SearchUtil.getCompactText(d.n)});
	},

	handleLinkKeyDown (e, $ele, $searchIn, $searchOut) {
		switch (e.which) {
			case 37: { // left
				e.preventDefault();
				if ($(`.has-results-left`).length) {
					const ix = $ele.parent().index() - 1; // offset as the control bar is at position 0
					$(`.omni__paginate-left`).click();
					const $psNext = $searchOut.find(`p`);
					$($psNext[ix] || $psNext[$psNext.length - 1]).find(`a`).focus();
				}
				break;
			}
			case 38: { // up
				e.preventDefault();
				if ($ele.parent().prev().find(`a`).length) {
					$ele.parent().prev().find(`a`).focus();
				} else if ($(`.has-results-left`).length) {
					$(`.omni__paginate-left`).click();
					$searchOut.find(`a`).last().focus();
				} else {
					$searchIn.focus();
				}
				break;
			}
			case 39: { // right
				e.preventDefault();
				if ($(`.has-results-right`).length) {
					const ix = $ele.parent().index() - 1; // offset as the control bar is at position 0
					$(`.omni__paginate-right`).click();
					const $psNext = $searchOut.find(`p`);
					$($psNext[ix] || $psNext[$psNext.length - 1]).find(`a`).focus();
				}
				break;
			}
			case 40: { // down
				e.preventDefault();
				if ($ele.parent().next().find(`a`).length) {
					$ele.parent().next().find(`a`).focus();
				} else if ($(`.has-results-right`).length) {
					$(`.omni__paginate-right`).click();
					$searchOut.find(`a`).first().focus();
				}
				break;
			}
		}
	},

	addScrollTopFloat () {
		const $wrpTop = $(`<div class="bk__to-top"/>`).appendTo($("body"));
		const $btnToTop = $(`<button class="btn btn-sm btn-default" title="To Top"><span class="glyphicon glyphicon-arrow-up"/></button>`).appendTo($wrpTop).click(() => MiscUtil.scrollPageTop());

		$(window).on("scroll", () => {
			if ($(window).scrollTop() > 50) $wrpTop.addClass("bk__to-top--scrolled");
			else $wrpTop.removeClass("bk__to-top--scrolled");
		});

		return $wrpTop;
	}
};

if (typeof window !== "undefined") window.addEventListener("load", Omnisearch.init);
if (typeof module !== "undefined") module.exports = Omnisearch;
